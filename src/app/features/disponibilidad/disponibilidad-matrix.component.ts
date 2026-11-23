import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  DIAS_SEMANA,
  DiaSemana,
  Disponibilidad,
  DisponibilidadRequest
} from '../../core/models/disponibilidad.models';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { AuthService } from '../../core/services/auth.service';
import { DisponibilidadService } from '../../core/services/disponibilidad.service';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-disponibilidad-matrix',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './disponibilidad-matrix.component.html',
  styleUrl: './disponibilidad-matrix.component.css'
})
export class DisponibilidadMatrixComponent implements OnInit {
  private readonly disponibilidadService = inject(DisponibilidadService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly platformId = inject(PLATFORM_ID);

  readonly days: DiaSemana[] = DIAS_SEMANA;
  readonly hours: number[] = Array.from({ length: 14 }, (_, idx) => idx + 7); // 07:00 - 20:00

  readonly bloques = signal<Disponibilidad[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly isCoordinator = computed(() => this.authService.hasRole(['COORDINADOR']));
  readonly coordinatorTutorId = signal<number>(2);

  readonly blockForm = this.fb.group({
    diaSemana: ['MONDAY' as DiaSemana, [Validators.required]],
    horaInicio: ['08:00', [Validators.required]],
    horaFin: ['10:00', [Validators.required]]
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadBloques();
    }
  }

  loadBloques(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const request$ = this.isCoordinator()
      ? this.disponibilidadService.listarPorTutor(this.coordinatorTutorId(), false)
      : this.disponibilidadService.listarMias();

    request$.subscribe({
      next: data => {
        this.bloques.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.bloques.set([]);
        this.errorMessage.set(err.error?.detail || this.i18n.translate('COMMON.ERROR_GENERIC'));
      }
    });
  }

  onCoordinatorTutorIdChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(value) && value > 0) {
      this.coordinatorTutorId.set(value);
    }
  }

  onAddBlockSubmit(): void {
    if (this.blockForm.invalid) {
      this.blockForm.markAllAsTouched();
      return;
    }

    const { diaSemana, horaInicio, horaFin } = this.blockForm.getRawValue();
    if (horaInicio >= horaFin) {
      this.errorMessage.set(this.i18n.translate('DISPONIBILIDAD.ERR_TIME_ORDER'));
      return;
    }

    this.createBlock(diaSemana, horaInicio, horaFin);
  }

  onCellClick(day: DiaSemana, hour: number): void {
    if (this.isSaving()) return;

    const existing = this.findBlockForCell(day, hour);
    if (existing) {
      this.toggleBlock(existing);
    } else {
      const start = this.formatHour(hour);
      const end = this.formatHour(hour + 1);
      this.createBlock(day, start, end);
    }
  }

  toggleBlock(bloque: Disponibilidad): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const request$ = bloque.activo
      ? this.disponibilidadService.desactivar(bloque.id)
      : this.disponibilidadService.activar(bloque.id);

    request$.subscribe({
      next: updated => {
        this.isSaving.set(false);
        this.bloques.update(list => list.map(item => (item.id === updated.id ? updated : item)));
        this.successMessage.set(
          this.i18n.translate(
            updated.activo ? 'DISPONIBILIDAD.ACTIVATED_OK' : 'DISPONIBILIDAD.DEACTIVATED_OK'
          )
        );
      },
      error: err => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.detail || this.i18n.translate('COMMON.ERROR_GENERIC'));
      }
    });
  }

  deleteBlock(bloque: Disponibilidad): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.disponibilidadService.eliminar(bloque.id).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.bloques.update(list => list.filter(item => item.id !== bloque.id));
        this.successMessage.set(this.i18n.translate('DISPONIBILIDAD.DELETED_OK'));
      },
      error: err => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.detail || this.i18n.translate('COMMON.ERROR_GENERIC'));
      }
    });
  }

  findBlockForCell(day: DiaSemana, hour: number): Disponibilidad | null {
    const slotStartMin = hour * 60;
    const slotEndMin = (hour + 1) * 60;

    const matching = this.bloques().filter(b => {
      if (b.diaSemana !== day) return false;
      const startMin = this.toMinutes(b.horaInicio);
      const endMin = this.toMinutes(b.horaFin);
      return startMin < slotEndMin && endMin > slotStartMin;
    });

    // Prioriza mostrar un bloque activo si coexiste con uno inactivo
    return matching.find(b => b.activo) ?? matching[0] ?? null;
  }

  getCellAriaLabel(day: DiaSemana, hour: number): string {
    const dayLabel = this.i18n.translate(`DAYS.${day}`);
    const start = this.formatHour(hour);
    const end = this.formatHour(hour + 1);
    const block = this.findBlockForCell(day, hour);

    if (!block) {
      return this.i18n.translate('DISPONIBILIDAD.CELL_FREE_ARIA', { day: dayLabel, start, end });
    }

    const key = block.activo ? 'DISPONIBILIDAD.CELL_ACTIVE_ARIA' : 'DISPONIBILIDAD.CELL_INACTIVE_ARIA';
    return this.i18n.translate(key, {
      day: dayLabel,
      start: this.formatTimeShort(block.horaInicio),
      end: this.formatTimeShort(block.horaFin)
    });
  }

  formatHour(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  formatTimeShort(time: string): string {
    return time.slice(0, 5);
  }

  private createBlock(diaSemana: DiaSemana, horaInicio: string, horaFin: string): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload: DisponibilidadRequest = {
      tutorId: this.isCoordinator() ? this.coordinatorTutorId() : null,
      diaSemana,
      horaInicio,
      horaFin,
      activo: true
    };

    this.disponibilidadService.crear(payload).subscribe({
      next: created => {
        this.isSaving.set(false);
        this.bloques.update(list => this.sortBloques([...list, created]));
        this.successMessage.set(this.i18n.translate('DISPONIBILIDAD.CREATED_OK'));
      },
      error: err => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.detail || this.i18n.translate('COMMON.ERROR_GENERIC'));
      }
    });
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  private sortBloques(list: Disponibilidad[]): Disponibilidad[] {
    return [...list].sort((a, b) => {
      const dayDiff = this.days.indexOf(a.diaSemana) - this.days.indexOf(b.diaSemana);
      if (dayDiff !== 0) return dayDiff;
      return a.horaInicio.localeCompare(b.horaInicio);
    });
  }
}
