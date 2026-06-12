using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace BudgetApi.Data;

/// <summary>
/// Transition EnsureCreated → migrations EF.
/// Les bases créées avant l'introduction des migrations contiennent déjà toutes les tables
/// mais pas l'historique __EFMigrationsHistory : Migrate() tenterait de tout recréer et
/// échouerait. On les « baseline » : on rattrape l'éventuel retard de schéma (tables
/// Immobilier/Recettes ajoutées après coup), puis on enregistre la migration initiale comme
/// déjà appliquée. Les migrations suivantes s'appliquent ensuite normalement, sans perte
/// de données.
/// </summary>
public static class MigrationBaseline
{
    public static void StampIfLegacy(BudgetContext db)
    {
        // Base absente (ou serveur pas encore prêt) : Migrate() la créera entièrement.
        if (!db.Database.CanConnect()) return;

        var legacy = db.Database.SqlQueryRaw<int>(
                """
                SELECT CASE WHEN OBJECT_ID(N'dbo.Accounts') IS NOT NULL
                             AND OBJECT_ID(N'dbo.__EFMigrationsHistory') IS NULL
                            THEN 1 ELSE 0 END AS Value
                """)
            .Single() == 1;
        if (!legacy) return;

        // Les installations restées sur une vieille version peuvent ne pas avoir les tables
        // ajoutées après le schéma d'origine : on les crée pour correspondre à InitialCreate.
        HousingSchema.EnsureTables(db);
        RecettesSchema.EnsureTables(db);

        var initialMigration = db.Database.GetMigrations().First();
        db.Database.ExecuteSqlRaw(
            """
            CREATE TABLE [__EFMigrationsHistory] (
                [MigrationId] nvarchar(150) NOT NULL,
                [ProductVersion] nvarchar(32) NOT NULL,
                CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
            );
            INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
            VALUES ({0}, {1});
            """,
            initialMigration, ProductInfo.GetVersion());
        Console.WriteLine($"Base héritée d'EnsureCreated : migration {initialMigration} marquée comme appliquée.");
    }
}
