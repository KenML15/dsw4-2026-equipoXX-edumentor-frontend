import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnInit, PLATFORM_ID, Signal, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DiaSemana, Disponibilidad } from '../../core/models/disponibilidad.models';
import { Materia } from '../../core/models/materia.models';
import {
  DURACIONES_SESION,
  MODALIDADES_SESION,
  ModalidadSesion,
  SesionRequest,
  TutorResumen
} from '../../core/models/sesion.models';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { DisponibilidadService } from '../../core/services/disponibilidad.service';
import { I18nService } from '../../core/services/i18n.service';
import { MateriaService } from '../../core/services/materia.service';
import { SesionService } from '../../core/services/sesion.service';
import { mensajeDeError } from '../../core/utils/mensaje-error.util';
import { fechaHoyEnZonaApi } from '../../core/utils/zona-horaria.util';
import { aHora, aMinutos, calcularHorasDisponibles, diaSemanaDeFecha, diasConDisponibilidad } from './horarios.util';
import {
  LARGO_MAXIMO_ENLACE,
  enlaceSegunModalidadValidator,
  fechaFuturaValidator,
  horaDisponibleValidator
} from './sesion.validators';

type CampoReserva = 'materiaId' | 'tutorId' | 'fecha' | 'hora' | 'duracionMinutos' | 'enlaceOUbicacion';

