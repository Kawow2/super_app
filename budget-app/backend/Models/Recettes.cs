namespace BudgetApi.Models;

public enum MealType
{
    Plat = 0,
    Entree = 1,
    Dessert = 2,
}

public enum MealTime
{
    Midi = 0,
    Soir = 1,
}

/// <summary>Repas du catalogue (« Pâtes carbonara »...), avec ses ingrédients via MealIngredient.</summary>
public class Meal
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public MealType Type { get; set; } = MealType.Plat;

    /// <summary>Temps de préparation en minutes.</summary>
    public int TimeToCook { get; set; } = 15;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Soft delete : les plannings passés gardent leur référence vers le repas.</summary>
    public DateTime? DeletedAt { get; set; }
}

/// <summary>Catalogue global d'ingrédients, nom unique en minuscules.</summary>
public class Ingredient
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
}

/// <summary>Ligne d'ingrédient d'un repas (quantité et unité libres).</summary>
public class MealIngredient
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MealId { get; set; }
    public Guid IngredientId { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
}

/// <summary>Planning d'une semaine. WeekStart est toujours un lundi (unique).</summary>
public class Planning
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateOnly WeekStart { get; set; }
}

/// <summary>Créneau du planning. DayOfWeek : 0 = lundi ... 6 = dimanche (≠ System.DayOfWeek).</summary>
public class PlanningMeal
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PlanningId { get; set; }
    public int DayOfWeek { get; set; }
    public MealTime MealTime { get; set; }
    public Guid MealId { get; set; }

    /// <summary>Créneau verrouillé : la génération aléatoire ne le remplace pas.</summary>
    public bool Locked { get; set; }
}
