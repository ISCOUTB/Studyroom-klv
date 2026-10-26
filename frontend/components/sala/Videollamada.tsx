'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

export type EstadoMedia = {
  microfono: boolean;
  camara: boolean;
  pantalla: boolean;
};

export type RemotoVideo = {
  usuarioId: string;
  nombre: string;
  stream: MediaStream | null;
  estado: EstadoMedia;
};

const ESTADO_APAGADO: EstadoMedia = {
  microfono: false,
  camara: false,
  pantalla: false,
};

const SERVIDORES_ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

type Conexion = {
  pc: RTCPeerConnection;
  nombre: string;
  polite: boolean;
  makingOffer: boolean;
  stream: MediaStream;
  candidatos: RTCIceCandidateInit[];
};

type Opciones = {
  socket: Socket | null;
  salaId: string;
  participando: boolean;
  usuarioId: string;
  usuarioNombre: string;
};

type ParticipanteLlamada = {
  usuarioId: string;
  nombre: string;
  estado: EstadoMedia;
};

function estadoDesdeStream(stream: MediaStream | null): EstadoMedia {
  return {
    microfono: !!stream?.getAudioTracks().some((pista) => pista.enabled),
    camara: !!stream?.getVideoTracks().some((pista) => pista.enabled),
    pantalla: false,
  };
}

