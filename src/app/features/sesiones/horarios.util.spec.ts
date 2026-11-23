import { Disponibilidad } from '../../core/models/disponibilidad.models';
import { aHora, aMinutos, calcularHorasDisponibles, diaSemanaDeFecha, diasConDisponibilidad } from './horarios.util';

function bloque(dia: Disponibilidad['diaSemana'], inicio: string, fin: string, activo = true, id = 1): Disponibilidad {
  return { id, tutorId: 2, tutorNombre: 'Tutor', diaSemana: dia, horaInicio: `${inicio}:00`, horaFin: `${fin}:00`, activo };
}

const LUNES = '2030-01-07';
const ANTES = Date.parse('2029-01-01T00:00:00-06:00');

describe('horarios.util', () => {
  it('convierte horas y minutos en ambos sentidos', () => {
    expect(aMinutos('08:30:00')).toBe(510);
    expect(aHora(510)).toBe('08:30');
    expect(aHora(aMinutos('17:05'))).toBe('17:05');
  });

  it('obtiene el día de la semana de una fecha local', () => {
    expect(diaSemanaDeFecha(LUNES)).toBe('MONDAY');
    expect(diaSemanaDeFecha('2030-01-13')).toBe('SUNDAY');
    expect(diaSemanaDeFecha('no-es-fecha')).toBeNull();
  });

  it('genera horas cada 30 minutos donde cabe la duración completa', () => {
    const horas = calcularHorasDisponibles([bloque('MONDAY', '08:00', '10:00')], LUNES, 60, ANTES);
    expect(horas).toEqual(['08:00', '08:30', '09:00']);
  });

  it('une bloques contiguos como lo hace el backend', () => {
    const bloques = [bloque('MONDAY', '09:00', '10:00', true, 2), bloque('MONDAY', '08:00', '09:00', true, 1)];
    expect(calcularHorasDisponibles(bloques, LUNES, 90, ANTES)).toEqual(['08:00', '08:30']);
  });

  it('no ofrece horas si la duración no cabe en el bloque', () => {
    expect(calcularHorasDisponibles([bloque('MONDAY', '08:00', '10:00')], LUNES, 150, ANTES)).toEqual([]);
  });

  it('ignora bloques inactivos y de otros días', () => {
    const bloques = [bloque('MONDAY', '08:00', '10:00', false), bloque('TUESDAY', '08:00', '10:00')];
    expect(calcularHorasDisponibles(bloques, LUNES, 60, ANTES)).toEqual([]);
  });

  it('excluye horas que ya pasaron', () => {
    const ahora = Date.parse('2030-01-07T08:45:00-06:00');
    expect(calcularHorasDisponibles([bloque('MONDAY', '08:00', '10:00')], LUNES, 60, ahora)).toEqual(['09:00']);
  });

  it('devuelve vacío sin fecha o con duración inválida', () => {
    const bloques = [bloque('MONDAY', '08:00', '10:00')];
    expect(calcularHorasDisponibles(bloques, '', 60, ANTES)).toEqual([]);
    expect(calcularHorasDisponibles(bloques, LUNES, 0, ANTES)).toEqual([]);
  });

  it('lista los días activos en orden de la semana', () => {
    const bloques = [bloque('FRIDAY', '08:00', '09:00'), bloque('MONDAY', '08:00', '09:00'), bloque('SUNDAY', '08:00', '09:00', false)];
    expect(diasConDisponibilidad(bloques)).toEqual(['MONDAY', 'FRIDAY']);
  });
});
