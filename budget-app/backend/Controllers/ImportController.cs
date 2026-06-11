using BudgetApi.Data;
using BudgetApi.Models;
using BudgetApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImportController(BudgetContext db) : ControllerBase
{
    public record ImportRowDto(DateOnly Date, string Label, decimal Amount, bool Duplicate, string? Category);

    /// <summary>
    /// Importe un relevé (csv / xlsx / pdf) sur un compte.
    /// dryRun = true : analyse seulement (aperçu + doublons), rien n'est enregistré.
    /// dryRun = false : enregistre les lignes nouvelles, ignore les doublons.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Import([FromForm] Guid accountId, [FromForm] bool dryRun, [FromForm] IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Aucun fichier reçu." });

        var account = await db.Accounts.FindAsync(accountId);
        if (account == null)
            return BadRequest(new { message = "Compte introuvable." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        List<ParsedRow> parsed;
        try
        {
            await using var stream = file.OpenReadStream();
            parsed = extension switch
            {
                ".csv" or ".txt" => ImportParser.ParseCsv(stream),
                ".xlsx" => ImportParser.ParseXlsx(stream),
                ".pdf" => ImportParser.ParsePdf(stream),
                ".xls" => throw new InvalidDataException(
                    "Le format .xls (ancien Excel) n'est pas supporté : ouvrez le fichier dans Excel et enregistrez-le en .xlsx."),
                _ => throw new InvalidDataException($"Extension non supportée : {extension} (formats acceptés : .csv, .xlsx, .pdf).")
            };
        }
        catch (InvalidDataException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception)
        {
            return BadRequest(new { message = "Impossible de lire ce fichier. Vérifiez son format ou son contenu." });
        }

        if (parsed.Count == 0)
            return BadRequest(new { message = "Aucune transaction reconnue dans ce fichier." });

        var categories = await db.Categories.AsNoTracking().ToListAsync();

        // Hashes déjà présents en base pour ce compte.
        var existing = (await db.Transactions
                .Where(t => t.AccountId == accountId)
                .Select(t => t.ImportHash)
                .ToListAsync())
            .ToHashSet();

        var rows = new List<ImportRowDto>();
        var toInsert = new List<Transaction>();

        foreach (var row in parsed)
        {
            var hash = Util.ComputeHash(accountId, row.Date, row.Amount, row.Label);

            // existing.Add renvoie false si le hash y est déjà : couvre la base
            // ET les doublons à l'intérieur du fichier importé.
            var duplicate = !existing.Add(hash);
            var category = duplicate ? null : Util.MatchCategory(categories, row.Label);

            rows.Add(new ImportRowDto(row.Date, row.Label, row.Amount, duplicate, category?.Name));

            if (!duplicate)
            {
                toInsert.Add(new Transaction
                {
                    AccountId = accountId,
                    Date = row.Date,
                    Label = row.Label,
                    Amount = row.Amount,
                    CategoryId = category?.Id,
                    ImportHash = hash
                });
            }
        }

        if (!dryRun && toInsert.Count > 0)
        {
            db.Transactions.AddRange(toInsert);
            await db.SaveChangesAsync();
        }

        return Ok(new
        {
            total = rows.Count,
            imported = dryRun ? 0 : toInsert.Count,
            newRows = toInsert.Count,
            duplicates = rows.Count - toInsert.Count,
            dryRun,
            rows = rows.OrderByDescending(r => r.Date).ToList()
        });
    }
}
