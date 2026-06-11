using BudgetApi.Data;
using BudgetApi.Models;
using BudgetApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController(BudgetContext db) : ControllerBase
{
    public record TransactionDto(Guid AccountId, DateOnly Date, string Label, decimal Amount, Guid? CategoryId);

    [HttpGet]
    public async Task<IActionResult> Get(
        Guid? accountId, DateOnly? from, DateOnly? to, Guid? categoryId,
        bool uncategorized = false, int limit = 2000)
    {
        var query = db.Transactions.AsNoTracking().AsQueryable();
        if (accountId.HasValue) query = query.Where(t => t.AccountId == accountId);
        if (from.HasValue) query = query.Where(t => t.Date >= from);
        if (to.HasValue) query = query.Where(t => t.Date <= to);
        if (categoryId.HasValue) query = query.Where(t => t.CategoryId == categoryId);
        if (uncategorized) query = query.Where(t => t.CategoryId == null);

        var transactions = await query
            .OrderByDescending(t => t.Date).ThenBy(t => t.Label)
            .Take(Math.Clamp(limit, 1, 10000))
            .ToListAsync();
        return Ok(transactions);
    }

    [HttpPost]
    public async Task<IActionResult> Create(TransactionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Label)) return BadRequest("Le libellé est requis.");
        if (!await db.Accounts.AnyAsync(a => a.Id == dto.AccountId)) return BadRequest("Compte introuvable.");

        var categoryId = dto.CategoryId;
        if (categoryId == null)
        {
            var categories = await db.Categories.Where(c => c.Keywords != null && c.Keywords != "").ToListAsync();
            categoryId = Util.MatchCategory(categories, dto.Label)?.Id;
        }

        var transaction = new Transaction
        {
            AccountId = dto.AccountId,
            Date = dto.Date,
            Label = dto.Label.Trim(),
            Amount = dto.Amount,
            CategoryId = categoryId,
            ImportHash = Util.ComputeHash(dto.AccountId, dto.Date, dto.Amount, dto.Label),
        };
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();
        return Ok(transaction);
    }

    public record SetCategoryDto(Guid? CategoryId, bool ApplyToSimilar = true);

    /// <summary>
    /// Change la catégorie d'une transaction et, par défaut, la propage à toutes
    /// les transactions au libellé similaire (mêmes mots, chiffres ignorés).
    /// </summary>
    [HttpPut("{id:guid}/category")]
    public async Task<IActionResult> SetCategory(Guid id, SetCategoryDto dto)
    {
        var transaction = await db.Transactions.FindAsync(id);
        if (transaction == null) return NotFound();

        transaction.CategoryId = dto.CategoryId;

        var similar = 0;
        if (dto.ApplyToSimilar)
        {
            var key = Util.SimilarityKey(transaction.Label);
            if (key.Length >= 3)
            {
                var others = await db.Transactions.Where(t => t.Id != id).ToListAsync();
                foreach (var other in others)
                {
                    if (other.CategoryId != dto.CategoryId && Util.SimilarityKey(other.Label) == key)
                    {
                        other.CategoryId = dto.CategoryId;
                        similar++;
                    }
                }
            }
        }

        await db.SaveChangesAsync();
        return Ok(new { similar });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, TransactionDto dto)
    {
        var transaction = await db.Transactions.FindAsync(id);
        if (transaction == null) return NotFound();

        transaction.AccountId = dto.AccountId;
        transaction.Date = dto.Date;
        transaction.Label = dto.Label.Trim();
        transaction.Amount = dto.Amount;
        transaction.CategoryId = dto.CategoryId;
        transaction.ImportHash = Util.ComputeHash(dto.AccountId, dto.Date, dto.Amount, dto.Label);

        await db.SaveChangesAsync();
        return Ok(transaction);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var transaction = await db.Transactions.FindAsync(id);
        if (transaction == null) return NotFound();
        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