@Component({
  selector: 'app-reservar-sesion',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './reservar-sesion.component.html',
  styleUrl: './reservar-sesion.component.css'
})
export class ReservarSesionComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly sesionService = inject(SesionService);
  private readonly materiaService = inject(MateriaService);
  private readonly disponibilidadService = inject(DisponibilidadService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly duraciones = DURACIONES_SESION;
  readonly modalidades = MODALIDADES_SESION;
  readonly largoMaximoEnlace = LARGO_MAXIMO_ENLACE;
  readonly fechaMinima = fechaHoyEnZonaApi();

  readonly materias = signal<Materia[]>([]);
  readonly tutores = signal<TutorResumen[]>([]);
  readonly bloquesTutor = signal<Disponibilidad[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly reservaForm = this.fb.group(
    {
      materiaId: this.fb.control<number | null>(null, Validators.required),
      tutorId: this.fb.control<number | null>(null, Validators.required),
      fecha: ['', Validators.required],
      duracionMinutos: [60, [Validators.required, Validators.min(30), Validators.max(240)]],
      hora: ['', [Validators.required, horaDisponibleValidator((): string[] => this.horasDisponibles())]],
      modalidad: this.fb.control<ModalidadSesion>('VIRTUAL', Validators.required),
      enlaceOUbicacion: ['', enlaceSegunModalidadValidator]
    },
    { validators: fechaFuturaValidator }
  );

  private readonly tutorSeleccionado = toSignal(this.reservaForm.controls.tutorId.valueChanges, {
    initialValue: null
  });
  private readonly fechaSeleccionada = toSignal(this.reservaForm.controls.fecha.valueChanges, {
    initialValue: ''
  });
  private readonly duracionSeleccionada = toSignal(this.reservaForm.controls.duracionMinutos.valueChanges, {
    initialValue: 60
  });
  readonly modalidadSeleccionada = toSignal(this.reservaForm.controls.modalidad.valueChanges, {
    initialValue: 'VIRTUAL' as ModalidadSesion
  });

  readonly horasDisponibles: Signal<string[]> = computed(() =>
    calcularHorasDisponibles(
      this.bloquesTutor(),
      this.fechaSeleccionada(),
      Number(this.duracionSeleccionada())
    )
  );

  readonly diasDelTutor = computed<DiaSemana[]>(() => diasConDisponibilidad(this.bloquesTutor()));

  readonly diaSeleccionadoSinBloques = computed(() => {
    const fecha = this.fechaSeleccionada();
    const dia = fecha ? diaSemanaDeFecha(fecha) : null;
    return this.tutorSeleccionado() !== null && dia !== null && !this.diasDelTutor().includes(dia);
  });

  readonly placeholderHora = computed(() => {
    if (this.tutorSeleccionado() === null || !this.fechaSeleccionada()) {
      return 'SESIONES.SELECT_TUTOR_FECHA';
    }
    return this.horasDisponibles().length === 0 ? 'SESIONES.NO_SLOTS' : 'SESIONES.SELECT_HORA';
  });

  constructor() {
    this.reservaForm.controls.enlaceOUbicacion.updateValueAndValidity();

    effect(() => {
      const disponibles = this.horasDisponibles();
      const control = this.reservaForm.controls.hora;
      if (control.value && !disponibles.includes(control.value)) {
        control.setValue('');
      }
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.reservaForm.controls.tutorId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(tutorId => this.cargarBloquesTutor(tutorId));

    this.reservaForm.controls.modalidad.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reservaForm.controls.enlaceOUbicacion.updateValueAndValidity());

    if (isPlatformBrowser(this.platformId)) {
      this.cargarCatalogos();
    }
  }

  cargarCatalogos(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.materiaService.listar(true).subscribe({
      next: data => this.materias.set(data),
      error: err => this.errorMessage.set(mensajeDeError(err, this.i18n))
    });

    this.sesionService.listarTutores().subscribe({
      next: data => {
        this.tutores.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(mensajeDeError(err, this.i18n));
      }
    });
  }

  onSubmit(): void {
    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      return;
    }

    const raw = this.reservaForm.getRawValue();
    const enlace = raw.enlaceOUbicacion.trim();
    const payload: SesionRequest = {
      tutorId: Number(raw.tutorId),
      materiaId: Number(raw.materiaId),
      fechaHora: `${raw.fecha}T${raw.hora}:00`,
      duracionMinutos: Number(raw.duracionMinutos),
      modalidad: raw.modalidad,
      enlaceOUbicacion: enlace ? enlace : null
    };

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.sesionService.solicitar(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set(this.i18n.translate('SESIONES.RESERVA_OK'));
        this.reservaForm.reset({
          materiaId: null,
          tutorId: null,
          fecha: '',
          duracionMinutos: 60,
          hora: '',
          modalidad: 'VIRTUAL',
          enlaceOUbicacion: ''
        });
      },
      error: err => {
        this.isSubmitting.set(false);
        this.errorMessage.set(mensajeDeError(err, this.i18n));
      }
    });
  }

  mostrarError(control: CampoReserva): boolean {
    const c = this.reservaForm.controls[control];
    return c.invalid && c.touched;
  }

  errorEnlaceKey(): string {
    const errores = this.reservaForm.controls.enlaceOUbicacion.errors ?? {};
    if (errores['enlaceRequerido']) return 'SESIONES.ERR_ENLACE_REQUIRED';
    if (errores['enlaceInvalido']) return 'SESIONES.ERR_ENLACE_INVALID';
    if (errores['ubicacionRequerida']) return 'SESIONES.ERR_UBICACION_REQUIRED';
    return 'SESIONES.ERR_ENLACE_LENGTH';
  }

  errorHoraKey(): string {
    return this.reservaForm.controls.hora.hasError('horaNoDisponible')
      ? 'SESIONES.ERR_HORA_NO_DISPONIBLE'
      : 'SESIONES.ERR_HORA_REQUIRED';
  }

  mostrarErrorFechaPasada(): boolean {
    const { fecha, hora } = this.reservaForm.controls;
    return this.reservaForm.hasError('fechaPasada') && (fecha.touched || hora.touched);
  }

  nombresDiasDelTutor(): string {
    return this.diasDelTutor()
      .map(dia => this.i18n.translate(`DAYS.${dia}`))
      .join(', ');
  }

  horaFin(hora: string): string {
    return aHora(aMinutos(hora) + Number(this.duracionSeleccionada()));
  }

  formatearHora(hora: string): string {
    return hora.slice(0, 5);
  }

  private cargarBloquesTutor(tutorId: number | null): void {
    this.bloquesTutor.set([]);
    if (tutorId === null || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.disponibilidadService.listarPorTutor(Number(tutorId), true).subscribe({
      next: data => this.bloquesTutor.set(data),
      error: () => this.bloquesTutor.set([])
    });
  }
}
