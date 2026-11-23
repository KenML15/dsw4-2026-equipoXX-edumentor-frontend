import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Materia, MateriaRequest } from '../../core/models/materia.models';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { MateriaService } from '../../core/services/materia.service';

@Component({
  selector: 'app-materias-catalog',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './materias-catalog.component.html',
  styleUrl: './materias-catalog.component.css'
})
export class MateriasCatalogComponent implements OnInit {
  private readonly materiaService = inject(MateriaService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly platformId = inject(PLATFORM_ID);

  readonly materias = signal<Materia[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly onlyActive = signal(false);

  readonly isFormOpen = signal(false);
  readonly editingId = signal<number | null>(null);

  readonly isCoordinator = computed(() => this.authService.hasRole(['COORDINADOR']));

  readonly filteredMaterias = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const activeOnly = this.onlyActive();

    return this.materias().filter(materia => {
      if (activeOnly && !materia.activa) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        materia.codigo.toLowerCase().includes(query) ||
        materia.nombre.toLowerCase().includes(query) ||
        (materia.descripcion?.toLowerCase().includes(query) ?? false)
      );
    });
  });

  readonly materiaForm = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', [Validators.maxLength(500)]],
    creditos: [4, [Validators.required, Validators.min(1), Validators.max(20)]],
    activa: [true]
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadMaterias();
    }
  }

  loadMaterias(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.materiaService.listar(false).subscribe({
      next: data => {
        this.materias.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || this.i18n.translate('COMMON.ERROR_GENERIC'));
      }
    });
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onOnlyActiveChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.onlyActive.set(checkbox.checked);
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.materiaForm.reset({
      codigo: '',
      nombre: '',
      descripcion: '',
      creditos: 4,
      activa: true
    });
    this.isFormOpen.set(true);
  }

  openEditForm(materia: Materia): void {
    this.editingId.set(materia.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.materiaForm.reset({
      codigo: materia.codigo,
      nombre: materia.nombre,
      descripcion: materia.descripcion ?? '',
      creditos: materia.creditos,
      activa: materia.activa
    });
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingId.set(null);
  }

  onSubmit(): void {
    if (this.materiaForm.invalid) {
      this.materiaForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const raw = this.materiaForm.getRawValue();
    const payload: MateriaRequest = {
      codigo: raw.codigo.trim().toUpperCase(),
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion.trim() ? raw.descripcion.trim() : null,
      creditos: Number(raw.creditos),
      activa: raw.activa
    };

    const currentEditId = this.editingId();
    const request$ = currentEditId
      ? this.materiaService.actualizar(currentEditId, payload)
      : this.materiaService.crear(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isFormOpen.set(false);
        this.editingId.set(null);
        this.successMessage.set(
          this.i18n.translate(currentEditId ? 'MATERIAS.UPDATED_OK' : 'MATERIAS.CREATED_OK')
        );
        this.loadMaterias();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || this.i18n.translate('COMMON.ERROR_GENERIC'));
      }
    });
  }

  onDelete(materia: Materia): void {
    const message = this.i18n.translate('MATERIAS.CONFIRM_DELETE', {
      codigo: materia.codigo,
      nombre: materia.nombre
    });
    if (!confirm(message)) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.materiaService.eliminar(materia.id).subscribe({
      next: () => {
        this.successMessage.set(this.i18n.translate('MATERIAS.DELETED_OK'));
        this.loadMaterias();
      },
      error: err => {
        this.errorMessage.set(err.error?.detail || this.i18n.translate('COMMON.ERROR_GENERIC'));
      }
    });
  }
}
