import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { ReservarSesionComponent } from './reservar-sesion.component';

function proximoLunes(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 7);
  while (fecha.getDay() !== 1) {
    fecha.setDate(fecha.getDate() + 1);
  }
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

describe('ReservarSesionComponent', () => {
  let fixture: ComponentFixture<ReservarSesionComponent>;
  let component: ReservarSesionComponent;
  let http: HttpTestingController;
  const lunes = proximoLunes();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservarSesionComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservarSesionComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne(r => r.url.endsWith('/api/materias')).flush([
      { id: 1, codigo: 'IF0009', nombre: 'Desarrollo de Software IV', descripcion: null, creditos: 4, activa: true }
    ]);
    http.expectOne(r => r.url.endsWith('/api/sesiones/tutores')).flush([
      { id: 2, nombreCompleto: 'Sebastián Quirós', promedioCalificacion: 0, totalEvaluaciones: 0 }
    ]);
  });

  afterEach(() => http.verify());

  function elegirTutorConBloqueLunes(): void {
    component.reservaForm.controls.tutorId.setValue(2);
    http.expectOne(r => r.url.endsWith('/api/disponibilidades/tutor/2')).flush([
      { id: 1, tutorId: 2, tutorNombre: 'Sebastián Quirós', diaSemana: 'MONDAY', horaInicio: '08:00:00', horaFin: '10:00:00', activo: true }
    ]);
    component.reservaForm.controls.fecha.setValue(lunes);
    TestBed.tick();
    fixture.detectChanges();
  }

  function opcionesDeHora(): string[] {
    const select = fixture.nativeElement.querySelector('#reserva-hora') as HTMLSelectElement;
    return Array.from(select.options).filter(o => !o.disabled).map(o => o.value);
  }

  it('solo ofrece horas dentro del bloque del tutor', () => {
    elegirTutorConBloqueLunes();

    expect(component.horasDisponibles()).toEqual(['08:00', '08:30', '09:00']);
    expect(opcionesDeHora()).toEqual(['08:00', '08:30', '09:00']);
  });

  it('recalcula las horas al cambiar la duración y limpia una hora que ya no cabe', () => {
    elegirTutorConBloqueLunes();
    component.reservaForm.controls.hora.setValue('09:00');

    component.reservaForm.controls.duracionMinutos.setValue(120);
    TestBed.tick();
    fixture.detectChanges();

    expect(opcionesDeHora()).toEqual(['08:00']);
    expect(component.reservaForm.controls.hora.value).toBe('');
  });

  it('rechaza una hora escrita que no pertenece a un bloque', () => {
    elegirTutorConBloqueLunes();

    component.reservaForm.controls.hora.setValue('11:00');

    expect(component.reservaForm.controls.hora.hasError('horaNoDisponible')).toBe(true);
  });

  it('avisa cuando el tutor no atiende el día elegido', () => {
    elegirTutorConBloqueLunes();
    const [anio, mes, dia] = lunes.split('-').map(Number);
    const martes = new Date(anio, mes - 1, dia + 1);
    component.reservaForm.controls.fecha.setValue(
      `${martes.getFullYear()}-${String(martes.getMonth() + 1).padStart(2, '0')}-${String(martes.getDate()).padStart(2, '0')}`
    );
    TestBed.tick();
    fixture.detectChanges();

    expect(component.diaSeleccionadoSinBloques()).toBe(true);
    expect(opcionesDeHora()).toEqual([]);
    expect(fixture.nativeElement.querySelector('#reserva-fecha-hint')?.textContent).toContain('Lunes');
  });

  it('desde el inicio exige enlace porque la modalidad por defecto es virtual', () => {
    expect(component.reservaForm.controls.enlaceOUbicacion.hasError('enlaceRequerido')).toBe(true);
  });

  it('valida el enlace según la modalidad y muestra el mensaje específico', () => {
    const enlace = component.reservaForm.controls.enlaceOUbicacion;

    enlace.setValue('http://meet.google.com/abc');
    enlace.markAsTouched();
    fixture.detectChanges();
    expect(enlace.hasError('enlaceInvalido')).toBe(true);
    expect(fixture.nativeElement.querySelector('#reserva-enlace-error')?.textContent).toContain('https://');

    component.reservaForm.controls.modalidad.setValue('PRESENCIAL');
    enlace.setValue('');
    fixture.detectChanges();
    expect(enlace.hasError('ubicacionRequerida')).toBe(true);

    enlace.setValue('Aula 201');
    expect(enlace.valid).toBe(true);
  });

  it('no envía el formulario si está incompleto', () => {
    component.onSubmit();
    fixture.detectChanges();

    http.expectNone(r => r.method === 'POST');
    expect(fixture.nativeElement.querySelector('#reserva-materia-error')).not.toBeNull();
  });

  it('envía la solicitud con fecha y hora combinadas', () => {
    elegirTutorConBloqueLunes();
    component.reservaForm.patchValue({
      materiaId: 1,
      hora: '08:30',
      modalidad: 'VIRTUAL',
      enlaceOUbicacion: ' https://meet.google.com/abc-defg-hij '
    });

    component.onSubmit();

    const req = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/sesiones'));
    expect(req.request.body).toEqual({
      tutorId: 2,
      materiaId: 1,
      fechaHora: `${lunes}T08:30:00`,
      duracionMinutos: 60,
      modalidad: 'VIRTUAL',
      enlaceOUbicacion: 'https://meet.google.com/abc-defg-hij'
    });
    req.flush({});
    expect(component.successMessage()).toContain('Solicitud enviada');
  });

  it('ofrece duraciones de 30 a 240 minutos en pasos de 30', () => {
    const select = fixture.nativeElement.querySelector('#reserva-duracion') as HTMLSelectElement;
    expect(Array.from(select.options).map(o => o.textContent?.trim())).toEqual(
      [30, 60, 90, 120, 150, 180, 210, 240].map(m => `${m} minutos`)
    );
  });

  it('muestra el error del backend traducido por código en inglés', () => {
    TestBed.inject(I18nService).setLanguage('en');
    elegirTutorConBloqueLunes();
    component.reservaForm.patchValue({ materiaId: 1, hora: '08:00', modalidad: 'PRESENCIAL', enlaceOUbicacion: 'Aula 201' });

    component.onSubmit();
    http.expectOne(r => r.method === 'POST').flush(
      { status: 400, codigo: 'TRASLAPE_TUTOR', detail: 'El tutor ya tiene una sesión confirmada que se traslapa con ese horario' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.errorMessage()).toBe('The tutor already has a confirmed session overlapping that time.');
    TestBed.inject(I18nService).setLanguage('es');
  });

  it('muestra el detalle del error del backend', () => {
    elegirTutorConBloqueLunes();
    component.reservaForm.patchValue({ materiaId: 1, hora: '08:00', modalidad: 'PRESENCIAL', enlaceOUbicacion: 'Aula 201' });

    component.onSubmit();
    http.expectOne(r => r.method === 'POST').flush(
      { status: 400, detail: 'El tutor ya tiene una sesión confirmada que se traslapa con ese horario' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.errorMessage()).toContain('traslapa');
  });
});
