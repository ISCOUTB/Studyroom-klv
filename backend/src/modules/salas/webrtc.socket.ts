import { Server, Socket } from 'socket.io';
import { salaUsuario } from '../../shared/realtime';
import { esParticipanteActivo } from './chat.service';

type UsuarioSocket = {
  id: string;
  nombre: string;
  rol: string;
};

type Acuse = ((respuesta: Record<string, unknown>) => void) | undefined;

export type EstadoMedia = {
  microfono: boolean;
  camara: boolean;
  pantalla: boolean;
};

type ParticipanteLlamada = {
  socketId: string;
  usuarioId: string;
  nombre: string;
  estado: EstadoMedia;
};

const MAX_SDP = 200_000;
const MAX_CANDIDATO = 2_000;

// salaId -> (usuarioId -> participante en la llamada)
const llamadas = new Map<string, Map<string, ParticipanteLlamada>>();

function responder(ack: Acuse, data: Record<string, unknown>) {
  if (typeof ack === 'function') {
    ack(data);
  }
}

function salaRoom(salaId: string): string {
  return `sala:${salaId}`;
}

function estadoValido(valor: unknown): EstadoMedia {
  const estado = (valor ?? {}) as Record<string, unknown>;
  return {
    microfono: estado.microfono === true,
    camara: estado.camara === true,
    pantalla: estado.pantalla === true,
  };
}

function descripcionValida(
  valor: unknown,
  tipo: 'offer' | 'answer'
): { type: 'offer' | 'answer'; sdp: string } | null {
  const descripcion = valor as { type?: unknown; sdp?: unknown } | null;
  if (!descripcion || descripcion.type !== tipo) return null;

  const sdp = String(descripcion.sdp ?? '');
  if (!sdp || sdp.length > MAX_SDP) return null;

  return { type: tipo, sdp };
}

function candidatoValido(valor: unknown): Record<string, unknown> | null {
  const candidato = valor as Record<string, unknown> | null;
  if (!candidato) return null;

  const candidate = String(candidato.candidate ?? '');
  if (!candidate || candidate.length > MAX_CANDIDATO) return null;

  const sdpMid =
    candidato.sdpMid === null || candidato.sdpMid === undefined
      ? null
      : String(candidato.sdpMid).slice(0, 64);
  const sdpMLineIndex =
    typeof candidato.sdpMLineIndex === 'number'
      ? candidato.sdpMLineIndex
      : null;
  const usernameFragment =
    typeof candidato.usernameFragment === 'string'
      ? candidato.usernameFragment.slice(0, 256)
      : null;

  return { candidate, sdpMid, sdpMLineIndex, usernameFragment };
}

/**
 * Registra la señalización de la videollamada (WebRTC) en una conexión ya
 * autenticada. El servidor solo reenvía ofertas, respuestas y candidatos
 * ICE entre participantes activos de la misma sala: el audio y el video
 * viajan directamente entre los navegadores.
 */
