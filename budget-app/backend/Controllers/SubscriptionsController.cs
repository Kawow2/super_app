using BudgetApi.Data;
using BudgetApi.Models;
using BudgetApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionsController(BudgetContext db) : ControllerBase
{
    public record SubscriptionDto(string Label, decimal Amount, int DayOfMonth, Guid? CategoryId, bool Active);

    [HttpGet]
    public async Task<IActionResult> Get() =>
        Ok(await db.Subscriptions.AsNoTracking().OrderBy(s => s.DayOfMonth).ThenBy(s => s.Label).ToListAsync());

    /// <summary>
    /// Devine les abonnements à partir de l'historique : dépenses au libellé similaire
    /// revenant sur au moins 3 mois consécutifs, à montant stable (±10 %) et
    /// à date proche dans le mois (±3 jours). Les abonnements déjà créés sont exclus.
    /// </summary>
    [HttpGet("detect")]
    public async Task<IActionResult> Detect()
    {
        var transactions = await db.Transactions.AsNoTracking()
            .Where(t => t.Amount < 0)
            .ToListAsync();

        var existingKeys = (await db.Subscriptions.AsNoTracking().ToListAsync())
            .Select(s => Util.SimilarityKey(s.Label))
            .ToHashSet();

        var suggestions = new List<SuggestionDto>();

        foreach (var group in transactions.GroupBy(t => Util.SimilarityKey(t.Label)))
        {
            if (group.Key.Length < 3 || existingKeys.Contains(group.Key)) continue;

            var monthIndices = group
                .Select(t => t.Date.Year * 12 + t.Date.Month)
                .Distinct().OrderBy(m => m).ToList();
            if (monthIndices.Count < 3) continue;

            // Au plus ~1 occurrence par mois (sinon : courses, pas abonnement).
            if (group.Count() > monthIndices.Count * 1.5) continue;

            // Au moins 3 mois consécutifs.
            var run = 1; var bestRun = 1;
            for (var i = 1; i < monthIndices.Count; i++)
            {
                run = monthIndices[i] == monthIndices[i - 1] + 1 ? run + 1 : 1;
                bestRun = Math.Max(bestRun, run);
            }
            if (bestRun < 3) continue;

            // Montant stable : 80 % des occurrences à ±10 % de la médiane.
            var amounts = group.Select(t => -t.Amount).OrderBy(a => a).ToList();
            var median = amounts[amounts.Count / 2];
            if (median <= 0) continue;
            if (amounts.Count(a => Math.Abs(a - median) <= median * 0.10m) < amounts.Count * 0.8) continue;

            // Jour du mois régulier : 70 % des occurrences à ±3 jours du jour médian.
            var days = group.Select(t => t.Date.Day).OrderBy(d => d).ToList();
            var medianDay = days[days.Count / 2];
            if (days.Count(d => Math.Abs(d - medianDay) <= 3) < days.Count * 0.7) continue;

            var latest = group.OrderByDescending(t => t.Date).First();
            suggestions.Add(new SuggestionDto(
                latest.Label, Math.Round(median, 2), medianDay,
                latest.CategoryId, monthIndices.Count, latest.Date));
        }

        return Ok(suggestions.OrderByDescending(s => s.Amount));
    }

    public record SuggestionDto(
        string Label, decimal Amount, int DayOfMonth,
        Guid? CategoryId, int Months, DateOnly LastDate);

    [HttpPost]
    public async Task<IActionResult> Create(SubscriptionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Label))
            return BadRequest(new { message = "Le libellé est obligatoire." });

        var subscription = new Subscription
        {
            Label = dto.Label.Trim(),
            Amount = dto.Amount,
            DayOfMonth = Math.Clamp(dto.DayOfMonth, 1, 31),
            CategoryId = dto.CategoryId,
            Active = dto.Active
        };
        db.Subscriptions.Add(subscription);
        await db.SaveChangesAsync();
        return Ok(subscription);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, SubscriptionDto dto)
    {
        var subscription = await db.Subscriptions.FindAsync(id);
        if (subscription == null) return NotFound();

        subscription.Label = dto.Label.Trim();
        subscription.Amount = dto.Amount;
        subscription.DayOfMonth = Math.Clamp(dto.DayOfMonth, 1, 31);
        subscription.CategoryId = dto.CategoryId;
        subscription.Active = dto.Active;
        await db.SaveChangesAsync();
        return Ok(subscription);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var subscription = await db.Subscriptions.FindAsync(id);
        if (subscription == null) return NotFound();
        db.Subscriptions.Remove(subscription);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
