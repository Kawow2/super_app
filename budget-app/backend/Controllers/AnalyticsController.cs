using BudgetApi.Data;
using BudgetApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalyticsController(BudgetContext db) : ControllerBase
{
    /// <summary>Dépenses et revenus mois par mois pour une année.</summary>
    [HttpGet("monthly")]
    public async Task<IActionResult> Monthly(int year, Guid? accountId)
    {
        var data = await db.Transactions
            .Where(t => t.Date.Year == year && (accountId == null || t.AccountId == accountId))
            .GroupBy(t => t.Date.Month)
            .Select(g => new
            {
                Month = g.Key,
                Expenses = g.Sum(t => t.Amount < 0 ? -t.Amount : 0),
                Income = g.Sum(t => t.Amount > 0 ? t.Amount : 0),
            })
            .ToListAsync();

        var result = Enumerable.Range(1, 12).Select(m => new
        {
            month = m,
            expenses = data.FirstOrDefault(d => d.Month == m)?.Expenses ?? 0,
            income = data.FirstOrDefault(d => d.Month == m)?.Income ?? 0,
        });
        return Ok(result);
    }

    /// <summary>Dépenses et revenus année par année.</summary>
    [HttpGet("yearly")]
    public async Task<IActionResult> Yearly(Guid? accountId)
    {
        var data = await db.Transactions
            .Where(t => accountId == null || t.AccountId == accountId)
            .GroupBy(t => t.Date.Year)
            .Select(g => new
            {
                year = g.Key,
                expenses = g.Sum(t => t.Amount < 0 ? -t.Amount : 0),
                income = g.Sum(t => t.Amount > 0 ? t.Amount : 0),
            })
            .OrderBy(x => x.year)
            .ToListAsync();
        return Ok(data);
    }

    /// <summary>Dépenses par catégorie sur une période.</summary>
    [HttpGet("by-category")]
    public async Task<IActionResult> ByCategory(DateOnly from, DateOnly to, Guid? accountId)
    {
        var data = await db.Transactions
            .Where(t => t.Amount < 0
                && t.Date >= from && t.Date <= to
                && (accountId == null || t.AccountId == accountId))
            .GroupBy(t => t.CategoryId)
            .Select(g => new { CategoryId = g.Key, Total = g.Sum(t => -t.Amount) })
            .ToListAsync();

        var categories = await db.Categories.ToDictionaryAsync(c => c.Id);

        var result = data.Select(d =>
        {
            Category? cat = null;
            if (d.CategoryId.HasValue)
                categories.TryGetValue(d.CategoryId.Value, out cat);
            return new
            {
                categoryId = d.CategoryId,
                name  = cat?.Name  ?? "Non catégorisé",
                color = cat?.Color ?? "#9ca3af",
                total = d.Total,
            };
        }).OrderByDescending(x => x.total);

        return Ok(result);
    }
}
