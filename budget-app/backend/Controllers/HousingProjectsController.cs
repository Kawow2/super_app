using BudgetApi.Data;
using BudgetApi.Models;
using BudgetApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HousingProjectsController(BudgetContext db) : ControllerBase
{
    public record ProjectDto(string Name, string? Notes);
    public record CostDto(string Label, decimal Amount);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var projects = await db.HousingProjects.OrderBy(p => p.Name).ToListAsync();
        var result = new List<object>();
        foreach (var project in projects)
        {
            var loans = await db.Loans.Where(l => l.ProjectId == project.Id && !l.IsScenario).ToListAsync();
            var summaries = await SummarizeLoans(loans);
            var totalCosts = await db.ProjectCosts.Where(c => c.ProjectId == project.Id).SumAsync(c => (decimal?)c.Amount) ?? 0;
            result.Add(new
            {
                project.Id,
                project.Name,
                project.Notes,
                LoanCount = loans.Count,
                TotalBorrowed = loans.Sum(l => l.Principal),
                MonthlyPayment = summaries.Sum(s => s.Summary.CurrentMonthlyTotal),
                FinalPrice = summaries.Sum(s => s.Summary.TotalRepaid) + totalCosts,
            });
        }
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id)
    {
        var project = await db.HousingProjects.FindAsync(id);
        if (project == null) return NotFound();

        var costs = await db.ProjectCosts.Where(c => c.ProjectId == id).OrderBy(c => c.Label).ToListAsync();
        var loans = await db.Loans.Where(l => l.ProjectId == id)
            .OrderBy(l => l.IsScenario).ThenBy(l => l.StartDate).ToListAsync();
        var summaries = await SummarizeLoans(loans);

        var real = summaries.Where(s => !s.Loan.IsScenario).ToList();
        var totalCosts = costs.Sum(c => c.Amount);
        var totalInterest = real.Sum(s => s.Summary.TotalInterest);
        var totalInsurance = real.Sum(s => s.Summary.TotalInsurance);
        var totalFees = real.Sum(s => s.Loan.Fees);

        // Agrégat mensuel (mensualité + assurance) sur l'union des échéanciers hors scénarios,
        // pour visualiser les chevauchements de prêts.
        var realLoanIds = real.Select(s => s.Loan.Id).ToList();
        var timeline = (await db.ScheduleEntries
                .Where(e => realLoanIds.Contains(e.LoanId))
                .GroupBy(e => new { e.Date.Year, e.Date.Month })
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Month,
                    Payment = g.Sum(e => e.Payment),
                    Insurance = g.Sum(e => e.Insurance),
                })
                .ToListAsync())
            .OrderBy(t => t.Year).ThenBy(t => t.Month)
            .Select(t => new
            {
                Month = $"{t.Year:D4}-{t.Month:D2}",
                t.Payment,
                t.Insurance,
                Total = t.Payment + t.Insurance,
            })
            .ToList();

        return Ok(new
        {
            project.Id,
            project.Name,
            project.Notes,
            Costs = costs,
            Loans = summaries.Select(s => new { Loan = s.Loan, Summary = s.Summary }),
            TotalBorrowed = real.Sum(s => s.Loan.Principal),
            TotalInterest = totalInterest,
            TotalInsurance = totalInsurance,
            TotalFees = totalFees,
            TotalCosts = totalCosts,
            MonthlyPayment = real.Sum(s => s.Summary.CurrentMonthlyTotal),
            FinalPrice = real.Sum(s => s.Summary.TotalRepaid) + totalCosts,
            Timeline = timeline,
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(ProjectDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Le nom du projet est requis.");
        var project = new HousingProject { Name = dto.Name.Trim(), Notes = dto.Notes };
        db.HousingProjects.Add(project);
        await db.SaveChangesAsync();
        return Ok(project);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, ProjectDto dto)
    {
        var project = await db.HousingProjects.FindAsync(id);
        if (project == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Le nom du projet est requis.");
        project.Name = dto.Name.Trim();
        project.Notes = dto.Notes;
        await db.SaveChangesAsync();
        return Ok(project);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await db.HousingProjects.FindAsync(id);
        if (project == null) return NotFound();

        // L'auto-référence des scénarios (BaseLoanId) bloquerait la cascade : on la nullifie d'abord.
        await db.Loans.Where(l => l.ProjectId == id && l.BaseLoanId != null)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.BaseLoanId, (Guid?)null));
        db.HousingProjects.Remove(project); // prêts, frais, échéanciers supprimés en cascade
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/costs")]
    public async Task<IActionResult> AddCost(Guid id, CostDto dto)
    {
        if (await db.HousingProjects.FindAsync(id) == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Label)) return BadRequest("Le libellé du frais est requis.");
        var cost = new ProjectCost { ProjectId = id, Label = dto.Label.Trim(), Amount = dto.Amount };
        db.ProjectCosts.Add(cost);
        await db.SaveChangesAsync();
        return Ok(cost);
    }

    [HttpPut("{id:guid}/costs/{costId:guid}")]
    public async Task<IActionResult> UpdateCost(Guid id, Guid costId, CostDto dto)
    {
        var cost = await db.ProjectCosts.FirstOrDefaultAsync(c => c.Id == costId && c.ProjectId == id);
        if (cost == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Label)) return BadRequest("Le libellé du frais est requis.");
        cost.Label = dto.Label.Trim();
        cost.Amount = dto.Amount;
        await db.SaveChangesAsync();
        return Ok(cost);
    }

    [HttpDelete("{id:guid}/costs/{costId:guid}")]
    public async Task<IActionResult> DeleteCost(Guid id, Guid costId)
    {
        var cost = await db.ProjectCosts.FirstOrDefaultAsync(c => c.Id == costId && c.ProjectId == id);
        if (cost == null) return NotFound();
        db.ProjectCosts.Remove(cost);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Associe à chaque prêt son résumé, calculé depuis l'échéancier persisté.</summary>
    private async Task<List<(Loan Loan, LoanSummary Summary)>> SummarizeLoans(List<Loan> loans)
    {
        var result = new List<(Loan, LoanSummary)>();
        foreach (var loan in loans)
        {
            var schedule = await db.ScheduleEntries
                .Where(e => e.LoanId == loan.Id)
                .OrderBy(e => e.PaymentNumber)
                .ToListAsync();
            var prepayments = await db.Prepayments.Where(p => p.LoanId == loan.Id).ToListAsync();
            result.Add((loan, AmortizationService.Summarize(loan, schedule, prepayments)));
        }
        return result;
    }
}
