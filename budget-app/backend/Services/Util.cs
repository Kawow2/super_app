using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using BudgetApi.Models;

namespace BudgetApi.Services;

public static class Util
{
    /// <summary>Minuscule, espaces multiples réduits, accents supprimés.</summary>
    public static string NormalizeLabel(string label)
    {
        var lowered = label.Trim().ToLowerInvariant();
        var collapsed = Regex.Replace(lowered, @"\s+", " ");
        return RemoveDiacritics(collapsed);
    }

    public static string RemoveDiacritics(string text)
    {
        var formD = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in formD)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    /// <summary>Empreinte stable d'une transaction, utilisée pour la détection de doublons.</summary>
    public static string ComputeHash(Guid accountId, DateOnly date, decimal amount, string label)
    {
        var raw = $"{accountId}|{date:yyyy-MM-dd}|{amount.ToString("0.00", CultureInfo.InvariantCulture)}|{NormalizeLabel(label)}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
    }

    /// <summary>
    /// Clé de similarité : libellé normalisé dont on retire les chiffres
    /// (dates, numéros de facture, références...). Deux opérations "CB CARREFOUR 10/01"
    /// et "CB CARREFOUR 12/02" partagent ainsi la même clé.
    /// </summary>
    public static string SimilarityKey(string label)
    {
        var normalized = NormalizeLabel(label);
        var stripped = new string(normalized.Where(c => !char.IsDigit(c)).ToArray());
        return Regex.Replace(stripped, @"\s+", " ").Trim();
    }

    /// <summary>Trouve la première catégorie dont un mot-clé apparaît dans le libellé.</summary>
    public static Category? MatchCategory(IEnumerable<Category> categories, string label)
    {
        var normalized = NormalizeLabel(label);
        foreach (var category in categories)
        {
            if (string.IsNullOrWhiteSpace(category.Keywords)) continue;
            var keywords = category.Keywords.Split(new[] { ';', ',' },
                StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (keywords.Any(k => k.Length > 1 && normalized.Contains(NormalizeLabel(k))))
                return category;
        }
        return null;
    }
}
