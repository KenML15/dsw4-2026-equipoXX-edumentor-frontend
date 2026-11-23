export const ZONA_HORARIA_API = 'America/Costa_Rica';
export const DESFASE_API = '-06:00';

const TIENE_ZONA = /(Z|[+-]\d{2}:?\d{2})$/i;

function normalizarFraccion(iso: string): string {
  return iso.replace(/(\.\d{3})\d+/, '$1');
}

export function instanteDeApi(iso: string): number {
  if (!iso) {
    return Number.NaN;
  }
  const normalizada = normalizarFraccion(iso.trim());
  return Date.parse(TIENE_ZONA.test(normalizada) ? normalizada : `${normalizada}${DESFASE_API}`);
}

export function instanteLocal(fecha: string, hora: string): number {
  if (!fecha || !hora) {
    return Number.NaN;
  }
  const horaCompleta = hora.length === 5 ? `${hora}:00` : hora;
  return Date.parse(`${fecha}T${horaCompleta}${DESFASE_API}`);
}

export function fechaHoyEnZonaApi(ahora: number = Date.now()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_API,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(ahora));
  const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

export function formatearEnZonaApi(
  instante: number,
  locale: string,
  opciones: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, { ...opciones, timeZone: ZONA_HORARIA_API }).format(new Date(instante));
}
