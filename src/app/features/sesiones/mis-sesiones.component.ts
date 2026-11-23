import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Rol } from '../../core/models/auth.models';
import { AccionSesion, ESTADOS_SESION, EstadoSesion, Sesion } from '../../core/models/sesion.models';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { SesionService } from '../../core/services/sesion.service';
import { mensajeDeError } from '../../core/utils/mensaje-error.util';
import { formatearEnZonaApi, instanteDeApi } from '../../core/utils/zona-horaria.util';

export interface AccionVista {
  accion: AccionSesion;
  habilitada: boolean;
  motivoKey: string | null;
  motivoParams?: Record<string, string>;
}

const MENSAJE_POR_ACCION: Record<AccionSesion, string> = {
  aceptar: 'SESIONES.ACCEPTED_OK',
  rechazar: 'SESIONES.REJECTED_OK',
  cancelar: 'SESIONES.CANCELLED_OK',
  iniciar: 'SESIONES.STARTED_OK',
  finalizar: 'SESIONES.FINISHED_OK'
};

const REGLAS_POR_ROL: Record<Rol, string[]> = {
  ESTUDIANTE: ['SESIONES.RULE_CANCEL_REQUESTED', 'SESIONES.RULE_CANCEL_CONFIRMED', 'SESIONES.RULE_NO_CANCEL_IN_SESSION', 'SESIONES.RULE_TIMEZONE'],
  TUTOR: [
    'SESIONES.RULE_TUTOR_REQUESTED',
    'SESIONES.RULE_CANCEL_CONFIRMED',
    'SESIONES.RULE_START_WINDOW',
    'SESIONES.RULE_FINISH_WINDOW',
    'SESIONES.RULE_TIMEZONE'
  ],
  COORDINADOR: ['SESIONES.RULE_COORDINATOR_CANCEL', 'SESIONES.RULE_NO_CANCEL_IN_SESSION', 'SESIONES.RULE_TIMEZONE']
};

const INTERVALO_RELOJ_MS = 30_000;

