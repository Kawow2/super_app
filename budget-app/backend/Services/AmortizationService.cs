using BudgetApi.Models;

namespace BudgetApi.Services;

/// <summary>Résumé d'un prêt calculé depuis son échéancier.</summary>
public record LoanSummary(
    decimal MonthlyPayment,          // mensualité hors assurance (1re échéance)
    decimal MonthlyInsurance,        // assurance mensuelle (1re échéance)
    decimal MonthlyTotal,            // mensualité + assurance
    decimal CurrentMonthlyTotal,     // mensualité + assurance de l'échéance courante (après prepayments « réduire mensualité »)
    decimal TotalInterest,
    decimal TotalInsurance,
    decimal TotalCost,               // intérêts + assurance + frais du prêt
    decimal TotalRepaid,             // capital + intérêts + assurance + frais
    decimal RemainingBalance,        // CRD à aujourd'hui
    decimal RemainingInterest,       // intérêts restant à payer à aujourd'hui
    int PaymentCount,
    DateOnly EndDate,
    decimal InterestSaved);          // intérêts économisés grâce aux remboursements anticipés

/// <summary>
/// Calcul d'échéancier en amortissement français (mensualité constante).
/// Fonctions pures : l'échéancier produit est persisté par les contrôleurs.
/// </summary>
public static class AmortizationService
{
    private const int MaxPayments = 600;

    private static decimal Round2(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    /// <summary>Mensualité constante : C·i / (1 − (1+i)^−n), ou C/n à taux nul.</summary>
    private static decimal ConstantPayment(decimal balance, decimal monthlyRate, int months)
    {
        if (months <= 0) return balance;
        if (monthlyRate == 0) return Round2(balance / months);
        var factor = (double)monthlyRate / (1 - Math.Pow(1 + (double)monthlyRate, -months));
        return Round2(balance * (decimal)factor);
    }

    public static List<ScheduleEntry> BuildSchedule(Loan loan, IReadOnlyList<Prepayment> prepayments)
    {
        var entries = new List<ScheduleEntry>();
        var monthlyRate = loan.AnnualRate / 100m / 12m;
        var balance = loan.Principal;
        var payment = ConstantPayment(balance, monthlyRate, loan.DurationMonths);

        var insurance = loan.InsuranceMode switch
        {
            InsuranceMode.AnnualPercent => Round2(loan.Principal * loan.InsuranceAnnualRate / 100m / 12m),
            InsuranceMode.FixedMonthly => Round2(loan.InsuranceMonthlyAmount),
            _ => 0m,
        };

        // Index de mois (1..n) de chaque remboursement anticipé par rapport au début du prêt.
        // Une date antérieure à la première échéance est rattachée à celle-ci.
        var prepaymentsByMonth = prepayments
            .Select(p => (Month: Math.Max(1, MonthIndex(loan.StartDate, p.Date)), p.Amount, p.Mode))
            .GroupBy(p => Math.Min(p.Month, MaxPayments))
            .ToDictionary(g => g.Key, g => g.ToList());

        for (var k = 1; balance > 0 && k <= MaxPayments; k++)
        {
            var date = loan.StartDate.AddMonths(k);
            var interest = Round2(balance * monthlyRate);
            var principalPart = payment - interest;
            var actualPayment = payment;

            // Dernière échéance : on solde exactement le capital restant.
            if (principalPart >= balance)
            {
                principalPart = balance;
                actualPayment = Round2(interest + principalPart);
            }

            balance = Round2(balance - principalPart);

            // Remboursements anticipés du mois, appliqués après l'échéance.
            var prepaid = 0m;
            if (prepaymentsByMonth.TryGetValue(k, out var monthPrepayments) && balance > 0)
            {
                foreach (var p in monthPrepayments)
                {
                    var amount = Math.Min(Round2(p.Amount), balance);
                    if (amount <= 0) continue;
                    prepaid += amount;
                    balance = Round2(balance - amount);

                    // « Réduire la mensualité » : recalcul sur la durée restante ; « réduire la
                    // durée » : mensualité inchangée, le prêt se termine simplement plus tôt.
                    if (p.Mode == PrepaymentMode.ReducePayment && balance > 0 && k < loan.DurationMonths)
                    {
                        payment = ConstantPayment(balance, monthlyRate, loan.DurationMonths - k);
                    }
                }
            }

            entries.Add(new ScheduleEntry
            {
                LoanId = loan.Id,
                PaymentNumber = k,
                Date = date,
                Payment = actualPayment,
                Principal = principalPart,
                Interest = interest,
                Insurance = insurance,
                PrepaidAmount = prepaid,
                RemainingBalance = balance,
            });
        }

        return entries;
    }

    public static LoanSummary Summarize(Loan loan, IReadOnlyList<ScheduleEntry> schedule, IReadOnlyList<Prepayment> prepayments)
    {
        if (schedule.Count == 0)
        {
            return new LoanSummary(0, 0, 0, 0, 0, 0, Round2(loan.Fees), Round2(loan.Fees),
                loan.Principal, 0, 0, loan.StartDate, 0);
        }

        var totalInterest = schedule.Sum(e => e.Interest);
        var totalInsurance = schedule.Sum(e => e.Insurance);
        var first = schedule[0];

        var today = DateOnly.FromDateTime(DateTime.Today);
        var current = schedule.FirstOrDefault(e => e.Date >= today) ?? schedule[^1];
        var remainingBalance = schedule.LastOrDefault(e => e.Date < today)?.RemainingBalance ?? loan.Principal;
        var remainingInterest = schedule.Where(e => e.Date >= today).Sum(e => e.Interest);

        // Intérêts qu'aurait coûté le même prêt sans remboursement anticipé.
        var interestSaved = 0m;
        if (prepayments.Count > 0)
        {
            var baseline = BuildSchedule(loan, []);
            interestSaved = Round2(baseline.Sum(e => e.Interest) - totalInterest);
        }

        return new LoanSummary(
            MonthlyPayment: first.Payment,
            MonthlyInsurance: first.Insurance,
            MonthlyTotal: Round2(first.Payment + first.Insurance),
            CurrentMonthlyTotal: Round2(current.Payment + current.Insurance),
            TotalInterest: Round2(totalInterest),
            TotalInsurance: Round2(totalInsurance),
            TotalCost: Round2(totalInterest + totalInsurance + loan.Fees),
            TotalRepaid: Round2(loan.Principal + totalInterest + totalInsurance + loan.Fees),
            RemainingBalance: remainingBalance,
            RemainingInterest: Round2(remainingInterest),
            PaymentCount: schedule.Count,
            EndDate: schedule[^1].Date,
            InterestSaved: interestSaved);
    }

    /// <summary>Écart en mois entre le début du prêt et une date (1 = premier mois d'échéance).</summary>
    private static int MonthIndex(DateOnly start, DateOnly date) =>
        (date.Year - start.Year) * 12 + date.Month - start.Month;
}
