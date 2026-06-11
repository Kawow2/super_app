using BudgetApi.Data;
using BudgetApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountsController(BudgetContext db) : ControllerBase
{
    public record AccountDto(string Name, string? Bank, decimal InitialBalance);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var accounts = await db.Accounts
            .OrderBy(a => a.Name)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Bank,
                a.InitialBalance,
                Balance = a.InitialBalance
                    + (db.Transactions.Where(t => t.AccountId == a.Id).Sum(t => (decimal?)t.Amount) ?? 0),
                TransactionCount = db.Transactions.Count(t => t.AccountId == a.Id),
            })
            .ToListAsync();
        return Ok(accounts);
    }

    [HttpPost]
    public async Task<IActionResult> Create(AccountDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Le nom du compte est requis.");
        var account = new Account { Name = dto.Name.Trim(), Bank = dto.Bank, InitialBalance = dto.InitialBalance };
        db.Accounts.Add(account);
        await db.SaveChangesAsync();
        return Ok(account);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, AccountDto dto)
    {
        var account = await db.Accounts.FindAsync(id);
        if (account == null) return NotFound();
        account.Name = dto.Name.Trim();
        account.Bank = dto.Bank;
        account.InitialBalance = dto.InitialBalance;
        await db.SaveChangesAsync();
        return Ok(account);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var account = await db.Accounts.FindAsync(id);
        if (account == null) return NotFound();
        db.Accounts.Remove(account); // les transactions liées sont supprimées en cascade
        await db.SaveChangesAsync();
        return NoContent();
    }
}
