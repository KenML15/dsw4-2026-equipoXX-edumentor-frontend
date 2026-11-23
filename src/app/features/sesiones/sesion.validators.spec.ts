import { FormControl, FormGroup } from '@angular/forms';
import {
  enlaceSegunModalidadValidator,
  esUrlHttpsValida,
  fechaFuturaValidator,
  horaDisponibleValidator
} from './sesion.validators';

describe('sesion.validators', () => {
  it.each([
    ['https://meet.google.com/abc-defg-hij', true],
    ['https://ucr.zoom.us/j/123?pwd=x', true],
    ['http://meet.google.com/abc', false],
    ['javascript:alert(1)', false],
    ['ftp://archivos.ucr.ac.cr/a', false],
    ['meet.google.com/abc', false],
    ['https://meet google.com', false],
    ['https://usuario:clave@meet.google.com', false],
    ['', false]
  ])('esUrlHttpsValida(%s) = %s', (url, esperado) => {
    expect(esUrlHttpsValida(url)).toBe(esperado);
  });

  function grupo(modalidad: string, enlace: string): FormGroup {
    const form = new FormGroup({
      modalidad: new FormControl(modalidad),
      enlaceOUbicacion: new FormControl(enlace, enlaceSegunModalidadValidator)
    });
    form.controls.enlaceOUbicacion.updateValueAndValidity();
    return form;
  }

  it('exige enlace https para sesiones virtuales', () => {
    expect(grupo('VIRTUAL', '').get('enlaceOUbicacion')?.errors).toEqual({ enlaceRequerido: true });
    expect(grupo('VIRTUAL', 'http://x.com').get('enlaceOUbicacion')?.errors).toEqual({ enlaceInvalido: true });
    expect(grupo('VIRTUAL', 'https://meet.google.com/a').get('enlaceOUbicacion')?.errors).toBeNull();
  });

  it('exige ubicación para sesiones presenciales', () => {
    expect(grupo('PRESENCIAL', ' ').get('enlaceOUbicacion')?.errors).toEqual({ ubicacionRequerida: true });
    expect(grupo('PRESENCIAL', 'Aula 201').get('enlaceOUbicacion')?.errors).toBeNull();
  });

  it('rechaza enlaces de más de 500 caracteres', () => {
    const largo = 'https://meet.google.com/' + 'a'.repeat(490);
    expect(grupo('VIRTUAL', largo).get('enlaceOUbicacion')?.errors).toEqual({ enlaceLargo: true });
  });

  it('marca como pasada una fecha y hora anteriores a ahora', () => {
    const pasado = new FormGroup({ fecha: new FormControl('2020-01-01'), hora: new FormControl('08:00') });
    const futuro = new FormGroup({ fecha: new FormControl('2099-01-01'), hora: new FormControl('08:00') });
    expect(fechaFuturaValidator(pasado)).toEqual({ fechaPasada: true });
    expect(fechaFuturaValidator(futuro)).toBeNull();
  });

  it('solo acepta horas de la lista disponible', () => {
    const validator = horaDisponibleValidator(() => ['08:00', '08:30']);
    expect(validator(new FormControl('08:30'))).toBeNull();
    expect(validator(new FormControl('11:00'))).toEqual({ horaNoDisponible: true });
    expect(validator(new FormControl(''))).toBeNull();
  });
});
