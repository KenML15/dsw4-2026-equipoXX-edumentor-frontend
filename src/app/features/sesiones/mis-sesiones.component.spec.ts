import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Rol } from '../../core/models/auth.models';
import { EstadoSesion, Sesion } from '../../core/models/sesion.models';
import { AuthService } from '../../core/services/auth.service';
import { MisSesionesComponent } from './mis-sesiones.component';

const MINUTO = 60_000;

const DESFASE_COSTA_RICA_MS = 6 * 60 * MINUTO;

function iso(ms: number): string {
  return new Date(ms - DESFASE_COSTA_RICA_MS).toISOString().slice(0, 19);
}

function sesion(
  id: number,
  estado: EstadoSesion,
  minutosHastaInicio: number,
  cancelablePara: 'participante' | 'coordinador' | 'ninguno' = 'participante'
): Sesion {
  const inicio = Date.now() + minutosHastaInicio * MINUTO;
  const fin = inicio + 60 * MINUTO;
  const abierta = estado === 'REQUESTED' || estado === 'CONFIRMED';
  let cancelableHasta: string | null = null;
  if (abierta && cancelablePara === 'coordinador') {
    cancelableHasta = iso(inicio);
  } else if (abierta && cancelablePara === 'participante') {
    cancelableHasta = estado === 'REQUESTED' ? iso(inicio) : iso(inicio - 120 * MINUTO);
  }
  return {
    id,
    estudianteId: 1,
    estudianteNombre: 'Kenneth Miranda',
    tutorId: 2,
    tutorNombre: 'Sebastián Quirós',
    materiaId: 1,
    materiaCodigo: 'IF0009',
    materiaNombre: 'Desarrollo de Software IV',
    fechaHora: iso(inicio),
    fechaHoraFin: iso(fin),
    duracionMinutos: 60,
    modalidad: 'PRESENCIAL',
    estado,
    enlaceOUbicacion: 'Aula 201',
    fechaCreacion: iso(Date.now() - 86_400_000),
    iniciableDesde: iso(inicio - 15 * MINUTO),
    finalizableDesde: iso(fin - 15 * MINUTO),
    cancelableHasta
  };
}