export function registrarWebRTC(
  io: Server,
  socket: Socket,
  usuario: UsuarioSocket
) {
  const salasDelSocket = socket.data.salas as Set<string>;

  const puedeLlamar = async (salaId: string) => {
    if (!salasDelSocket.has(salaId)) {
      return {
        ok: false as const,
        error: 'Únete a la sala para entrar a la videollamada.',
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

  socket.on('webrtc:entrar', async (payload: any, ack?: Acuse) => {
    const salaId = String(payload?.salaId ?? '')
      .trim()
      .slice(0, 64);

    if (!salaId) {
      return responder(ack, { ok: false, error: 'Sala inválida.' });
    }

    try {
      const permiso = await puedeLlamar(salaId);
      if (!permiso.ok) {
        return responder(ack, { ok: false, error: permiso.error });
      }

      let sala = llamadas.get(salaId);
      if (!sala) {
        sala = new Map();
        llamadas.set(salaId, sala);
      }

      const participantes = [...sala.values()]
        .filter((participante) => participante.usuarioId !== usuario.id)
        .map(({ usuarioId, nombre, estado }) => ({
          usuarioId,
          nombre,
          estado,
        }));

      sala.set(usuario.id, {
        socketId: socket.id,
        usuarioId: usuario.id,
        nombre: usuario.nombre,
        estado: estadoValido(payload?.estado),
      });

      socket.to(salaRoom(salaId)).emit('webrtc:participante', {
        salaId,
        usuarioId: usuario.id,
        nombre: usuario.nombre,
        estado: estadoValido(payload?.estado),
      });

      return responder(ack, { ok: true, participantes });
    } catch (error) {
      console.error('[webrtc:entrar]', error);
      return responder(ack, {
        ok: false,
        error: 'No se pudo entrar a la videollamada.',
      });
    }
  });

  socket.on('webrtc:salir', (payload: any, ack?: Acuse) => {
    const salaId = String(payload?.salaId ?? '')
      .trim()
      .slice(0, 64);
    if (!salaId) return responder(ack, { ok: true });

    const sala = llamadas.get(salaId);
    const participante = sala?.get(usuario.id);

    if (sala && participante && participante.socketId === socket.id) {
      sala.delete(usuario.id);

      if (sala.size === 0) {
        llamadas.delete(salaId);
      }

      socket.to(salaRoom(salaId)).emit('webrtc:salido', {
        salaId,
        usuarioId: usuario.id,
      });
    }

    return responder(ack, { ok: true });
  });

  const reenviar = (
    evento: 'webrtc:oferta' | 'webrtc:respuesta',
    tipo: 'offer' | 'answer',
    payload: any
  ) => {
    const salaId = String(payload?.salaId ?? '')
      .trim()
      .slice(0, 64);
    const destinoId = String(payload?.destinoId ?? '')
      .trim()
      .slice(0, 64);

    if (!salaId || !destinoId || destinoId === usuario.id) return;

    const sala = llamadas.get(salaId);
    if (!sala || !sala.has(usuario.id) || !sala.has(destinoId)) return;

    const descripcion = descripcionValida(payload?.descripcion, tipo);
    if (!descripcion) return;

    io.to(salaUsuario(destinoId)).emit(evento, {
      salaId,
      origenId: usuario.id,
      origenNombre: usuario.nombre,
      descripcion,
    });
  };

  socket.on('webrtc:oferta', (payload: any) => {
    reenviar('webrtc:oferta', 'offer', payload);
  });

  socket.on('webrtc:respuesta', (payload: any) => {
    reenviar('webrtc:respuesta', 'answer', payload);
  });

  socket.on('webrtc:candidato', (payload: any) => {
    const salaId = String(payload?.salaId ?? '')
      .trim()
      .slice(0, 64);
    const destinoId = String(payload?.destinoId ?? '')
      .trim()
      .slice(0, 64);

    if (!salaId || !destinoId || destinoId === usuario.id) return;

    const sala = llamadas.get(salaId);
    if (!sala || !sala.has(usuario.id) || !sala.has(destinoId)) return;

    const candidato = candidatoValido(payload?.candidato);
    if (!candidato) return;

    io.to(salaUsuario(destinoId)).emit('webrtc:candidato', {
      salaId,
      origenId: usuario.id,
      candidato,
    });
  });

  socket.on('webrtc:estado', (payload: any) => {
    const salaId = String(payload?.salaId ?? '')
      .trim()
      .slice(0, 64);
    if (!salaId) return;

    const sala = llamadas.get(salaId);
    const participante = sala?.get(usuario.id);
    if (!sala || !participante) return;

    participante.estado = estadoValido(payload?.estado);

    socket.to(salaRoom(salaId)).emit('webrtc:estado', {
      salaId,
      usuarioId: usuario.id,
      estado: participante.estado,
    });
  });

  const salirDeLlamadas = (salaIds: Iterable<string>) => {
    for (const salaId of salaIds) {
      const sala = llamadas.get(salaId);
      const participante = sala?.get(usuario.id);

      if (!sala || !participante || participante.socketId !== socket.id) {
        continue;
      }

      sala.delete(usuario.id);
      if (sala.size === 0) {
        llamadas.delete(salaId);
      }

      socket.to(salaRoom(salaId)).emit('webrtc:salido', {
        salaId,
        usuarioId: usuario.id,
      });
    }
  };

  socket.on('sala:salir', (payload: any) => {
    const salaId = String(payload?.salaId ?? '')
      .trim()
      .slice(0, 64);
    if (salaId) salirDeLlamadas([salaId]);
  });

  socket.on('disconnecting', () => {
    salirDeLlamadas(
      new Set([...llamadas.keys(), ...salasDelSocket])
    );
  });
}
