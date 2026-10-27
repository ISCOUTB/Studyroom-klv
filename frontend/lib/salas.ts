export const ASIGNATURAS = [
  'Cálculo I',
  'Física I',
  'Álgebra Lineal',
  'Estadística',
  'Cálculo Integral',
] as const;

export type Asignatura = (typeof ASIGNATURAS)[number];
export type EstadoSala = 'Activa' | 'Programada' | 'Finalizada';

export interface ColorMateria {
  punto: string;
  franja: string;
  chip: string;
  texto: string;
  suave: string;
  borde: string;
}

export const COLORES_MATERIA: Record<string, ColorMateria> = {
  'Cálculo I': {
    punto: 'bg-blue-600',
    franja: 'bg-blue-600',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    texto: 'text-blue-700',
    suave: 'bg-blue-50',
    borde: 'border-blue-200',
  },
  'Física I': {
    punto: 'bg-emerald-500',
    franja: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    texto: 'text-emerald-700',
    suave: 'bg-emerald-50',
    borde: 'border-emerald-200',
  },
  'Álgebra Lineal': {
    punto: 'bg-amber-500',
    franja: 'bg-amber-400',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    texto: 'text-amber-700',
    suave: 'bg-amber-50',
    borde: 'border-amber-200',
  },
  Estadística: {
    punto: 'bg-rose-500',
    franja: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    texto: 'text-rose-700',
    suave: 'bg-rose-50',
    borde: 'border-rose-200',
  },
  'Cálculo Integral': {
    punto: 'bg-violet-500',
    franja: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
    texto: 'text-violet-700',
    suave: 'bg-violet-50',
    borde: 'border-violet-200',
  },
};

const COLOR_POR_DEFECTO: ColorMateria = {
  punto: 'bg-slate-400',
  franja: 'bg-slate-400',
  chip: 'bg-slate-100 text-slate-600 border-slate-200',
  texto: 'text-slate-600',
  suave: 'bg-slate-50',
  borde: 'border-slate-200',
};

export function colorDeMateria(asignatura: string): ColorMateria {
  return COLORES_MATERIA[asignatura] ?? COLOR_POR_DEFECTO;
}

/** "2026-10-28T14:26:00.000Z" -> "mié, 28 de oct, 2:26 p. m." */
export function formatearFechaProgramada(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  const partes = new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(fecha);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  const diaSemana = valor('weekday').replace('.', '');
  const dia = valor('day');
  const mes = valor('month').replace('.', '');
  const hora = valor('hour');
  const minuto = valor('minute');
  const periodo = valor('dayPeriod');

  return `${diaSemana}, ${dia} de ${mes}, ${hora}:${minuto} ${periodo}`
    .replace(/\s+/g, ' ')
    .trim();
}

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
  programadaEn?: string | null;
  codigoAcceso?: string | null;
  creadoEn: string;
  esAnfitrion: boolean;
  participando: boolean;
}

export interface SalaDetalle extends Sala {
  participantes: ParticipanteSala[];
}

export interface AutorMensaje {
  id: string;
  nombre: string;
  rol: 'ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR' | string;
}

export interface MensajeChat {
  id: string;
  contenido: string;
  enviadoEn: string;
  usuario: AutorMensaje;
}

export interface PresenciaSala {
  salaId: string;
  usuarios: string[];
}

export interface MaterialEstudio {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipoMime: string;
  tamano: number;
  creadoEn: string;
  usuario: {
    id: string;
    nombre: string;
  };
  puedeEliminar: boolean;
}

export const MAX_MATERIAL_BYTES = 10 * 1024 * 1024;

export const EXTENSIONES_MATERIALES = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
] as const;

export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  return punto >= 0 ? nombre.slice(punto).toLowerCase() : '';
}

export function formatearTamano(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
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
