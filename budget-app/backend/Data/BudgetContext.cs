using BudgetApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Data;

public class BudgetContext(DbContextOptions<BudgetContext> options) : DbContext(options)
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<AppSetting> Settings => Set<AppSetting>();
    public DbSet<HousingProject> HousingProjects => Set<HousingProject>();
    public DbSet<ProjectCost> ProjectCosts => Set<ProjectCost>();
    public DbSet<Loan> Loans => Set<Loan>();
    public DbSet<Prepayment> Prepayments => Set<Prepayment>();
    public DbSet<ScheduleEntry> ScheduleEntries => Set<ScheduleEntry>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Account>().Property(a => a.InitialBalance).HasPrecision(18, 2);
        mb.Entity<Transaction>().Property(t => t.Amount).HasPrecision(18, 2);
        mb.Entity<Subscription>().Property(s => s.Amount).HasPrecision(18, 2);

        mb.Entity<Transaction>().Property(t => t.ImportHash).HasMaxLength(64);
        mb.Entity<Transaction>().HasIndex(t => new { t.AccountId, t.ImportHash });
        mb.Entity<Transaction>().HasIndex(t => t.Date);

        mb.Entity<Transaction>()
            .HasOne<Account>().WithMany()
            .HasForeignKey(t => t.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Transaction>()
            .HasOne<Category>().WithMany()
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Subscription>()
            .HasOne<Category>().WithMany()
            .HasForeignKey(s => s.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<AppSetting>().HasKey(s => s.Key);
        mb.Entity<AppSetting>().Property(s => s.Key).HasMaxLength(100);

        // ----- Immobilier -----

        mb.Entity<HousingProject>().Property(p => p.Name).HasMaxLength(200);

        mb.Entity<ProjectCost>().Property(c => c.Label).HasMaxLength(200);
        mb.Entity<ProjectCost>().Property(c => c.Amount).HasPrecision(18, 2);
        mb.Entity<ProjectCost>()
            .HasOne<HousingProject>().WithMany()
            .HasForeignKey(c => c.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Loan>().Property(l => l.Name).HasMaxLength(200);
        mb.Entity<Loan>().Property(l => l.Principal).HasPrecision(18, 2);
        mb.Entity<Loan>().Property(l => l.AnnualRate).HasPrecision(8, 4);
        mb.Entity<Loan>().Property(l => l.InsuranceAnnualRate).HasPrecision(8, 4);
        mb.Entity<Loan>().Property(l => l.InsuranceMonthlyAmount).HasPrecision(18, 2);
        mb.Entity<Loan>().Property(l => l.Fees).HasPrecision(18, 2);
        mb.Entity<Loan>()
            .HasOne<HousingProject>().WithMany()
            .HasForeignKey(l => l.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
        // Auto-référence : SQL Server n'accepte pas SetNull/Cascade ici,
        // les scénarios liés sont nullifiés manuellement avant suppression du prêt.
        mb.Entity<Loan>()
            .HasOne<Loan>().WithMany()
            .HasForeignKey(l => l.BaseLoanId)
            .OnDelete(DeleteBehavior.ClientSetNull);

        mb.Entity<Prepayment>().Property(p => p.Amount).HasPrecision(18, 2);
        mb.Entity<Prepayment>()
            .HasOne<Loan>().WithMany()
            .HasForeignKey(p => p.LoanId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<ScheduleEntry>().Property(e => e.Payment).HasPrecision(18, 2);
        mb.Entity<ScheduleEntry>().Property(e => e.Principal).HasPrecision(18, 2);
        mb.Entity<ScheduleEntry>().Property(e => e.Interest).HasPrecision(18, 2);
        mb.Entity<ScheduleEntry>().Property(e => e.Insurance).HasPrecision(18, 2);
        mb.Entity<ScheduleEntry>().Property(e => e.PrepaidAmount).HasPrecision(18, 2);
        mb.Entity<ScheduleEntry>().Property(e => e.RemainingBalance).HasPrecision(18, 2);
        mb.Entity<ScheduleEntry>().HasIndex(e => new { e.LoanId, e.PaymentNumber }).IsUnique();
        mb.Entity<ScheduleEntry>()
            .HasOne<Loan>().WithMany()
            .HasForeignKey(e => e.LoanId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
