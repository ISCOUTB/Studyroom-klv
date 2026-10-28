import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import {
  crearNotificacion,
  crearNotificaciones,
  formatearFechaNotificacion,
} from '../notificaciones/notificaciones.service';
import { actualizarSolicitudesExpiradas } from './tutorias.service';

const MODALIDADES: Record<string, 'VIRTUAL' | 'PRESENCIAL'> = {
  virtual: 'VIRTUAL',
  presencial: 'PRESENCIAL',
};

const ETIQUETA_ESTADO: Record<string, string> = {
  SOLICITADA: 'Solicitada',
  AGENDADA: 'Agendada',
  RECHAZADA: 'Rechazada',
  EXPIRADA: 'Expirada',
  CANCELADA: 'Cancelada',
  FINALIZADA: 'Finalizada',
};

const ETIQUETA_MODALIDAD: Record<string, string> = {
  VIRTUAL: 'Virtual',
  PRESENCIAL: 'Presencial',
};

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DURACION_MINIMA = 30;
const DURACION_MAXIMA = 4 * 60;
const MAX_NOTAS = 300;

type UsuarioResumen = {
  id: string;
  nombre: string;
  correoUnico?: string;
};

type TutorConUsuario = {
  id: string;
  carrera: string;
  semestre: number;
  fotoUrl: string | null;
  biografia: string | null;
  experiencia: string | null;
  modalidad: string;
  ubicacion: string | null;
  asignaturas: string[];
  aprobado: boolean;
  usuario: UsuarioResumen;
};

type DisponibilidadConTutorias = {
  id: string;
  tutorId: string;
  fecha: Date;
  horaIni: string;
  horaFin: string;
  diaSemana: string;
  tutorias?: Array<{ id: string; estado: string }>;
};

