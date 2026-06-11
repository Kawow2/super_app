import { Routes } from '@angular/router';
import { BudgetShellComponent } from './budget-shell.component';

export const BUDGET_ROUTES: Routes = [
  {
    path: '',
    component: BudgetShellComponent,
    children: [
      { path: '', loadComponent: () => import('./dashboard.component').then(m => m.DashboardComponent) },
      { path: 'transactions', loadComponent: () => import('./transactions.component').then(m => m.TransactionsComponent) },
      { path: 'import', loadComponent: () => import('./import.component').then(m => m.ImportComponent) },
      { path: 'categories', loadComponent: () => import('./categories.component').then(m => m.CategoriesComponent) },
      { path: 'abonnements', loadComponent: () => import('./subscriptions.component').then(m => m.SubscriptionsComponent) },
      { path: 'comptes', loadComponent: () => import('./accounts.component').then(m => m.AccountsComponent) },
      { path: 'parametres', loadComponent: () => import('./settings.component').then(m => m.SettingsComponent) },
    ],
  },
];
