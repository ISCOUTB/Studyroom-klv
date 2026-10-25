import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import {
  MAX_NOTIFICACIONES,
  serializarNotificacion,
} from './notificaciones.service';

function text(value: unknown): string {
  return String(value ?? '').trim();
}

// ---------------------------------------------------------
// GET /api/notificaciones
// ---------------------------------------------------------
export const listarNotificaciones = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const solicitadas = Number(req.query.take);
  const take =
    Number.isInteger(solicitadas) && solicitadas > 0
      ? Math.min(solicitadas, 50)
      : MAX_NOTIFICACIONES;

  try {
    const [notificaciones, noLeidas] = await prisma.$transaction([
      prisma.notificacion.findMany({
        where: { usuarioId: req.user.id },
        orderBy: { creadaEn: 'desc' },
        take,
      }),
      prisma.notificacion.count({
        where: { usuarioId: req.user.id, leida: false },
      }),
    ]);

    return res.json({
      notificaciones: notificaciones.map(serializarNotificacion),
      noLeidas,
    });
  } catch (error) {
    console.error('[notificaciones:listar]', error);
    return res.status(500).json({ error: 'No se pudieron cargar las notificaciones.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/notificaciones/leer-todas
// ---------------------------------------------------------
export const marcarTodasLeidas = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    await prisma.notificacion.updateMany({
      where: { usuarioId: req.user.id, leida: false },
      data: { leida: true },
    });

    return res.json({
      message: 'Todas las notificaciones fueron marcadas como leídas.',
      noLeidas: 0,
    });
  } catch (error) {
    console.error('[notificaciones:leer-todas]', error);
    return res
      .status(500)
      .json({ error: 'No se pudieron marcar las notificaciones como leídas.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/notificaciones/:id/leer
// ---------------------------------------------------------
export const marcarLeida = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const id = text(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Notificación inválida.' });
  }

  try {
    const notificacion = await prisma.notificacion.findFirst({
      where: { id, usuarioId: req.user.id },
    });

    if (!notificacion) {
      return res.status(404).json({ error: 'La notificación no existe.' });
    }

    if (!notificacion.leida) {
      await prisma.notificacion.update({
        where: { id: notificacion.id },
        data: { leida: true },
      });
    }

    const noLeidas = await prisma.notificacion.count({
      where: { usuarioId: req.user.id, leida: false },
    });

    return res.json({ message: 'Notificación marcada como leída.', noLeidas });
  } catch (error) {
    console.error('[notificaciones:leer]', error);
    return res.status(500).json({ error: 'No se pudo marcar la notificación como leída.' });
  }
};