type TutoriaConRelaciones = {
  id: string;
  solicitanteId: string;
  monitorId: string;
  disponibilidadId: string | null;
  estado: string;
  solicitadaEn: Date;
  expiraEn: Date;
  respondidaEn: Date | null;
  programadaEn: Date | null;
  modalidad: string;
  ubicacion: string | null;
  notas: string | null;
  monitor: TutorConUsuario;
  solicitante: UsuarioResumen;
  disponibilidad: { id: string; fecha: Date; horaIni: string; horaFin: string; diaSemana: string } | null;
  calificacionTutoria?: { puntaje: number; comentario: string | null } | null;
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function fechaISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/**
 * Convierte "YYYY-MM-DD" en una fecha UTC a medianoche, tal como la guarda
 * PostgreSQL en una columna DATE. Evita corrimientos por zona horaria.
 */
function parseFecha(value: unknown): Date | null {
  const fecha = text(value);
  if (!FECHA_REGEX.test(fecha)) return null;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const date = new Date(Date.UTC(anio, mes - 1, dia));

  if (
    date.getUTCFullYear() !== anio ||
    date.getUTCMonth() !== mes - 1 ||
    date.getUTCDate() !== dia
  ) {
    return null;
  }

  return date;
}

function hoyUTC(): Date {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
}

function horaValida(hora: string): boolean {
  return HORA_REGEX.test(hora);
}

function minutosDe(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Combina una fecha local (YYYY-MM-DD) y una hora (HH:MM) en un Date local.
 * La fecha se parsea manualmente para no depender del formato del navegador.
 */
function combinarFechaHora(fecha: string, hora: string): Date | null {
  if (!FECHA_REGEX.test(fecha) || !horaValida(hora)) return null;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  const date = new Date(anio, mes - 1, dia, horas, minutos, 0, 0);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function diaSemanaDe(fecha: Date): string {
  return DIAS_SEMANA[fecha.getUTCDay()] ?? 'Lun';
}

function modalidadDe(value: unknown): 'VIRTUAL' | 'PRESENCIAL' | null {
  return MODALIDADES[text(value).toLowerCase()] ?? null;
}

function listaAsignaturas(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : text(value).split(',');
  const unicas: string[] = [];

  for (const item of raw) {
    const asignatura = text(item);
    if (asignatura && !unicas.includes(asignatura)) {
      unicas.push(asignatura);
    }
  }

  return unicas;
}

async function obtenerTutorAprobado(usuarioId: string) {
  const tutor = await prisma.tutor.findUnique({
    where: { id: usuarioId },
    select: { id: true, aprobado: true },
  });

  return tutor?.aprobado ? tutor : null;
}

function serializarDisponibilidad(bloque: DisponibilidadConTutorias) {
  const estados = (bloque.tutorias ?? []).map((tutoria) => tutoria.estado);
  const ocupado = estados.includes('AGENDADA');
  const solicitado = estados.includes('SOLICITADA');

  return {
    id: bloque.id,
    fecha: fechaISO(bloque.fecha),
    diaSemana: bloque.diaSemana,
    horaIni: bloque.horaIni,
    horaFin: bloque.horaFin,
    ocupado,
    solicitado,
  };
}

function serializarMonitor(
  tutor: TutorConUsuario,
  disponibilidad: DisponibilidadConTutorias[],
  puntajes: number[] = []
) {
  const totalResenas = puntajes.length;
  const promedio =
    totalResenas === 0
      ? 0
      : Math.round((puntajes.reduce((suma, puntaje) => suma + puntaje, 0) / totalResenas) * 10) / 10;

  return {
    id: tutor.id,
    nombre: tutor.usuario.nombre,
    correo: tutor.usuario.correoUnico,
    carrera: tutor.carrera,
    semestre: tutor.semestre,
    fotoUrl: tutor.fotoUrl,
    biografia: tutor.biografia,
    experiencia: tutor.experiencia,
    modalidad: ETIQUETA_MODALIDAD[tutor.modalidad] ?? 'Virtual',
    ubicacion: tutor.ubicacion,
    asignaturas: tutor.asignaturas,
    promedio,
    totalResenas,
    disponibilidad: disponibilidad.map(serializarDisponibilidad),
  };
}

function serializarTutoria(tutoria: TutoriaConRelaciones, usuarioId: string) {
  return {
    id: tutoria.id,
    estado: ETIQUETA_ESTADO[tutoria.estado] ?? tutoria.estado,
    estadoCodigo: tutoria.estado,
    solicitadaEn: tutoria.solicitadaEn,
    expiraEn: tutoria.expiraEn,
    respondidaEn: tutoria.respondidaEn,
    programadaEn: tutoria.programadaEn,
    modalidad: ETIQUETA_MODALIDAD[tutoria.modalidad] ?? 'Virtual',
    ubicacion: tutoria.ubicacion,
    notas: tutoria.notas,
    monitor: {
      id: tutoria.monitor.id,
      nombre: tutoria.monitor.usuario.nombre,
      correo: tutoria.monitor.usuario.correoUnico,
      carrera: tutoria.monitor.carrera,
      semestre: tutoria.monitor.semestre,
    },
    solicitante: {
      id: tutoria.solicitante.id,
      nombre: tutoria.solicitante.nombre,
      correo: tutoria.solicitante.correoUnico,
    },
    disponibilidad: tutoria.disponibilidad
      ? {
          id: tutoria.disponibilidad.id,
          fecha: fechaISO(tutoria.disponibilidad.fecha),
          diaSemana: tutoria.disponibilidad.diaSemana,
          horaIni: tutoria.disponibilidad.horaIni,
          horaFin: tutoria.disponibilidad.horaFin,
        }
      : null,
    soyMonitor: tutoria.monitorId === usuarioId,
    soySolicitante: tutoria.solicitanteId === usuarioId,
    calificacion: tutoria.calificacionTutoria
      ? {
          puntaje: tutoria.calificacionTutoria.puntaje,
          comentario: tutoria.calificacionTutoria.comentario,
        }
      : null,
    puedeCalificar:
      tutoria.solicitanteId === usuarioId &&
      tutoria.estado === 'FINALIZADA' &&
      !tutoria.calificacionTutoria,
  };
}

// ---------------------------------------------------------
// GET /api/tutorias/contexto
// ---------------------------------------------------------
export const obtenerContexto = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    const tutor = await prisma.tutor.findUnique({
      where: { id: req.user.id },
      select: {
        aprobado: true,
        carrera: true,
        semestre: true,
        biografia: true,
        experiencia: true,
        modalidad: true,
        ubicacion: true,
        asignaturas: true,
        solicitudEn: true,
      },
    });

    return res.json({
      esMonitor: Boolean(tutor?.aprobado),
      esAdmin: req.user.rol === 'ADMINISTRADOR',
      solicitud: tutor
        ? {
            aprobado: tutor.aprobado,
            carrera: tutor.carrera,
            semestre: tutor.semestre,
            biografia: tutor.biografia,
            experiencia: tutor.experiencia,
            modalidad: ETIQUETA_MODALIDAD[tutor.modalidad] ?? 'Virtual',
            ubicacion: tutor.ubicacion,
            asignaturas: tutor.asignaturas,
            solicitudEn: tutor.solicitudEn,
          }
        : null,
    });
  } catch (error) {
    console.error('[tutorias:contexto]', error);
    return res.status(500).json({ error: 'No se pudo cargar tu información de monitor.' });
  }
};

// ---------------------------------------------------------
// POST /api/tutorias/solicitud-monitor
// ---------------------------------------------------------
export const solicitarMonitor = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const carrera = text(req.body?.carrera);
  const semestre = Number(req.body?.semestre);
  const biografia = text(req.body?.biografia);
  const experiencia = text(req.body?.experiencia);
  const modalidad = modalidadDe(req.body?.modalidad ?? 'Virtual');
  const ubicacion = text(req.body?.ubicacion);
  const asignaturas = listaAsignaturas(req.body?.asignaturas);

  if (carrera.length < 2 || carrera.length > 120) {
    return res.status(400).json({ error: 'La carrera debe tener entre 2 y 120 caracteres.' });
  }
  if (!Number.isInteger(semestre) || semestre < 1 || semestre > 12) {
    return res.status(400).json({ error: 'El semestre debe estar entre 1 y 12.' });
  }
  if (biografia.length > 300) {
    return res.status(400).json({ error: 'La biografía no puede superar los 300 caracteres.' });
  }
  if (experiencia.length > 500) {
    return res.status(400).json({ error: 'La experiencia no puede superar los 500 caracteres.' });
  }
  if (!modalidad) {
    return res.status(400).json({ error: 'Selecciona una modalidad válida.' });
  }
  if (modalidad === 'PRESENCIAL' && (ubicacion.length < 3 || ubicacion.length > 120)) {
    return res.status(400).json({
      error: 'Indica el salón o la ubicación en el campus (entre 3 y 120 caracteres).',
    });
  }
  if (asignaturas.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos una asignatura que dominas.' });
  }
  if (asignaturas.length > 10 || asignaturas.some((asignatura) => asignatura.length > 60)) {
    return res.status(400).json({ error: 'Puedes registrar hasta 10 asignaturas de máximo 60 caracteres.' });
  }

  try {
    const existente = await prisma.tutor.findUnique({ where: { id: req.user.id } });

    if (existente?.aprobado) {
      return res.status(409).json({ error: 'Ya eres monitor aprobado en la plataforma.' });
    }

    const datos = {
      carrera,
      semestre,
      biografia: biografia || null,
      experiencia: experiencia || null,
      modalidad,
      ubicacion: modalidad === 'PRESENCIAL' ? ubicacion : null,
      asignaturas,
      aprobado: false,
    };

    if (existente) {
      await prisma.tutor.update({ where: { id: req.user.id }, data: datos });
    } else {
      await prisma.tutor.create({ data: { id: req.user.id, ...datos } });
    }

    // Avisar a todos los administradores para que revisen la postulación.
    // Es best-effort: un fallo al notificar no invalida la solicitud guardada.
    try {
      const [solicitante, admins] = await Promise.all([
        prisma.usuario.findUnique({
          where: { id: req.user.id },
          select: { nombre: true },
        }),
        prisma.usuario.findMany({
          where: { rol: 'ADMINISTRADOR' },
          select: { id: true },
        }),
      ]);

      await crearNotificaciones(
        admins.map((admin) => ({
          usuarioId: admin.id,
          tipo: 'SOLICITUD_MONITOR' as const,
          titulo: existente
            ? 'Solicitud de monitor actualizada'
            : 'Nueva solicitud de monitor',
          mensaje: `${solicitante?.nombre ?? 'Un estudiante'} ${
            existente ? 'actualizó su' : 'envió una'
          } solicitud para ser monitor de ${asignaturas.slice(0, 2).join(' y ')}${
            asignaturas.length > 2 ? '…' : '.'
          }`,
          enlace: '/admin?tab=monitores',
        }))
      );
    } catch (error) {
      console.error('[tutorias:solicitud-monitor:notificar]', error);
    }

    return res.status(existente ? 200 : 201).json({
      message: existente
        ? 'Solicitud actualizada. Un administrador la revisará pronto.'
        : 'Solicitud enviada. Un administrador revisará tu perfil para activarte como monitor.',
    });
  } catch (error) {
    console.error('[tutorias:solicitud-monitor]', error);
    return res.status(500).json({ error: 'No se pudo enviar la solicitud de monitor.' });
  }
};

