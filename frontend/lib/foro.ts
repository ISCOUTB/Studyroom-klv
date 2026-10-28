export const ASIGNATURAS_FORO = [
  'Álgebra Lineal',
  'Cálculo I',
  'Cálculo Integral',
  'Estadística',
  'Física I',
] as const;

export type EstadoForo = 'todas' | 'sin-resolver' | 'resueltas';

export interface AutorForo {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  rol: string;
}

export interface PreguntaForo {
  id: string;
  titulo: string;
  descripcion: string;
  asignatura: string;
  tema: string | null;
  resuelta: boolean;
  creadoEn: string;
  autor: AutorForo;
  totalRespuestas: number;
  soyAutor: boolean;
}

export interface RespuestaForo {
  id: string;
  contenido: string;
  aceptada: boolean;
  creadoEn: string;
  autor: AutorForo;
  soyAutor: boolean;
}

export interface PreguntaForoDetalle extends PreguntaForo {
  respuestas: RespuestaForo[];
}

const RELATIVO = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** "hace 1 hora", "hace 5 minutos", "hace 3 días". */
export function tiempoRelativoForo(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  const segundos = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 1000));
  if (segundos < 45) return 'ahora';

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return RELATIVO.format(-minutos, 'minute');

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return RELATIVO.format(-horas, 'hour');

  const dias = Math.floor(horas / 24);
  if (dias < 30) return RELATIVO.format(-dias, 'day');

  const meses = Math.floor(dias / 30);
  if (meses < 12) return RELATIVO.format(-meses, 'month');

  return RELATIVO.format(-Math.floor(dias / 365), 'year');
}

/** "28 de octubre de 2026, 2:30 p. m." */
export function formatearFechaForo(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(fecha);
}
