import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

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
    path: 'disponibilidad',
    canActivate: [roleGuard],
    data: { roles: ['TUTOR', 'COORDINADOR'] },
    loadComponent: () =>
      import('./features/disponibilidad/disponibilidad-matrix.component').then(
        m => m.DisponibilidadMatrixComponent
      )
  },
  {
    path: 'sesiones/reservar',
    canActivate: [roleGuard],
    data: { roles: ['ESTUDIANTE'] },
    loadComponent: () =>
      import('./features/sesiones/reservar-sesion.component').then(m => m.ReservarSesionComponent)
  },
  {
    path: 'sesiones',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/sesiones/mis-sesiones.component').then(m => m.MisSesionesComponent)
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
