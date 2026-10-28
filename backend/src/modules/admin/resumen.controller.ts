import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';

const DIAS_SEMANA = 7;
const MS_DIA = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------
// GET /api/admin/resumen
// ---------------------------------------------------------
export const obtenerResumen = async (_req: AuthRequest, res: Response) => {
  try {
    const desde = new Date(Date.now() - DIAS_SEMANA * MS_DIA);

    const [
      usuarios,
      usuariosNuevos,
      estudiantes,
      estudiantesParticipantes,
      salasActivas,
      salasTotal,
      tutoriasFinalizadas,
      tutoriasTotal,
      calificaciones,
      preguntasForo,
      materiales,
      reportesPendientes,
    ] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { creadoEn: { gte: desde } } }),
      prisma.usuario.count({ where: { rol: 'ESTUDIANTE' } }),
      prisma.participacionSala.findMany({
        where: { usuario: { rol: 'ESTUDIANTE' } },
        distinct: ['usuarioId'],
        select: { usuarioId: true },
      }),
      prisma.salaEstudio.count({ where: { estado: 'ACTIVA' } }),
      prisma.salaEstudio.count(),
      prisma.tutoria.count({ where: { estado: 'FINALIZADA' } }),
      prisma.tutoria.count(),
      prisma.tutoria.aggregate({
        where: { calificacion: { not: null } },
        _avg: { calificacion: true },
        _count: { _all: true },
      }),
      prisma.pregunta.count(),
      prisma.materialEstudio.count(),
      prisma.reporte.count({ where: { estado: 'PENDIENTE' } }),
    ]);

    const activacion =
      estudiantes === 0
        ? 0
        : Math.round((estudiantesParticipantes.length / estudiantes) * 100);

    return res.json({
      usuarios: { total: usuarios, nuevos7dias: usuariosNuevos },
      activacion: {
        porcentaje: activacion,
        estudiantes,
        participantes: estudiantesParticipantes.length,
      },
      salas: { activas: salasActivas, total: salasTotal },
      tutorias: { finalizadas: tutoriasFinalizadas, total: tutoriasTotal },
      calificacion: {
        promedio: Number((calificaciones._avg.calificacion ?? 0).toFixed(1)),
        calificadas: calificaciones._count._all,
      },
      foro: { preguntas: preguntasForo },
      ejercicios: { resueltos: 0 },
      materiales: { total: materiales },
      reportes: { pendientes: reportesPendientes },
    });
  } catch (error) {
    console.error('[admin:resumen]', error);
    return res.status(500).json({ error: 'No se pudieron calcular las métricas.' });
  }
};
