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

        db.SaveChanges();
    }
}
