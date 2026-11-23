import { fechaHoyEnZonaApi, formatearEnZonaApi, instanteDeApi, instanteLocal } from './zona-horaria.util';

describe('zona-horaria.util', () => {
  it('interpreta fechas de la API sin zona como hora de Costa Rica', () => {
    expect(instanteDeApi('2026-11-30T08:00:00')).toBe(Date.parse('2026-11-30T14:00:00Z'));
  });

  it('respeta fechas que ya traen zona', () => {
    expect(instanteDeApi('2026-11-30T08:00:00Z')).toBe(Date.parse('2026-11-30T08:00:00Z'));
    expect(instanteDeApi('2026-11-30T08:00:00+02:00')).toBe(Date.parse('2026-11-30T06:00:00Z'));
  });

  it('acepta fracciones de segundo con más de 3 dígitos como las envía Java', () => {
    expect(instanteDeApi('2026-11-23T11:25:55.8789658')).toBe(Date.parse('2026-11-23T17:25:55.878Z'));
  });

  it('devuelve NaN para valores vacíos o inválidos', () => {
    expect(instanteDeApi('')).toBeNaN();
    expect(instanteLocal('', '08:00')).toBeNaN();
  });

  it('combina fecha y hora del formulario en hora de Costa Rica', () => {
    expect(instanteLocal('2026-11-30', '08:30')).toBe(Date.parse('2026-11-30T14:30:00Z'));
  });

  it('obtiene la fecha de hoy en Costa Rica aunque en UTC ya sea otro día', () => {
    expect(fechaHoyEnZonaApi(Date.parse('2026-11-24T03:00:00Z'))).toBe('2026-11-23');
    expect(fechaHoyEnZonaApi(Date.parse('2026-11-24T07:00:00Z'))).toBe('2026-11-24');
  });

  it('formatea en hora de Costa Rica sin importar la zona del navegador', () => {
    const texto = formatearEnZonaApi(Date.parse('2026-11-30T14:00:00Z'), 'en-US', { timeStyle: 'short' });
    expect(texto).toMatch(/^8:00\sAM$/);
  });
});
