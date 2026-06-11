import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'transactions', loadComponent: () => import('./features/transactions.component').then(m => m.TransactionsComponent) },
  { path: 'import', loadComponent: () => import('./features/import.component').then(m => m.ImportComponent) },
  { path: 'categories', loadComponent: () => import('./features/categories.component').then(m => m.CategoriesComponent) },
  { path: 'abonnements', loadComponent: () => import('./features/subscriptions.component').then(m => m.SubscriptionsComponent) },
  { path: 'comptes', loadComponent: () => import('./features/accounts.component').then(m => m.AccountsComponent) },
  { path: 'parametres', loadComponent: () => import('./features/settings.component').then(m => m.SettingsComponent) },
  { path: '**', redirectTo: '' },
];
