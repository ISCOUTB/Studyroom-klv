import { randomInt } from 'crypto';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { esParticipanteActivo, listarMensajesSala } from './chat.service';
import { expulsarUsuarioDeSala } from './chat.socket';

const ASIGNATURAS = [
  'Cálculo I',
  'Física I',
  'Álgebra Lineal',
  'Estadística',
  'Cálculo Integral',
];

const ESTADOS_CREACION: Record<string, 'ACTIVA' | 'PROGRAMADA'> = {
  activa: 'ACTIVA',
  programada: 'PROGRAMADA',
};

const ESTADOS_VISIBLES: Array<'ACTIVA' | 'PROGRAMADA'> = ['ACTIVA', 'PROGRAMADA'];
const ETIQUETA_ESTADO: Record<string, string> = {
  ACTIVA: 'Activa',
  PROGRAMADA: 'Programada',
  FINALIZADA: 'Finalizada',
};

const PRIVACIDADES_CREACION: Record<string, 'PUBLICA' | 'PRIVADA'> = {
  publica: 'PUBLICA',
  pública: 'PUBLICA',
  privada: 'PRIVADA',
};

const CARACTERES_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function estadoParaCrear(value: unknown): 'ACTIVA' | 'PROGRAMADA' | null {
  return ESTADOS_CREACION[text(value).toLowerCase()] ?? null;
}

function privacidadParaCrear(
  value: unknown
): 'PUBLICA' | 'PRIVADA' | null {
  return PRIVACIDADES_CREACION[text(value).toLowerCase()] ?? null;
}

function normalizarCodigo(value: unknown): string {
  return text(value).toUpperCase().replace(/\s+/g, '');
}

function generarCodigo(): string {
  return Array.from(
    { length: 6 },
    () => CARACTERES_CODIGO[randomInt(CARACTERES_CODIGO.length)]
  ).join('');
}

async function generarCodigoUnico(): Promise<string> {
  for (let intento = 0; intento < 12; intento += 1) {
    const codigo = generarCodigo();
    const existente = await prisma.salaEstudio.findUnique({
      where: { codigoAcceso: codigo },
      select: { id: true },
    });
    if (!existente) return codigo;
  }

  throw new Error('No se pudo generar un código de acceso único.');
}

type UsuarioResumen = {
  id: string;
  nombre: string;
  rol: string;
};

type ParticipacionSala = {
  usuarioId: string;
  estado: string;
  unioEn: Date;
  usuario?: UsuarioResumen;
};

type SalaConRelaciones = {
  id: string;
  anfitrionId: string;
  titulo: string;
  asignatura: string;
  tema: string;
  descripcion: string;
  cupoMaximo: number;
  privacidad: string;
  estado: string;
  programadaEn: Date | null;
  codigoAcceso: string | null;
  creadoEn: Date;
  anfitrion: UsuarioResumen;
  participantes?: ParticipacionSala[];
};

function serializarSala(sala: SalaConRelaciones, usuarioId: string, detalle = false) {
  const participantesActivos = (sala.participantes ?? []).filter(
    (participacion) => participacion.estado === 'ACTIVO'
  );
  const participando = participantesActivos.some(
    (participacion) => participacion.usuarioId === usuarioId
  );
  const esAnfitrion = sala.anfitrionId === usuarioId;

  const respuesta: Record<string, unknown> = {
    id: sala.id,
    titulo: sala.titulo,
    asignatura: sala.asignatura,
    tema: sala.tema,
    descripcion: sala.descripcion,
    anfitrion: {
      id: sala.anfitrion.id,
      nombre: sala.anfitrion.nombre,
    },
    participantesActuales: participantesActivos.length,
    cupoMaximo: sala.cupoMaximo,
    estado: ETIQUETA_ESTADO[sala.estado] ?? 'Activa',
    privacidad: sala.privacidad === 'PRIVADA' ? 'Privada' : 'Pública',
    programadaEn: sala.programadaEn ? sala.programadaEn.toISOString() : null,
    codigoAcceso: esAnfitrion || participando ? sala.codigoAcceso : null,
    creadoEn: sala.creadoEn,
    esAnfitrion,
    participando,
  };

  if (detalle) {
    respuesta.participantes = participantesActivos.map((participacion) => ({
      id: participacion.usuario?.id ?? participacion.usuarioId,
      nombre: participacion.usuario?.nombre ?? 'Usuario UTB',
      rol: participacion.usuario?.rol ?? 'ESTUDIANTE',
      esAnfitrion: participacion.usuarioId === sala.anfitrionId,
      unioEn: participacion.unioEn,
    }));
  }

  return respuesta;
}

