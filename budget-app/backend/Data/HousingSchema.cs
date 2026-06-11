using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Data;

/// <summary>
/// Création idempotente des tables Immobilier.
/// `EnsureCreated()` ne fait rien quand la base existe déjà : ces tables, ajoutées
/// après coup, doivent donc être créées explicitement sur les installations existantes.
/// Le schéma reproduit exactement ce que EnsureCreated génère sur une base neuve
/// (conventions EF : DbSet → nom de table, Guid → uniqueidentifier, DateOnly → date,
/// enum → int, decimal avec la précision configurée dans BudgetContext).
/// </summary>
public static class HousingSchema
{
    public static void EnsureTables(BudgetContext db)
    {
        string[] statements =
        [
            """
            IF OBJECT_ID(N'dbo.HousingProjects') IS NULL
            CREATE TABLE [HousingProjects] (
                [Id] uniqueidentifier NOT NULL,
                [Name] nvarchar(200) NOT NULL,
                [Notes] nvarchar(max) NULL,
                CONSTRAINT [PK_HousingProjects] PRIMARY KEY ([Id])
            );
            """,
            """
            IF OBJECT_ID(N'dbo.ProjectCosts') IS NULL
            CREATE TABLE [ProjectCosts] (
                [Id] uniqueidentifier NOT NULL,
                [ProjectId] uniqueidentifier NOT NULL,
                [Label] nvarchar(200) NOT NULL,
                [Amount] decimal(18,2) NOT NULL,
                CONSTRAINT [PK_ProjectCosts] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_ProjectCosts_HousingProjects_ProjectId]
                    FOREIGN KEY ([ProjectId]) REFERENCES [HousingProjects] ([Id]) ON DELETE CASCADE
            );
            """,
            """
            IF OBJECT_ID(N'dbo.Loans') IS NULL
            CREATE TABLE [Loans] (
                [Id] uniqueidentifier NOT NULL,
                [ProjectId] uniqueidentifier NOT NULL,
                [Name] nvarchar(200) NOT NULL,
                [Principal] decimal(18,2) NOT NULL,
                [AnnualRate] decimal(8,4) NOT NULL,
                [DurationMonths] int NOT NULL,
                [StartDate] date NOT NULL,
                [InsuranceMode] int NOT NULL,
                [InsuranceAnnualRate] decimal(8,4) NOT NULL,
                [InsuranceMonthlyAmount] decimal(18,2) NOT NULL,
                [Fees] decimal(18,2) NOT NULL,
                [IsScenario] bit NOT NULL,
                [BaseLoanId] uniqueidentifier NULL,
                CONSTRAINT [PK_Loans] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_Loans_HousingProjects_ProjectId]
                    FOREIGN KEY ([ProjectId]) REFERENCES [HousingProjects] ([Id]) ON DELETE CASCADE,
                CONSTRAINT [FK_Loans_Loans_BaseLoanId]
                    FOREIGN KEY ([BaseLoanId]) REFERENCES [Loans] ([Id])
            );
            """,
            """
            IF OBJECT_ID(N'dbo.Prepayments') IS NULL
            CREATE TABLE [Prepayments] (
                [Id] uniqueidentifier NOT NULL,
                [LoanId] uniqueidentifier NOT NULL,
                [Date] date NOT NULL,
                [Amount] decimal(18,2) NOT NULL,
                [Mode] int NOT NULL,
                CONSTRAINT [PK_Prepayments] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_Prepayments_Loans_LoanId]
                    FOREIGN KEY ([LoanId]) REFERENCES [Loans] ([Id]) ON DELETE CASCADE
            );
            """,
            """
            IF OBJECT_ID(N'dbo.ScheduleEntries') IS NULL
            CREATE TABLE [ScheduleEntries] (
                [Id] uniqueidentifier NOT NULL,
                [LoanId] uniqueidentifier NOT NULL,
                [PaymentNumber] int NOT NULL,
                [Date] date NOT NULL,
                [Payment] decimal(18,2) NOT NULL,
                [Principal] decimal(18,2) NOT NULL,
                [Interest] decimal(18,2) NOT NULL,
                [Insurance] decimal(18,2) NOT NULL,
                [PrepaidAmount] decimal(18,2) NOT NULL,
                [RemainingBalance] decimal(18,2) NOT NULL,
                CONSTRAINT [PK_ScheduleEntries] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_ScheduleEntries_Loans_LoanId]
                    FOREIGN KEY ([LoanId]) REFERENCES [Loans] ([Id]) ON DELETE CASCADE
            );
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProjectCosts_ProjectId')
            CREATE INDEX [IX_ProjectCosts_ProjectId] ON [ProjectCosts] ([ProjectId]);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Loans_ProjectId')
            CREATE INDEX [IX_Loans_ProjectId] ON [Loans] ([ProjectId]);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Loans_BaseLoanId')
            CREATE INDEX [IX_Loans_BaseLoanId] ON [Loans] ([BaseLoanId]);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Prepayments_LoanId')
            CREATE INDEX [IX_Prepayments_LoanId] ON [Prepayments] ([LoanId]);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ScheduleEntries_LoanId_PaymentNumber')
            CREATE UNIQUE INDEX [IX_ScheduleEntries_LoanId_PaymentNumber] ON [ScheduleEntries] ([LoanId], [PaymentNumber]);
            """,
        ];

        foreach (var sql in statements)
        {
            db.Database.ExecuteSqlRaw(sql);
        }
    }
}
