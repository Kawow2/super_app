import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'budget' },

  { path: 'budget', loadChildren: () => import('./features/budget/budget.routes').then(m => m.BUDGET_ROUTES) },
  { path: 'recettes', loadChildren: () => import('./features/recettes/recettes.routes').then(m => m.RECETTES_ROUTES) },
  { path: 'maison', loadChildren: () => import('./features/maison/maison.routes').then(m => m.MAISON_ROUTES) },

  // Redirections des anciennes URLs (avant la structure multi-app).
  { path: 'transactions', redirectTo: 'budget/transactions' },
  { path: 'import', redirectTo: 'budget/import' },
  { path: 'categories', redirectTo: 'budget/categories' },
  { path: 'abonnements', redirectTo: 'budget/abonnements' },
  { path: 'comptes', redirectTo: 'budget/comptes' },
  { path: 'parametres', redirectTo: 'budget/parametres' },

  { path: '**', redirectTo: 'budget' },
];
