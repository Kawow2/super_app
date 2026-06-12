using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Data;

/// <summary>
/// Création idempotente des tables Recettes, datant de l'époque EnsureCreated.
/// Conservé uniquement pour le baseline (<see cref="MigrationBaseline"/>) des bases
/// antérieures aux migrations EF. Ne plus ajouter de tables ici : utiliser
/// `dotnet ef migrations add`.
/// </summary>
public static class RecettesSchema
{
    public static void EnsureTables(BudgetContext db)
    {
        string[] statements =
        [
            """
            IF OBJECT_ID(N'dbo.Meals') IS NULL
            CREATE TABLE [Meals] (
                [Id] uniqueidentifier NOT NULL,
                [Name] nvarchar(200) NOT NULL,
                [Description] nvarchar(max) NULL,
                [Type] int NOT NULL,
                [TimeToCook] int NOT NULL,
                [CreatedAt] datetime2 NOT NULL,
                [DeletedAt] datetime2 NULL,
                CONSTRAINT [PK_Meals] PRIMARY KEY ([Id])
            );
            """,
            """
            IF OBJECT_ID(N'dbo.Ingredients') IS NULL
            CREATE TABLE [Ingredients] (
                [Id] uniqueidentifier NOT NULL,
                [Name] nvarchar(200) NOT NULL,
                CONSTRAINT [PK_Ingredients] PRIMARY KEY ([Id])
            );
            """,
            """
            IF OBJECT_ID(N'dbo.MealIngredients') IS NULL
            CREATE TABLE [MealIngredients] (
                [Id] uniqueidentifier NOT NULL,
                [MealId] uniqueidentifier NOT NULL,
                [IngredientId] uniqueidentifier NOT NULL,
                [Quantity] decimal(18,2) NULL,
                [Unit] nvarchar(50) NULL,
                CONSTRAINT [PK_MealIngredients] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_MealIngredients_Meals_MealId]
                    FOREIGN KEY ([MealId]) REFERENCES [Meals] ([Id]) ON DELETE CASCADE,
                CONSTRAINT [FK_MealIngredients_Ingredients_IngredientId]
                    FOREIGN KEY ([IngredientId]) REFERENCES [Ingredients] ([Id])
            );
            """,
            """
            IF OBJECT_ID(N'dbo.Plannings') IS NULL
            CREATE TABLE [Plannings] (
                [Id] uniqueidentifier NOT NULL,
                [WeekStart] date NOT NULL,
                CONSTRAINT [PK_Plannings] PRIMARY KEY ([Id])
            );
            """,
            """
            IF OBJECT_ID(N'dbo.PlanningMeals') IS NULL
            CREATE TABLE [PlanningMeals] (
                [Id] uniqueidentifier NOT NULL,
                [PlanningId] uniqueidentifier NOT NULL,
                [DayOfWeek] int NOT NULL,
                [MealTime] int NOT NULL,
                [MealId] uniqueidentifier NOT NULL,
                [Locked] bit NOT NULL,
                CONSTRAINT [PK_PlanningMeals] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_PlanningMeals_Plannings_PlanningId]
                    FOREIGN KEY ([PlanningId]) REFERENCES [Plannings] ([Id]) ON DELETE CASCADE,
                CONSTRAINT [FK_PlanningMeals_Meals_MealId]
                    FOREIGN KEY ([MealId]) REFERENCES [Meals] ([Id])
            );
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Ingredients_Name')
            CREATE UNIQUE INDEX [IX_Ingredients_Name] ON [Ingredients] ([Name]);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MealIngredients_MealId_IngredientId')
            CREATE UNIQUE INDEX [IX_MealIngredients_MealId_IngredientId] ON [MealIngredients] ([MealId], [IngredientId]);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MealIngredients_IngredientId')
            CREATE INDEX [IX_MealIngredients_IngredientId] ON [MealIngredients] ([IngredientId]);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Plannings_WeekStart')
            CREATE UNIQUE INDEX [IX_Plannings_WeekStart] ON [Plannings] ([WeekStart]);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PlanningMeals_PlanningId_DayOfWeek_MealTime')
            CREATE UNIQUE INDEX [IX_PlanningMeals_PlanningId_DayOfWeek_MealTime] ON [PlanningMeals] ([PlanningId], [DayOfWeek], [MealTime]);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PlanningMeals_MealId')
            CREATE INDEX [IX_PlanningMeals_MealId] ON [PlanningMeals] ([MealId]);
            """,
        ];

        foreach (var sql in statements)
        {
            db.Database.ExecuteSqlRaw(sql);
        }
    }
}
