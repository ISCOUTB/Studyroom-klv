import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { crearNotificacion } from '../notificaciones/notificaciones.service';
import { esAsignaturaActiva } from '../admin/catalogo.service';

const MAX_TITULO = 150;
const MAX_DESCRIPCION = 1000;
const MAX_ASIGNATURA = 80;
const MAX_TEMA = 80;
const MAX_CONTENIDO = 1000;
const MIN_TITULO = 5;
const MIN_DESCRIPCION = 10;
const MIN_CONTENIDO = 3;
const MAX_PREGUNTAS = 100;

const ESTADOS = new Set(['todas', 'sin-resolver', 'resueltas']);

const AUTOR_SELECT = {
  id: true,
  nombre: true,
  fotoUrl: true,
  rol: true,
} as const;

type AutorPublico = {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  rol: string;
};

type PreguntaConAutor = {
  id: string;
  autorId: string;
  titulo: string;
  descripcion: string;
  asignatura: string;
  tema: string | null;
  resuelta: boolean;
  creadoEn: Date;
  autor: AutorPublico;
};

type RespuestaConAutor = {
  id: string;
  preguntaId: string;
  autorId: string;
  contenido: string;
  aceptada: boolean;
  creadoEn: Date;
  autor: AutorPublico;
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function serializarAutor(autor: AutorPublico) {
  return {
    id: autor.id,
    nombre: autor.nombre,
    fotoUrl: autor.fotoUrl,
    rol: autor.rol,
  };
}

function serializarPregunta(
  pregunta: PreguntaConAutor,
  usuarioId: string,
  totalRespuestas: number
) {
  return {
    id: pregunta.id,
    titulo: pregunta.titulo,
    descripcion: pregunta.descripcion,
    asignatura: pregunta.asignatura,
    tema: pregunta.tema,
    resuelta: pregunta.resuelta,
    creadoEn: pregunta.creadoEn.toISOString(),
    autor: serializarAutor(pregunta.autor),
    totalRespuestas,
    soyAutor: pregunta.autorId === usuarioId,
  };
}

function serializarRespuesta(respuesta: RespuestaConAutor, usuarioId: string) {
  return {
    id: respuesta.id,
    contenido: respuesta.contenido,
    aceptada: respuesta.aceptada,
    creadoEn: respuesta.creadoEn.toISOString(),
    autor: serializarAutor(respuesta.autor),
    soyAutor: respuesta.autorId === usuarioId,
  };
}

// ---------------------------------------------------------
// GET /api/foro?asignatura=&estado=&q=&tema=
// ---------------------------------------------------------
export const listarPreguntas = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const asignatura = text(req.query.asignatura);
  const estado = text(req.query.estado).toLowerCase() || 'todas';
  const q = text(req.query.q);
  const tema = text(req.query.tema);

  const where: Prisma.PreguntaWhereInput = {};

  if (asignatura && asignatura.toLowerCase() !== 'todas') {
    where.asignatura = asignatura;
  }

  if (estado === 'sin-resolver') {
    where.resuelta = false;
  } else if (estado === 'resueltas') {
    where.resuelta = true;
  } else if (!ESTADOS.has(estado)) {
    return res.status(400).json({ error: 'El estado solicitado no es válido.' });
  }

  if (tema) {
    where.tema = { contains: tema, mode: 'insensitive' };
  }

  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: 'insensitive' } },
      { descripcion: { contains: q, mode: 'insensitive' } },
    ];
  }

  try {
    const preguntas = await prisma.pregunta.findMany({
      where,
      orderBy: [{ resuelta: 'asc' }, { creadoEn: 'desc' }],
      take: MAX_PREGUNTAS,
      include: {
        autor: { select: AUTOR_SELECT },
        _count: { select: { respuestas: true } },
      },
    });

    return res.json({
      preguntas: preguntas.map((pregunta) =>
        serializarPregunta(
          pregunta,
          req.user!.id,
          pregunta._count.respuestas
        )
      ),
      total: preguntas.length,
    });
  } catch (error) {
    console.error('[foro:listar]', error);
    return res.status(500).json({ error: 'No se pudieron cargar las preguntas del foro.' });
  }
};

