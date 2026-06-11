using BudgetApi.Data;
using BudgetApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(BudgetContext db) : ControllerBase
{
    public record CategoryDto(string Name, string Color, string? Keywords);

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await db.Categories.OrderBy(c => c.Name).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create(CategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Le nom de la catégorie est requis.");
        var category = new Category { Name = dto.Name.Trim(), Color = dto.Color, Keywords = dto.Keywords };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return Ok(category);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, CategoryDto dto)
    {
        var category = await db.Categories.FindAsync(id);
        if (category == null) return NotFound();
        category.Name = dto.Name.Trim();
        category.Color = dto.Color;
        category.Keywords = dto.Keywords;
        await db.SaveChangesAsync();
        return Ok(category);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var category = await db.Categories.FindAsync(id);
        if (category == null) return NotFound();
        db.Categories.Remove(category); // les transactions repassent en "non catégorisé"
        await db.SaveChangesAsync();
        return NoContent();
    }
}
