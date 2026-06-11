import { Routes } from '@angular/router';

export const RECETTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../shared/coming-soon.component').then(m => m.ComingSoonComponent),
    data: { appName: 'Recettes', icon: '🍳' },
  },
];
