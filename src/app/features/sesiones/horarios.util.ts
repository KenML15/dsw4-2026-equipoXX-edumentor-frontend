import { DIAS_SEMANA, DiaSemana, Disponibilidad } from '../../core/models/disponibilidad.models';
import { instanteLocal } from '../../core/utils/zona-horaria.util';

export const PASO_MINUTOS = 30;

const DIA_POR_INDICE_JS: DiaSemana[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY'
];

interface Rango {
  inicio: number;
  fin: number;
}

export function aMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + (minutos || 0);
}

export function aHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
}

export function diaSemanaDeFecha(fecha: string): DiaSemana | null {
  const partes = fecha.split('-').map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) {
    return null;
  }
  const [anio, mes, dia] = partes;
  const date = new Date(Date.UTC(anio, mes - 1, dia));
  return Number.isNaN(date.getTime()) ? null : DIA_POR_INDICE_JS[date.getUTCDay()];
}

export function diasConDisponibilidad(bloques: Disponibilidad[]): DiaSemana[] {
  const activos = new Set(bloques.filter(b => b.activo).map(b => b.diaSemana));
  return DIAS_SEMANA.filter(dia => activos.has(dia));
}

function rangosFusionados(bloques: Disponibilidad[], dia: DiaSemana): Rango[] {
  const ordenados = bloques
    .filter(b => b.activo && b.diaSemana === dia)
    .map(b => ({ inicio: aMinutos(b.horaInicio), fin: aMinutos(b.horaFin) }))
    .filter(r => r.inicio < r.fin)
    .sort((a, b) => a.inicio - b.inicio);

  const resultado: Rango[] = [];
  for (const rango of ordenados) {
    const ultimo = resultado[resultado.length - 1];
    if (ultimo && rango.inicio <= ultimo.fin) {
      ultimo.fin = Math.max(ultimo.fin, rango.fin);
    } else {
      resultado.push({ ...rango });
    }
  }
  return resultado;
}

export function calcularHorasDisponibles(
  bloques: Disponibilidad[],
  fecha: string,
  duracionMinutos: number,
  ahora: number = Date.now(),
  paso = PASO_MINUTOS
): string[] {
  const dia = fecha ? diaSemanaDeFecha(fecha) : null;
  if (!dia || duracionMinutos <= 0) {
    return [];
  }

  const horas: string[] = [];

  for (const rango of rangosFusionados(bloques, dia)) {
    for (let inicio = rango.inicio; inicio + duracionMinutos <= rango.fin; inicio += paso) {
      if (instanteLocal(fecha, aHora(inicio)) > ahora) {
        horas.push(aHora(inicio));
      }
    }
  }
  return horas;
}
