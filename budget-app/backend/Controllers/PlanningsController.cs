using BudgetApi.Data;
using BudgetApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlanningsController(BudgetContext db) : ControllerBase
{
    public record SlotDto(int DayOfWeek, MealTime MealTime, Guid MealId);

    /// <summary>Planning de la semaine demandée (créé à la volée). weekStart est normalisé au lundi.</summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateOnly? weekStart)
    {
        var planning = await GetOrCreateAsync(weekStart);
        return Ok(await ShapeAsync(planning));
    }

    /// <summary>Remplit aléatoirement les créneaux non verrouillés à partir des repas actifs.</summary>
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromQuery] DateOnly? weekStart)
    {
        var mealIds = await db.Meals.Where(m => m.DeletedAt == null).Select(m => m.Id).ToListAsync();
        if (mealIds.Count == 0)
            return UnprocessableEntity("Ajoutez des repas avant de générer un planning.");

        var planning = await GetOrCreateAsync(weekStart);
        var slots = await db.PlanningMeals.Where(pm => pm.PlanningId == planning.Id).ToListAsync();

        db.PlanningMeals.RemoveRange(slots.Where(s => !s.Locked));
        foreach (var day in Enumerable.Range(0, 7))
        {
            foreach (var time in new[] { MealTime.Midi, MealTime.Soir })
            {
                if (slots.Any(s => s.Locked && s.DayOfWeek == day && s.MealTime == time)) continue;
                db.PlanningMeals.Add(new PlanningMeal
                {
                    PlanningId = planning.Id,
                    DayOfWeek = day,
                    MealTime = time,
                    MealId = mealIds[Random.Shared.Next(mealIds.Count)],
                });
            }
        }
        await db.SaveChangesAsync();
        return Ok(await ShapeAsync(planning));
    }

    /// <summary>Ingrédients de la semaine, groupés par nom avec occurrences et repas sources.</summary>
    [HttpGet("shopping-list")]
    public async Task<IActionResult> ShoppingList([FromQuery] DateOnly? weekStart)
    {
        var planning = await GetOrCreateAsync(weekStart);

        var rows = await db.PlanningMeals
            .Where(pm => pm.PlanningId == planning.Id)
            .Join(db.MealIngredients, pm => pm.MealId, mi => mi.MealId, (pm, mi) => mi)
            .Join(db.Ingredients, mi => mi.IngredientId, i => i.Id, (mi, i) => new { i.Name, mi.MealId })
            .Join(db.Meals, r => r.MealId, m => m.Id, (r, m) => new { r.Name, MealName = m.Name })
            .ToListAsync();

        var items = rows
            .GroupBy(r => r.Name)
            .Select(g => new
            {
                Name = g.Key,
                Count = g.Count(),
                Meals = g.Select(r => r.MealName).Distinct().OrderBy(n => n).ToList(),
            })
            .OrderBy(i => i.Name)
            .ToList();

        return Ok(new { planning.WeekStart, Items = items });
    }

    /// <summary>Assigne un repas à un créneau (remplace l'existant en conservant son verrouillage).</summary>
    [HttpPost("{id:guid}/slots")]
    public async Task<IActionResult> SetSlot(Guid id, SlotDto dto)
    {
        if (dto.DayOfWeek is < 0 or > 6) return BadRequest("DayOfWeek doit être entre 0 (lundi) et 6 (dimanche).");
        var planning = await db.Plannings.FindAsync(id);
        if (planning == null) return NotFound();
        var mealExists = await db.Meals.AnyAsync(m => m.Id == dto.MealId && m.DeletedAt == null);
        if (!mealExists) return NotFound("Repas introuvable.");

        var slot = await db.PlanningMeals.FirstOrDefaultAsync(pm =>
            pm.PlanningId == id && pm.DayOfWeek == dto.DayOfWeek && pm.MealTime == dto.MealTime);
        if (slot == null)
        {
            slot = new PlanningMeal { PlanningId = id, DayOfWeek = dto.DayOfWeek, MealTime = dto.MealTime, MealId = dto.MealId };
            db.PlanningMeals.Add(slot);
        }
        else
        {
            slot.MealId = dto.MealId; // Locked conservé
        }
        await db.SaveChangesAsync();
        return Ok(await ShapeSlotAsync(slot));
    }

    [HttpPost("{id:guid}/slots/{slotId:guid}/lock")]
    public async Task<IActionResult> ToggleLock(Guid id, Guid slotId)
    {
        var slot = await db.PlanningMeals.FirstOrDefaultAsync(pm => pm.Id == slotId && pm.PlanningId == id);
        if (slot == null) return NotFound();
        slot.Locked = !slot.Locked;
        await db.SaveChangesAsync();
        return Ok(await ShapeSlotAsync(slot));
    }

    [HttpDelete("{id:guid}/slots/{slotId:guid}")]
    public async Task<IActionResult> ClearSlot(Guid id, Guid slotId)
    {
        var slot = await db.PlanningMeals.FirstOrDefaultAsync(pm => pm.Id == slotId && pm.PlanningId == id);
        if (slot == null) return NotFound();
        db.PlanningMeals.Remove(slot);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Recule au lundi de la semaine (System.DayOfWeek : dimanche = 0).</summary>
    private static DateOnly ToMonday(DateOnly d) => d.AddDays(-(((int)d.DayOfWeek + 6) % 7));

    private async Task<Planning> GetOrCreateAsync(DateOnly? weekStart)
    {
        var monday = ToMonday(weekStart ?? DateOnly.FromDateTime(DateTime.Today));
        var planning = await db.Plannings.FirstOrDefaultAsync(p => p.WeekStart == monday);
        if (planning == null)
        {
            planning = new Planning { WeekStart = monday };
            db.Plannings.Add(planning);
            await db.SaveChangesAsync();
        }
        return planning;
    }

    /// <summary>Le nom du repas est joint sans filtrer DeletedAt : les semaines passées restent lisibles.</summary>
    private async Task<object> ShapeAsync(Planning planning)
    {
        var slots = await db.PlanningMeals
            .Where(pm => pm.PlanningId == planning.Id)
            .Join(db.Meals, pm => pm.MealId, m => m.Id, (pm, m) => new
            {
                pm.Id,
                pm.DayOfWeek,
                pm.MealTime,
                pm.MealId,
                MealName = m.Name,
                pm.Locked,
            })
            .OrderBy(s => s.DayOfWeek).ThenBy(s => s.MealTime)
            .ToListAsync();
        return new { planning.Id, planning.WeekStart, Slots = slots };
    }

    private async Task<object> ShapeSlotAsync(PlanningMeal slot)
    {
        var mealName = await db.Meals.Where(m => m.Id == slot.MealId).Select(m => m.Name).FirstAsync();
        return new { slot.Id, slot.DayOfWeek, slot.MealTime, slot.MealId, MealName = mealName, slot.Locked };
    }
}
