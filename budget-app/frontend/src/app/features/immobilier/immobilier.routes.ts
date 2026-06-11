import { Routes } from '@angular/router';
import { ImmobilierShellComponent } from './immobilier-shell.component';

export const IMMOBILIER_ROUTES: Routes = [
  {
    path: '',
    component: ImmobilierShellComponent,
    children: [
      { path: '', loadComponent: () => import('./projects-list.component').then(m => m.ProjectsListComponent) },
      { path: 'projets/:id', loadComponent: () => import('./project-detail.component').then(m => m.ProjectDetailComponent) },
    ],
  },
];
