using BudgetApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IngredientsController(BudgetContext db) : ControllerBase
{
    /// <summary>Noms du catalogue global, pour l'autocomplétion du formulaire de repas.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var names = await db.Ingredients.OrderBy(i => i.Name).Select(i => i.Name).ToListAsync();
        return Ok(names);
    }
}