// ---------------------------------------------------------
// POST /api/foro
// ---------------------------------------------------------
export const crearPregunta = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const titulo = text(req.body?.titulo);
  const descripcion = text(req.body?.descripcion);
  const asignatura = text(req.body?.asignatura);
  const tema = text(req.body?.tema);

  if (titulo.length < MIN_TITULO) {
    return res
      .status(400)
      .json({ error: `El título debe tener al menos ${MIN_TITULO} caracteres.` });
  }
  if (titulo.length > MAX_TITULO) {
    return res
      .status(400)
      .json({ error: `El título no puede superar los ${MAX_TITULO} caracteres.` });
  }
  if (!asignatura) {
    return res.status(400).json({ error: 'Selecciona una asignatura.' });
  }
  if (asignatura.length > MAX_ASIGNATURA) {
    return res.status(400).json({ error: 'La asignatura no es válida.' });
  }
  if (!(await esAsignaturaActiva(asignatura))) {
    return res.status(400).json({ error: 'Selecciona una asignatura del catálogo.' });
  }
  if (tema.length > MAX_TEMA) {
    return res
      .status(400)
      .json({ error: `El tema no puede superar los ${MAX_TEMA} caracteres.` });
  }
  if (descripcion.length < MIN_DESCRIPCION) {
    return res.status(400).json({
      error: `La descripción debe tener al menos ${MIN_DESCRIPCION} caracteres.`,
    });
  }
  if (descripcion.length > MAX_DESCRIPCION) {
    return res.status(400).json({
      error: `La descripción no puede superar los ${MAX_DESCRIPCION} caracteres.`,
    });
  }

  try {
    const pregunta = await prisma.pregunta.create({
      data: {
        autorId: req.user.id,
        titulo,
        descripcion,
        asignatura,
        tema: tema || null,
      },
      include: {
        autor: { select: AUTOR_SELECT },
        _count: { select: { respuestas: true } },
      },
    });

    return res.status(201).json({
      message: 'Tu pregunta fue publicada.',
      pregunta: serializarPregunta(
        pregunta,
        req.user.id,
        pregunta._count.respuestas
      ),
    });
  } catch (error) {
    console.error('[foro:crear-pregunta]', error);
    return res.status(500).json({ error: 'No se pudo publicar tu pregunta.' });
  }
};

// ---------------------------------------------------------
// GET /api/foro/:id
// ---------------------------------------------------------
export const obtenerPregunta = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const id = text(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'La pregunta no es válida.' });
  }

  try {
    const pregunta = await prisma.pregunta.findUnique({
      where: { id },
      include: {
        autor: { select: AUTOR_SELECT },
        respuestas: {
          orderBy: [{ aceptada: 'desc' }, { creadoEn: 'asc' }],
          include: { autor: { select: AUTOR_SELECT } },
        },
      },
    });

    if (!pregunta) {
      return res.status(404).json({ error: 'La pregunta no existe o fue eliminada.' });
    }

    return res.json({
      pregunta: {
        ...serializarPregunta(pregunta, req.user.id, pregunta.respuestas.length),
        respuestas: pregunta.respuestas.map((respuesta) =>
          serializarRespuesta(respuesta, req.user!.id)
        ),
      },
    });
  } catch (error) {
    console.error('[foro:detalle]', error);
    return res.status(500).json({ error: 'No se pudo cargar la pregunta.' });
  }
};

