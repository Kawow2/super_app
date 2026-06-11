namespace BudgetApi.Models;

/// <summary>Projet immobilier (« Appartement 1 »...) regroupant prêts et frais fixes.</summary>
public class HousingProject
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string? Notes { get; set; }
}

/// <summary>Frais fixe d'un projet (cuisine, travaux, frais de banque...) compté dans le prix final.</summary>
public class ProjectCost
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public string Label { get; set; } = "";
    public decimal Amount { get; set; }
}

public enum InsuranceMode
{
    None = 0,

    /// <summary>Taux annuel en % du capital initial (standard français).</summary>
    AnnualPercent = 1,

    /// <summary>Montant fixe en € par mois.</summary>
    FixedMonthly = 2,
}

public class Loan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = "";

    /// <summary>Capital emprunté.</summary>
    public decimal Principal { get; set; }

    /// <summary>Taux nominal annuel en % (ex. 3.5).</summary>
    public decimal AnnualRate { get; set; }

    /// <summary>Durée totale en mois (l'UI convertit les années).</summary>
    public int DurationMonths { get; set; }

    public DateOnly StartDate { get; set; }

    public InsuranceMode InsuranceMode { get; set; }

    /// <summary>Taux annuel d'assurance en % du capital initial (mode AnnualPercent).</summary>
    public decimal InsuranceAnnualRate { get; set; }

    /// <summary>Assurance fixe en €/mois (mode FixedMonthly).</summary>
    public decimal InsuranceMonthlyAmount { get; set; }

    /// <summary>Frais fixes du prêt : dossier, garantie...</summary>
    public decimal Fees { get; set; }

    /// <summary>Variante de comparaison : exclue des totaux du projet.</summary>
    public bool IsScenario { get; set; }

    /// <summary>Prêt d'origine si ce prêt est un scénario dupliqué.</summary>
    public Guid? BaseLoanId { get; set; }
}

public enum PrepaymentMode
{
    /// <summary>Mensualité inchangée, le prêt se termine plus tôt.</summary>
    ReduceDuration = 0,

    /// <summary>Date de fin inchangée, mensualité recalculée à la baisse.</summary>
    ReducePayment = 1,
}

/// <summary>Remboursement anticipé partiel (ou total) d'un prêt.</summary>
public class Prepayment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LoanId { get; set; }
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public PrepaymentMode Mode { get; set; }
}

/// <summary>Ligne d'échéancier persistée (projection mois par mois d'un prêt).</summary>
public class ScheduleEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LoanId { get; set; }

    /// <summary>Numéro d'échéance, 1..n.</summary>
    public int PaymentNumber { get; set; }

    public DateOnly Date { get; set; }

    /// <summary>Mensualité hors assurance (ajustée sur la dernière échéance).</summary>
    public decimal Payment { get; set; }

    /// <summary>Part de capital amorti.</summary>
    public decimal Principal { get; set; }

    /// <summary>Part d'intérêts.</summary>
    public decimal Interest { get; set; }

    /// <summary>Assurance du mois.</summary>
    public decimal Insurance { get; set; }

    /// <summary>Remboursement anticipé appliqué ce mois (0 sinon).</summary>
    public decimal PrepaidAmount { get; set; }

    /// <summary>Capital restant dû après l'échéance.</summary>
    public decimal RemainingBalance { get; set; }
}
