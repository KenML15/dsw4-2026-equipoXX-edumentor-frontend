import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AccionSesion, Sesion, SesionRequest, TutorResumen } from '../models/sesion.models';

@Injectable({
  providedIn: 'root'
})
export class SesionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/sesiones';

  solicitar(request: SesionRequest): Observable<Sesion> {
    return this.http.post<Sesion>(this.apiUrl, request);
  }

  listarMias(): Observable<Sesion[]> {
    return this.http.get<Sesion[]>(`${this.apiUrl}/mias`);
  }

  obtenerPorId(id: number): Observable<Sesion> {
    return this.http.get<Sesion>(`${this.apiUrl}/${id}`);
  }

  listarTutores(): Observable<TutorResumen[]> {
    return this.http.get<TutorResumen[]>(`${this.apiUrl}/tutores`);
  }

  ejecutarAccion(id: number, accion: AccionSesion): Observable<Sesion> {
    return this.http.put<Sesion>(`${this.apiUrl}/${id}/${accion}`, {});
  }
}
