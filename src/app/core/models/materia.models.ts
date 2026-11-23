export interface Materia {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  creditos: number;
  activa: boolean;
}

export interface MateriaRequest {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  creditos: number;
  activa: boolean;
}
