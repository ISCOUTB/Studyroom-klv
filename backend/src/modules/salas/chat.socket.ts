import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { registrarServidorRealtime, salaUsuario } from '../../shared/realtime';
import {
  crearMensajeSala,
  esParticipanteActivo,
} from './chat.service';

type UsuarioSocket = {
  id: string;
  nombre: string;
  rol: string;
};

type Acuse = ((respuesta: Record<string, unknown>) => void) | undefined;

const MAX_MENSAJE = 500;

let ioRef: Server | null = null;

// salaId -> (socketId -> usuarioId)
const presencia = new Map<string, Map<string, string>>();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado.');
  }
  return secret;
}

function nombreSala(salaId: string): string {
  return `sala:${salaId}`;
}

function responder(ack: Acuse, data: Record<string, unknown>) {
  if (typeof ack === 'function') {
    ack(data);
  }
}

function usuariosEnLinea(salaId: string): string[] {
  const usuarios = presencia.get(salaId);
  return usuarios ? [...new Set(usuarios.values())] : [];
}

function emitirPresencia(salaId: string) {
  if (!ioRef) return;

  ioRef.to(nombreSala(salaId)).emit('presencia:actualizada', {
    salaId,
    usuarios: usuariosEnLinea(salaId),
  });
}

function agregarPresencia(salaId: string, socketId: string, usuarioId: string) {
  let usuarios = presencia.get(salaId);
  if (!usuarios) {
    usuarios = new Map();
    presencia.set(salaId, usuarios);
  }
  usuarios.set(socketId, usuarioId);
}

function quitarPresencia(salaId: string, socketId: string) {
  const usuarios = presencia.get(salaId);
  if (!usuarios) return;

  usuarios.delete(socketId);
  if (usuarios.size === 0) {
    presencia.delete(salaId);
  }
}

/**
 * Saca de la sala en tiempo real a todas las conexiones de un usuario.
 * Se usa cuando abandona la sala por HTTP para que deje de recibir mensajes.
 */
export async function expulsarUsuarioDeSala(
  salaId: string,
  usuarioId: string
): Promise<void> {
  const io = ioRef;
  if (!io) return;

  let huboCambios = false;

  for (const socket of io.sockets.sockets.values()) {
    const usuario = socket.data.user as UsuarioSocket | undefined;
    const salas = socket.data.salas as Set<string> | undefined;

    if (!usuario || usuario.id !== usuarioId || !salas?.has(salaId)) {
      continue;
    }

    await socket.leave(nombreSala(salaId));
    salas.delete(salaId);
    quitarPresencia(salaId, socket.id);

    socket.emit('sala:expulsado', {
      salaId,
      motivo: 'Tu participación en la sala terminó. Vuelve a unirte para usar el chat.',
    });

    huboCambios = true;
  }

  if (huboCambios) {
    emitirPresencia(salaId);
  }
}

export function registrarChat(io: Server) {
  ioRef = io;
  registrarServidorRealtime(io);

  // Autenticación del WebSocket con el mismo JWT de la API.
  io.use(async (socket, next) => {
    try {
      const tokenAuth = socket.handshake.auth?.token;
      const header = socket.handshake.headers.authorization;
      const token =
        typeof tokenAuth === 'string'
          ? tokenAuth
          : header?.startsWith('Bearer ')
            ? header.slice(7)
            : '';

      if (!token) {
        return next(new Error('Token no proporcionado. Inicia sesión.'));
      }

      const decoded = jwt.verify(token, getJwtSecret()) as { id?: string };
      if (!decoded.id) {
        return next(new Error('Token inválido.'));
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        select: { id: true, nombre: true, rol: true },
      });

      if (!usuario) {
        return next(new Error('Usuario no encontrado.'));
      }

      socket.data.user = usuario;
      return next();
    } catch {
      return next(new Error('Token inválido o expirado.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const usuario = socket.data.user as UsuarioSocket;
    socket.data.salas = new Set<string>();

    // Sala privada del usuario: recibe notificaciones en cualquier pantalla.
    socket.join(salaUsuario(usuario.id));

    socket.on('sala:unirse', async (payload: any, ack?: Acuse) => {
      const salaId = String(payload?.salaId ?? '').trim();

      if (!salaId) {
        return responder(ack, { ok: false, error: 'Sala inválida.' });
      }

      try {
        const sala = await prisma.salaEstudio.findUnique({
          where: { id: salaId },
          select: { id: true },
        });

        if (!sala) {
          return responder(ack, {
            ok: false,
            error: 'La sala de estudio no existe.',
          });
        }

        const participa = await esParticipanteActivo(salaId, usuario.id);
        if (!participa) {
          return responder(ack, {
            ok: false,
            error: 'Únete a la sala para participar en el chat.',
          });
        }

        await socket.join(nombreSala(salaId));
        socket.data.salas.add(salaId);
        agregarPresencia(salaId, socket.id, usuario.id);
        emitirPresencia(salaId);

        return responder(ack, {
          ok: true,
          usuarios: usuariosEnLinea(salaId),
        });
      } catch (error) {
        console.error('[chat:unirse]', error);
        return responder(ack, {
          ok: false,
          error: 'No se pudo conectar al chat de la sala.',
        });
      }
    });

    socket.on('sala:salir', async (payload: any, ack?: Acuse) => {
      const salaId = String(payload?.salaId ?? '').trim();
      if (!salaId) return responder(ack, { ok: true });

      await socket.leave(nombreSala(salaId));
      socket.data.salas.delete(salaId);
      quitarPresencia(salaId, socket.id);
      emitirPresencia(salaId);

      return responder(ack, { ok: true });
    });

    socket.on('mensaje:enviar', async (payload: any, ack?: Acuse) => {
      const salaId = String(payload?.salaId ?? '').trim();
      const contenido = String(payload?.contenido ?? '').trim();

      if (!salaId) {
        return responder(ack, { ok: false, error: 'Sala inválida.' });
      }
      if (!contenido) {
        return responder(ack, {
          ok: false,
          error: 'El mensaje no puede estar vacío.',
        });
      }
      if (contenido.length > MAX_MENSAJE) {
        return responder(ack, {
          ok: false,
          error: `El mensaje no puede superar ${MAX_MENSAJE} caracteres.`,
        });
      }
      if (!socket.data.salas.has(salaId)) {
        return responder(ack, {
          ok: false,
          error: 'Primero debes unirte al chat de la sala.',
        });
      }

      try {
        const participa = await esParticipanteActivo(salaId, usuario.id);
        if (!participa) {
          return responder(ack, {
            ok: false,
            error: 'Ya no perteneces a esta sala.',
          });
        }

        const mensaje = await crearMensajeSala(
          salaId,
          usuario.id,
          contenido
        );

        io.to(nombreSala(salaId)).emit('mensaje:nuevo', mensaje);
        return responder(ack, { ok: true, mensaje });
      } catch (error) {
        console.error('[chat:mensaje]', error);
        return responder(ack, {
          ok: false,
          error: 'No se pudo enviar el mensaje. Inténtalo de nuevo.',
        });
      }
    });

    socket.on('disconnecting', () => {
      for (const salaId of socket.data.salas as Set<string>) {
        quitarPresencia(salaId, socket.id);
        emitirPresencia(salaId);
      }
      socket.data.salas.clear();
    });
  });
}