// ---------------------------------------------------------
// GET /api/tutorias/perfil-monitor
// ---------------------------------------------------------
export const obtenerPerfilMonitor = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    const tutor = await prisma.tutor.findUnique({
      where: { id: req.user.id },
      include: {
        usuario: { select: { id: true, nombre: true, correoUnico: true } },
        disponibilidades: {
          where: { fecha: { gte: hoyUTC() } },
          orderBy: [{ fecha: 'asc' }, { horaIni: 'asc' }],
          include: {
            tutorias: {
              where: { estado: { in: ['SOLICITADA', 'AGENDADA'] } },
              select: { id: true, estado: true },
            },
          },
        },
      },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Aún no tienes un perfil de monitor.' });
    }

    return res.json({
      monitor: {
        ...serializarMonitor(tutor, tutor.disponibilidades),
        aprobado: tutor.aprobado,
        solicitudEn: tutor.solicitudEn,
      },
    });
  } catch (error) {
    console.error('[tutorias:perfil-monitor]', error);
    return res.status(500).json({ error: 'No se pudo cargar tu perfil de monitor.' });
  }
};

// ---------------------------------------------------------
// PUT /api/tutorias/perfil-monitor
// ---------------------------------------------------------
export const actualizarPerfilMonitor = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const carrera = text(req.body?.carrera);
  const semestre = Number(req.body?.semestre);
  const biografia = text(req.body?.biografia);
  const experiencia = text(req.body?.experiencia);
  const modalidad = modalidadDe(req.body?.modalidad ?? 'Virtual');
  const ubicacion = text(req.body?.ubicacion);
  const asignaturas = listaAsignaturas(req.body?.asignaturas);

  if (carrera.length < 2 || carrera.length > 120) {
    return res.status(400).json({ error: 'La carrera debe tener entre 2 y 120 caracteres.' });
  }
  if (!Number.isInteger(semestre) || semestre < 1 || semestre > 12) {
    return res.status(400).json({ error: 'El semestre debe estar entre 1 y 12.' });
  }
  if (biografia.length > 300) {
    return res.status(400).json({ error: 'La biografía no puede superar los 300 caracteres.' });
  }
  if (experiencia.length > 500) {
    return res.status(400).json({ error: 'La experiencia no puede superar los 500 caracteres.' });
  }
  if (!modalidad) {
    return res.status(400).json({ error: 'Selecciona una modalidad válida.' });
  }
  if (modalidad === 'PRESENCIAL' && (ubicacion.length < 3 || ubicacion.length > 120)) {
    return res.status(400).json({
      error: 'Indica el salón o la ubicación en el campus (entre 3 y 120 caracteres).',
    });
  }
  if (asignaturas.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos una asignatura que dominas.' });
  }

  try {
    const tutor = await prisma.tutor.findUnique({ where: { id: req.user.id } });
    if (!tutor) {
      return res.status(404).json({ error: 'Aún no tienes un perfil de monitor.' });
    }

    const actualizado = await prisma.tutor.update({
      where: { id: req.user.id },
      data: {
        carrera,
        semestre,
        biografia: biografia || null,
        experiencia: experiencia || null,
        modalidad,
        ubicacion: modalidad === 'PRESENCIAL' ? ubicacion : null,
        asignaturas,
      },
      include: { usuario: { select: { id: true, nombre: true, correoUnico: true } } },
    });

    return res.json({
      message: 'Perfil de monitor actualizado con éxito.',
      monitor: {
        ...serializarMonitor(actualizado, []),
        aprobado: actualizado.aprobado,
      },
    });
  } catch (error) {
    console.error('[tutorias:actualizar-perfil]', error);
    return res.status(500).json({ error: 'No se pudo actualizar tu perfil de monitor.' });
  }
};

