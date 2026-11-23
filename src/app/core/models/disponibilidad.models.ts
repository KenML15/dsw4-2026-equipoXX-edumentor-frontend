export type DiaSemana =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export const DIAS_SEMANA: DiaSemana[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
];

export interface Disponibilidad {
  id: number;
  tutorId: number;
  tutorNombre: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

export interface DisponibilidadRequest {
  tutorId?: number | null;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  activo?: boolean;
}
