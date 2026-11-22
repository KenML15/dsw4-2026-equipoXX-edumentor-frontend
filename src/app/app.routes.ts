import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'materias',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/materias/materias-catalog.component').then(m => m.MateriasCatalogComponent)
  },
  {
    path: '',
    redirectTo: 'materias',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'materias'
  }
];
