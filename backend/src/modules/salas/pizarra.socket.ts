import { Server, Socket } from 'socket.io';
import prisma from '../../config/prisma';
import { esParticipanteActivo } from './chat.service';

type UsuarioSocket = {
  id: string;
  nombre: string;
  rol: string;
};

type Acuse = ((respuesta: Record<string, unknown>) => void) | undefined;

const MAX_TRAZOS_CARGA = 1000;
const MAX_PUNTOS = 2000;
const MAX_TEXTO = 300;
const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export type TrazoPizarraSocket = {
  id?: string;
  tipo?: string;
  color?: string;
  grosor?: number;
  datos?: unknown;
  usuarioId?: string;
  usuarioNombre?: string;
  creadoEn?: string;
};

function responder(ack: Acuse, data: Record<string, unknown>) {
  if (typeof ack === 'function') {
    ack(data);
  }
}

function salaRoom(salaId: string): string {
  return `sala:${salaId}`;
}

function texto(valor: unknown, max: number): string {
  return String(valor ?? '').trim().slice(0, max);
}

function numero(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Valida y normaliza un trazo recibido del cliente. */
function normalizarTrazo(trazo: TrazoPizarraSocket) {
  const tipo = trazo.tipo === 'texto' ? 'texto' : 'trazo';
  const color = COLOR_REGEX.test(String(trazo.color ?? ''))
    ? String(trazo.color)
    : '#1D4ED8';
  const grosor = Math.min(40, Math.max(1, Math.round(numero(trazo.grosor) ?? 3)));
  const datos = (trazo.datos ?? {}) as Record<string, unknown>;

  if (tipo === 'texto') {
    const contenido = texto(datos.texto, MAX_TEXTO);
    if (!contenido) return null;

    const x = numero(datos.x);
    const y = numero(datos.y);
    if (x === null || y === null) return null;

    return {
      tipo,
      color,
      grosor,
      datos: {
        texto: contenido,
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      },
    };
  }

  const puntosEntrada = Array.isArray(datos.puntos) ? datos.puntos : [];
  const puntos = puntosEntrada
    .slice(0, MAX_PUNTOS)
    .map((punto) => {
      const p = punto as { x?: unknown; y?: unknown };
      const x = numero(p?.x);
      const y = numero(p?.y);
      if (x === null || y === null) return null;
      return {
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      };
    })
    .filter((punto): punto is { x: number; y: number } => punto !== null);

  if (puntos.length < 2) return null;

  return { tipo, color, grosor, datos: { puntos } };
}

function serializar(trazo: {
  id: string;
  tipo: string;
  color: string;
  grosor: number;
  datos: unknown;
  creadoEn: Date;
  usuarioId: string;
  usuario?: { nombre: string } | null;
}) {
  return {
    id: trazo.id,
    tipo: trazo.tipo,
    color: trazo.color,
    grosor: trazo.grosor,
    datos: trazo.datos,
    creadoEn: trazo.creadoEn.toISOString(),
    usuarioId: trazo.usuarioId,
    usuarioNombre: trazo.usuario?.nombre ?? 'Participante',
  };
}

/**
 * Registra los eventos de la pizarra colaborativa en una conexión ya autenticada.
 * Se apoya en `sala:unirse` del chat: el socket debe estar en `sala:<id>`.
 */
export function registrarPizarra(
  io: Server,
  socket: Socket,
  usuario: UsuarioSocket
) {
  const salasDelSocket = socket.data.salas as Set<string>;

  const puedeEscribir = async (salaId: string) => {
    if (!salasDelSocket.has(salaId)) {
      return {
        ok: false as const,
        error: 'Únete a la sala para usar la pizarra colaborativa.',
      };
    }

    const participa = await esParticipanteActivo(salaId, usuario.id);
    if (!participa) {
      return {
        ok: false as const,
        error: 'Ya no perteneces a esta sala.',
      };
    }

    return { ok: true as const };
  };

  socket.on('pizarra:cargar', async (payload: any, ack?: Acuse) => {
    const salaId = texto(payload?.salaId, 64);
    if (!salaId) return responder(ack, { ok: false, error: 'Sala inválida.' });

    try {
      const permiso = await puedeEscribir(salaId);
      if (!permiso.ok) return responder(ack, { ok: false, error: permiso.error });

      const trazos = await prisma.trazoPizarra.findMany({
        where: { salaId },
        orderBy: { creadoEn: 'asc' },
        take: MAX_TRAZOS_CARGA,
        include: { usuario: { select: { nombre: true } } },
      });

      return responder(ack, {
        ok: true,
        trazos: trazos.map(serializar),
      });
    } catch (error) {
      console.error('[pizarra:cargar]', error);
      return responder(ack, {
        ok: false,
        error: 'No se pudo cargar la pizarra.',
      });
    }
  });

  // Trazo en curso: se reenvía a los demás sin guardar, para dibujo fluido.
  socket.on('pizarra:preview', (payload: any) => {
    const salaId = texto(payload?.salaId, 64);
    if (!salaId || !salasDelSocket.has(salaId)) return;

    socket.to(salaRoom(salaId)).emit('pizarra:preview', {
      salaId,
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      trazo: {
        tipo: 'trazo',
        color: COLOR_REGEX.test(String(payload?.trazo?.color ?? ''))
          ? String(payload.trazo.color)
          : '#1D4ED8',
        grosor: Math.min(
          40,
          Math.max(1, Math.round(numero(payload?.trazo?.grosor) ?? 3))
        ),
        datos: { puntos: payload?.trazo?.datos?.puntos ?? [] },
      },
    });
  });

  socket.on('pizarra:trazo', async (payload: any, ack?: Acuse) => {
    const salaId = texto(payload?.salaId, 64);
    if (!salaId) return responder(ack, { ok: false, error: 'Sala inválida.' });

    const normalizado = normalizarTrazo(payload?.trazo ?? {});
    if (!normalizado) {
      return responder(ack, { ok: false, error: 'El trazo no es válido.' });
    }

    try {
      const permiso = await puedeEscribir(salaId);
      if (!permiso.ok) return responder(ack, { ok: false, error: permiso.error });

      const creado = await prisma.trazoPizarra.create({
        data: {
          salaId,
          usuarioId: usuario.id,
          tipo: normalizado.tipo,
          color: normalizado.color,
          grosor: normalizado.grosor,
          datos: normalizado.datos,
        },
        include: { usuario: { select: { nombre: true } } },
      });

      const trazo = serializar(creado);
      io.to(salaRoom(salaId)).emit('pizarra:trazo', { salaId, trazo });

      return responder(ack, { ok: true, trazo });
    } catch (error) {
      console.error('[pizarra:trazo]', error);
      return responder(ack, {
        ok: false,
        error: 'No se pudo guardar el trazo en la pizarra.',
      });
    }
  });

  socket.on('pizarra:borrar', async (payload: any, ack?: Acuse) => {
    const salaId = texto(payload?.salaId, 64);
    const ids = Array.isArray(payload?.ids)
      ? payload.ids
          .map((id: unknown) => String(id ?? '').trim())
          .filter(Boolean)
          .slice(0, 200)
      : [];

    if (!salaId || ids.length === 0) {
      return responder(ack, { ok: true, ids: [] });
    }

    try {
      const permiso = await puedeEscribir(salaId);
      if (!permiso.ok) return responder(ack, { ok: false, error: permiso.error });

      const borrados = await prisma.trazoPizarra.deleteMany({
        where: { salaId, id: { in: ids } },
      });

      io.to(salaRoom(salaId)).emit('pizarra:quitar', { salaId, ids });

      return responder(ack, { ok: true, ids, cantidad: borrados.count });
    } catch (error) {
      console.error('[pizarra:borrar]', error);
      return responder(ack, {
        ok: false,
        error: 'No se pudieron borrar los trazos.',
      });
    }
  });

  socket.on('pizarra:deshacer', async (payload: any, ack?: Acuse) => {
    const salaId = texto(payload?.salaId, 64);
    if (!salaId) return responder(ack, { ok: false, error: 'Sala inválida.' });

    try {
      const permiso = await puedeEscribir(salaId);
      if (!permiso.ok) return responder(ack, { ok: false, error: permiso.error });

      const ultimo = await prisma.trazoPizarra.findFirst({
        where: { salaId, usuarioId: usuario.id },
        orderBy: { creadoEn: 'desc' },
        include: { usuario: { select: { nombre: true } } },
      });

      if (!ultimo) {
        return responder(ack, { ok: true, trazo: null });
      }

      await prisma.trazoPizarra.delete({ where: { id: ultimo.id } });

      io.to(salaRoom(salaId)).emit('pizarra:quitar', {
        salaId,
        ids: [ultimo.id],
      });

      return responder(ack, { ok: true, trazo: serializar(ultimo) });
    } catch (error) {
      console.error('[pizarra:deshacer]', error);
      return responder(ack, {
        ok: false,
        error: 'No se pudo deshacer el último trazo.',
      });
    }
  });

  socket.on('pizarra:limpiar', async (payload: any, ack?: Acuse) => {
    const salaId = texto(payload?.salaId, 64);
    if (!salaId) return responder(ack, { ok: false, error: 'Sala inválida.' });

    try {
      const permiso = await puedeEscribir(salaId);
      if (!permiso.ok) return responder(ack, { ok: false, error: permiso.error });

      const sala = await prisma.salaEstudio.findUnique({
        where: { id: salaId },
        select: { anfitrionId: true },
      });

      const esAnfitrion = sala?.anfitrionId === usuario.id;
      const esAdministrador = usuario.rol === 'ADMINISTRADOR';
      if (!esAnfitrion && !esAdministrador) {
        return responder(ack, {
          ok: false,
          error: 'Solo el anfitrión de la sala puede limpiar la pizarra.',
        });
      }

      const borrados = await prisma.trazoPizarra.deleteMany({ where: { salaId } });
      io.to(salaRoom(salaId)).emit('pizarra:limpiar', { salaId });

      return responder(ack, { ok: true, cantidad: borrados.count });
    } catch (error) {
      console.error('[pizarra:limpiar]', error);
      return responder(ack, {
        ok: false,
        error: 'No se pudo limpiar la pizarra.',
      });
    }
  });

  // Cursores en vivo (no se persisten).
  socket.on('pizarra:cursor', (payload: any) => {
    const salaId = texto(payload?.salaId, 64);
    if (!salaId || !salasDelSocket.has(salaId)) return;

    const x = numero(payload?.x);
    const y = numero(payload?.y);
    if (x === null || y === null) return;

    socket.to(salaRoom(salaId)).emit('pizarra:cursor', {
      salaId,
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      x,
      y,
      color: COLOR_REGEX.test(String(payload?.color ?? ''))
        ? String(payload.color)
        : '#1D4ED8',
    });
  });
}
