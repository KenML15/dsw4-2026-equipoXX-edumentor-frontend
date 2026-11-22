import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Materia, MateriaRequest } from '../models/materia.models';

@Injectable({
  providedIn: 'root'
})
export class MateriaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/materias';

  listar(soloActivas = false): Observable<Materia[]> {
    const params = new HttpParams().set('soloActivas', String(soloActivas));
    return this.http.get<Materia[]>(this.apiUrl, { params });
  }

  obtenerPorId(id: number): Observable<Materia> {
    return this.http.get<Materia>(`${this.apiUrl}/${id}`);
  }

  crear(request: MateriaRequest): Observable<Materia> {
    return this.http.post<Materia>(this.apiUrl, request);
  }

  actualizar(id: number, request: MateriaRequest): Observable<Materia> {
    return this.http.put<Materia>(`${this.apiUrl}/${id}`, request);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
