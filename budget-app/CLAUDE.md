# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal budget app for local use (no authentication, by design). Three sub-apps live in one codebase: **budget** (accounts, transactions, bank-statement import, subscriptions), **immobilier** (housing projects, loans, amortization schedules), and **recettes** (meal planning). UI text, code comments, and commit messages are in **French**.

Stack: Angular 19 (standalone components, signals) + PrimeNG + Chart.js frontend, ASP.NET Core 8 Web API + EF Core backend, SQL Server 2022, all orchestrated with Docker Compose.

## Commands

```bash
# Full stack (web on :4200, api on :5000, db on :1433)
docker compose up --build -d

# Dev without Docker: start only the database, then run each app locally
docker compose up -d db
cd backend && dotnet run            # API on http://localhost:5000
cd frontend && npm start            # ng serve with proxy.conf.json routing /api → :5000

# Builds
cd backend && dotnet build
cd frontend && npm run build        # ng build --configuration production
```

There are no tests and no linter configured in this repo.

The SQL Server SA password (`Budget@pp2026!`) is defined in `docker-compose.yml` in **two places** (db service env var and api connection string) — change both or neither.

## Database schema: no EF migrations

The project deliberately does not use EF migrations. The schema is created by `Database.EnsureCreated()` on first startup (`backend/Program.cs`), which does **nothing** on existing databases. Tables added after the initial release must therefore also be created by an idempotent raw-SQL `EnsureTables` method in `backend/Data/` (see `HousingSchema.cs`, `RecettesSchema.cs` as templates: `IF OBJECT_ID(...) IS NULL CREATE TABLE ...`). The SQL must replicate exactly what EF conventions would generate (Guid → uniqueidentifier, DateOnly → date, enum → int, decimal precision as configured in `BudgetContext.OnModelCreating`). `Seed.Run` executes last because it inserts into tables created by the `EnsureTables` calls. When adding an entity: model in `Models/`, DbSet + configuration in `BudgetContext`, matching SQL in a schema file, and register the `EnsureTables` call in `Program.cs` before `Seed.Run`.

## Architecture

### Backend (`backend/`)
- One controller per resource in `Controllers/`; entities grouped by sub-app in `Models/` (`Models.cs` = budget, `Housing.cs`, `Recettes.cs`).
- `Services/ImportParser.cs` parses bank statements (CSV with auto-detected separator/encoding, XLSX, best-effort PDF) by matching column headers, not column order.
- Duplicate detection: every transaction gets a SHA-256 fingerprint of `account + date + amount + normalized label` (`Services/Util.cs`); imports skip rows whose hash already exists in DB or earlier in the same file.
- `Services/AmortizationService.cs` computes loan schedules for the immobilier app. Loans can reference a base loan (scenario comparison); that self-reference uses `ClientSetNull`, so related scenarios must be nullified manually before deleting a loan.
- Meals use soft delete (`DeletedAt`), never physical deletion.

### Frontend (`frontend/src/app/`)
- `app.routes.ts` lazy-loads one route file per sub-app: `features/{budget,immobilier,recettes}/`, each with its own shell component. Old pre-multi-app URLs redirect into `budget/`.
- `core/` holds models and injectable services, split by sub-app (`services.ts` = budget, `housing.service.ts`, `recettes.service.ts`). Services own signal-based state (`signal<T[]>`) and call the API via `HttpClient` against the relative path `/api`; components read those signals.
- `shared/` has the reactive Chart.js wrapper (`chart.component.ts`) and the top nav.
- PrimeNG with the Aura preset, **light mode only** (`darkModeSelector: false`); the accent color is a user setting applied via `updatePrimaryPalette` and the `--accent` CSS variable (`SettingsService`). Locale is `fr`.
