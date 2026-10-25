import prisma from '../../config/prisma';
import { emitirAUsuario } from '../../shared/realtime';

export const MAX_NOTIFICACIONES = 30;

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

export interface NotificacionPublica {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  leida: boolean;
  creadaEn: string;
}

type CrearNotificacionInput = {
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  enlace?: string | null;
};

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Bogota',
});

function recortar(valor: string, maximo: number): string {
  return valor.length > maximo ? `${valor.slice(0, maximo - 1)}…` : valor;
}

export function serializarNotificacion(notificacion: {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  leida: boolean;
  creadaEn: Date;
}): NotificacionPublica {
  return {
    id: notificacion.id,
    tipo: notificacion.tipo as TipoNotificacion,
    titulo: notificacion.titulo,
    mensaje: notificacion.mensaje,
    enlace: notificacion.enlace,
    leida: notificacion.leida,
    creadaEn: notificacion.creadaEn.toISOString(),
  };
}

/** Formatea la fecha de una tutoría para los textos de las notificaciones. */
export function formatearFechaNotificacion(fecha: Date | null): string {
  if (!fecha) return 'la fecha acordada';
  return FORMATO_FECHA.format(fecha).replace(/\./g, '');
}

/**
 * Guarda la notificación y la envía en tiempo real a todas las sesiones
 * abiertas del usuario. Un fallo al notificar nunca debe romper la acción
 * principal (agendar, aceptar, cancelar, etc.).
 */
export async function crearNotificacion(
  input: CrearNotificacionInput
): Promise<NotificacionPublica | null> {
  try {
    const notificacion = await prisma.notificacion.create({
      data: {
        usuarioId: input.usuarioId,
        tipo: input.tipo,
        titulo: recortar(input.titulo, 120),
        mensaje: recortar(input.mensaje, 300),
        enlace: input.enlace ? recortar(input.enlace, 200) : null,
      },
    });

    const publica = serializarNotificacion(notificacion);
    emitirAUsuario(input.usuarioId, 'notificacion:nueva', publica);
    return publica;
  } catch (error) {
    console.error('[notificaciones:crear]', error);
    return null;
  }
}

export async function crearNotificaciones(
  inputs: CrearNotificacionInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  await Promise.all(inputs.map((input) => crearNotificacion(input)));
}
