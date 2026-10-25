import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { crearNotificacion } from '../notificaciones/notificaciones.service';

const ETIQUETA_MODALIDAD: Record<string, string> = {
  VIRTUAL: 'Virtual',
  PRESENCIAL: 'Presencial',
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function serializarTutor(tutor: {
  id: string;
  carrera: string;
  semestre: number;
  biografia: string | null;
  modalidad: string;
  ubicacion: string | null;
  asignaturas: string[];
  aprobado: boolean;
  solicitudEn: Date;
  usuario: { nombre: string; correoUnico: string };
  disponibilidades: Array<{ id: string }>;
}) {
  return {
    id: tutor.id,
    nombre: tutor.usuario.nombre,
    correo: tutor.usuario.correoUnico,
    carrera: tutor.carrera,
    semestre: tutor.semestre,
    biografia: tutor.biografia,
    modalidad: ETIQUETA_MODALIDAD[tutor.modalidad] ?? 'Virtual',
    ubicacion: tutor.ubicacion,
    asignaturas: tutor.asignaturas,
    aprobado: tutor.aprobado,
    estado: tutor.aprobado ? 'Aprobado' : 'Pendiente',
    solicitudEn: tutor.solicitudEn,
    bloquesDisponibles: tutor.disponibilidades.length,
  };
}

// ---------------------------------------------------------
// GET /api/admin/monitores
// ---------------------------------------------------------
export const listarSolicitudesMonitor = async (_req: AuthRequest, res: Response) => {
  try {
    const tutores = await prisma.tutor.findMany({
      orderBy: { solicitudEn: 'desc' },
      include: {
        usuario: { select: { nombre: true, correoUnico: true } },
        disponibilidades: { select: { id: true } },
      },
    });

    return res.json({
      solicitudes: tutores.filter((tutor) => !tutor.aprobado).map(serializarTutor),
      monitores: tutores.filter((tutor) => tutor.aprobado).map(serializarTutor),
    });
  } catch (error) {
    console.error('[admin:monitores]', error);
    return res.status(500).json({ error: 'No se pudieron cargar las solicitudes de monitor.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/admin/monitores/:id
// ---------------------------------------------------------
export const responderSolicitudMonitor = async (req: AuthRequest, res: Response) => {
  const id = text(req.params.id);
  const aprobado = req.body?.aprobado;

  if (typeof aprobado !== 'boolean') {
    return res.status(400).json({ error: 'Indica si apruebas o rechazas la solicitud.' });
  }

  try {
    const tutor = await prisma.tutor.findUnique({
      where: { id },
      include: { usuario: { select: { rol: true, nombre: true } } },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'La solicitud de monitor no existe.' });
    }

    if (aprobado) {
      await prisma.$transaction([
        prisma.tutor.update({ where: { id }, data: { aprobado: true } }),
        prisma.usuario.update({
          where: { id },
          data: { rol: tutor.usuario.rol === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'TUTOR' },
        }),
      ]);

      await crearNotificacion({
        usuarioId: id,
        tipo: 'MONITOR_APROBADO',
        titulo: '¡Ya eres monitor!',
        mensaje:
          'Tu solicitud fue aprobada. Publica tus bloques de disponibilidad y empieza a recibir tutorías.',
        enlace: '/perfil/monitor',
      });

      return res.json({
        message: `${tutor.usuario.nombre} fue aprobado como monitor. Debe volver a iniciar sesión para ver su nuevo rol.`,
      });
    }

    if (tutor.aprobado) {
      return res.status(400).json({
        error: 'No puedes rechazar a un monitor ya aprobado. Esta acción solo aplica a solicitudes pendientes.',
      });
    }

    await prisma.tutor.delete({ where: { id } });

    await crearNotificacion({
      usuarioId: id,
      tipo: 'MONITOR_RECHAZADO',
      titulo: 'Solicitud de monitor rechazada',
      mensaje:
        'Tu solicitud para ser monitor no fue aprobada. Puedes actualizar tu perfil y volver a postularte.',
      enlace: '/perfil/monitor',
    });

    return res.json({ message: 'Solicitud de monitor rechazada y eliminada.' });
  } catch (error) {
    console.error('[admin:responder-monitor]', error);
    return res.status(500).json({ error: 'No se pudo procesar la solicitud de monitor.' });
  }
};
