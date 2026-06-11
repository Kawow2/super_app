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
    }
}
