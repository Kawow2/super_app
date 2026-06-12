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

## Database schema: EF migrations

The schema is managed by EF Core migrations (`backend/Migrations/`), applied automatically at startup by `Database.Migrate()` (`backend/Program.cs`). When adding or changing an entity: model in `Models/`, DbSet + configuration in `BudgetContext`, then generate the migration:

```bash
cd backend && dotnet ef migrations add <Name>   # applied automatically at next startup
```

Never edit the database schema by hand or via raw SQL — always go through a migration. `Seed.Run` executes after `Migrate()`.

Legacy note: databases created before migrations existed (via `EnsureCreated()`) have no `__EFMigrationsHistory` table. `MigrationBaseline.StampIfLegacy` (`backend/Data/`) detects them at startup, brings them up to the initial schema via the idempotent `HousingSchema`/`RecettesSchema` SQL, and stamps `InitialCreate` as applied so `Migrate()` doesn't try to recreate existing tables. Those two schema files exist only for this baseline path — never add new tables to them.

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
