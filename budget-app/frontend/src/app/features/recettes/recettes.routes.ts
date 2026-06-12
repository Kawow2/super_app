import { Routes } from '@angular/router';
import { RecettesShellComponent } from './recettes-shell.component';

export const RECETTES_ROUTES: Routes = [
  {
    path: '',
    component: RecettesShellComponent,
    children: [
      { path: '', loadComponent: () => import('./planning.component').then(m => m.PlanningComponent) },
      { path: 'repas', loadComponent: () => import('./meals-list.component').then(m => m.MealsListComponent) },
      { path: 'repas/nouveau', loadComponent: () => import('./meal-form.component').then(m => m.MealFormComponent) },
      { path: 'repas/:id', loadComponent: () => import('./meal-form.component').then(m => m.MealFormComponent) },
      { path: 'courses', loadComponent: () => import('./shopping-list.component').then(m => m.ShoppingListComponent) },
    ],
  },
];