/** Pide cámara y micrófono, degradando a solo audio o solo video. */
async function pedirMedios(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;

  const intentos: MediaStreamConstraints[] = [
    {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: { echoCancellation: true, noiseSuppression: true },
    },
    { audio: { echoCancellation: true, noiseSuppression: true } },
    { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
  ];

  for (const restricciones of intentos) {
    try {
      return await navigator.mediaDevices.getUserMedia(restricciones);
    } catch {
      // Probamos la siguiente combinación.
    }
  }

  return null;
}

/**
 * Videollamada entre los participantes de una sala usando WebRTC en malla.
 * El servidor solo intercambia la señalización (ofertas, respuestas y
 * candidatos ICE); el audio y el video van de navegador a navegador.
 */
export function useVideollamada({
  socket,
  salaId,
  participando,
  usuarioId,
  usuarioNombre,
}: Opciones) {
  const conexionesRef = useRef<Map<string, Conexion>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pantallaRef = useRef<MediaStream | null>(null);
  const estadoLocalRef = useRef<EstadoMedia>(ESTADO_APAGADO);
  const enLlamadaRef = useRef(false);

  const [enLlamada, setEnLlamada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [remotos, setRemotos] = useState<Record<string, RemotoVideo>>({});
  const [estadoLocal, setEstadoLocal] = useState<EstadoMedia>(ESTADO_APAGADO);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [pantallaStream, setPantallaStream] = useState<MediaStream | null>(null);

  const actualizarEstado = useCallback(
    (parcial: Partial<EstadoMedia>) => {
      const siguiente = { ...estadoLocalRef.current, ...parcial };
      estadoLocalRef.current = siguiente;
      setEstadoLocal(siguiente);

      if (enLlamadaRef.current && socket) {
        socket.emit('webrtc:estado', { salaId, estado: siguiente });
      }
    },
    [salaId, socket]
  );

  const emitir = useCallback(
    (evento: string, datos: Record<string, unknown>, ack?: (r: any) => void) => {
      if (!socket) return;
      if (ack) {
        socket.emit(evento, datos, ack);
      } else {
        socket.emit(evento, datos);
      }
    },
    [socket]
  );

  const guardarRemoto = useCallback(
    (usuario: string, cambios: Partial<RemotoVideo>) => {
      setRemotos((prev) => {
        const actual =
          prev[usuario] ??
          ({
            usuarioId: usuario,
            nombre: cambios.nombre ?? 'Participante',
            stream: null,
            estado: ESTADO_APAGADO,
          } as RemotoVideo);

        return {
          ...prev,
          [usuario]: { ...actual, ...cambios },
        };
      });
    },
    []
  );

  const cerrarConexion = useCallback((destinoId: string) => {
    const conexion = conexionesRef.current.get(destinoId);
    if (!conexion) return;

    conexion.pc.onicecandidate = null;
    conexion.pc.ontrack = null;
    conexion.pc.onnegotiationneeded = null;
    try {
      conexion.pc.close();
    } catch {
      // La conexión ya estaba cerrada.
    }
    conexionesRef.current.delete(destinoId);
  }, []);

  const crearConexion = useCallback(
    (destinoId: string, nombre: string): Conexion | null => {
      const existente = conexionesRef.current.get(destinoId);
      if (existente) return existente;
      if (!socket || !salaId) return null;

      const pc = new RTCPeerConnection({ iceServers: SERVIDORES_ICE });
      const conexion: Conexion = {
        pc,
        nombre,
        polite: usuarioId.localeCompare(destinoId) < 0,
        makingOffer: false,
        stream: new MediaStream(),
        candidatos: [],
      };
      conexionesRef.current.set(destinoId, conexion);

      const local = localStreamRef.current;
      const tipos = new Set(local?.getTracks().map((pista) => pista.kind) ?? []);

      if (local) {
        for (const pista of local.getTracks()) {
          pc.addTrack(pista, local);
        }
      }

      // Sin pista local de ese tipo, igual necesitamos recibir el del otro lado.
      if (!tipos.has('audio')) {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }
      if (!tipos.has('video')) {
        pc.addTransceiver('video', { direction: 'recvonly' });
      }

      pc.onicecandidate = (evento) => {
        if (!evento.candidate) return;
        emitir('webrtc:candidato', {
          salaId,
          destinoId,
          candidato: evento.candidate.toJSON(),
        });
      };

      pc.onnegotiationneeded = async () => {
        try {
          conexion.makingOffer = true;
          await pc.setLocalDescription();
          if (pc.localDescription) {
            emitir('webrtc:oferta', {
              salaId,
              destinoId,
              descripcion: {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp,
              },
            });
          }
        } catch (err) {
          console.error('[webrtc:oferta]', err);
        } finally {
          conexion.makingOffer = false;
        }
      };

      pc.ontrack = (evento) => {
        if (!conexion.stream.getTracks().includes(evento.track)) {
          conexion.stream.addTrack(evento.track);
        }
        guardarRemoto(destinoId, {
          nombre: conexion.nombre,
          stream: conexion.stream,
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          cerrarConexion(destinoId);
        }
      };

      return conexion;
    },
    [cerrarConexion, emitir, guardarRemoto, salaId, socket, usuarioId]
  );

  const aplicarCandidatos = useCallback(async (conexion: Conexion) => {
    const pendientes = conexion.candidatos;
    conexion.candidatos = [];

    for (const candidato of pendientes) {
      try {
        await conexion.pc.addIceCandidate(candidato);
      } catch (err) {
        console.warn('[webrtc:candidato]', err);
      }
    }
  }, []);

  const procesarDescripcion = useCallback(
    async (origenId: string, nombre: string, descripcion: RTCSessionDescriptionInit) => {
      const conexion = crearConexion(origenId, nombre);
      if (!conexion) return;

      const { pc } = conexion;

      try {
        if (descripcion.type === 'offer') {
          const colision =
            conexion.makingOffer || pc.signalingState !== 'stable';
          const ignorar = !conexion.polite && colision;
          if (ignorar) return;

          if (colision && conexion.polite) {
            await pc.setLocalDescription({ type: 'rollback' });
          }

          await pc.setRemoteDescription(descripcion);
          await aplicarCandidatos(conexion);
          await pc.setLocalDescription();
          if (pc.localDescription) {
            emitir('webrtc:respuesta', {
              salaId,
              destinoId: origenId,
              descripcion: {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp,
              },
            });
          }
          return;
        }

        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(descripcion);
          await aplicarCandidatos(conexion);
        }
      } catch (err) {
        console.error('[webrtc:descripcion]', err);
      }
    },
    [aplicarCandidatos, crearConexion, emitir, salaId]
  );

  /* ------------------------------------------------------------------ */
  /* Señalización                                                        */
  /* ------------------------------------------------------------------ */

  const limpiarTodo = useCallback(
    (avisar: boolean) => {
      if (avisar && enLlamadaRef.current && socket && salaId) {
        socket.emit('webrtc:salir', { salaId });
      }

      enLlamadaRef.current = false;
      setEnLlamada(false);

      for (const destinoId of Array.from(conexionesRef.current.keys())) {
        cerrarConexion(destinoId);
      }

      for (const stream of [localStreamRef.current, pantallaRef.current]) {
        stream?.getTracks().forEach((pista) => pista.stop());
      }

      localStreamRef.current = null;
      pantallaRef.current = null;
      estadoLocalRef.current = ESTADO_APAGADO;

      setLocalStream(null);
      setPantallaStream(null);
      setEstadoLocal(ESTADO_APAGADO);
      setRemotos({});
      setCargando(false);
    },
    [cerrarConexion, salaId, socket]
  );

  useEffect(() => {
    if (!socket || !participando) {
      limpiarTodo(false);
      return;
    }

    const alEntrarParticipante = (payload: any) => {
      if (payload?.salaId !== salaId || payload?.usuarioId === usuarioId) {
        return;
      }
      if (!enLlamadaRef.current) return;

      // Si la persona vuelve a anunciarse (reconexión), se rehace la conexión.
      if (conexionesRef.current.has(payload.usuarioId)) {
        cerrarConexion(payload.usuarioId);
        guardarRemoto(payload.usuarioId, { stream: null });
      }

      guardarRemoto(payload.usuarioId, {
        nombre: payload.nombre ?? 'Participante',
        estado: payload.estado ?? ESTADO_APAGADO,
      });
      crearConexion(payload.usuarioId, payload.nombre ?? 'Participante');
    };

    const alSalirParticipante = (payload: any) => {
      if (payload?.salaId !== salaId) return;

      cerrarConexion(payload.usuarioId);
      setRemotos((prev) => {
        if (!prev[payload.usuarioId]) return prev;
        const siguiente = { ...prev };
        delete siguiente[payload.usuarioId];
        return siguiente;
      });
    };

    const alCambiarEstado = (payload: any) => {
      if (payload?.salaId !== salaId) return;
      guardarRemoto(payload.usuarioId, {
        estado: payload.estado ?? ESTADO_APAGADO,
      });
    };

    const alRecibirOferta = (payload: any) => {
      if (payload?.salaId !== salaId || !payload?.descripcion) return;
      void procesarDescripcion(
        payload.origenId,
        payload.origenNombre ?? 'Participante',
        payload.descripcion
      );
    };

    const alRecibirRespuesta = (payload: any) => {
      if (payload?.salaId !== salaId || !payload?.descripcion) return;
      void procesarDescripcion(
        payload.origenId,
        payload.origenNombre ?? 'Participante',
        payload.descripcion
      );
    };

    const alRecibirCandidato = (payload: any) => {
      if (payload?.salaId !== salaId || !payload?.candidato) return;

      const conexion = conexionesRef.current.get(payload.origenId);
      if (!conexion) return;

      if (conexion.pc.remoteDescription) {
        conexion.pc.addIceCandidate(payload.candidato).catch(() => {});
      } else {
        conexion.candidatos.push(payload.candidato);
      }
    };

    const alReconectar = () => {
      if (!enLlamadaRef.current) return;

      for (const destinoId of Array.from(conexionesRef.current.keys())) {
        cerrarConexion(destinoId);
      }

      setRemotos((prev) => {
        const siguiente: Record<string, RemotoVideo> = {};
        for (const [remotoId, remoto] of Object.entries(prev)) {
          siguiente[remotoId] = { ...remoto, stream: null };
        }
        return siguiente;
      });

      socket.emit(
        'webrtc:entrar',
        { salaId, estado: estadoLocalRef.current },
        (respuesta: any) => {
          if (!respuesta?.ok) return;

          const participantes = Array.isArray(respuesta.participantes)
            ? (respuesta.participantes as ParticipanteLlamada[])
            : [];

          for (const participante of participantes) {
            guardarRemoto(participante.usuarioId, {
              nombre: participante.nombre,
              estado: participante.estado ?? ESTADO_APAGADO,
              stream: null,
            });
            crearConexion(participante.usuarioId, participante.nombre);
          }
        }
      );
    };

    socket.on('webrtc:participante', alEntrarParticipante);
    socket.on('webrtc:salido', alSalirParticipante);
    socket.on('webrtc:estado', alCambiarEstado);
    socket.on('webrtc:oferta', alRecibirOferta);
    socket.on('webrtc:respuesta', alRecibirRespuesta);
    socket.on('webrtc:candidato', alRecibirCandidato);
    socket.on('connect', alReconectar);

    return () => {
      socket.off('webrtc:participante', alEntrarParticipante);
      socket.off('webrtc:salido', alSalirParticipante);
      socket.off('webrtc:estado', alCambiarEstado);
      socket.off('webrtc:oferta', alRecibirOferta);
      socket.off('webrtc:respuesta', alRecibirRespuesta);
      socket.off('webrtc:candidato', alRecibirCandidato);
      socket.off('connect', alReconectar);
      limpiarTodo(true);
    };
  }, [
    cerrarConexion,
    crearConexion,
    guardarRemoto,
    limpiarTodo,
    participando,
    procesarDescripcion,
    salaId,
    socket,
    usuarioId,
  ]);

  /* ------------------------------------------------------------------ */
  /* Medios locales                                                      */
  /* ------------------------------------------------------------------ */

  const sustituirPista = useCallback(
    async (kind: 'audio' | 'video', pista: MediaStreamTrack | null) => {
      for (const conexion of Array.from(conexionesRef.current.values())) {
        const { pc } = conexion;

        try {
          const emisor = pc
            .getSenders()
            .find((sender) => sender.track?.kind === kind);

          if (emisor) {
            await emisor.replaceTrack(pista);
            continue;
          }

          const transceptor = pc
            .getTransceivers()
            .find((t) => t.receiver.track.kind === kind);

          if (transceptor) {
            await transceptor.sender.replaceTrack(pista);
            if (pista && transceptor.direction === 'recvonly') {
              transceptor.direction = 'sendrecv';
            }
            continue;
          }

          const local = localStreamRef.current;
          if (pista && local) {
            pc.addTrack(pista, local);
          }
        } catch (err) {
          console.warn('[webrtc:pista]', err);
        }
      }
    },
    []
  );

  const unirse = useCallback(async () => {
    if (!socket || !salaId || enLlamadaRef.current) return;

    setCargando(true);
    setError('');
    setAviso('');

    const stream = await pedirMedios();

    if (stream) {
      localStreamRef.current = stream;
      setLocalStream(stream);
      estadoLocalRef.current = estadoDesdeStream(stream);
      setEstadoLocal(estadoLocalRef.current);
    } else {
      estadoLocalRef.current = ESTADO_APAGADO;
      setEstadoLocal(ESTADO_APAGADO);
      setAviso(
        'Entraste sin cámara ni micrófono. Puedes activarlos con los botones de la llamada.'
      );
    }

    enLlamadaRef.current = true;
    setEnLlamada(true);

    socket.emit(
      'webrtc:entrar',
      { salaId, estado: estadoLocalRef.current },
      (respuesta: any) => {
        setCargando(false);

        if (!respuesta?.ok) {
          enLlamadaRef.current = false;
          setEnLlamada(false);
          setError(respuesta?.error || 'No se pudo entrar a la videollamada.');
          return;
        }

        const participantes = Array.isArray(respuesta.participantes)
          ? (respuesta.participantes as ParticipanteLlamada[])
          : [];

        for (const participante of participantes) {
          guardarRemoto(participante.usuarioId, {
            nombre: participante.nombre,
            estado: participante.estado ?? ESTADO_APAGADO,
          });
        }
      }
    );
  }, [guardarRemoto, salaId, socket]);

  const salir = useCallback(() => {
    limpiarTodo(true);
    setAviso('');
    setError('');
  }, [limpiarTodo]);

  const alternarMicrofono = useCallback(async () => {
    const pista = localStreamRef.current?.getAudioTracks()[0];

    if (pista) {
      pista.enabled = !pista.enabled;
      actualizarEstado({ microfono: pista.enabled });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const nueva = stream.getAudioTracks()[0];
      if (!nueva) return;

      let local = localStreamRef.current;
      if (!local) {
        local = new MediaStream();
        localStreamRef.current = local;
      }
      local.addTrack(nueva);
      setLocalStream(local);

      await sustituirPista('audio', nueva);
      actualizarEstado({ microfono: true });
      setAviso('');
    } catch {
      setAviso('No pudimos acceder a tu micrófono. Revisa los permisos.');
    }
  }, [actualizarEstado, sustituirPista]);

  const alternarCamara = useCallback(async () => {
    const pista = localStreamRef.current?.getVideoTracks()[0];

    if (pista) {
      pista.enabled = !pista.enabled;
      actualizarEstado({ camara: pista.enabled });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });
      const nueva = stream.getVideoTracks()[0];
      if (!nueva) return;

      let local = localStreamRef.current;
      if (!local) {
        local = new MediaStream();
        localStreamRef.current = local;
      }
      local.addTrack(nueva);
      setLocalStream(local);

      await sustituirPista('video', nueva);
      actualizarEstado({ camara: true });
      setAviso('');
    } catch {
      setAviso('No pudimos acceder a tu cámara. Revisa los permisos.');
    }
  }, [actualizarEstado, sustituirPista]);

  const detenerPantalla = useCallback(async () => {
    const stream = pantallaRef.current;
    if (!stream) return;

    pantallaRef.current = null;
    setPantallaStream(null);
    stream.getTracks().forEach((pista) => pista.stop());

    const camara = localStreamRef.current?.getVideoTracks()[0] ?? null;
    await sustituirPista('video', camara);
    actualizarEstado({ pantalla: false });
  }, [actualizarEstado, sustituirPista]);

  const alternarPantalla = useCallback(async () => {
    if (pantallaRef.current) {
      await detenerPantalla();
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setAviso('Tu navegador no permite compartir pantalla.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      });
      const pista = stream.getVideoTracks()[0];
      if (!pista) return;

      pantallaRef.current = stream;
      setPantallaStream(stream);
      pista.addEventListener('ended', () => {
        void detenerPantalla();
      });

      await sustituirPista('video', pista);
      actualizarEstado({ pantalla: true });
      setAviso('');
    } catch {
      // El usuario canceló el selector de pantalla.
    }
  }, [actualizarEstado, detenerPantalla, sustituirPista]);

  const vistaLocal = pantallaStream ?? localStream;

  return {
    enLlamada,
    cargando,
    error,
    aviso,
    remotos,
    estadoLocal,
    localStream,
    pantallaStream,
    vistaLocal,
    usuarioNombre,
    unirse,
    salir,
    alternarMicrofono,
    alternarCamara,
    alternarPantalla,
    compartiendo: !!pantallaStream,
  };
}

export type VideollamadaAPI = ReturnType<typeof useVideollamada>;

/* -------------------------------------------------------------------- */
/* Presentación                                                          */
/* -------------------------------------------------------------------- */

export function VideoStream({
  stream,
  className = '',
  espejo = false,
}: {
  stream: MediaStream | null;
  className?: string;
  espejo?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    if (elemento.srcObject !== stream) {
      elemento.srcObject = stream;
    }

    if (stream) {
      elemento.play().catch(() => {
        // El navegador puede bloquear la reproducción hasta el primer clic.
      });
    }

    return () => {
      if (elemento.srcObject === stream) {
        elemento.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`${className} ${espejo ? '-scale-x-100' : ''}`}
    />
  );
}

function PistaAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    elemento.srcObject = stream;
    elemento.play().catch(() => {});

    return () => {
      elemento.srcObject = null;
    };
  }, [stream]);

  return <audio ref={ref} autoPlay />;
}

