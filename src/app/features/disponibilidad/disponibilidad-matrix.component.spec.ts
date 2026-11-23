import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Rol } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { DisponibilidadMatrixComponent } from './disponibilidad-matrix.component';

describe('DisponibilidadMatrixComponent', () => {
  let fixture: ComponentFixture<DisponibilidadMatrixComponent>;
  let component: DisponibilidadMatrixComponent;
  let http: HttpTestingController;

  async function montar(rol: Rol): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DisponibilidadMatrixComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { userRole: signal<Rol | null>(rol), hasRole: (roles: Rol[]) => roles.includes(rol) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DisponibilidadMatrixComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  const tutores = [
    { id: 7, nombreCompleto: 'Laura Vargas', promedioCalificacion: 0, totalEvaluaciones: 0 },
    { id: 9, nombreCompleto: 'Sebastián Quirós', promedioCalificacion: 0, totalEvaluaciones: 0 }
  ];

  it('coordinador: carga los tutores del backend y selecciona el primero sin IDs quemados', async () => {
    await montar('COORDINADOR');

    http.expectOne(r => r.url.endsWith('/api/sesiones/tutores')).flush(tutores);
    http.expectOne(r => r.url.endsWith('/api/disponibilidades/tutor/7')).flush([]);
    fixture.detectChanges();

    expect(component.coordinatorTutorId()).toBe(7);
    const select = fixture.nativeElement.querySelector('#coord-tutor-id') as HTMLSelectElement;
    expect(Array.from(select.options).map(o => o.textContent?.trim())).toEqual(['Laura Vargas', 'Sebastián Quirós']);
  });

  it('coordinador: recarga los bloques automáticamente al cambiar de tutor', async () => {
    await montar('COORDINADOR');
    http.expectOne(r => r.url.endsWith('/api/sesiones/tutores')).flush(tutores);
    http.expectOne(r => r.url.endsWith('/api/disponibilidades/tutor/7')).flush([]);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#coord-tutor-id') as HTMLSelectElement;
    select.value = '9';
    select.dispatchEvent(new Event('change'));

    http.expectOne(r => r.url.endsWith('/api/disponibilidades/tutor/9')).flush([
      { id: 3, tutorId: 9, tutorNombre: 'Sebastián Quirós', diaSemana: 'MONDAY', horaInicio: '08:00:00', horaFin: '10:00:00', activo: true }
    ]);

    expect(component.coordinatorTutorId()).toBe(9);
    expect(component.bloques().length).toBe(1);
  });

  it('coordinador: crea bloques para el tutor seleccionado', async () => {
    await montar('COORDINADOR');
    http.expectOne(r => r.url.endsWith('/api/sesiones/tutores')).flush(tutores);
    http.expectOne(r => r.url.endsWith('/api/disponibilidades/tutor/7')).flush([]);

    component.onCellClick('TUESDAY', 9);

    const req = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/disponibilidades'));
    expect(req.request.body).toEqual(expect.objectContaining({ tutorId: 7, diaSemana: 'TUESDAY', horaInicio: '09:00', horaFin: '10:00' }));
    req.flush({ id: 1, tutorId: 7, tutorNombre: 'Laura Vargas', diaSemana: 'TUESDAY', horaInicio: '09:00:00', horaFin: '10:00:00', activo: true });
  });

  it('coordinador: sin tutores registrados muestra un aviso y no crea bloques', async () => {
    await montar('COORDINADOR');
    http.expectOne(r => r.url.endsWith('/api/sesiones/tutores')).flush([]);
    fixture.detectChanges();

    component.onCellClick('MONDAY', 8);

    http.expectNone(r => r.method === 'POST');
    expect(fixture.nativeElement.textContent).toContain('No hay tutores registrados');
    expect(component.errorMessage()).toContain('Selecciona un tutor');
  });

  it('tutor: carga sus propios bloques sin pedir la lista de tutores', async () => {
    await montar('TUTOR');

    http.expectOne(r => r.url.endsWith('/api/disponibilidades/mias')).flush([]);
    http.expectNone(r => r.url.endsWith('/api/sesiones/tutores'));
    expect(fixture.nativeElement.querySelector('#coord-tutor-id')).toBeNull();
  });
});
