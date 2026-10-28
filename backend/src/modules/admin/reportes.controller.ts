import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { EstadoReporteEnum, TipoReporteEnum } from '@prisma/client';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { UPLOADS_DIR } from '../../shared/uploads';
import { registrarAuditoria } from './auditoria.service';

const TIPOS: TipoReporteEnum[] = ['MATERIAL', 'PREGUNTA', 'RESPUESTA', 'MENSAJE'];
const MAX_MOTIVO = 500;
const MIN_MOTIVO = 5;

const REPORTANTE_SELECT = { id: true, nombre: true } as const;

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function tipoValido(value: string): value is TipoReporteEnum {
  return (TIPOS as string[]).includes(value);
}

function serializarReporte(reporte: {
  id: string;
  tipo: TipoReporteEnum;
  referenciaId: string;
  motivo: string;
  estado: EstadoReporteEnum;
  creadoEn: Date;
  resueltoEn: Date | null;
  reportante: { id: string; nombre: string };
  resueltoPor: { id: string; nombre: string } | null;
}) {
  return {
    id: reporte.id,
    tipo: reporte.tipo,
    referenciaId: reporte.referenciaId,
    motivo: reporte.motivo,
    estado: reporte.estado,
    creadoEn: reporte.creadoEn.toISOString(),
    resueltoEn: reporte.resueltoEn?.toISOString() ?? null,
    reportante: reporte.reportante,
    resueltoPor: reporte.resueltoPor,
  };
}

async function contenidoExiste(tipo: TipoReporteEnum, referenciaId: string): Promise<boolean> {
  switch (tipo) {
    case 'MATERIAL':
      return !!(await prisma.materialEstudio.findUnique({
        where: { id: referenciaId },
        select: { id: true },
      }));
    case 'PREGUNTA':
      return !!(await prisma.pregunta.findUnique({
        where: { id: referenciaId },
        select: { id: true },
      }));
    case 'RESPUESTA':
      return !!(await prisma.respuesta.findUnique({
        where: { id: referenciaId },
        select: { id: true },
      }));
    case 'MENSAJE':
      return !!(await prisma.mensajeChat.findUnique({
        where: { id: referenciaId },
        select: { id: true },
      }));
    default:
      return false;
  }
}

// ---------------------------------------------------------
// POST /api/reportes (cualquier usuario autenticado)
// ---------------------------------------------------------
export const crearReporte = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado.' });

  const tipoTexto = text(req.body?.tipo).toUpperCase();
  const referenciaId = text(req.body?.referenciaId);
  const motivo = text(req.body?.motivo);

  if (!tipoValido(tipoTexto)) {
    return res.status(400).json({ error: 'El tipo de contenido no es válido.' });
  }
  if (!referenciaId) {
    return res.status(400).json({ error: 'No se indicó el contenido a reportar.' });
  }
  if (motivo.length < MIN_MOTIVO || motivo.length > MAX_MOTIVO) {
    return res.status(400).json({
      error: `El motivo debe tener entre ${MIN_MOTIVO} y ${MAX_MOTIVO} caracteres.`,
    });
  }

  try {
    if (!(await contenidoExiste(tipoTexto, referenciaId))) {
      return res.status(404).json({ error: 'El contenido ya no existe.' });
    }

    const duplicado = await prisma.reporte.findFirst({
      where: {
        tipo: tipoTexto,
        referenciaId,
        reportanteId: req.user.id,
        estado: 'PENDIENTE',
      },
      select: { id: true },
    });
    if (duplicado) {
      return res.status(409).json({
        error: 'Ya reportaste este contenido. Un administrador lo revisará pronto.',
      });
    }

    const reporte = await prisma.reporte.create({
      data: {
        tipo: tipoTexto,
        referenciaId,
        motivo,
        reportanteId: req.user.id,
      },
      include: {
        reportante: { select: REPORTANTE_SELECT },
        resueltoPor: { select: REPORTANTE_SELECT },
      },
    });

    return res.status(201).json({
      message: 'Gracias. Un administrador revisará tu reporte.',
      reporte: serializarReporte(reporte),
    });
  } catch (error) {
    console.error('[reportes:crear]', error);
    return res.status(500).json({ error: 'No se pudo enviar el reporte.' });
  }
};

// ---------------------------------------------------------
// GET /api/admin/reportes?estado=todos|pendientes|resueltos
// ---------------------------------------------------------
export const listarReportes = async (req: AuthRequest, res: Response) => {
  const estadoTexto = text(req.query.estado).toLowerCase() || 'todos';
  const where =
    estadoTexto === 'pendientes'
      ? { estado: 'PENDIENTE' as const }
      : estadoTexto === 'resueltos'
        ? { estado: 'RESUELTO' as const }
        : undefined;

  try {
    const [reportes, agrupados] = await Promise.all([
      prisma.reporte.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        include: {
          reportante: { select: REPORTANTE_SELECT },
          resueltoPor: { select: REPORTANTE_SELECT },
        },
      }),
      prisma.reporte.groupBy({
        by: ['estado'],
        _count: { _all: true },
      }),
    ]);

    const totales = { pendientes: 0, resueltos: 0 };
    agrupados.forEach((grupo) => {
      if (grupo.estado === 'PENDIENTE') totales.pendientes = grupo._count._all;
      if (grupo.estado === 'RESUELTO') totales.resueltos = grupo._count._all;
    });

    return res.json({
      reportes: reportes.map(serializarReporte),
      totales,
    });
  } catch (error) {
    console.error('[admin:reportes:listar]', error);
    return res.status(500).json({ error: 'No se pudieron cargar los reportes.' });
  }
};

