namespace BudgetApi.Models;

public class Account
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string? Bank { get; set; }
    public decimal InitialBalance { get; set; }
}

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#6b7280";

    /// <summary>Mots-clés (séparés par ; ou ,) utilisés pour catégoriser automatiquement les transactions importées.</summary>
    public string? Keywords { get; set; }
}

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AccountId { get; set; }
    public DateOnly Date { get; set; }
    public string Label { get; set; } = "";

    /// <summary>Montant signé : négatif = dépense, positif = revenu.</summary>
    public decimal Amount { get; set; }

    public Guid? CategoryId { get; set; }

    /// <summary>Empreinte (compte + date + montant + libellé normalisé) servant à détecter les doublons à l'import.</summary>
    public string ImportHash { get; set; } = "";
}

public class Subscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Label { get; set; } = "";
    public decimal Amount { get; set; }
    public int DayOfMonth { get; set; } = 1;
    public Guid? CategoryId { get; set; }
    public bool Active { get; set; } = true;
}

public class AppSetting
{
    public string Key { get; set; } = "";
    public string Value { get; set; } = "";
}
