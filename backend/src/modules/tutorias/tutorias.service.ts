import prisma from '../../config/prisma';
import {
  crearNotificacion,
  formatearFechaNotificacion,
} from '../notificaciones/notificaciones.service';

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