describe('MisSesionesComponent', () => {
  let fixture: ComponentFixture<MisSesionesComponent>;
  let component: MisSesionesComponent;
  let http: HttpTestingController;

  async function montar(rol: Rol, sesiones: Sesion[]): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [MisSesionesComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { userRole: signal<Rol | null>(rol), hasRole: (roles: Rol[]) => roles.includes(rol) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MisSesionesComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/api/sesiones/mias')).flush(sesiones);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  function boton(id: number, accion: string): HTMLButtonElement | null {
    const tarjetas = Array.from(fixture.nativeElement.querySelectorAll('.sesion-item')) as HTMLElement[];
    const tarjeta = tarjetas.find(t => t.querySelector(`[id="sesion-titulo-${id}"]`));
    return tarjeta?.querySelector(`button[data-accion="${accion}"]`) ?? null;
  }

  it('tutor: aceptar y rechazar en solicitudes pendientes, sin cancelar', async () => {
    await montar('TUTOR', [sesion(1, 'REQUESTED', 3 * 24 * 60)]);

    expect(boton(1, 'aceptar')?.disabled).toBe(false);
    expect(boton(1, 'rechazar')?.disabled).toBe(false);
    expect(boton(1, 'cancelar')).toBeNull();
  });

  it('tutor: no puede iniciar una sesión confirmada para dentro de varios días y ve el motivo', async () => {
    await montar('TUTOR', [sesion(2, 'CONFIRMED', 3 * 24 * 60)]);

    const iniciar = boton(2, 'iniciar');
    expect(iniciar?.disabled).toBe(true);
    const motivo = fixture.nativeElement.querySelector(`#${iniciar?.getAttribute('aria-describedby')}`);
    expect(motivo?.textContent).toContain('Podrás iniciarla');
    expect(boton(2, 'cancelar')?.disabled).toBe(false);
  });

  it('tutor: puede iniciar dentro de la tolerancia pero ya no cancelar', async () => {
    await montar('TUTOR', [sesion(3, 'CONFIRMED', 10)]);

    expect(boton(3, 'iniciar')?.disabled).toBe(false);
    expect(boton(3, 'cancelar')?.disabled).toBe(true);
  });

  it('tutor: no puede iniciar después del horario de la sesión', async () => {
    await montar('TUTOR', [sesion(4, 'CONFIRMED', -90)]);

    const acciones = component.accionesDisponibles(component.sesiones()[0]);
    expect(acciones.find(a => a.accion === 'iniciar')).toEqual(
      expect.objectContaining({ habilitada: false, motivoKey: 'SESIONES.MOTIVO_HORARIO_TERMINO' })
    );
  });

  it('tutor: no puede finalizar justo después de iniciar', async () => {
    await montar('TUTOR', [sesion(5, 'IN_SESSION', -5), sesion(6, 'IN_SESSION', -50)]);

    expect(boton(5, 'finalizar')?.disabled).toBe(true);
    expect(boton(6, 'finalizar')?.disabled).toBe(false);
  });

  it('estudiante: cancela solicitudes pendientes aunque falten menos de 2 horas', async () => {
    await montar('ESTUDIANTE', [sesion(7, 'REQUESTED', 30), sesion(8, 'CONFIRMED', 60), sesion(9, 'COMPLETED', -200)]);

    expect(boton(7, 'cancelar')?.disabled).toBe(false);
    expect(boton(8, 'cancelar')?.disabled).toBe(true);
    expect(boton(9, 'cancelar')).toBeNull();
    expect(boton(7, 'aceptar')).toBeNull();
  });

  it('coordinador: puede cancelar sesiones confirmadas que no han comenzado', async () => {
    await montar('COORDINADOR', [sesion(10, 'CONFIRMED', 30, 'coordinador'), sesion(11, 'IN_SESSION', -10, 'coordinador')]);

    expect(boton(10, 'cancelar')?.disabled).toBe(false);
    expect(boton(11, 'cancelar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.reglas-panel')?.textContent).toContain('coordinador');
  });

  it('sin cancelableHasta del backend no muestra el botón de cancelar', async () => {
    await montar('TUTOR', [sesion(15, 'CONFIRMED', 3 * 24 * 60, 'ninguno')]);

    expect(boton(15, 'cancelar')).toBeNull();
    expect(boton(15, 'iniciar')).not.toBeNull();
  });

  it('muestra las fechas en hora de Costa Rica', async () => {
    const fija = { ...sesion(16, 'COMPLETED', -200), fechaHora: '2026-11-30T08:00:00', fechaHoraFin: '2026-11-30T09:00:00' };
    await montar('ESTUDIANTE', [fija]);

    expect(component.formatearHora(fija.fechaHora)).toMatch(/^8:00/);
  });

  it('traduce el error del backend por su código', async () => {
    const original = sesion(17, 'CONFIRMED', 3 * 24 * 60);
    await montar('TUTOR', [original]);

    component.ejecutarAccion(original, 'iniciar');
    http.expectOne(r => r.url.endsWith('/api/sesiones/17/iniciar')).flush(
      { status: 400, codigo: 'INICIO_ANTICIPADO', detail: 'texto', parametros: { desde: original.iniciableDesde } },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.errorMessage()).toContain('todavía no puede iniciarse');
  });

  it('cancela tras confirmar y actualiza la tarjeta', async () => {
    const original = sesion(12, 'CONFIRMED', 3 * 24 * 60);
    await montar('ESTUDIANTE', [original]);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);

    boton(12, 'cancelar')?.click();
    const req = http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/api/sesiones/12/cancelar'));
    req.flush({ ...original, estado: 'CANCELLED', cancelableHasta: null });
    fixture.detectChanges();

    expect(confirmar).toHaveBeenCalled();
    expect(component.sesiones()[0].estado).toBe('CANCELLED');
    expect(component.successMessage()).toContain('cancelada');
    expect(boton(12, 'cancelar')).toBeNull();
    confirmar.mockRestore();
  });

  it('no cancela si el usuario no confirma', async () => {
    await montar('ESTUDIANTE', [sesion(13, 'CONFIRMED', 3 * 24 * 60)]);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);

    boton(13, 'cancelar')?.click();

    http.expectNone(r => r.method === 'PUT');
    confirmar.mockRestore();
  });

  it('informa cuando aceptar termina en rechazo por traslape', async () => {
    const original = sesion(14, 'REQUESTED', 3 * 24 * 60);
    await montar('TUTOR', [original]);

    boton(14, 'aceptar')?.click();
    http.expectOne(r => r.url.endsWith('/api/sesiones/14/aceptar')).flush({ ...original, estado: 'REJECTED' });

    expect(component.errorMessage()).toContain('traslapa');
  });
});
