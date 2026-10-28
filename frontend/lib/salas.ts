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
  /** Chip de filtro activo: relleno con el color de la asignatura. */
  relleno: string;
}

export const COLORES_POR_CLAVE: Record<string, ColorMateria> = {
  blue: {
    punto: 'bg-blue-600',
    franja: 'bg-blue-600',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    texto: 'text-blue-700',
    suave: 'bg-blue-50',
    borde: 'border-blue-200',
    relleno: 'border-blue-600 bg-blue-600 text-white shadow-sm',
  },
  emerald: {
    punto: 'bg-emerald-500',
    franja: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    texto: 'text-emerald-700',
    suave: 'bg-emerald-50',
    borde: 'border-emerald-200',
    relleno: 'border-emerald-600 bg-emerald-600 text-white shadow-sm',
  },
  amber: {
    punto: 'bg-amber-500',
    franja: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    texto: 'text-amber-700',
    suave: 'bg-amber-50',
    borde: 'border-amber-200',
    relleno: 'border-amber-500 bg-amber-500 text-amber-950 shadow-sm',
  },
  rose: {
    punto: 'bg-rose-500',
    franja: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    texto: 'text-rose-700',
    suave: 'bg-rose-50',
    borde: 'border-rose-200',
    relleno: 'border-rose-600 bg-rose-600 text-white shadow-sm',
  },
  violet: {
    punto: 'bg-violet-500',
    franja: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
    texto: 'text-violet-700',
    suave: 'bg-violet-50',
    borde: 'border-violet-200',
    relleno: 'border-violet-600 bg-violet-600 text-white shadow-sm',
  },
  sky: {
    punto: 'bg-sky-500',
    franja: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    texto: 'text-sky-700',
    suave: 'bg-sky-50',
    borde: 'border-sky-200',
    relleno: 'border-sky-600 bg-sky-600 text-white shadow-sm',
  },
  indigo: {
    punto: 'bg-indigo-500',
    franja: 'bg-indigo-500',
    chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    texto: 'text-indigo-700',
    suave: 'bg-indigo-50',
    borde: 'border-indigo-200',
    relleno: 'border-indigo-600 bg-indigo-600 text-white shadow-sm',
  },
  teal: {
    punto: 'bg-teal-500',
    franja: 'bg-teal-500',
    chip: 'bg-teal-50 text-teal-700 border-teal-200',
    texto: 'text-teal-700',
    suave: 'bg-teal-50',
    borde: 'border-teal-200',
    relleno: 'border-teal-600 bg-teal-600 text-white shadow-sm',
  },
  orange: {
    punto: 'bg-orange-500',
    franja: 'bg-orange-500',
    chip: 'bg-orange-50 text-orange-700 border-orange-200',
    texto: 'text-orange-700',
    suave: 'bg-orange-50',
    borde: 'border-orange-200',
    relleno: 'border-orange-600 bg-orange-600 text-white shadow-sm',
  },
  slate: {
    punto: 'bg-slate-400',
    franja: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
    texto: 'text-slate-600',
    suave: 'bg-slate-50',
    borde: 'border-slate-200',
    relleno: 'border-slate-500 bg-slate-500 text-white shadow-sm',
  },
};

export const COLORES_MATERIA: Record<string, ColorMateria> = {
  'Cálculo I': COLORES_POR_CLAVE.blue,
  'Física I': COLORES_POR_CLAVE.emerald,
  'Álgebra Lineal': COLORES_POR_CLAVE.amber,
  Estadística: COLORES_POR_CLAVE.rose,
  'Cálculo Integral': COLORES_POR_CLAVE.violet,
};

const COLOR_POR_DEFECTO: ColorMateria = {
  punto: 'bg-slate-400',
  franja: 'bg-slate-400',
  chip: 'bg-slate-100 text-slate-600 border-slate-200',
  texto: 'text-slate-600',
  suave: 'bg-slate-50',
  borde: 'border-slate-200',
  relleno: 'border-slate-500 bg-slate-500 text-white shadow-sm',
};

export function colorDeMateria(asignatura: string, clave?: string | null): ColorMateria {
  if (clave && COLORES_POR_CLAVE[clave]) return COLORES_POR_CLAVE[clave];
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
