import prisma from '../../config/prisma';
import {
  crearNotificacion,
  crearNotificaciones,
  formatearFechaNotificacion,
} from '../notificaciones/notificaciones.service';
import { enviarRecordatorioTutoria } from './tutorias.emails';

/** Minutos de anticipación con los que se envía el recordatorio. */
export const MINUTOS_RECORDATORIO = Math.min(
  Math.max(Number(process.env.RECORDATORIO_MINUTOS) || 60, 5),
  24 * 60
);

/**
 * Marca como expiradas las solicitudes vencidas y avisa a cada estudiante.
 * El updateMany condicionado por estado evita notificaciones duplicadas si
 * dos procesos intentan expirar la misma solicitud al mismo tiempo.
 */
export async function actualizarSolicitudesExpiradas(): Promise<number> {
  const vencidas = await prisma.tutoria.findMany({
    where: { estado: 'SOLICITADA', expiraEn: { lt: new Date() } },
    select: {
      id: true,
      solicitanteId: true,
      programadaEn: true,
      monitor: {
        select: {
          usuario: { select: { nombre: true } },
        },
      },
    },
  });

  let actualizadas = 0;

  for (const tutoria of vencidas) {
    const resultado = await prisma.tutoria.updateMany({
      where: { id: tutoria.id, estado: 'SOLICITADA' },
      data: { estado: 'EXPIRADA' },
    });

    if (resultado.count === 0) continue;

    actualizadas += 1;
    await crearNotificacion({
      usuarioId: tutoria.solicitanteId,
      tipo: 'TUTORIA_EXPIRADA',
      titulo: 'Solicitud de tutoría expirada',
      mensaje: `${tutoria.monitor.usuario.nombre} no respondió tu solicitud para ${formatearFechaNotificacion(
        tutoria.programadaEn
      )}. Puedes buscar otro horario.`,
      enlace: '/tutorias',
    });
  }

  return actualizadas;
}

/**
 * Envía el recordatorio de las tutorías agendadas que comienzan dentro de la
 * ventana configurada. El `updateMany` condicionado por `recordatorioEnviadoEn`
 * actúa como reclamo atómico: si hay varias instancias del backend, solo una
 * envía el aviso. Después del reclamo se notifica en la app y por correo a
 * estudiante y monitor.
 */
export async function enviarRecordatoriosProximos(
  ahora: Date = new Date()
): Promise<number> {
  const limite = new Date(
    ahora.getTime() + MINUTOS_RECORDATORIO * 60 * 1000
  );

  const tutorias = await prisma.tutoria.findMany({
    where: {
      estado: 'AGENDADA',
      recordatorioEnviadoEn: null,
      programadaEn: { not: null, gt: ahora, lte: limite },
    },
    select: {
      id: true,
      programadaEn: true,
      modalidad: true,
      ubicacion: true,
      solicitante: { select: { id: true, nombre: true, correoUnico: true } },
      monitor: {
        select: {
          usuario: { select: { id: true, nombre: true, correoUnico: true } },
        },
      },
    },
    orderBy: { programadaEn: 'asc' },
  });

  let enviados = 0;

  for (const tutoria of tutorias) {
    const programadaEn = tutoria.programadaEn;
    if (!programadaEn) continue;

    const reclamada = await prisma.tutoria.updateMany({
      where: {
        id: tutoria.id,
        estado: 'AGENDADA',
        recordatorioEnviadoEn: null,
      },
      data: { recordatorioEnviadoEn: new Date() },
    });

    if (reclamada.count === 0) continue;

    enviados += 1;

    const fecha = formatearFechaNotificacion(programadaEn);
    const modalidad =
      tutoria.modalidad === 'PRESENCIAL' ? 'Presencial' : 'Virtual';
    const lugar =
      modalidad === 'Presencial' && tutoria.ubicacion
        ? ` en ${tutoria.ubicacion}`
        : '';
    const monitor = tutoria.monitor.usuario;
    const solicitante = tutoria.solicitante;

    try {
      await crearNotificaciones([
        {
          usuarioId: solicitante.id,
          tipo: 'TUTORIA_RECORDATORIO',
          titulo: 'Tu tutoría empieza pronto',
          mensaje: `Tu tutoría con ${monitor.nombre} comienza ${fecha} (${modalidad}${lugar}).`,
          enlace: '/tutorias#mis-tutorias',
        },
        {
          usuarioId: monitor.id,
          tipo: 'TUTORIA_RECORDATORIO',
          titulo: 'Tienes una tutoría próxima',
          mensaje: `Tienes una tutoría con ${solicitante.nombre}: ${fecha} (${modalidad}${lugar}).`,
          enlace: '/tutorias#mis-tutorias',
        },
      ]);
    } catch (error) {
      console.error('[tutorias:recordatorio:notificar]', error);
    }

    await Promise.allSettled([
      enviarRecordatorioTutoria({
        correo: solicitante.correoUnico,
        nombre: solicitante.nombre,
        contraparte: monitor.nombre,
        esMonitor: false,
        fecha,
        modalidad,
        ubicacion: tutoria.ubicacion,
      }),
      enviarRecordatorioTutoria({
        correo: monitor.correoUnico,
        nombre: monitor.nombre,
        contraparte: solicitante.nombre,
        esMonitor: true,
        fecha,
        modalidad,
        ubicacion: tutoria.ubicacion,
      }),
    ]);
  }

  return enviados;
}
