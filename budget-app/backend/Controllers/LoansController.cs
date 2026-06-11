using BudgetApi.Data;
using BudgetApi.Models;
using BudgetApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LoansController(BudgetContext db) : ControllerBase
{
    public record LoanDto(
        Guid ProjectId, string Name, decimal Principal, decimal AnnualRate, int DurationMonths,
        DateOnly StartDate, InsuranceMode InsuranceMode, decimal InsuranceAnnualRate,
        decimal InsuranceMonthlyAmount, decimal Fees);

    public record DuplicateDto(string Name);
    public record PrepaymentDto(DateOnly Date, decimal Amount, PrepaymentMode Mode);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var loan = await db.Loans.FindAsync(id);
        if (loan == null) return NotFound();

        var schedule = await db.ScheduleEntries
            .Where(e => e.LoanId == id)
            .OrderBy(e => e.PaymentNumber)
            .ToListAsync();
        var prepayments = await db.Prepayments
            .Where(p => p.LoanId == id)
            .OrderBy(p => p.Date)
            .ToListAsync();

        return Ok(new
        {
            Loan = loan,
            Summary = AmortizationService.Summarize(loan, schedule, prepayments),
            Schedule = schedule,
            Prepayments = prepayments,
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(LoanDto dto)
    {
        var error = Validate(dto);
        if (error != null) return BadRequest(error);
        if (await db.HousingProjects.FindAsync(dto.ProjectId) == null)
            return BadRequest("Le projet est introuvable.");

        var loan = new Loan { ProjectId = dto.ProjectId };
        Apply(loan, dto);
        db.Loans.Add(loan);
        await db.SaveChangesAsync();
        await RebuildSchedule(loan);
        return Ok(loan);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, LoanDto dto)
    {
        var loan = await db.Loans.FindAsync(id);
        if (loan == null) return NotFound();
        var error = Validate(dto);
        if (error != null) return BadRequest(error);

        Apply(loan, dto);
        await db.SaveChangesAsync();
        await RebuildSchedule(loan);
        return Ok(loan);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var loan = await db.Loans.FindAsync(id);
        if (loan == null) return NotFound();

        // Détache les scénarios qui pointent vers ce prêt (FK auto-référencée sans cascade).
        await db.Loans.Where(l => l.BaseLoanId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.BaseLoanId, (Guid?)null));
        db.Loans.Remove(loan); // échéancier et remboursements anticipés supprimés en cascade
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Duplique un prêt en scénario de comparaison (exclu des totaux du projet).</summary>
    [HttpPost("{id:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid id, DuplicateDto dto)
    {
        var source = await db.Loans.FindAsync(id);
        if (source == null) return NotFound();

        var copy = new Loan
        {
            ProjectId = source.ProjectId,
            Name = string.IsNullOrWhiteSpace(dto.Name) ? $"{source.Name} (scénario)" : dto.Name.Trim(),
            Principal = source.Principal,
            AnnualRate = source.AnnualRate,
            DurationMonths = source.DurationMonths,
            StartDate = source.StartDate,
            InsuranceMode = source.InsuranceMode,
            InsuranceAnnualRate = source.InsuranceAnnualRate,
            InsuranceMonthlyAmount = source.InsuranceMonthlyAmount,
            Fees = source.Fees,
            IsScenario = true,
            BaseLoanId = source.IsScenario ? source.BaseLoanId : source.Id,
        };
        db.Loans.Add(copy);
        await db.SaveChangesAsync();
        await RebuildSchedule(copy);
        return Ok(copy);
    }

    [HttpPost("{id:guid}/prepayments")]
    public async Task<IActionResult> AddPrepayment(Guid id, PrepaymentDto dto)
    {
        var loan = await db.Loans.FindAsync(id);
        if (loan == null) return NotFound();
        if (dto.Amount <= 0) return BadRequest("Le montant du remboursement doit être positif.");

        db.Prepayments.Add(new Prepayment { LoanId = id, Date = dto.Date, Amount = dto.Amount, Mode = dto.Mode });
        await db.SaveChangesAsync();
        await RebuildSchedule(loan);
        return Ok(loan);
    }

    [HttpPut("{id:guid}/prepayments/{pid:guid}")]
    public async Task<IActionResult> UpdatePrepayment(Guid id, Guid pid, PrepaymentDto dto)
    {
        var loan = await db.Loans.FindAsync(id);
        var prepayment = await db.Prepayments.FirstOrDefaultAsync(p => p.Id == pid && p.LoanId == id);
        if (loan == null || prepayment == null) return NotFound();
        if (dto.Amount <= 0) return BadRequest("Le montant du remboursement doit être positif.");

        prepayment.Date = dto.Date;
        prepayment.Amount = dto.Amount;
        prepayment.Mode = dto.Mode;
        await db.SaveChangesAsync();
        await RebuildSchedule(loan);
        return Ok(loan);
    }

    [HttpDelete("{id:guid}/prepayments/{pid:guid}")]
    public async Task<IActionResult> DeletePrepayment(Guid id, Guid pid)
    {
        var loan = await db.Loans.FindAsync(id);
        var prepayment = await db.Prepayments.FirstOrDefaultAsync(p => p.Id == pid && p.LoanId == id);
        if (loan == null || prepayment == null) return NotFound();

        db.Prepayments.Remove(prepayment);
        await db.SaveChangesAsync();
        await RebuildSchedule(loan);
        return NoContent();
    }

    private static string? Validate(LoanDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return "Le nom du prêt est requis.";
        if (dto.Principal <= 0) return "Le capital emprunté doit être positif.";
        if (dto.DurationMonths is < 1 or > 600) return "La durée doit être comprise entre 1 et 600 mois.";
        if (dto.AnnualRate < 0) return "Le taux ne peut pas être négatif.";
        if (dto.InsuranceAnnualRate < 0 || dto.InsuranceMonthlyAmount < 0) return "L'assurance ne peut pas être négative.";
        if (dto.Fees < 0) return "Les frais ne peuvent pas être négatifs.";
        return null;
    }

    private static void Apply(Loan loan, LoanDto dto)
    {
        loan.Name = dto.Name.Trim();
        loan.Principal = dto.Principal;
        loan.AnnualRate = dto.AnnualRate;
        loan.DurationMonths = dto.DurationMonths;
        loan.StartDate = dto.StartDate;
        loan.InsuranceMode = dto.InsuranceMode;
        loan.InsuranceAnnualRate = dto.InsuranceAnnualRate;
        loan.InsuranceMonthlyAmount = dto.InsuranceMonthlyAmount;
        loan.Fees = dto.Fees;
    }

    /// <summary>
    /// Recalcule et remplace l'échéancier persisté du prêt (les projections sont stockées en base).
    /// À appeler après le SaveChanges des modifications du prêt/des remboursements anticipés,
    /// pour que la lecture des prepayments reflète l'état réel.
    /// </summary>
    private async Task RebuildSchedule(Loan loan)
    {
        await db.ScheduleEntries.Where(e => e.LoanId == loan.Id).ExecuteDeleteAsync();
        var prepayments = await db.Prepayments.AsNoTracking().Where(p => p.LoanId == loan.Id).ToListAsync();
        db.ScheduleEntries.AddRange(AmortizationService.BuildSchedule(loan, prepayments));
        await db.SaveChangesAsync();
    }
}
