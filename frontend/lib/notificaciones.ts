export type TipoNotificacion =
  | 'TUTORIA_SOLICITADA'
  | 'TUTORIA_ACEPTADA'
  | 'TUTORIA_RECHAZADA'
  | 'TUTORIA_CANCELADA'
  | 'TUTORIA_FINALIZADA'
  | 'TUTORIA_EXPIRADA'
  | 'MONITOR_APROBADO'
  | 'MONITOR_RECHAZADO'
  | 'SOLICITUD_MONITOR';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  leida: boolean;
  creadaEn: string;
}

const ICONOS: Record<TipoNotificacion, string> = {
  TUTORIA_SOLICITADA: '📩',
  TUTORIA_ACEPTADA: '✅',
  TUTORIA_RECHAZADA: '🚫',
  TUTORIA_CANCELADA: '🗓️',
  TUTORIA_FINALIZADA: '🎓',
  TUTORIA_EXPIRADA: '⏰',
  MONITOR_APROBADO: '⭐',
  MONITOR_RECHAZADO: '📄',
  SOLICITUD_MONITOR: '📝',
};

export function iconoNotificacion(tipo: TipoNotificacion): string {
  return ICONOS[tipo] ?? '🔔';
}

/** "Hace 5 min", "Hace 2 h", "Ayer" o la fecha corta. */
export function tiempoRelativo(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  const segundos = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 1000));

  if (segundos < 60) return 'Ahora';
  if (segundos < 3600) {
    const minutos = Math.floor(segundos / 60);
    return `Hace ${minutos} min`;
  }
  if (segundos < 86400) {
    const horas = Math.floor(segundos / 3600);
    return `Hace ${horas} h`;
  }
  if (segundos < 172800) return 'Ayer';

  const dias = Math.floor(segundos / 86400);
  if (dias < 7) return `Hace ${dias} días`;

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: fecha.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
    .format(fecha)
    .replace('.', '');
}

export const LIMITE_NOTIFICACIONES = 30;