@Component({
  selector: 'app-mis-sesiones',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './mis-sesiones.component.html',
  styleUrl: './mis-sesiones.component.css'
})
export class MisSesionesComponent implements OnInit {
  private readonly sesionService = inject(SesionService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly estados = ESTADOS_SESION;

  readonly sesiones = signal<Sesion[]>([]);
  readonly isLoading = signal(false);
  readonly procesandoId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly filtroEstado = signal<EstadoSesion | 'TODOS'>('TODOS');
  readonly ahora = signal(Date.now());

  readonly rol = computed(() => this.authService.userRole());
  readonly esEstudiante = computed(() => this.rol() === 'ESTUDIANTE');
  readonly reglas = computed(() => {
    const rol = this.rol();
    return rol ? REGLAS_POR_ROL[rol] : [];
  });

  readonly sesionesFiltradas = computed(() => {
    const filtro = this.filtroEstado();
    const lista = this.sesiones();
    return filtro === 'TODOS' ? lista : lista.filter(s => s.estado === filtro);
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarSesiones();
      const reloj = setInterval(() => this.ahora.set(Date.now()), INTERVALO_RELOJ_MS);
      this.destroyRef.onDestroy(() => clearInterval(reloj));
    }
  }

  cargarSesiones(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.ahora.set(Date.now());

    this.sesionService.listarMias().subscribe({
      next: data => {
        this.sesiones.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.sesiones.set([]);
        this.errorMessage.set(mensajeDeError(err, this.i18n));
      }
    });
  }

  onFiltroChange(event: Event): void {
    this.filtroEstado.set((event.target as HTMLSelectElement).value as EstadoSesion | 'TODOS');
  }

  accionesDisponibles(sesion: Sesion): AccionVista[] {
    const ahora = this.ahora();
    const inicio = instanteDeApi(sesion.fechaHora);
    const fin = instanteDeApi(sesion.fechaHoraFin);
    const yaInicio = ahora >= inicio;
    const aceptacion: AccionVista = yaInicio
      ? { accion: 'aceptar', habilitada: false, motivoKey: 'SESIONES.MOTIVO_PASADA' }
      : { accion: 'aceptar', habilitada: true, motivoKey: null };
    const cancelacion = (): AccionVista[] => {
      if (!sesion.cancelableHasta) {
        return [];
      }
      if (yaInicio) {
        return [{ accion: 'cancelar', habilitada: false, motivoKey: 'SESIONES.MOTIVO_PASADA' }];
      }
      return ahora <= instanteDeApi(sesion.cancelableHasta)
        ? [{ accion: 'cancelar', habilitada: true, motivoKey: null }]
        : [{ accion: 'cancelar', habilitada: false, motivoKey: 'SESIONES.MOTIVO_CANCELAR_TARDE' }];
    };

    switch (this.rol()) {
      case 'TUTOR':
        if (sesion.estado === 'REQUESTED') {
          return [aceptacion, { accion: 'rechazar', habilitada: true, motivoKey: null }];
        }
        if (sesion.estado === 'CONFIRMED') {
          return [this.ventanaInicio(sesion, ahora, fin), ...cancelacion()];
        }
        if (sesion.estado === 'IN_SESSION') {
          const desde = instanteDeApi(sesion.finalizableDesde);
          return [
            ahora >= desde
              ? { accion: 'finalizar', habilitada: true, motivoKey: null }
              : {
                  accion: 'finalizar',
                  habilitada: false,
                  motivoKey: 'SESIONES.MOTIVO_FINALIZAR_DESDE',
                  motivoParams: { hora: this.formatearHora(sesion.finalizableDesde) }
                }
          ];
        }
        return [];
      case 'ESTUDIANTE':
      case 'COORDINADOR':
        return cancelacion();
      default:
        return [];
    }
  }

  ejecutarAccion(sesion: Sesion, accion: AccionSesion): void {
    if (accion === 'cancelar' || accion === 'rechazar') {
      const confirmKey = accion === 'cancelar' ? 'SESIONES.CONFIRM_CANCEL' : 'SESIONES.CONFIRM_REJECT';
      const mensaje = this.i18n.translate(confirmKey, {
        materia: sesion.materiaCodigo,
        fecha: this.formatearFecha(sesion.fechaHora)
      });
      if (!confirm(mensaje)) {
        return;
      }
    }

    this.procesandoId.set(sesion.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.sesionService.ejecutarAccion(sesion.id, accion).subscribe({
      next: actualizada => {
        this.procesandoId.set(null);
        this.ahora.set(Date.now());
        this.sesiones.update(lista => lista.map(s => (s.id === actualizada.id ? actualizada : s)));
        if (accion === 'aceptar' && actualizada.estado === 'REJECTED') {
          this.errorMessage.set(this.i18n.translate('SESIONES.ACCEPT_OVERLAP'));
        } else {
          this.successMessage.set(this.i18n.translate(MENSAJE_POR_ACCION[accion]));
        }
      },
      error: err => {
        this.procesandoId.set(null);
        this.errorMessage.set(mensajeDeError(err, this.i18n));
      }
    });
  }

  contraparte(sesion: Sesion): string {
    return this.esEstudiante() ? sesion.tutorNombre : sesion.estudianteNombre;
  }

  etiquetaAccion(sesion: Sesion, accion: AccionSesion): string {
    return this.i18n.translate(`SESIONES.ACTION_ARIA_${accion.toUpperCase()}`, {
      materia: sesion.materiaCodigo,
      fecha: this.formatearFecha(sesion.fechaHora)
    });
  }

  formatearFecha(fechaIso: string): string {
    const instante = instanteDeApi(fechaIso);
    if (Number.isNaN(instante)) {
      return fechaIso;
    }
    return formatearEnZonaApi(instante, this.locale(), { dateStyle: 'medium', timeStyle: 'short' });
  }

  formatearHora(fechaIso: string): string {
    const instante = instanteDeApi(fechaIso);
    if (Number.isNaN(instante)) {
      return fechaIso;
    }
    return formatearEnZonaApi(instante, this.locale(), { timeStyle: 'short' });
  }

  private ventanaInicio(sesion: Sesion, ahora: number, fin: number): AccionVista {
    const desde = instanteDeApi(sesion.iniciableDesde);
    if (ahora < desde) {
      return {
        accion: 'iniciar',
        habilitada: false,
        motivoKey: 'SESIONES.MOTIVO_INICIAR_DESDE',
        motivoParams: { hora: this.formatearFecha(sesion.iniciableDesde) }
      };
    }
    if (ahora >= fin) {
      return { accion: 'iniciar', habilitada: false, motivoKey: 'SESIONES.MOTIVO_HORARIO_TERMINO' };
    }
    return { accion: 'iniciar', habilitada: true, motivoKey: null };
  }

  private locale(): string {
    return this.i18n.currentLang() === 'es' ? 'es-CR' : 'en-US';
  }
}
