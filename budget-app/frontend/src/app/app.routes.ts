import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'budget' },

  { path: 'budget', loadChildren: () => import('./features/budget/budget.routes').then(m => m.BUDGET_ROUTES) },
  { path: 'immobilier', loadChildren: () => import('./features/immobilier/immobilier.routes').then(m => m.IMMOBILIER_ROUTES) },
  { path: 'recettes', loadChildren: () => import('./features/recettes/recettes.routes').then(m => m.RECETTES_ROUTES) },
  { path: 'maison', redirectTo: 'immobilier' },

  // Redirections des anciennes URLs (avant la structure multi-app).
  { path: 'transactions', redirectTo: 'budget/transactions' },
  { path: 'import', redirectTo: 'budget/import' },
  { path: 'categories', redirectTo: 'budget/categories' },
  { path: 'abonnements', redirectTo: 'budget/abonnements' },
  { path: 'comptes', redirectTo: 'budget/comptes' },
  { path: 'parametres', redirectTo: 'budget/parametres' },

  { path: '**', redirectTo: 'budget' },
];