// ---------------------------------------------------------
// GET /api/salas
// ---------------------------------------------------------
export const listarSalas = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    const codigo = normalizarCodigo(
      req.query.codigo ?? req.query.codigoAcceso
    );

    // Las salas privadas solo se listan para su anfitrión, sus participantes
    // activos o para quien consulte con el código de acceso.
    const condiciones: Prisma.SalaEstudioWhereInput[] = [
      { privacidad: 'PUBLICA' },
      { anfitrionId: req.user.id },
      {
        participantes: {
          some: { usuarioId: req.user.id, estado: 'ACTIVO' },
        },
      },
    ];
    if (codigo) {
      condiciones.push({ codigoAcceso: codigo });
    }

    const where: Prisma.SalaEstudioWhereInput = codigo
      ? { estado: { in: ESTADOS_VISIBLES }, codigoAcceso: codigo }
      : { estado: { in: ESTADOS_VISIBLES }, OR: condiciones };

    const salas = await prisma.salaEstudio.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { creadoEn: 'desc' }],
      include: {
        anfitrion: { select: { id: true, nombre: true, rol: true } },
        participantes: {
          where: { estado: 'ACTIVO' },
          select: { usuarioId: true, estado: true, unioEn: true },
        },
      },
    });

    return res.json({
      salas: salas.map((sala) => serializarSala(sala, req.user!.id)),
    });
  } catch (error) {
    console.error('[salas:listar]', error);
    return res.status(500).json({ error: 'No se pudieron cargar las salas de estudio.' });
  }
};

// ---------------------------------------------------------
// POST /api/salas
// ---------------------------------------------------------
export const crearSala = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const titulo = text(req.body?.titulo);
  const asignatura = text(req.body?.asignatura);
  const tema = text(req.body?.tema);
  const descripcion = text(req.body?.descripcion);
  const estado = estadoParaCrear(req.body?.estado ?? 'Activa');
  const privacidad = privacidadParaCrear(
    req.body?.privacidad ?? 'Pública'
  );
  const cupoMaximo = Number(req.body?.cupoMaximo ?? 10);
  const programadaEnTexto = text(req.body?.programadaEn);
  let programadaEn: Date | null = null;

  if (titulo.length < 3 || titulo.length > 100) {
    return res.status(400).json({
      error: 'El título debe tener entre 3 y 100 caracteres.',
    });
  }
  if (!ASIGNATURAS.includes(asignatura)) {
    return res.status(400).json({
      error: 'Selecciona una asignatura válida.',
    });
  }
  if (tema.length < 3 || tema.length > 140) {
    return res.status(400).json({
      error: 'El tema debe tener entre 3 y 140 caracteres.',
    });
  }
  if (descripcion.length < 5 || descripcion.length > 600) {
    return res.status(400).json({
      error: 'La descripción debe tener entre 5 y 600 caracteres.',
    });
  }
  if (!estado) {
    return res.status(400).json({
      error: 'El estado debe ser Activa o Programada.',
    });
  }
  if (!privacidad) {
    return res.status(400).json({
      error: 'La privacidad debe ser Pública o Privada.',
    });
  }
  if (!Number.isInteger(cupoMaximo) || cupoMaximo < 2 || cupoMaximo > 50) {
    return res.status(400).json({
      error: 'El cupo máximo debe estar entre 2 y 50 participantes.',
    });
  }

  if (estado === 'PROGRAMADA') {
    programadaEn = new Date(programadaEnTexto);

    if (!programadaEnTexto || Number.isNaN(programadaEn.getTime())) {
      return res.status(400).json({
        error: 'Selecciona la fecha y la hora de la sala programada.',
      });
    }
    if (programadaEn.getTime() <= Date.now()) {
      return res.status(400).json({
        error: 'La fecha y la hora de la sala deben ser futuras.',
      });
    }
  }

  try {
    const codigoAcceso =
      privacidad === 'PRIVADA' ? await generarCodigoUnico() : null;

    const sala = await prisma.salaEstudio.create({
      data: {
        anfitrionId: req.user.id,
        titulo,
        asignatura,
        tema,
        descripcion,
        cupoMaximo,
        estado,
        privacidad,
        programadaEn,
        codigoAcceso,
        // El anfitrión cuenta como primer participante de la sala.
        participantes: {
          create: { usuarioId: req.user.id },
        },
      },
      include: {
        anfitrion: { select: { id: true, nombre: true, rol: true } },
        participantes: {
          where: { estado: 'ACTIVO' },
          select: { usuarioId: true, estado: true, unioEn: true },
        },
      },
    });

    return res.status(201).json({
      message: 'Sala de estudio creada con éxito.',
      sala: serializarSala(sala, req.user.id),
    });
  } catch (error) {
    console.error('[salas:crear]', error);
    return res.status(500).json({ error: 'No se pudo crear la sala de estudio.' });
  }
};

