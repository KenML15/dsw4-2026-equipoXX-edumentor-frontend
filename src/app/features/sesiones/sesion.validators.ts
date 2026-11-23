import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ModalidadSesion } from '../../core/models/sesion.models';
import { instanteLocal } from '../../core/utils/zona-horaria.util';

export const LARGO_MINIMO_UBICACION = 3;
export const LARGO_MAXIMO_ENLACE = 500;

export function esUrlHttpsValida(valor: string): boolean {
  if (!valor || /\s/.test(valor)) {
    return false;
  }
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const fechaFuturaValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const fecha = group.get('fecha')?.value as string | undefined;
  const hora = group.get('hora')?.value as string | undefined;
  if (!fecha || !hora) {
    return null;
  }
  const seleccion = instanteLocal(fecha, hora);
  if (Number.isNaN(seleccion)) {
    return { fechaInvalida: true };
  }
  return seleccion > Date.now() ? null : { fechaPasada: true };
};

export const enlaceSegunModalidadValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const modalidad = control.parent?.get('modalidad')?.value as ModalidadSesion | undefined;
  const valor = String(control.value ?? '').trim();

  if (valor.length > LARGO_MAXIMO_ENLACE) {
    return { enlaceLargo: true };
  }
  if (modalidad === 'VIRTUAL') {
    if (!valor) {
      return { enlaceRequerido: true };
    }
    return esUrlHttpsValida(valor) ? null : { enlaceInvalido: true };
  }
  if (modalidad === 'PRESENCIAL' && valor.length < LARGO_MINIMO_UBICACION) {
    return { ubicacionRequerida: true };
  }
  return null;
};

export function horaDisponibleValidator(horasDisponibles: () => string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const hora = control.value as string;
    if (!hora) {
      return null;
    }
    return horasDisponibles().includes(hora) ? null : { horaNoDisponible: true };
  };
}
