using BudgetApi.Models;

namespace BudgetApi.Data;

public static class Seed
{
    public static void Run(BudgetContext db)
    {
        if (!db.Settings.Any())
        {
            db.Settings.Add(new AppSetting { Key = "themeColor", Value = "#4f46e5" });
        }

        if (!db.Categories.Any())
        {
            db.Categories.AddRange(
                new Category { Name = "Alimentation", Color = "#f59e0b", Keywords = "carrefour;leclerc;lidl;auchan;intermarche;monoprix;casino;boulangerie" },
                new Category { Name = "Logement", Color = "#3b82f6", Keywords = "loyer;edf;engie;total energies;eau" },
                new Category { Name = "Transport", Color = "#10b981", Keywords = "sncf;tcl;essence;station;peage;uber;blablacar" },
                new Category { Name = "Abonnements", Color = "#8b5cf6", Keywords = "netflix;spotify;disney;free;orange;sfr;bouygues;canal;amazon prime" },
                new Category { Name = "Loisirs", Color = "#ec4899", Keywords = "cinema;restaurant;fnac;steam;decathlon" },
                new Category { Name = "Santé", Color = "#ef4444", Keywords = "pharmacie;medecin;mutuelle;dentiste" },
                new Category { Name = "Salaire", Color = "#22c55e", Keywords = "salaire;paie;remuneration" }
            );
        }

        if (!db.Accounts.Any())
        {
            db.Accounts.Add(new Account { Name = "Compte courant", Bank = "Ma banque", InitialBalance = 0 });
        }

        if (!db.Meals.Any())
        {
            SeedMeals(db);
        }

        db.SaveChanges();
    }

    /// <summary>Quelques repas d'exemple pour que la génération de planning fonctionne immédiatement.</summary>
    private static void SeedMeals(BudgetContext db)
    {
        var meals = new (string Name, string? Description, MealType Type, int Time, (string Name, decimal? Qty, string? Unit)[] Ingredients)[]
        {
            ("Pâtes carbonara", "Spaghetti, lardons, œufs, parmesan", MealType.Plat, 20,
                [("spaghetti", 400, "g"), ("lardons", 200, "g"), ("oeufs", 3, null), ("parmesan", 50, "g")]),
            ("Poulet rôti", "Poulet entier au four avec pommes de terre", MealType.Plat, 90,
                [("poulet", 1, null), ("pommes de terre", 800, "g"), ("beurre", 50, "g")]),
            ("Salade niçoise", "Salade complète : thon, œufs, olives", MealType.Plat, 15,
                [("salade", 1, null), ("thon", 160, "g"), ("oeufs", 2, null), ("olives", 50, "g"), ("tomates", 3, null)]),
            ("Omelette aux champignons", null, MealType.Plat, 10,
                [("oeufs", 4, null), ("champignons", 150, "g"), ("beurre", 20, "g")]),
            ("Soupe de légumes", "Carottes, poireaux, pommes de terre", MealType.Entree, 35,
                [("carottes", 3, null), ("poireaux", 2, null), ("pommes de terre", 300, "g")]),
            ("Crêpes", "Pâte à crêpes classique", MealType.Dessert, 30,
                [("farine", 250, "g"), ("oeufs", 3, null), ("lait", 50, "cl"), ("beurre", 30, "g")]),
        };

        var ingredients = new Dictionary<string, Ingredient>();
        foreach (var (name, description, type, time, lines) in meals)
        {
            var meal = new Meal { Name = name, Description = description, Type = type, TimeToCook = time };
            db.Meals.Add(meal);
            foreach (var (ingredientName, qty, unit) in lines)
            {
                if (!ingredients.TryGetValue(ingredientName, out var ingredient))
                {
                    ingredient = new Ingredient { Name = ingredientName };
                    ingredients[ingredientName] = ingredient;
                    db.Ingredients.Add(ingredient);
                }
                db.MealIngredients.Add(new MealIngredient
                {
                    MealId = meal.Id,
                    IngredientId = ingredient.Id,
                    Quantity = qty,
                    Unit = unit,
                });
            }
        }
    }
}