/**
 * Reproduce el audio de todos los participantes remotos una sola vez aunque
 * haya varias vistas con sus videos.
 */
export function AudioRemotos({
  remotos,
}: {
  remotos: Record<string, RemotoVideo>;
}) {
  return (
    <div
      className="pointer-events-none fixed h-px w-px overflow-hidden opacity-0"
      aria-hidden="true"
    >
      {Object.entries(remotos).map(([usuarioId, remoto]) =>
        remoto.stream ? (
          <PistaAudio key={usuarioId} stream={remoto.stream} />
        ) : null
      )}
    </div>
  );
}

function BotonControl({
  activo,
  peligro,
  etiqueta,
  icono,
  onClick,
  titulo,
}: {
  activo?: boolean;
  peligro?: boolean;
  etiqueta: string;
  icono: string;
  onClick: () => void;
  titulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo ?? etiqueta}
      aria-label={etiqueta}
      aria-pressed={activo}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${
        peligro
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : activo
            ? 'bg-[#0B4FC4] text-white hover:bg-[#093fa3]'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      <span aria-hidden="true">{icono}</span>
      <span className="hidden sm:inline">{etiqueta}</span>
    </button>
  );
}

function EtiquetaEstado({ estado }: { estado: EstadoMedia }) {
  if (estado.pantalla) {
    return (
      <span className="rounded-full bg-[#0B4FC4] px-1.5 py-0.5 text-[9px] font-bold text-white">
        Compartiendo
      </span>
    );
  }

  return (
    <span className="text-[10px] text-slate-300" aria-hidden="true">
      {estado.microfono ? '🎤' : '🔇'}
    </span>
  );
}

