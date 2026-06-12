using System.Text;
using BudgetApi.Data;
using Microsoft.EntityFrameworkCore;

Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<BudgetContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddControllers();

builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseCors();
app.MapControllers();

// Initialisation de la base : on attend que SQL Server soit prêt (utile au premier docker compose up).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BudgetContext>();
    var attempts = 0;
    while (true)
    {
        try
        {
            db.Database.EnsureCreated();
            HousingSchema.EnsureTables(db);
            RecettesSchema.EnsureTables(db);
            // Seed en dernier : il insère dans des tables créées par les EnsureTables ci-dessus.
            Seed.Run(db);
            Console.WriteLine("Base de données prête.");
            break;
        }
        catch (Exception ex) when (attempts++ < 40)
        {
            Console.WriteLine($"Base de données pas encore prête (tentative {attempts}) : {ex.Message}");
            Thread.Sleep(3000);
        }
    }
}

app.Run();