// ---------------------------------------------------------
// GET /api/salas/:id
// ---------------------------------------------------------
export const obtenerSala = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const id = text(req.params.id);

  try {
    const sala = await prisma.salaEstudio.findUnique({
      where: { id },
      include: {
        anfitrion: { select: { id: true, nombre: true, rol: true } },
        participantes: {
          where: { estado: 'ACTIVO' },
          orderBy: { unioEn: 'asc' },
          include: {
            usuario: { select: { id: true, nombre: true, rol: true } },
          },
        },
      },
    });

    if (!sala) {
      return res.status(404).json({ error: 'La sala de estudio no existe.' });
    }

    return res.json({ sala: serializarSala(sala, req.user.id, true) });
  } catch (error) {
    console.error('[salas:detalle]', error);
    return res.status(500).json({ error: 'No se pudo cargar la sala de estudio.' });
  }
};

// ---------------------------------------------------------
// GET /api/salas/:id/mensajes
// ---------------------------------------------------------
export const listarMensajes = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const salaId = text(req.params.id);

  try {
    const sala = await prisma.salaEstudio.findUnique({
      where: { id: salaId },
      select: { id: true },
    });

    if (!sala) {
      return res.status(404).json({ error: 'La sala de estudio no existe.' });
    }

    const participa = await esParticipanteActivo(salaId, req.user.id);
    if (!participa) {
      return res.status(403).json({
        error: 'Únete a la sala para ver el historial de mensajes.',
      });
    }

    const mensajes = await listarMensajesSala(salaId);
    return res.json({ mensajes });
  } catch (error) {
    console.error('[salas:mensajes]', error);
    return res.status(500).json({ error: 'No se pudo cargar la mensajería de la sala.' });
  }
};

// ---------------------------------------------------------
// POST /api/salas/:id/unirse
// ---------------------------------------------------------
export const unirseSala = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const salaId = text(req.params.id);

  try {
    const sala = await prisma.salaEstudio.findUnique({
      where: { id: salaId },
      select: {
        id: true,
        estado: true,
        cupoMaximo: true,
        privacidad: true,
        codigoAcceso: true,
        anfitrionId: true,
        programadaEn: true,
      },
    });

    if (!sala) {
      return res.status(404).json({ error: 'La sala de estudio no existe.' });
    }
    if (sala.estado === 'FINALIZADA') {
      return res.status(400).json({ error: 'Esta sala ya finalizó.' });
    }
    if (
      sala.estado === 'PROGRAMADA' &&
      sala.programadaEn &&
      sala.programadaEn.getTime() > Date.now()
    ) {
      return res.status(400).json({
        error: 'La sala aún no ha comenzado. Inténtalo a la hora programada.',
      });
    }

    const participacion = await prisma.participacionSala.findUnique({
      where: { salaId_usuarioId: { salaId, usuarioId: req.user.id } },
    });

    if (participacion?.estado === 'ACTIVO') {
      return res.json({ message: 'Ya estabas dentro de la sala.' });
    }

    if (sala.privacidad === 'PRIVADA' && sala.anfitrionId !== req.user.id) {
      const codigo = normalizarCodigo(req.body?.codigoAcceso);
      if (!codigo) {
        return res.status(403).json({
          error: 'Esta sala es privada. Ingresa el código de acceso.',
        });
      }
      if (codigo !== sala.codigoAcceso) {
        return res.status(403).json({
          error: 'El código de acceso no es correcto. Verifícalo e inténtalo de nuevo.',
        });
      }
    }

    const participantesActivos = await prisma.participacionSala.count({
      where: { salaId, estado: 'ACTIVO' },
    });

    if (participantesActivos >= sala.cupoMaximo) {
      return res.status(409).json({ error: 'La sala está llena.' });
    }

    await prisma.participacionSala.upsert({
      where: { salaId_usuarioId: { salaId, usuarioId: req.user.id } },
      update: { estado: 'ACTIVO', unioEn: new Date() },
      create: { salaId, usuarioId: req.user.id },
    });

    return res.json({ message: 'Te uniste a la sala de estudio.' });
  } catch (error) {
    console.error('[salas:unirse]', error);
    return res.status(500).json({ error: 'No se pudo unir a la sala de estudio.' });
  }
};

// ---------------------------------------------------------
// POST /api/salas/:id/abandonar
// ---------------------------------------------------------
export const abandonarSala = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const salaId = text(req.params.id);

  try {
    const participacion = await prisma.participacionSala.findUnique({
      where: { salaId_usuarioId: { salaId, usuarioId: req.user.id } },
    });

    if (!participacion) {
      return res.json({ message: 'No estabas dentro de la sala.' });
    }

    await prisma.participacionSala.update({
      where: { id: participacion.id },
      data: { estado: 'ABANDONO' },
    });

    // Si tenía la mensajería abierta, se le saca del canal en tiempo real.
    await expulsarUsuarioDeSala(salaId, req.user.id);

    return res.json({ message: 'Saliste de la sala de estudio.' });
  } catch (error) {
    console.error('[salas:abandonar]', error);
    return res.status(500).json({ error: 'No se pudo salir de la sala de estudio.' });
  }
};
