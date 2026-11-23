export type EstadoSesion =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'IN_SESSION'
  | 'COMPLETED'
  | 'REVIEWED';

export type ModalidadSesion = 'VIRTUAL' | 'PRESENCIAL';

export type AccionSesion = 'aceptar' | 'rechazar' | 'cancelar' | 'iniciar' | 'finalizar';

export const ESTADOS_SESION: EstadoSesion[] = [
  'REQUESTED',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'IN_SESSION',
  'COMPLETED',
  'REVIEWED'
];

export const MODALIDADES_SESION: ModalidadSesion[] = ['VIRTUAL', 'PRESENCIAL'];

export const PASO_DURACION_MINUTOS = 30;

export const DURACIONES_SESION: number[] = [30, 60, 90, 120, 150, 180, 210, 240];

export interface Sesion {
  id: number;
  estudianteId: number;
  estudianteNombre: string;
  tutorId: number;
  tutorNombre: string;
  materiaId: number;
  materiaCodigo: string;
  materiaNombre: string;
  fechaHora: string;
  fechaHoraFin: string;
  duracionMinutos: number;
  modalidad: ModalidadSesion;
  estado: EstadoSesion;
  enlaceOUbicacion: string | null;
  fechaCreacion: string;
  iniciableDesde: string;
  finalizableDesde: string;
  cancelableHasta: string | null;
}

export interface SesionRequest {
  tutorId: number;
  materiaId: number;
  fechaHora: string;
  duracionMinutos: number;
  modalidad: ModalidadSesion;
  enlaceOUbicacion: string | null;
}

export interface TutorResumen {
  id: number;
  nombreCompleto: string;
  promedioCalificacion: number | null;
  totalEvaluaciones: number | null;
}
