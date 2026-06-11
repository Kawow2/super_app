using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace BudgetApi.Services;

public record ParsedRow(DateOnly Date, string Label, decimal Amount);

/// <summary>
/// Lecture "souple" de relevés bancaires : CSV, XLSX et PDF (best effort).
/// Les colonnes sont détectées par leur en-tête (date / libellé / montant ou débit / crédit).
/// </summary>
public static class ImportParser
{
    private static readonly string[] DateHeaders = { "date", "dateoperation", "datedeloperation", "datecomptable", "datedecomptabilisation", "datevaleur" };
    private static readonly string[] LabelHeaders = { "libellesimplifie", "libelle", "label", "description", "intitule", "designation", "operation", "detail", "motif", "nature" };
    private static readonly string[] AmountHeaders = { "montant", "amount", "somme" };
    private static readonly string[] DebitHeaders = { "debit" };
    private static readonly string[] CreditHeaders = { "credit" };

    private static readonly string[] DateFormats =
    {
        "dd/MM/yyyy", "d/M/yyyy", "dd/MM/yy", "yyyy-MM-dd", "dd-MM-yyyy", "dd.MM.yyyy", "yyyy/MM/dd"
    };

    // ----------------------------------------------------------------- CSV

    public static List<ParsedRow> ParseCsv(Stream stream)
    {
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        var bytes = ms.ToArray();

        string text;
        try
        {
            text = new UTF8Encoding(false, throwOnInvalidBytes: true).GetString(bytes);
        }
        catch (DecoderFallbackException)
        {
            // Beaucoup d'exports bancaires français sont en Windows-1252.
            text = Encoding.GetEncoding(1252).GetString(bytes);
        }
        text = text.TrimStart('\uFEFF');

        // Certains exports contiennent quelques lignes d'en-tête avant le tableau :
        // on repère la première ligne qui ressemble à une ligne d'en-têtes avec une colonne date.
        var lines = text.Replace("\r\n", "\n").Split('\n');
        var headerLine = Array.FindIndex(lines, l =>
            NormalizeHeader(l).Contains("date") && (l.Contains(';') || l.Contains(',') || l.Contains('\t')));
        if (headerLine > 0)
            text = string.Join("\n", lines.Skip(headerLine));

        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            DetectDelimiter = true,
            BadDataFound = null,
            MissingFieldFound = null,
            HeaderValidated = null,
        };

        using var reader = new StringReader(text);
        using var csv = new CsvReader(reader, config);

        if (!csv.Read()) return new List<ParsedRow>();
        csv.ReadHeader();
        var headers = (csv.HeaderRecord ?? Array.Empty<string>()).Select(NormalizeHeader).ToArray();

        var dateIdx = FindColumn(headers, DateHeaders);
        var labelIdx = FindColumn(headers, LabelHeaders);
        var amountIdx = FindColumn(headers, AmountHeaders);
        var debitIdx = FindColumn(headers, DebitHeaders);
        var creditIdx = FindColumn(headers, CreditHeaders);

        if (dateIdx < 0)
            throw new InvalidOperationException("colonne date introuvable (en-têtes attendus : Date, Date opération...).");
        if (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)
            throw new InvalidOperationException("colonne montant introuvable (Montant, ou Débit / Crédit).");

