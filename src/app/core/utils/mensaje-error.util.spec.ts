import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { I18nService } from '../services/i18n.service';
import { mensajeDeError } from './mensaje-error.util';

describe('mensajeDeError', () => {
  let i18n: I18nService;

  beforeEach(() => {
    i18n = TestBed.inject(I18nService);
    i18n.setLanguage('es');
  });

  function error(status: number, cuerpo: unknown): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: cuerpo });
  }

  it('traduce el código de error al idioma activo en lugar de mostrar el texto del backend', () => {
    const err = error(400, { codigo: 'TRASLAPE_TUTOR', detail: 'texto del servidor' });

    expect(mensajeDeError(err, i18n)).toBe('El tutor ya tiene una sesión confirmada que se traslapa con ese horario.');
    i18n.setLanguage('en');
    expect(mensajeDeError(err, i18n)).toBe('The tutor already has a confirmed session overlapping that time.');
  });

  it('sustituye parámetros numéricos', () => {
    const err = error(400, { codigo: 'DURACION_INVALIDA', parametros: { paso: 30 } });

    expect(mensajeDeError(err, i18n)).toBe('La duración debe ser múltiplo de 30 minutos.');
  });

  it('formatea la fecha "desde" en hora de Costa Rica', () => {
    i18n.setLanguage('en');
    const err = error(400, { codigo: 'INICIO_ANTICIPADO', parametros: { desde: '2026-11-30T07:45' } });

    expect(mensajeDeError(err, i18n)).toMatch(/from Nov 30, 2026, 7:45\sAM\.$/);
  });

  it('traduce el estado y la acción de una transición inválida', () => {
    const err = error(400, { codigo: 'TRANSICION_INVALIDA', parametros: { accion: 'aceptar', estado: 'CANCELLED' } });

    expect(mensajeDeError(err, i18n)).toBe('No se puede aceptar una sesión en estado «Cancelada».');
  });

  it('usa el detalle del backend cuando el código no tiene traducción', () => {
    expect(mensajeDeError(error(400, { codigo: 'OTRO', detail: 'Detalle' }), i18n)).toBe('Detalle');
    expect(mensajeDeError(error(400, { detail: 'Sin código' }), i18n)).toBe('Sin código');
  });

  it('usa un mensaje propio para 403 y uno genérico si no hay cuerpo', () => {
    expect(mensajeDeError(error(403, { detail: 'Forbidden' }), i18n)).toBe('No tienes permiso para realizar esta acción.');
    expect(mensajeDeError(error(500, null), i18n)).toBe('Ocurrió un error inesperado al procesar la solicitud.');
  });
});