// ---------------------------------------------------------
// GET /api/tutorias/disponibilidad
// ---------------------------------------------------------
export const listarDisponibilidad = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    const tutor = await obtenerTutorAprobado(req.user.id);
    if (!tutor) {
      return res.status(403).json({ error: 'Solo los monitores aprobados pueden gestionar su disponibilidad.' });
    }

    const bloques = await prisma.disponibilidadMonitor.findMany({
      where: { tutorId: req.user.id, fecha: { gte: hoyUTC() } },
      orderBy: [{ fecha: 'asc' }, { horaIni: 'asc' }],
      include: {
        tutorias: {
          where: { estado: { in: ['SOLICITADA', 'AGENDADA'] } },
          select: { id: true, estado: true },
        },
      },
    });

    return res.json({ disponibilidad: bloques.map(serializarDisponibilidad) });
  } catch (error) {
    console.error('[tutorias:listar-disponibilidad]', error);
    return res.status(500).json({ error: 'No se pudo cargar la disponibilidad.' });
  }
};

// ---------------------------------------------------------
// POST /api/tutorias/disponibilidad
// ---------------------------------------------------------
export const crearDisponibilidad = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const fechaTexto = text(req.body?.fecha);
  const horaIni = text(req.body?.horaIni);
  const horaFin = text(req.body?.horaFin);
  const fecha = parseFecha(fechaTexto);

  if (!fecha) {
    return res.status(400).json({ error: 'Selecciona una fecha válida.' });
  }
  if (!horaValida(horaIni) || !horaValida(horaFin)) {
    return res.status(400).json({ error: 'Las horas deben tener el formato HH:MM.' });
  }

  const inicio = minutosDe(horaIni);
  const fin = minutosDe(horaFin);
  if (fin <= inicio) {
    return res.status(400).json({ error: 'La hora de fin debe ser posterior a la de inicio.' });
  }

  const duracion = fin - inicio;
  if (duracion < DURACION_MINIMA || duracion > DURACION_MAXIMA) {
    return res.status(400).json({ error: 'Cada bloque debe durar entre 30 minutos y 4 horas.' });
  }

  const inicioCompleto = combinarFechaHora(fechaTexto, horaIni);
  if (!inicioCompleto || inicioCompleto.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'El bloque debe comenzar en una fecha y hora futuras.' });
  }

  try {
    const tutor = await obtenerTutorAprobado(req.user.id);
    if (!tutor) {
      return res.status(403).json({ error: 'Solo los monitores aprobados pueden publicar disponibilidad.' });
    }

    const bloquesDelDia = await prisma.disponibilidadMonitor.findMany({
      where: { tutorId: req.user.id, fecha },
      select: { id: true, horaIni: true, horaFin: true },
    });

    const seSolapa = bloquesDelDia.some((bloque) => {
      const otroInicio = minutosDe(bloque.horaIni);
      const otroFin = minutosDe(bloque.horaFin);
      return inicio < otroFin && fin > otroInicio;
    });

    if (seSolapa) {
      return res.status(409).json({ error: 'Ese bloque se cruza con otro de tu disponibilidad.' });
    }

    const bloque = await prisma.disponibilidadMonitor.create({
      data: {
        tutorId: req.user.id,
        fecha,
        horaIni,
        horaFin,
        diaSemana: diaSemanaDe(fecha),
      },
      include: {
        tutorias: { select: { id: true, estado: true } },
      },
    });

    return res.status(201).json({
      message: 'Bloque de disponibilidad agregado.',
      disponibilidad: serializarDisponibilidad(bloque),
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(409).json({ error: 'Ya tienes un bloque publicado a esa hora.' });
    }
    console.error('[tutorias:crear-disponibilidad]', error);
    return res.status(500).json({ error: 'No se pudo publicar el bloque de disponibilidad.' });
  }
};

