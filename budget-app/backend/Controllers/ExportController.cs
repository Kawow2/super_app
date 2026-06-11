using System.Text.Json;
using BudgetApi.Data;
using BudgetApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExportController(BudgetContext db) : ControllerBase
{
    public class ExportPayload
    {
        public DateTime ExportedAt { get; set; }
        public List<AppSetting> Settings { get; set; } = new();
        public List<Category> Categories { get; set; } = new();
        public List<Account> Accounts { get; set; } = new();
        public List<Subscription> Subscriptions { get; set; } = new();
        public List<Transaction> Transactions { get; set; } = new();
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    /// <summary>Télécharge l'intégralité des données au format JSON (sauvegarde / changement de PC).</summary>
    [HttpGet]
    public async Task<IActionResult> Export()
    {
        var payload = new ExportPayload
        {
            ExportedAt = DateTime.UtcNow,
            Settings = await db.Settings.AsNoTracking().ToListAsync(),
            Categories = await db.Categories.AsNoTracking().ToListAsync(),
            Accounts = await db.Accounts.AsNoTracking().ToListAsync(),
            Subscriptions = await db.Subscriptions.AsNoTracking().ToListAsync(),
            Transactions = await db.Transactions.AsNoTracking().ToListAsync()
        };

        var bytes = JsonSerializer.SerializeToUtf8Bytes(payload, JsonOptions);
        var fileName = $"budget-export-{DateTime.Now:yyyy-MM-dd}.json";
        return File(bytes, "application/json", fileName);
    }

    /// <summary>
    /// Restaure une sauvegarde JSON : REMPLACE toutes les données existantes.
    /// Les Guid étant conservés, l'historique est restitué à l'identique.
    /// </summary>
    [HttpPost("restore")]
    public async Task<IActionResult> Restore([FromForm] IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Aucun fichier reçu." });

        ExportPayload? payload;
        try
        {
            await using var stream = file.OpenReadStream();
            payload = await JsonSerializer.DeserializeAsync<ExportPayload>(stream, JsonOptions);
        }
        catch (JsonException)
        {
            return BadRequest(new { message = "Fichier illisible : ce n'est pas un export valide de l'application." });
        }

        if (payload == null || payload.Accounts == null || payload.Transactions == null)
            return BadRequest(new { message = "Fichier incomplet : ce n'est pas un export valide de l'application." });

        await using var transaction = await db.Database.BeginTransactionAsync();

        // Suppression dans l'ordre des dépendances...
        db.Transactions.RemoveRange(db.Transactions);
        db.Subscriptions.RemoveRange(db.Subscriptions);
        db.Accounts.RemoveRange(db.Accounts);
        db.Categories.RemoveRange(db.Categories);
        db.Settings.RemoveRange(db.Settings);
        await db.SaveChangesAsync();

        // ... puis réinsertion dans l'ordre inverse.
        db.Settings.AddRange(payload.Settings ?? new List<AppSetting>());
        db.Categories.AddRange(payload.Categories ?? new List<Category>());
        db.Accounts.AddRange(payload.Accounts);
        db.Subscriptions.AddRange(payload.Subscriptions ?? new List<Subscription>());
        db.Transactions.AddRange(payload.Transactions);
        await db.SaveChangesAsync();

        await transaction.CommitAsync();

        return Ok(new
        {
            accounts = payload.Accounts.Count,
            categories = payload.Categories?.Count ?? 0,
            subscriptions = payload.Subscriptions?.Count ?? 0,
            transactions = payload.Transactions.Count
        });
    }
}
