import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Disponibilidad, DisponibilidadRequest } from '../models/disponibilidad.models';

@Injectable({
  providedIn: 'root'
})
export class DisponibilidadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/disponibilidades';

  listarMias(): Observable<Disponibilidad[]> {
    return this.http.get<Disponibilidad[]>(`${this.apiUrl}/mias`);
  }

  listarPorTutor(tutorId: number, soloActivas = false): Observable<Disponibilidad[]> {
    const params = new HttpParams().set('soloActivas', String(soloActivas));
    return this.http.get<Disponibilidad[]>(`${this.apiUrl}/tutor/${tutorId}`, { params });
  }

  crear(request: DisponibilidadRequest): Observable<Disponibilidad> {
    return this.http.post<Disponibilidad>(this.apiUrl, request);
  }

  activar(id: number): Observable<Disponibilidad> {
    return this.http.put<Disponibilidad>(`${this.apiUrl}/${id}/activar`, {});
  }

  desactivar(id: number): Observable<Disponibilidad> {
    return this.http.put<Disponibilidad>(`${this.apiUrl}/${id}/desactivar`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