// ---------------------------------------------------------
// DELETE /api/tutorias/disponibilidad/:id
// ---------------------------------------------------------
export const eliminarDisponibilidad = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const id = text(req.params.id);

  try {
    const tutor = await obtenerTutorAprobado(req.user.id);
    if (!tutor) {
      return res.status(403).json({ error: 'Solo los monitores aprobados pueden gestionar su disponibilidad.' });
    }

    const bloque = await prisma.disponibilidadMonitor.findUnique({ where: { id } });
    if (!bloque || bloque.tutorId !== req.user.id) {
      return res.status(404).json({ error: 'El bloque de disponibilidad no existe.' });
    }

    const agendada = await prisma.tutoria.findFirst({
      where: { disponibilidadId: id, estado: 'AGENDADA' },
    });
    if (agendada) {
      return res.status(409).json({
        error: 'No puedes eliminar un bloque con una tutoría agendada. Cancélala primero.',
      });
    }

    const pendientes = await prisma.tutoria.findMany({
      where: { disponibilidadId: id, estado: 'SOLICITADA' },
      select: { solicitanteId: true },
    });

    await prisma.$transaction([
      prisma.tutoria.updateMany({
        where: { disponibilidadId: id, estado: 'SOLICITADA' },
        data: { estado: 'CANCELADA', respondidaEn: new Date() },
      }),
      prisma.disponibilidadMonitor.delete({ where: { id } }),
    ]);

    await crearNotificaciones(
      pendientes.map((pendiente) => ({
        usuarioId: pendiente.solicitanteId,
        tipo: 'TUTORIA_CANCELADA' as const,
        titulo: 'Horario eliminado por el monitor',
        mensaje:
          'El monitor eliminó un bloque de disponibilidad con tu solicitud pendiente. Busca otro horario.',
        enlace: '/tutorias#mis-tutorias',
      }))
    );

    return res.json({ message: 'Bloque de disponibilidad eliminado.' });
  } catch (error) {
    console.error('[tutorias:eliminar-disponibilidad]', error);
    return res.status(500).json({ error: 'No se pudo eliminar el bloque de disponibilidad.' });
  }
};

// ---------------------------------------------------------
// GET /api/tutorias/monitores
// ---------------------------------------------------------
export const listarMonitores = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const orden = text(req.query?.orden).toLowerCase();

  try {
    const tutores = await prisma.tutor.findMany({
      where: { aprobado: true },
      orderBy: { solicitudEn: 'asc' },
      include: {
        usuario: { select: { id: true, nombre: true, correoUnico: true } },
        calificacionesRecibidas: { select: { puntaje: true } },
        disponibilidades: {
          where: { fecha: { gte: hoyUTC() } },
          orderBy: [{ fecha: 'asc' }, { horaIni: 'asc' }],
          include: {
            tutorias: {
              where: { estado: 'AGENDADA' },
              select: { id: true, estado: true },
            },
          },
        },
      },
    });

    const ahora = Date.now();
    const monitores = tutores.map((tutor) => {
      const disponibles = tutor.disponibilidades.filter((bloque) => {
        const inicio = combinarFechaHora(fechaISO(bloque.fecha), bloque.horaIni);
        return Boolean(inicio && inicio.getTime() > ahora);
      });

      return serializarMonitor(
        tutor,
        disponibles,
        tutor.calificacionesRecibidas.map((calificacion) => calificacion.puntaje)
      );
    });

    const ordenar = {
      'mas-horarios': (a: typeof monitores[number], b: typeof monitores[number]) =>
        b.disponibilidad.length - a.disponibilidad.length,
      'mas-resenas': (a: typeof monitores[number], b: typeof monitores[number]) =>
        b.totalResenas - a.totalResenas,
      'mejor-calificados': (a: typeof monitores[number], b: typeof monitores[number]) =>
        b.promedio - a.promedio || b.totalResenas - a.totalResenas,
    } as const;

    const comparador =
      ordenar[orden as keyof typeof ordenar] ?? ordenar['mejor-calificados'];

    monitores.sort(comparador);

    return res.json({ monitores });
  } catch (error) {
    console.error('[tutorias:listar-monitores]', error);
    return res.status(500).json({ error: 'No se pudieron cargar los monitores.' });
  }
};

// ---------------------------------------------------------
// GET /api/tutorias
// ---------------------------------------------------------
export const listarTutorias = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    await actualizarSolicitudesExpiradas();

    const tutor = await prisma.tutor.findUnique({
      where: { id: req.user.id },
      select: { id: true, aprobado: true },
    });
    const esMonitor = Boolean(tutor?.aprobado);
    const esAdmin = req.user.rol === 'ADMINISTRADOR';

    const where = esAdmin
      ? {}
      : esMonitor
        ? { OR: [{ monitorId: req.user.id }, { solicitanteId: req.user.id }] }
        : { solicitanteId: req.user.id };

    const tutorias = await prisma.tutoria.findMany({
      where,
      orderBy: [{ solicitadaEn: 'desc' }],
      include: {
        monitor: {
          include: {
            usuario: { select: { id: true, nombre: true, correoUnico: true } },
          },
        },
        solicitante: { select: { id: true, nombre: true, correoUnico: true } },
        disponibilidad: {
          select: { id: true, fecha: true, horaIni: true, horaFin: true, diaSemana: true },
        },
        calificacionTutoria: { select: { puntaje: true, comentario: true } },
      },
    });

    return res.json({
      esMonitor,
      esAdmin,
      tutorias: tutorias.map((tutoria) => serializarTutoria(tutoria, req.user!.id)),
    });
  } catch (error) {
    console.error('[tutorias:listar]', error);
    return res.status(500).json({ error: 'No se pudieron cargar las tutorías.' });
  }
};