export function Videollamada({
  video,
  participantes,
  usuariosEnLinea,
  puedeParticipar,
  usuarioId,
}: {
  video: VideollamadaAPI;
  participantes: Array<{ id: string; nombre: string; esAnfitrion: boolean }>;
  usuariosEnLinea: string[];
  puedeParticipar: boolean;
  usuarioId: string;
}) {
  const tiles = useMemo(() => {
    if (!video.enLlamada) return [];

    return [
      {
        id: '__yo__',
        nombre: 'Tú',
        esYo: true,
        stream: video.vistaLocal,
        estado: video.estadoLocal,
        espejo: !video.compartiendo,
      },
      ...Object.values(video.remotos).map((remoto) => ({
        id: remoto.usuarioId,
        nombre: remoto.nombre,
        esYo: false,
        stream: remoto.stream,
        estado: remoto.estado,
        espejo: false,
      })),
    ];
  }, [
    video.compartiendo,
    video.enLlamada,
    video.estadoLocal,
    video.remotos,
    video.vistaLocal,
  ]);

  const sinParticipantesFuera = participantes.filter(
    (participante) =>
      participante.id !== usuarioId && !video.remotos[participante.id]
  );

  if (!video.enLlamada) {
    return (
      <section className="flex min-h-[340px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Videollamada de la sala
            </h2>
            <p className="text-[11px] text-slate-400">
              {usuariosEnLinea.length} conectado
              {usuariosEnLinea.length === 1 ? '' : 's'} ahora
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
            Sin iniciar
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B4FC4]/10 text-2xl">
            🎥
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              {puedeParticipar
                ? 'Entra a la videollamada'
                : 'Únete a la sala para usar la videollamada'}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-slate-400">
              Comparte tu cámara, micrófono y pantalla con las personas que
              están en esta sala. El navegador te pedirá permiso la primera vez.
            </p>
          </div>

          {puedeParticipar && (
            <button
              type="button"
              onClick={() => void video.unirse()}
              disabled={video.cargando}
              className="mt-1 rounded-xl bg-[#0B4FC4] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {video.cargando ? 'Conectando…' : 'Entrar a la videollamada'}
            </button>
          )}

          {video.aviso && (
            <p className="max-w-sm rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              {video.aviso}
            </p>
          )}
          {video.error && (
            <p className="max-w-sm rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {video.error}
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] leading-relaxed text-slate-500">
          La pizarra, el chat y los materiales siguen disponibles mientras
          hablas con tu grupo.
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[340px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            Videollamada de la sala
          </h2>
          <p className="text-[11px] text-slate-400">
            {tiles.length} en la llamada · {usuariosEnLinea.length} en línea
          </p>
        </div>
        <div className="flex items-center gap-2">
          {video.compartiendo && (
            <span className="rounded-full bg-[#0B4FC4]/10 px-2.5 py-1 text-[10px] font-bold text-[#0B4FC4]">
              Compartiendo pantalla
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            En vivo
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-4">
        <div
          className={`grid gap-3 ${
            tiles.length <= 1
              ? 'grid-cols-1'
              : tiles.length <= 4
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {tiles.map((tile) => {
            const mostrarVideo =
              !!tile.stream &&
              (tile.estado.pantalla || tile.estado.camara) &&
              !!tile.stream.getVideoTracks().length;

            return (
              <div
                key={tile.id}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 ring-1 ring-slate-200 ${
                  tiles.length === 1 ? 'aspect-[16/9] max-h-[420px]' : 'aspect-video'
                }`}
              >
                {tile.stream && (
                  <VideoStream
                    stream={tile.stream}
                    espejo={tile.espejo}
                    className={`h-full w-full object-cover transition-opacity ${
                      mostrarVideo ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                )}

                {!mostrarVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">
                      {iniciales(tile.nombre)}
                    </div>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/90 to-transparent px-2.5 py-2">
                  <span className="truncate text-[11px] font-semibold text-white">
                    {tile.nombre}
                  </span>
                  <EtiquetaEstado estado={tile.estado} />
                </div>
              </div>
            );
          })}
        </div>

        {sinParticipantesFuera.length > 0 && (
          <p className="mt-3 text-center text-[10px] text-slate-400">
            {sinParticipantesFuera.length} participante
            {sinParticipantesFuera.length === 1 ? '' : 's'} de la sala aún no
            {sinParticipantesFuera.length === 1 ? ' está' : ' están'} en la
            llamada.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 bg-white px-3 py-2.5">
        <BotonControl
          activo={video.estadoLocal.microfono}
          icono={video.estadoLocal.microfono ? '🎤' : '🔇'}
          etiqueta={video.estadoLocal.microfono ? 'Silenciar' : 'Micrófono'}
          onClick={() => void video.alternarMicrofono()}
        />
        <BotonControl
          activo={video.estadoLocal.camara}
          icono={video.estadoLocal.camara ? '🎥' : '📷'}
          etiqueta={video.estadoLocal.camara ? 'Apagar cámara' : 'Cámara'}
          onClick={() => void video.alternarCamara()}
        />
        <BotonControl
          activo={video.compartiendo}
          icono="🖥"
          etiqueta={video.compartiendo ? 'Dejar de compartir' : 'Compartir pantalla'}
          onClick={() => void video.alternarPantalla()}
        />
        <BotonControl
          peligro
          icono="☎"
          etiqueta="Salir de la llamada"
          onClick={video.salir}
        />
      </div>

      {(video.aviso || video.error) && (
        <div className="border-t border-slate-100 bg-amber-50 px-4 py-2 text-[11px] text-amber-800">
          {video.error || video.aviso}
        </div>
      )}
    </section>
  );
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}
