export const ASIGNATURAS = [
  'Cálculo I',
  'Física I',
  'Álgebra Lineal',
  'Estadística',
  'Cálculo Integral',
] as const;

export type Asignatura = (typeof ASIGNATURAS)[number];
export type EstadoSala = 'Activa' | 'Programada' | 'Finalizada';

export interface AnfitrionSala {
  id: string;
  nombre: string;
}

export interface ParticipanteSala {
  id: string;
  nombre: string;
  rol: 'ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR' | string;
  esAnfitrion: boolean;
  unioEn: string;
}

export interface Sala {
  id: string;
  titulo: string;
  asignatura: Asignatura | string;
  tema: string;
  descripcion: string;
  anfitrion: AnfitrionSala;
  participantesActuales: number;
  cupoMaximo: number;
  estado: EstadoSala;
  privacidad: 'Pública' | 'Privada' | string;
  creadoEn: string;
  esAnfitrion: boolean;
  participando: boolean;
}

export interface SalaDetalle extends Sala {
  participantes: ParticipanteSala[];
}

// La base de datos no guarda una imagen por sala: se elige una acorde
// a la asignatura para conservar el diseño actual de las tarjetas.
const IMAGENES_POR_ASIGNATURA: Record<string, string> = {
  'Cálculo I':
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
  'Física I':
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
  'Álgebra Lineal':
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
  Estadística:
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
  'Cálculo Integral':
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
};

const IMAGEN_POR_DEFECTO =
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80';

export function imagenDeAsignatura(asignatura: string): string {
  return IMAGENES_POR_ASIGNATURA[asignatura] ?? IMAGEN_POR_DEFECTO;
}

export function inicialesDe(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .map((parte) => parte[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}