// ---------------------------------------------------------
// POST /api/tutorias
// ---------------------------------------------------------
export const solicitarTutoria = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const monitorId = text(req.body?.monitorId);
  const disponibilidadId = text(req.body?.disponibilidadId);
  const modalidadSolicitada = modalidadDe(req.body?.modalidad);
  const ubicacionSolicitada = text(req.body?.ubicacion);
  const notas = text(req.body?.notas);

  if (!monitorId || !disponibilidadId) {
    return res.status(400).json({ error: 'Selecciona un monitor y un bloque de disponibilidad.' });
  }
  if (notas.length > MAX_NOTAS) {
    return res.status(400).json({ error: 'Las notas no pueden superar los 300 caracteres.' });
  }

  try {
    const monitor = await prisma.tutor.findUnique({
      where: { id: monitorId },
      include: { usuario: { select: { id: true, nombre: true, correoUnico: true } } },
    });

    if (!monitor || !monitor.aprobado) {
      return res.status(404).json({ error: 'El monitor seleccionado no está disponible.' });
    }
    if (monitor.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes agendar una tutoría contigo mismo.' });
    }

    const bloque = await prisma.disponibilidadMonitor.findUnique({
      where: { id: disponibilidadId },
    });

    if (!bloque || bloque.tutorId !== monitor.id) {
      return res.status(404).json({ error: 'El bloque de disponibilidad no existe.' });
    }

    const fechaTexto = fechaISO(bloque.fecha);
    const inicio = combinarFechaHora(fechaTexto, bloque.horaIni);
    if (!inicio || inicio.getTime() <= Date.now()) {
      return res.status(409).json({ error: 'Este bloque ya pasó. Elige otro horario.' });
    }

    const yaAgendada = await prisma.tutoria.findFirst({
      where: { disponibilidadId, estado: 'AGENDADA' },
    });
    if (yaAgendada) {
      return res.status(409).json({ error: 'Ese bloque ya fue agendado por otro estudiante.' });
    }

    const duplicada = await prisma.tutoria.findFirst({
      where: {
        solicitanteId: req.user.id,
        disponibilidadId,
        estado: { in: ['SOLICITADA', 'AGENDADA'] },
      },
    });
    if (duplicada) {
      return res.status(409).json({ error: 'Ya tienes una solicitud activa para ese bloque.' });
    }

    const modalidad = modalidadSolicitada ?? (monitor.modalidad as 'VIRTUAL' | 'PRESENCIAL');
    const ubicacion =
      modalidad === 'PRESENCIAL'
        ? ubicacionSolicitada || monitor.ubicacion || ''
        : null;

    if (modalidad === 'PRESENCIAL' && (ubicacion ?? '').length < 3) {
      return res.status(400).json({
        error: 'El monitor no registró una ubicación. Indica el salón para la tutoría presencial.',
      });
    }

    const ahora = Date.now();
    const limiteRespuesta = Math.min(
      ahora + 24 * 60 * 60 * 1000,
      inicio.getTime()
    );

    const tutoria = await prisma.tutoria.create({
      data: {
        solicitanteId: req.user.id,
        monitorId: monitor.id,
        disponibilidadId: bloque.id,
        estado: 'SOLICITADA',
        expiraEn: new Date(limiteRespuesta),
        programadaEn: inicio,
        modalidad,
        ubicacion: ubicacion || null,
        notas: notas || null,
      },
      include: {
        monitor: {
          include: {
            usuario: { select: { id: true, nombre: true, correoUnico: true } },
          },
        },
        solicitante: { select: { id: true, nombre: true, correoUnico: true } },
        disponibilidad: {
          select: { id: true, fecha: true, horaIni: true, horaFin: true, diaSemana: true },
        },
      },
    });

    await crearNotificacion({
      usuarioId: monitor.id,
      tipo: 'TUTORIA_SOLICITADA',
      titulo: 'Nueva solicitud de tutoría',
      mensaje: `${tutoria.solicitante.nombre} solicitó una tutoría para ${formatearFechaNotificacion(
        inicio
      )} (${ETIQUETA_MODALIDAD[modalidad]}).`,
      enlace: '/tutorias#mis-tutorias',
    });

    return res.status(201).json({
      message:
        'Solicitud de tutoría enviada. El monitor tiene 24 horas (o hasta el inicio del bloque) para responder.',
      tutoria: serializarTutoria(tutoria, req.user.id),
    });
  } catch (error) {
    console.error('[tutorias:solicitar]', error);
    return res.status(500).json({ error: 'No se pudo agendar la tutoría.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/tutorias/:id/responder
// ---------------------------------------------------------
export const responderTutoria = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const id = text(req.params.id);
  const aceptar = req.body?.aceptar;

  if (typeof aceptar !== 'boolean') {
    return res.status(400).json({ error: 'Indica si aceptas o rechazas la tutoría.' });
  }

  try {
    await actualizarSolicitudesExpiradas();

    const tutoria = await prisma.tutoria.findUnique({
      where: { id },
      include: {
        monitor: {
          include: { usuario: { select: { id: true, nombre: true, correoUnico: true } } },
        },
        solicitante: { select: { id: true, nombre: true, correoUnico: true } },
        disponibilidad: {
          select: { id: true, fecha: true, horaIni: true, horaFin: true, diaSemana: true },
        },
      },
    });

    if (!tutoria) {
      return res.status(404).json({ error: 'La tutoría no existe.' });
    }
    if (tutoria.monitorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el monitor asignado puede responder esta solicitud.' });
    }
    if (tutoria.estado !== 'SOLICITADA') {
      return res.status(400).json({
        error:
          tutoria.estado === 'EXPIRADA'
            ? 'La solicitud expiró antes de que el monitor respondiera.'
            : 'Esta solicitud ya fue respondida.',
      });
    }

    if (!aceptar) {
      await prisma.tutoria.update({
        where: { id },
        data: { estado: 'RECHAZADA', respondidaEn: new Date() },
      });

      await crearNotificacion({
        usuarioId: tutoria.solicitanteId,
        tipo: 'TUTORIA_RECHAZADA',
        titulo: 'Solicitud rechazada',
        mensaje: `${tutoria.monitor.usuario.nombre} rechazó tu solicitud para ${formatearFechaNotificacion(
          tutoria.programadaEn
        )}. Puedes buscar otro horario.`,
        enlace: '/tutorias#mis-tutorias',
      });

      return res.json({ message: 'Solicitud rechazada.' });
    }

    if (!tutoria.disponibilidadId) {
      return res.status(400).json({ error: 'La solicitud no tiene un bloque de disponibilidad asociado.' });
    }
    if (!tutoria.programadaEn || tutoria.programadaEn.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'El horario de esta solicitud ya pasó.' });
    }

    const yaAgendada = await prisma.tutoria.findFirst({
      where: {
        disponibilidadId: tutoria.disponibilidadId,
        estado: 'AGENDADA',
        id: { not: id },
      },
    });
    if (yaAgendada) {
      return res.status(409).json({ error: 'Ese bloque ya tiene otra tutoría agendada.' });
    }

    const otrasPendientes = await prisma.tutoria.findMany({
      where: {
        disponibilidadId: tutoria.disponibilidadId,
        estado: 'SOLICITADA',
        id: { not: id },
      },
      select: {
        solicitanteId: true,
        programadaEn: true,
      },
    });

    const ahora = new Date();
    await prisma.$transaction([
      prisma.tutoria.update({
        where: { id },
        data: { estado: 'AGENDADA', respondidaEn: ahora },
      }),
      prisma.tutoria.updateMany({
        where: {
          disponibilidadId: tutoria.disponibilidadId,
          estado: 'SOLICITADA',
          id: { not: id },
        },
        data: { estado: 'RECHAZADA', respondidaEn: ahora },
      }),
    ]);

    await crearNotificaciones([
      {
        usuarioId: tutoria.solicitanteId,
        tipo: 'TUTORIA_ACEPTADA',
        titulo: 'Tutoría aceptada',
        mensaje: `${tutoria.monitor.usuario.nombre} aceptó tu tutoría para ${formatearFechaNotificacion(
          tutoria.programadaEn
        )}.`,
        enlace: '/tutorias#mis-tutorias',
      },
      ...otrasPendientes.map((otra) => ({
        usuarioId: otra.solicitanteId,
        tipo: 'TUTORIA_RECHAZADA' as const,
        titulo: 'Horario ya no disponible',
        mensaje: `El monitor aceptó otra solicitud para ${formatearFechaNotificacion(
          otra.programadaEn
        )}. Busca otro horario disponible.`,
        enlace: '/tutorias#mis-tutorias',
      })),
    ]);

    return res.json({ message: 'Tutoría aceptada y agendada. Las demás solicitudes del bloque fueron rechazadas.' });
  } catch (error) {
    console.error('[tutorias:responder]', error);
    return res.status(500).json({ error: 'No se pudo responder la solicitud de tutoría.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/tutorias/:id/cancelar
// ---------------------------------------------------------
export const cancelarTutoria = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const id = text(req.params.id);

  try {
    await actualizarSolicitudesExpiradas();

    const tutoria = await prisma.tutoria.findUnique({
      where: { id },
      include: {
        solicitante: { select: { id: true, nombre: true } },
        monitor: {
          include: { usuario: { select: { id: true, nombre: true } } },
        },
      },
    });
    if (!tutoria) {
      return res.status(404).json({ error: 'La tutoría no existe.' });
    }

    const esAdmin = req.user.rol === 'ADMINISTRADOR';
    if (tutoria.solicitanteId !== req.user.id && tutoria.monitorId !== req.user.id && !esAdmin) {
      return res.status(403).json({ error: 'No tienes permisos para cancelar esta tutoría.' });
    }
    if (!['SOLICITADA', 'AGENDADA'].includes(tutoria.estado)) {
      return res.status(400).json({ error: 'Esta tutoría ya no se puede cancelar.' });
    }

    await prisma.tutoria.update({
      where: { id },
      data: { estado: 'CANCELADA' },
    });

    const fecha = formatearFechaNotificacion(tutoria.programadaEn);
    const esSolicitante = tutoria.solicitanteId === req.user.id;
    const esMonitor = tutoria.monitorId === req.user.id;
    const notificaciones: Array<{
      usuarioId: string;
      tipo: 'TUTORIA_CANCELADA';
      titulo: string;
      mensaje: string;
      enlace: string;
    }> = [];

    if (!esSolicitante) {
      notificaciones.push({
        usuarioId: tutoria.solicitanteId,
        tipo: 'TUTORIA_CANCELADA',
        titulo: 'Tutoría cancelada',
        mensaje: esMonitor
          ? `${tutoria.monitor.usuario.nombre} canceló la tutoría de ${fecha}.`
          : `Un administrador canceló tu tutoría de ${fecha}.`,
        enlace: '/tutorias#mis-tutorias',
      });
    }

    if (!esMonitor) {
      notificaciones.push({
        usuarioId: tutoria.monitorId,
        tipo: 'TUTORIA_CANCELADA',
        titulo: 'Tutoría cancelada',
        mensaje: esSolicitante
          ? `${tutoria.solicitante.nombre} canceló la tutoría de ${fecha}.`
          : `Un administrador canceló la tutoría de ${fecha} con ${tutoria.solicitante.nombre}.`,
        enlace: '/tutorias#mis-tutorias',
      });
    }

    await crearNotificaciones(notificaciones);

    return res.json({ message: 'Tutoría cancelada.' });
  } catch (error) {
    console.error('[tutorias:cancelar]', error);
    return res.status(500).json({ error: 'No se pudo cancelar la tutoría.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/tutorias/:id/finalizar
// ---------------------------------------------------------
export const finalizarTutoria = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const id = text(req.params.id);

  try {
    const tutoria = await prisma.tutoria.findUnique({
      where: { id },
      include: {
        monitor: {
          include: { usuario: { select: { nombre: true } } },
        },
      },
    });
    if (!tutoria) {
      return res.status(404).json({ error: 'La tutoría no existe.' });
    }

    const esAdmin = req.user.rol === 'ADMINISTRADOR';
    if (tutoria.monitorId !== req.user.id && !esAdmin) {
      return res.status(403).json({ error: 'Solo el monitor o un administrador pueden finalizar la tutoría.' });
    }
    if (tutoria.estado !== 'AGENDADA') {
      return res.status(400).json({ error: 'Solo se pueden finalizar tutorías agendadas.' });
    }
    if (!tutoria.programadaEn || tutoria.programadaEn.getTime() > Date.now()) {
      return res.status(400).json({ error: 'La tutoría todavía no ha comenzado.' });
    }

    await prisma.tutoria.update({
      where: { id },
      data: { estado: 'FINALIZADA' },
    });

    await crearNotificacion({
      usuarioId: tutoria.solicitanteId,
      tipo: 'TUTORIA_FINALIZADA',
      titulo: 'Tutoría finalizada',
      mensaje: `${tutoria.monitor.usuario.nombre} finalizó la tutoría de ${formatearFechaNotificacion(
        tutoria.programadaEn
      )}.`,
      enlace: '/tutorias#mis-tutorias',
    });

    return res.json({ message: 'Tutoría finalizada.' });
  } catch (error) {
    console.error('[tutorias:finalizar]', error);
    return res.status(500).json({ error: 'No se pudo finalizar la tutoría.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/tutorias/:id/calificar
// ---------------------------------------------------------
export const calificarTutoria = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const id = text(req.params.id);
  const puntaje = Number(req.body?.puntaje);
  const comentario = text(req.body?.comentario);

  if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
    return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5 estrellas.' });
  }
  if (comentario.length > 300) {
    return res.status(400).json({ error: 'El comentario no puede superar los 300 caracteres.' });
  }

  try {
    const tutoria = await prisma.tutoria.findUnique({
      where: { id },
      include: { calificacionTutoria: { select: { id: true } } },
    });

    if (!tutoria) {
      return res.status(404).json({ error: 'La tutoría no existe.' });
    }
    if (tutoria.solicitanteId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el estudiante que solicitó la tutoría puede calificarla.' });
    }
    if (tutoria.estado !== 'FINALIZADA') {
      return res.status(400).json({ error: 'Solo puedes calificar tutorías finalizadas.' });
    }
    if (tutoria.calificacionTutoria) {
      return res.status(409).json({ error: 'Ya calificaste esta tutoría.' });
    }

    const [calificacion] = await prisma.$transaction([
      prisma.calificacionTutoria.create({
        data: {
          tutoriaId: tutoria.id,
          monitorId: tutoria.monitorId,
          estudianteId: req.user.id,
          puntaje,
          comentario: comentario || null,
        },
      }),
      prisma.tutoria.update({
        where: { id: tutoria.id },
        data: { calificacion: puntaje },
      }),
    ]);

    return res.status(201).json({
      message: 'Gracias por calificar la tutoría.',
      calificacion: {
        puntaje: calificacion.puntaje,
        comentario: calificacion.comentario,
      },
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(409).json({ error: 'Ya calificaste esta tutoría.' });
    }
    console.error('[tutorias:calificar]', error);
    return res.status(500).json({ error: 'No se pudo guardar la calificación.' });
  }
};
