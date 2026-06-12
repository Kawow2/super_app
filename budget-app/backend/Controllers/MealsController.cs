using BudgetApi.Data;
using BudgetApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MealsController(BudgetContext db) : ControllerBase
{
    public record IngredientLineDto(string Name, decimal? Quantity, string? Unit);
    public record MealDto(string Name, string? Description, MealType Type, int TimeToCook, List<IngredientLineDto>? Ingredients);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var meals = await db.Meals
            .Where(m => m.DeletedAt == null)
            .OrderBy(m => m.Name)
            .ToListAsync();
        var ingredients = await LoadIngredientsAsync(meals.Select(m => m.Id).ToList());
        return Ok(meals.Select(m => Shape(m, ingredients)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var meal = await db.Meals.FirstOrDefaultAsync(m => m.Id == id && m.DeletedAt == null);
        if (meal == null) return NotFound();
        var ingredients = await LoadIngredientsAsync([meal.Id]);
        return Ok(Shape(meal, ingredients));
    }

    [HttpPost]
    public async Task<IActionResult> Create(MealDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Le nom du repas est requis.");
        if (dto.TimeToCook <= 0) return BadRequest("Le temps de préparation doit être positif.");

        var meal = new Meal
        {
            Name = dto.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Type = dto.Type,
            TimeToCook = dto.TimeToCook,
        };
        db.Meals.Add(meal);
        await UpsertIngredientsAsync(meal.Id, dto.Ingredients);
        await db.SaveChangesAsync();

        var ingredients = await LoadIngredientsAsync([meal.Id]);
        return Ok(Shape(meal, ingredients));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, MealDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Le nom du repas est requis.");
        if (dto.TimeToCook <= 0) return BadRequest("Le temps de préparation doit être positif.");

        var meal = await db.Meals.FirstOrDefaultAsync(m => m.Id == id && m.DeletedAt == null);
        if (meal == null) return NotFound();

        meal.Name = dto.Name.Trim();
        meal.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        meal.Type = dto.Type;
        meal.TimeToCook = dto.TimeToCook;

        // Remplacement complet des lignes d'ingrédients (plus simple qu'un diff).
        var existing = await db.MealIngredients.Where(mi => mi.MealId == id).ToListAsync();
        db.MealIngredients.RemoveRange(existing);
        await UpsertIngredientsAsync(meal.Id, dto.Ingredients);
        await db.SaveChangesAsync();

        var ingredients = await LoadIngredientsAsync([meal.Id]);
        return Ok(Shape(meal, ingredients));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var meal = await db.Meals.FirstOrDefaultAsync(m => m.Id == id && m.DeletedAt == null);
        if (meal == null) return NotFound();
        meal.DeletedAt = DateTime.UtcNow; // soft delete : les plannings passés restent lisibles
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Crée les lignes d'ingrédients d'un repas, en réutilisant le catalogue global (nom en minuscules).</summary>
    private async Task UpsertIngredientsAsync(Guid mealId, List<IngredientLineDto>? lines)
    {
        if (lines == null) return;
        var seen = new HashSet<string>();
        foreach (var line in lines)
        {
            var name = (line.Name ?? "").Trim().ToLowerInvariant();
            if (name.Length == 0 || !seen.Add(name)) continue;

            var ingredient = await db.Ingredients.FirstOrDefaultAsync(i => i.Name == name)
                ?? db.Ingredients.Local.FirstOrDefault(i => i.Name == name);
            if (ingredient == null)
            {
                ingredient = new Ingredient { Name = name };
                db.Ingredients.Add(ingredient);
            }

            db.MealIngredients.Add(new MealIngredient
            {
                MealId = mealId,
                IngredientId = ingredient.Id,
                Quantity = line.Quantity,
                Unit = string.IsNullOrWhiteSpace(line.Unit) ? null : line.Unit.Trim(),
            });
        }
    }

    private async Task<ILookup<Guid, (string Name, decimal? Quantity, string? Unit)>> LoadIngredientsAsync(List<Guid> mealIds)
    {
        var rows = await db.MealIngredients
            .Where(mi => mealIds.Contains(mi.MealId))
            .Join(db.Ingredients, mi => mi.IngredientId, i => i.Id,
                (mi, i) => new { mi.MealId, i.Name, mi.Quantity, mi.Unit })
            .OrderBy(r => r.Name)
            .ToListAsync();
        return rows.ToLookup(r => r.MealId, r => (r.Name, r.Quantity, r.Unit));
    }

    private static object Shape(Meal m, ILookup<Guid, (string Name, decimal? Quantity, string? Unit)> ingredients) => new
    {
        m.Id,
        m.Name,
        m.Description,
        m.Type,
        m.TimeToCook,
        m.CreatedAt,
        Ingredients = ingredients[m.Id].Select(i => new { i.Name, i.Quantity, i.Unit }),
    };
}