async function retirarContenido(
  tipo: TipoReporteEnum,
  referenciaId: string
): Promise<{ existia: boolean; descripcion: string }> {
  if (tipo === 'MATERIAL') {
    const material = await prisma.materialEstudio.findUnique({
      where: { id: referenciaId },
      select: { id: true, nombreOriginal: true, nombreArchivo: true },
    });
    if (!material) return { existia: false, descripcion: 'material ya eliminado' };

    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(material.nombreArchivo)));
    } catch (error) {
      const codigo = (error as NodeJS.ErrnoException).code;
      if (codigo !== 'ENOENT') console.error('[admin:reportes:archivo]', error);
    }

    await prisma.materialEstudio.delete({ where: { id: material.id } });
    return { existia: true, descripcion: `material “${material.nombreOriginal}”` };
  }

  if (tipo === 'PREGUNTA') {
    const pregunta = await prisma.pregunta.findUnique({
      where: { id: referenciaId },
      select: { id: true, titulo: true },
    });
    if (!pregunta) return { existia: false, descripcion: 'pregunta ya eliminada' };

    await prisma.pregunta.delete({ where: { id: pregunta.id } });
    return { existia: true, descripcion: `pregunta “${pregunta.titulo}”` };
  }

  if (tipo === 'RESPUESTA') {
    const respuesta = await prisma.respuesta.findUnique({
      where: { id: referenciaId },
      select: {
        id: true,
        preguntaId: true,
        aceptada: true,
        contenido: true,
      },
    });
    if (!respuesta) return { existia: false, descripcion: 'respuesta ya eliminada' };

    await prisma.respuesta.delete({ where: { id: respuesta.id } });
    if (respuesta.aceptada) {
      await prisma.pregunta.update({
        where: { id: respuesta.preguntaId },
        data: { resuelta: false },
      });
    }
    return {
      existia: true,
      descripcion: `respuesta “${respuesta.contenido.slice(0, 60)}”`,
    };
  }

  const mensaje = await prisma.mensajeChat.findUnique({
    where: { id: referenciaId },
    select: { id: true, contenido: true },
  });
  if (!mensaje) return { existia: false, descripcion: 'mensaje ya eliminado' };

  await prisma.mensajeChat.delete({ where: { id: mensaje.id } });
  return {
    existia: true,
    descripcion: `mensaje “${mensaje.contenido.slice(0, 60)}”`,
  };
}

// ---------------------------------------------------------
// PATCH /api/admin/reportes/:id
// body: { accion: 'retirar' | 'descartar' }
// ---------------------------------------------------------
export const resolverReporte = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado.' });

  const id = text(req.params.id);
  const accion = text(req.body?.accion).toLowerCase();

  if (!id) return res.status(400).json({ error: 'El reporte no es válido.' });
  if (accion !== 'retirar' && accion !== 'descartar') {
    return res.status(400).json({ error: 'Indica si vas a retirar el contenido o descartar el reporte.' });
  }

  try {
    const reporte = await prisma.reporte.findUnique({
      where: { id },
      include: { reportante: { select: REPORTANTE_SELECT } },
    });

    if (!reporte) {
      return res.status(404).json({ error: 'El reporte no existe.' });
    }
    if (reporte.estado === 'RESUELTO') {
      return res.status(400).json({ error: 'Este reporte ya fue revisado.' });
    }

    let detalle: string;

    if (accion === 'retirar') {
      const resultado = await retirarContenido(reporte.tipo, reporte.referenciaId);
      detalle = resultado.existia
        ? `Retiró ${resultado.descripcion} reportado por ${reporte.reportante.nombre}.`
        : `Cerró el reporte: ${resultado.descripcion}.`;
    } else {
      detalle = `Descartó el reporte de ${reporte.tipo.toLowerCase()} enviado por ${reporte.reportante.nombre}.`;
    }

    const resueltoEn = new Date();
    const actualizado = await prisma.reporte.update({
      where: { id },
      data: {
        estado: 'RESUELTO',
        resueltoPorId: req.user.id,
        resueltoEn,
      },
      include: {
        reportante: { select: REPORTANTE_SELECT },
        resueltoPor: { select: REPORTANTE_SELECT },
      },
    });

    // Si el contenido se retiró, los demás reportes pendientes sobre el mismo
    // contenido quedan cerrados para no dejar cola de moderación fantasma.
    if (accion === 'retirar') {
      await prisma.reporte.updateMany({
        where: {
          tipo: reporte.tipo,
          referenciaId: reporte.referenciaId,
          estado: 'PENDIENTE',
          NOT: { id },
        },
        data: {
          estado: 'RESUELTO',
          resueltoPorId: req.user.id,
          resueltoEn,
        },
      });
    }

    await registrarAuditoria(
      req.user.id,
      accion === 'retirar' ? 'CONTENIDO_RETIRADO' : 'REPORTE_DESCARTADO',
      detalle
    );

    return res.json({
      message:
        accion === 'retirar'
          ? 'Contenido retirado y reporte resuelto.'
          : 'Reporte descartado.',
      reporte: serializarReporte(actualizado),
    });
  } catch (error) {
    console.error('[admin:reportes:resolver]', error);
    return res.status(500).json({ error: 'No se pudo resolver el reporte.' });
  }
};