        var rows = new List<ParsedRow>();
        while (csv.Read())
        {
            if (!TryParseDate(csv.GetField(dateIdx), out var date)) continue;

            var label = labelIdx >= 0 ? csv.GetField(labelIdx) ?? "" : "";

            decimal amount;
            if (amountIdx >= 0)
            {
                if (!TryParseAmount(csv.GetField(amountIdx), out amount)) continue;
            }
            else
            {
                decimal debit = 0, credit = 0;
                if (debitIdx >= 0) TryParseAmount(csv.GetField(debitIdx), out debit);
                if (creditIdx >= 0) TryParseAmount(csv.GetField(creditIdx), out credit);
                if (debit == 0 && credit == 0) continue;
                amount = credit - Math.Abs(debit);
            }

            rows.Add(new ParsedRow(date, CleanLabel(label), amount));
        }
        return rows;
    }

    // ---------------------------------------------------------------- XLSX

    public static List<ParsedRow> ParseXlsx(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.Worksheet(1);
        var headerRow = sheet.FirstRowUsed();
        if (headerRow == null) return new List<ParsedRow>();

        var columns = new Dictionary<int, string>();
        foreach (var cell in headerRow.CellsUsed())
            columns[cell.Address.ColumnNumber] = NormalizeHeader(cell.GetString());

        var dateCol = FindColumn(columns, DateHeaders);
        var labelCol = FindColumn(columns, LabelHeaders);
        var amountCol = FindColumn(columns, AmountHeaders);
        var debitCol = FindColumn(columns, DebitHeaders);
        var creditCol = FindColumn(columns, CreditHeaders);

        if (dateCol < 0)
            throw new InvalidOperationException("colonne date introuvable dans la première feuille.");
        if (amountCol < 0 && debitCol < 0 && creditCol < 0)
            throw new InvalidOperationException("colonne montant introuvable (Montant, ou Débit / Crédit).");

        var rows = new List<ParsedRow>();
        foreach (var row in sheet.RowsUsed().Where(r => r.RowNumber() > headerRow.RowNumber()))
        {
            if (!TryGetDate(row.Cell(dateCol), out var date)) continue;

            var label = labelCol > 0 ? row.Cell(labelCol).GetString() : "";

            decimal amount;
            if (amountCol > 0)
            {
                if (!TryGetAmount(row.Cell(amountCol), out amount)) continue;
            }
            else
            {
                decimal debit = 0, credit = 0;
                if (debitCol > 0) TryGetAmount(row.Cell(debitCol), out debit);
                if (creditCol > 0) TryGetAmount(row.Cell(creditCol), out credit);
                if (debit == 0 && credit == 0) continue;
                amount = credit - Math.Abs(debit);
            }

            rows.Add(new ParsedRow(date, CleanLabel(label), amount));
        }
        return rows;
    }

    private static bool TryGetDate(IXLCell cell, out DateOnly date)
    {
        if (cell.DataType == XLDataType.DateTime)
        {
            date = DateOnly.FromDateTime(cell.GetDateTime());
            return true;
        }
        return TryParseDate(cell.GetString(), out date);
    }

    private static bool TryGetAmount(IXLCell cell, out decimal amount)
    {
        if (cell.DataType == XLDataType.Number)
        {
            amount = (decimal)cell.GetDouble();
            return true;
        }
        return TryParseAmount(cell.GetString(), out amount);
    }

    // ----------------------------------------------------------------- PDF

    /// <summary>
    /// Lecture best effort : on extrait le texte et on cherche les lignes
    /// "date ... libellé ... montant". À affiner quand le modèle de relevé sera connu.
    /// </summary>
    public static List<ParsedRow> ParsePdf(Stream stream)
    {
        using var ms = new MemoryStream();
        stream.CopyTo(ms);

        var rows = new List<ParsedRow>();
        var lineRegex = new Regex(
            @"(?<date>\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4})\s+(?<label>.+?)\s+(?<amount>[-+]?\d[\d\s\u00A0\u202F]*[.,]\d{2})\s*(€|EUR)?\s*$",
            RegexOptions.Compiled);

        using var document = PdfDocument.Open(ms.ToArray());
        foreach (var page in document.GetPages())
        {
            var text = ContentOrderTextExtractor.GetText(page);
            foreach (var line in text.Split('\n'))
            {
                var match = lineRegex.Match(line.Trim());
                if (!match.Success) continue;
                if (!TryParseDate(match.Groups["date"].Value, out var date)) continue;
                if (!TryParseAmount(match.Groups["amount"].Value, out var amount)) continue;
                rows.Add(new ParsedRow(date, CleanLabel(match.Groups["label"].Value), amount));
            }
        }

        if (rows.Count == 0)
            throw new InvalidOperationException(
                "aucune transaction reconnue dans ce PDF. Le format de votre relevé est peut-être particulier : essayez l'export CSV/XLSX de votre banque.");

        return rows;
    }

    // ------------------------------------------------------------- helpers

    private static string CleanLabel(string label)
    {
        var cleaned = Regex.Replace(label.Trim(), @"\s+", " ");
        return string.IsNullOrWhiteSpace(cleaned) ? "(sans libellé)" : cleaned;
    }

    private static string NormalizeHeader(string header) =>
        new(Util.RemoveDiacritics(header).ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());

    private static int FindColumn(string[] normalizedHeaders, string[] candidates)
    {
        for (var i = 0; i < normalizedHeaders.Length; i++)
            if (candidates.Contains(normalizedHeaders[i])) return i;
        for (var i = 0; i < normalizedHeaders.Length; i++)
            if (candidates.Any(c => ContainsMatch(normalizedHeaders[i], c))) return i;
        return -1;
    }

    private static int FindColumn(Dictionary<int, string> columns, string[] candidates)
    {
        foreach (var (col, header) in columns)
            if (candidates.Contains(header)) return col;
        foreach (var (col, header) in columns)
            if (candidates.Any(c => ContainsMatch(header, c))) return col;
        return -1;
    }

    /// <summary>
    /// Correspondance partielle, mais une colonne contenant "date" ne peut matcher
    /// qu'un candidat de type date (évite que "Date de valeur" soit prise pour un montant).
    /// </summary>
    private static bool ContainsMatch(string header, string candidate) =>
        header.Contains(candidate) && (candidate.Contains("date") || !header.Contains("date"));

    public static bool TryParseDate(string? input, out DateOnly date)
    {
        date = default;
        if (string.IsNullOrWhiteSpace(input)) return false;
        input = input.Trim();
        if (DateOnly.TryParseExact(input, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
            return true;
        if (DateTime.TryParse(input, CultureInfo.GetCultureInfo("fr-FR"), DateTimeStyles.None, out var dt))
        {
            date = DateOnly.FromDateTime(dt);
            return true;
        }
        return false;
    }

    /// <summary>Gère "1 234,56", "1,234.56", "-12,30 €", "(45,00)"...</summary>
    public static bool TryParseAmount(string? input, out decimal value)
    {
        value = 0;
        if (string.IsNullOrWhiteSpace(input)) return false;

        var s = input
            .Replace("\u00A0", "").Replace("\u202F", "").Replace(" ", "")
            .Replace("€", "").Replace("EUR", "", StringComparison.OrdinalIgnoreCase)
            .Trim();

        var negative = false;
        if (s.StartsWith('(') && s.EndsWith(')'))
        {
            negative = true;
            s = s[1..^1];
        }
        if (s.StartsWith('+')) s = s[1..];

        var lastComma = s.LastIndexOf(',');
        var lastDot = s.LastIndexOf('.');
        if (lastComma >= 0 && lastDot >= 0)
        {
            s = lastComma > lastDot
                ? s.Replace(".", "").Replace(',', '.')
                : s.Replace(",", "");
        }
        else if (lastComma >= 0)
        {
            s = s.Replace(',', '.');
        }

        if (!decimal.TryParse(s, NumberStyles.Number | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out value))
            return false;

        if (negative) value = -value;
        return true;
    }
}