// ---------------------------------------------------------
// POST /api/foro/:id/respuestas
// ---------------------------------------------------------
export const crearRespuesta = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const preguntaId = text(req.params.id);
  const contenido = text(req.body?.contenido);

  if (!preguntaId) {
    return res.status(400).json({ error: 'La pregunta no es válida.' });
  }
  if (contenido.length < MIN_CONTENIDO) {
    return res.status(400).json({
      error: `La respuesta debe tener al menos ${MIN_CONTENIDO} caracteres.`,
    });
  }
  if (contenido.length > MAX_CONTENIDO) {
    return res.status(400).json({
      error: `La respuesta no puede superar los ${MAX_CONTENIDO} caracteres.`,
    });
  }

  try {
    const pregunta = await prisma.pregunta.findUnique({
      where: { id: preguntaId },
      select: { id: true, autorId: true, titulo: true },
    });

    if (!pregunta) {
      return res.status(404).json({ error: 'La pregunta no existe o fue eliminada.' });
    }

    const respuesta = await prisma.respuesta.create({
      data: {
        preguntaId: pregunta.id,
        autorId: req.user.id,
        contenido,
      },
      include: { autor: { select: AUTOR_SELECT } },
    });

    if (pregunta.autorId !== req.user.id) {
      await crearNotificacion({
        usuarioId: pregunta.autorId,
        tipo: 'FORO_RESPUESTA',
        titulo: 'Nueva respuesta en tu pregunta',
        mensaje: `${respuesta.autor.nombre} respondió a “${pregunta.titulo}”.`,
        enlace: `/foro/${pregunta.id}`,
      });
    }

    return res.status(201).json({
      message: 'Tu respuesta fue publicada.',
      respuesta: serializarRespuesta(respuesta, req.user.id),
    });
  } catch (error) {
    console.error('[foro:crear-respuesta]', error);
    return res.status(500).json({ error: 'No se pudo publicar tu respuesta.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/foro/:id/respuestas/:respuestaId/aceptar
// ---------------------------------------------------------
export const aceptarRespuesta = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const preguntaId = text(req.params.id);
  const respuestaId = text(req.params.respuestaId);

  if (!preguntaId || !respuestaId) {
    return res.status(400).json({ error: 'La respuesta no es válida.' });
  }

  try {
    const pregunta = await prisma.pregunta.findUnique({
      where: { id: preguntaId },
      select: { id: true, autorId: true, titulo: true },
    });

    if (!pregunta) {
      return res.status(404).json({ error: 'La pregunta no existe o fue eliminada.' });
    }
    if (pregunta.autorId !== req.user.id) {
      return res
        .status(403)
        .json({ error: 'Solo quien hizo la pregunta puede aceptar una respuesta.' });
    }

    const respuesta = await prisma.respuesta.findFirst({
      where: { id: respuestaId, preguntaId: pregunta.id },
      select: { id: true, autorId: true, aceptada: true },
    });

    if (!respuesta) {
      return res.status(404).json({ error: 'La respuesta no existe.' });
    }

    await prisma.$transaction([
      prisma.respuesta.updateMany({
        where: { preguntaId: pregunta.id },
        data: { aceptada: false },
      }),
      prisma.respuesta.update({
        where: { id: respuesta.id },
        data: { aceptada: true },
      }),
      prisma.pregunta.update({
        where: { id: pregunta.id },
        data: { resuelta: true },
      }),
    ]);

    if (respuesta.autorId !== req.user.id) {
      await crearNotificacion({
        usuarioId: respuesta.autorId,
        tipo: 'FORO_ACEPTADA',
        titulo: 'Tu respuesta fue aceptada',
        mensaje: `Tu respuesta en “${pregunta.titulo}” fue marcada como la respuesta aceptada.`,
        enlace: `/foro/${pregunta.id}`,
      });
    }

    return res.json({
      message: 'Respuesta marcada como aceptada.',
      resuelta: true,
      respuestaId: respuesta.id,
    });
  } catch (error) {
    console.error('[foro:aceptar-respuesta]', error);
    return res.status(500).json({ error: 'No se pudo aceptar la respuesta.' });
  }
};

// ---------------------------------------------------------
// DELETE /api/foro/:id
// ---------------------------------------------------------
export const eliminarPregunta = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const id = text(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'La pregunta no es válida.' });
  }

  try {
    const pregunta = await prisma.pregunta.findUnique({
      where: { id },
      select: { id: true, autorId: true },
    });

    if (!pregunta) {
      return res.status(404).json({ error: 'La pregunta no existe o fue eliminada.' });
    }

    const esAdmin = req.user.rol === 'ADMINISTRADOR';
    if (pregunta.autorId !== req.user.id && !esAdmin) {
      return res
        .status(403)
        .json({ error: 'Solo el autor de la pregunta o un administrador pueden eliminarla.' });
    }

    await prisma.pregunta.delete({ where: { id: pregunta.id } });

    return res.json({ message: 'La pregunta y sus respuestas fueron eliminadas.' });
  } catch (error) {
    console.error('[foro:eliminar-pregunta]', error);
    return res.status(500).json({ error: 'No se pudo eliminar la pregunta.' });
  }
};

// ---------------------------------------------------------
// DELETE /api/foro/:id/respuestas/:respuestaId
// ---------------------------------------------------------
export const eliminarRespuesta = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const preguntaId = text(req.params.id);
  const respuestaId = text(req.params.respuestaId);

  if (!preguntaId || !respuestaId) {
    return res.status(400).json({ error: 'La respuesta no es válida.' });
  }

  try {
    const respuesta = await prisma.respuesta.findFirst({
      where: { id: respuestaId, preguntaId },
      select: { id: true, autorId: true, aceptada: true },
    });

    if (!respuesta) {
      return res.status(404).json({ error: 'La respuesta no existe.' });
    }

    const esAdmin = req.user.rol === 'ADMINISTRADOR';
    if (respuesta.autorId !== req.user.id && !esAdmin) {
      return res
        .status(403)
        .json({ error: 'Solo el autor de la respuesta o un administrador pueden eliminarla.' });
    }

    await prisma.$transaction([
      prisma.respuesta.delete({ where: { id: respuesta.id } }),
      ...(respuesta.aceptada
        ? [
            prisma.pregunta.update({
              where: { id: preguntaId },
              data: { resuelta: false },
            }),
          ]
        : []),
    ]);

    return res.json({ message: 'La respuesta fue eliminada.' });
  } catch (error) {
    console.error('[foro:eliminar-respuesta]', error);
    return res.status(500).json({ error: 'No se pudo eliminar la respuesta.' });
  }
};
