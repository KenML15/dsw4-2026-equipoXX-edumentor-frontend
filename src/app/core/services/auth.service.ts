import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, Rol, Usuario } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly apiUrl = 'http://localhost:8080/api';
  private readonly tokenKey = 'edumentor_token';
  private readonly userKey = 'edumentor_user';

  private readonly currentUserSignal = signal<Usuario | null>(this.loadStoredUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.getToken() && !!this.currentUserSignal());
  readonly userRole = computed<Rol | null>(() => this.currentUserSignal()?.rol ?? this.extractRoleFromToken());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  getMe(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/usuarios/me`).pipe(
      tap(usuario => {
        if (this.isBrowser) {
          localStorage.setItem(this.userKey, JSON.stringify(usuario));
        }
        this.currentUserSignal.set(usuario);
      })
    );
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  hasRole(allowedRoles: Rol[]): boolean {
    const role = this.userRole();
    return role !== null && allowedRoles.includes(role);
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem(this.tokenKey, response.token);
      localStorage.setItem(this.userKey, JSON.stringify(response.usuario));
    }
    this.currentUserSignal.set(response.usuario);
  }

  private loadStoredUser(): Usuario | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  }

  private extractRoleFromToken(): Rol | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.rol as Rol) ?? null;
    } catch {
      return null;
    }
  }
}