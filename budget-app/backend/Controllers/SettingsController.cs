using BudgetApi.Data;
using BudgetApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController(BudgetContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get() =>
        Ok(await db.Settings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value));

    /// <summary>Upsert de paires clé / valeur (ex. { "themeColor": "#4f46e5" }).</summary>
    [HttpPut]
    public async Task<IActionResult> Update(Dictionary<string, string> values)
    {
        foreach (var (key, value) in values)
        {
            var setting = await db.Settings.FindAsync(key);
            if (setting == null)
                db.Settings.Add(new AppSetting { Key = key, Value = value });
            else
                setting.Value = value;
        }
        await db.SaveChangesAsync();
        return Ok(await db.Settings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value));
    }
}
