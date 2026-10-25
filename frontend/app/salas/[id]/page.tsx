'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { useParams, useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { apiRequest, API_URL } from '@/lib/api';
import {
  type MaterialEstudio,
  type MensajeChat,
  type PresenciaSala,
  type SalaDetalle,
  EXTENSIONES_MATERIALES,
  MAX_MATERIAL_BYTES,
  extensionDe,
  formatearTamano,
  inicialesDe,
} from '@/lib/salas';

const MAX_MENSAJE = 500;
const MAX_DESCRIPCION_MATERIAL = 300;

function horaDe(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

function fechaCortaDe(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function iconoDeMaterial(nombre: string): { emoji: string; clase: string } {
  const extension = extensionDe(nombre);

  if (extension === '.pdf') {
    return { emoji: '📕', clase: 'bg-red-500/15 text-red-300' };
  }
  if (extension === '.doc' || extension === '.docx') {
    return { emoji: '📘', clase: 'bg-blue-500/15 text-blue-300' };
  }
  if (extension === '.ppt' || extension === '.pptx') {
    return { emoji: '📊', clase: 'bg-orange-500/15 text-orange-300' };
  }
  if (extension === '.xls' || extension === '.xlsx') {
    return { emoji: '📈', clase: 'bg-emerald-500/15 text-emerald-300' };
  }
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    return { emoji: '🖼️', clase: 'bg-purple-500/15 text-purple-300' };
  }
  if (extension === '.txt') {
    return { emoji: '📝', clase: 'bg-slate-500/20 text-slate-300' };
  }

  return { emoji: '📎', clase: 'bg-slate-500/20 text-slate-300' };
}

export default function SalaEnVivoPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const salaId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [activeTab, setActiveTab] = useState<'chat' | 'participantes' | 'materiales'>('chat');
  const [sala, setSala] = useState<SalaDetalle | null>(null);
  const [loadingSala, setLoadingSala] = useState(true);
  const [errorSala, setErrorSala] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [uniendose, setUniendose] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [cronometro, setCronometro] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Chat en tiempo real
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [mensajeTexto, setMensajeTexto] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [errorChat, setErrorChat] = useState('');
  const [conectadoChat, setConectadoChat] = useState(false);
  const [usuariosEnLinea, setUsuariosEnLinea] = useState<string[]>([]);

  // Materiales de estudio
  const [materiales, setMateriales] = useState<MaterialEstudio[]>([]);
  const [cargandoMateriales, setCargandoMateriales] = useState(false);
  const [errorMateriales, setErrorMateriales] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [descripcionMaterial, setDescripcionMaterial] = useState('');
  const [subiendoMaterial, setSubiendoMaterial] = useState(false);
  const [descargandoMaterialId, setDescargandoMaterialId] = useState<string | null>(
    null
  );
  const [eliminandoMaterialId, setEliminandoMaterialId] = useState<string | null>(
    null
  );
  const [confirmarEliminarId, setConfirmarEliminarId] = useState<string | null>(
    null
  );

  const socketRef = useRef<Socket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const materialInputRef = useRef<HTMLInputElement | null>(null);

  const cargarSala = useCallback(async () => {
    if (!token || !salaId) return;

    setLoadingSala(true);
    setErrorSala('');

    try {
      const data = await apiRequest<{ sala: SalaDetalle }>(
        `/api/salas/${encodeURIComponent(salaId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSala(data.sala);
    } catch (err) {
      setErrorSala(
        err instanceof Error ? err.message : 'No se pudo cargar la sala de estudio.'
      );
    } finally {
      setLoadingSala(false);
    }
  }, [token, salaId]);

  const cargarHistorial = useCallback(async () => {
    if (!token || !salaId) return;

    setCargandoHistorial(true);

    try {
      const data = await apiRequest<{ mensajes: MensajeChat[] }>(
        `/api/salas/${encodeURIComponent(salaId)}/mensajes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Se combina con los mensajes que hayan llegado en vivo durante la carga.
      setMensajes((prev) => {
        const porId = new Map<string, MensajeChat>();
        for (const mensaje of data.mensajes ?? []) {
          porId.set(mensaje.id, mensaje);
        }
        for (const mensaje of prev) {
          if (!porId.has(mensaje.id)) {
            porId.set(mensaje.id, mensaje);
          }
        }

        return Array.from(porId.values())
          .sort(
            (a, b) =>
              new Date(a.enviadoEn).getTime() - new Date(b.enviadoEn).getTime()
          )
          .slice(-100);
      });
      setErrorChat('');
    } catch (err) {
      setErrorChat(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el historial del chat.'
      );
    } finally {
      setCargandoHistorial(false);
    }
  }, [token, salaId]);

  const cargarMateriales = useCallback(async () => {
    if (!token || !salaId) return;

    setCargandoMateriales(true);

    try {
      const data = await apiRequest<{ materiales: MaterialEstudio[] }>(
        `/api/salas/${encodeURIComponent(salaId)}/materiales`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMateriales(data.materiales ?? []);
      setErrorMateriales('');
    } catch (err) {
      setErrorMateriales(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los materiales de la sala.'
      );
    } finally {
      setCargandoMateriales(false);
    }
  }, [token, salaId]);

  useEffect(() => {
    setMensajes([]);
    setMensajeTexto('');
    setErrorChat('');
    setUsuariosEnLinea([]);
    setMateriales([]);
    setErrorMateriales('');
    setArchivoSeleccionado(null);
    setDescripcionMaterial('');
    setConfirmarEliminarId(null);
  }, [salaId]);

  useEffect(() => {
    if (activeTab !== 'materiales' || !sala?.participando) return;
    void cargarMateriales();
  }, [activeTab, sala?.participando, cargarMateriales]);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      router.push('/login');
      return;
    }

    cargarSala();
  }, [isLoading, user, token, router, cargarSala]);

  // Cronómetro real desde que la sala fue creada.
  useEffect(() => {
    if (!sala) return;

    const base =
      sala.estado === 'Activa'
        ? Math.max(
            0,
            Math.floor((Date.now() - new Date(sala.creadoEn).getTime()) / 1000)
          )
        : 0;

    setCronometro(base);
    const timer = setInterval(() => setCronometro((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [sala]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Conexión del chat: solo para participantes activos de la sala.
  useEffect(() => {
    if (!token || !salaId || !sala?.participando) {
      setConectadoChat(false);
      return;
    }

    const socket = io(API_URL, {
      auth: { token },
      reconnection: true,
    });
    socketRef.current = socket;
    setConectadoChat(false);
    setErrorChat('');
    setUsuariosEnLinea([]);

    const unirseAlChat = () => {
      socket.timeout(8000).emit(
        'sala:unirse',
        { salaId },
        (timeoutError: Error | null, respuesta: { ok?: boolean; error?: string }) => {
          if (timeoutError) {
            setConectadoChat(false);
            setErrorChat('El chat tardó demasiado en responder. Reintentando…');
            return;
          }
          if (!respuesta?.ok) {
            setConectadoChat(false);
            setErrorChat(
              respuesta?.error || 'No se pudo conectar al chat de la sala.'
            );
            return;
          }

          setConectadoChat(true);
          setErrorChat('');
          // Al conectar y al reconectar se refresca el historial.
          void cargarHistorial();
        }
      );
    };

    socket.on('connect', unirseAlChat);
    socket.on('disconnect', () => {
      setConectadoChat(false);
      setUsuariosEnLinea([]);
    });
    socket.on('connect_error', (error: Error) => {
      setConectadoChat(false);
      const mensaje = error?.message || '';
      const esMensajeDelServidor = /token|usuario|sala|particip/i.test(mensaje);
      setErrorChat(
        esMensajeDelServidor
          ? mensaje
          : 'No se pudo conectar al chat. Reintentando…'
      );
    });
    socket.on('mensaje:nuevo', (mensaje: MensajeChat) => {
      setMensajes((prev) =>
        prev.some((item) => item.id === mensaje.id) ? prev : [...prev, mensaje]
      );
    });
    socket.on('presencia:actualizada', (presencia: PresenciaSala) => {
      if (presencia?.salaId === salaId) {
        setUsuariosEnLinea(presencia.usuarios ?? []);
      }
    });
    socket.on(
      'sala:expulsado',
      (payload: { salaId?: string; motivo?: string }) => {
        if (payload?.salaId !== salaId) return;

        setConectadoChat(false);
        setUsuariosEnLinea([]);
        setErrorChat(
          payload.motivo ||
            'Tu participación en la sala terminó. Vuelve a unirte para usar el chat.'
        );
        setSala((prev) =>
          prev
            ? {
                ...prev,
                participando: false,
                participantesActuales: Math.max(
                  0,
                  prev.participantesActuales - 1
                ),
                participantes: prev.participantes.filter(
                  (participante) => participante.id !== user.id
                ),
              }
            : prev
        );
      }
    );

    return () => {
      socket.emit('sala:salir', { salaId });
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, salaId, sala?.participando, cargarHistorial]);

  // Mantiene el historial desplazado hasta el último mensaje.
  useEffect(() => {
    if (activeTab !== 'chat') return;

    const contenedor = chatScrollRef.current;
    if (contenedor) {
      contenedor.scrollTop = contenedor.scrollHeight;
    }
  }, [mensajes, activeTab, cargandoHistorial]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const handleUnirse = async () => {
    if (!token || !sala) return;

    setErrorAccion('');
    setUniendose(true);
    try {
      await apiRequest(`/api/salas/${sala.id}/unirse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await cargarSala();
    } catch (err) {
      setErrorAccion(
        err instanceof Error ? err.message : 'No se pudo entrar a la sala.'
      );
    } finally {
      setUniendose(false);
    }
  };

  const handleAbandonar = async () => {
    if (!token || !sala) return;

    setErrorAccion('');
    setSaliendo(true);
    try {
      await apiRequest(`/api/salas/${sala.id}/abandonar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/salas');
    } catch (err) {
      setErrorAccion(
        err instanceof Error ? err.message : 'No se pudo salir de la sala.'
      );
    } finally {
      setSaliendo(false);
    }
  };

  const handleEnviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();

    const contenido = mensajeTexto.trim();
    const socket = socketRef.current;

    if (!contenido || !socket || !salaId || !conectadoChat || enviandoMensaje) {
      return;
    }

    setEnviandoMensaje(true);
    setErrorChat('');

    socket.timeout(8000).emit(
      'mensaje:enviar',
      { salaId, contenido },
      (timeoutError: Error | null, respuesta: { ok?: boolean; error?: string }) => {
        setEnviandoMensaje(false);

        if (timeoutError) {
          setErrorChat('El mensaje tardó demasiado en enviarse. Inténtalo de nuevo.');
          return;
        }
        if (!respuesta?.ok) {
          setErrorChat(respuesta?.error || 'No se pudo enviar el mensaje.');
          return;
        }

        setMensajeTexto('');
      }
    );
  };

  const limpiarArchivo = () => {
    setArchivoSeleccionado(null);
    setDescripcionMaterial('');
    if (materialInputRef.current) {
      materialInputRef.current.value = '';
    }
  };

  const handleSeleccionarArchivo = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const archivo = e.target.files?.[0] ?? null;
    setErrorMateriales('');

    if (!archivo) {
      setArchivoSeleccionado(null);
      return;
    }

    const extension = extensionDe(archivo.name);
    if (!(EXTENSIONES_MATERIALES as readonly string[]).includes(extension)) {
      setArchivoSeleccionado(null);
      e.target.value = '';
      setErrorMateriales(
        'Formato no permitido. Puedes subir PDF, Word, PowerPoint, Excel, TXT o imágenes JPG/PNG/WEBP.'
      );
      return;
    }

    if (archivo.size > MAX_MATERIAL_BYTES) {
      setArchivoSeleccionado(null);
      e.target.value = '';
      setErrorMateriales('El archivo supera el límite de 10 MB.');
      return;
    }

    setArchivoSeleccionado(archivo);
  };

  const handleSubirMaterial = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !archivoSeleccionado ||
      !token ||
      !salaId ||
      subiendoMaterial ||
      !sala?.participando
    ) {
      return;
    }

    setSubiendoMaterial(true);
    setErrorMateriales('');

    try {
      const formulario = new FormData();
      formulario.append('archivo', archivoSeleccionado);

      const descripcion = descripcionMaterial.trim();
      if (descripcion) {
        formulario.append('descripcion', descripcion);
      }

      const data = await apiRequest<{ material: MaterialEstudio }>(
        `/api/salas/${encodeURIComponent(salaId)}/materiales`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formulario,
        }
      );

      setMateriales((prev) => [
        data.material,
        ...prev.filter((material) => material.id !== data.material.id),
      ]);
      limpiarArchivo();
    } catch (err) {
      setErrorMateriales(
        err instanceof Error ? err.message : 'No se pudo subir el material.'
      );
    } finally {
      setSubiendoMaterial(false);
    }
  };

  const handleDescargarMaterial = async (material: MaterialEstudio) => {
    if (!token || !salaId || descargandoMaterialId) return;

    setDescargandoMaterialId(material.id);
    setErrorMateriales('');

    try {
      const respuesta = await fetch(
        `${API_URL}/api/salas/${encodeURIComponent(salaId)}/materiales/${encodeURIComponent(material.id)}/descargar`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!respuesta.ok) {
        let data: { error?: string } | null = null;
        try {
          data = await respuesta.json();
        } catch {
          // Respuesta sin cuerpo JSON.
        }
        throw new Error(data?.error || 'No se pudo descargar el material.');
      }

      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = material.nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setErrorMateriales(
        err instanceof Error ? err.message : 'No se pudo descargar el material.'
      );
    } finally {
      setDescargandoMaterialId(null);
    }
  };

  const handleEliminarMaterial = async (material: MaterialEstudio) => {
    if (!token || !salaId || eliminandoMaterialId) return;

    setEliminandoMaterialId(material.id);
    setErrorMateriales('');

    try {
      await apiRequest(
        `/api/salas/${encodeURIComponent(salaId)}/materiales/${encodeURIComponent(material.id)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMateriales((prev) =>
        prev.filter((item) => item.id !== material.id)
      );
      setConfirmarEliminarId(null);
    } catch (err) {
      setErrorMateriales(
        err instanceof Error ? err.message : 'No se pudo eliminar el material.'
      );
    } finally {
      setEliminandoMaterialId(null);
    }
  };

  if (isLoading || !user) return null;

  if (loadingSala) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center px-4">
        <UTBLogo className="h-10 mb-8" />
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-600 border-t-blue-500" />
        <p className="mt-4 text-sm font-semibold text-slate-300">
          Cargando sala de estudio…
        </p>
      </div>
    );
  }

  if (errorSala || !sala) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-lg font-bold text-white mb-2">
            No pudimos abrir la sala
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            {errorSala || 'La sala de estudio no existe.'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={cargarSala}
              className="px-4 py-2.5 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => router.push('/salas')}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs transition-colors"
            >
              Volver a las salas
            </button>
          </div>
        </div>
      </div>
    );
  }

  const participantes = sala.participantes ?? [];
  const puedeEscribir = sala.participando && conectadoChat;
  const estadoConexion = !isOnline
    ? { color: 'bg-red-500', texto: 'Sin conexión a internet' }
    : !sala.participando
      ? { color: 'bg-slate-500', texto: 'Chat disponible al unirte a la sala' }
      : conectadoChat
        ? {
            color: 'bg-emerald-400',
            texto: `Chat conectado · ${usuariosEnLinea.length} en línea`,
          }
        : { color: 'bg-amber-400', texto: 'Conectando al chat…' };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Encabezado Sala en Vivo (Referencia visual 5) */}
      <header className="bg-slate-800 border-b border-slate-700 h-20 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-6">
          <UTBLogo className="h-9" />
          <div className="hidden md:flex items-center gap-3 border-l border-slate-700 pl-6">
            <span className="p-2 bg-slate-700 text-blue-400 rounded-lg">📖</span>
            <div>
              <h2 className="font-bold text-sm text-white">
                {sala.asignatura} · {sala.titulo}
              </h2>
              <p className="text-[11px] text-slate-400">{sala.tema}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-xl border border-slate-700 text-xs font-mono">
            <span>⏱️</span>
            <span className="text-emerald-400 font-bold">{formatTime(cronometro)}</span>
          </div>

          {sala.participando ? (
            <button
              onClick={handleAbandonar}
              disabled={saliendo}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span>➔</span>
              <span>{saliendo ? 'Saliendo…' : 'Abandonar Sala'}</span>
            </button>
          ) : (
            <button
              onClick={handleUnirse}
              disabled={uniendose}
              className="px-4 py-2 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span>+</span>
              <span>{uniendose ? 'Entrando…' : 'Unirse a la Sala'}</span>
            </button>
          )}
        </div>
      </header>

      {errorAccion && (
        <div className="bg-red-900/40 border-b border-red-700/50 px-6 py-2.5 text-center text-xs text-red-200">
          {errorAccion}
        </div>
      )}

      {/* Contenido de la Sala */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Zona principal (Video / Pizarra marcadores de posición) */}
        <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  sala.estado === 'Activa'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-blue-400'
                }`}
              ></span>
              <span className="font-semibold text-slate-200">
                {sala.estado === 'Activa'
                  ? 'Videollamada y Pizarra Activas'
                  : 'Sala programada'}
              </span>
            </div>
            <span className="text-slate-400">
              {sala.participantesActuales} participante
              {sala.participantesActuales === 1 ? '' : 's'} conectado
              {sala.participantesActuales === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[350px]">
            {/* Videollamada marcador */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
              <div className="absolute top-3 left-3 bg-slate-900/80 px-3 py-1 rounded-lg text-xs font-medium text-slate-300">
                📹 Videollamada (Jitsi / WebRTC Próximamente)
              </div>
              <div className="w-20 h-20 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-3xl font-bold mb-3 border border-blue-500/30">
                👥
              </div>
              <h3 className="font-bold text-sm text-slate-200">
                Sala de Estudio Simultáneo
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                La transmisión de video y audio en tiempo real se habilitará con
                el servicio de terceros integrado.
              </p>
            </div>

            {/* Pizarra marcador */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
              <div className="absolute top-3 left-3 bg-slate-900/80 px-3 py-1 rounded-lg text-xs font-medium text-slate-300">
                ✏️ Pizarra Colaborativa (tldraw Próximamente)
              </div>
              <div className="w-20 h-20 bg-emerald-600/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl font-bold mb-3 border border-emerald-500/30">
                📐
              </div>
              <h3 className="font-bold text-sm text-slate-200">
                Espacio de Ejercicios en Conjunto
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Resolución simultánea de fórmulas y gráficas matemáticas
                sincronizadas en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Panel Lateral: Chat | Participantes | Materiales (Referencia visual 5 derecha) */}
        <div className="w-full lg:w-96 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col h-[450px] lg:h-auto">
          <div className="p-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-full">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'chat'
                    ? 'bg-[#0B4FC4] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('participantes')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'participantes'
                    ? 'bg-[#0B4FC4] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Participantes ({sala.participantesActuales})
              </button>
              <button
                onClick={() => setActiveTab('materiales')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'materiales'
                    ? 'bg-[#0B4FC4] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Materiales
              </button>
            </div>
          </div>

          {/* Contenido de la pestaña activa */}
          {activeTab === 'chat' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      conectadoChat ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  ></span>
                  {sala.participando
                    ? conectadoChat
                      ? `${usuariosEnLinea.length} en línea`
                      : 'Conectando…'
                    : 'Solo participantes'}
                </span>
                {mensajes.length > 0 && (
                  <span>
                    {mensajes.length} mensaje{mensajes.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3"
              >
                {!sala.participando ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="text-3xl mb-3">💬</div>
                    <p className="text-xs font-semibold text-slate-300">
                      Únete para participar en el chat
                    </p>
                    <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-slate-500">
                      Solo los participantes activos de la sala pueden leer y
                      enviar mensajes.
                    </p>
                  </div>
                ) : cargandoHistorial ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
                    <p className="mt-3 text-[11px] text-slate-400">
                      Cargando mensajes…
                    </p>
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="text-3xl mb-3">💬</div>
                    <p className="text-xs font-semibold text-slate-300">
                      Aún no hay mensajes
                    </p>
                    <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-slate-500">
                      Escribe el primer mensaje y comienza a estudiar en equipo.
                    </p>
                  </div>
                ) : (
                  mensajes.map((mensaje) => {
                    const esMio = mensaje.usuario.id === user.id;

                    return (
                      <div
                        key={mensaje.id}
                        className={`flex gap-2 ${esMio ? 'flex-row-reverse' : ''}`}
                      >
                        <div className="w-7 h-7 shrink-0 bg-blue-600/30 text-blue-300 rounded-full flex items-center justify-center font-bold text-[10px]">
                          {inicialesDe(mensaje.usuario.nombre)}
                        </div>
                        <div
                          className={`max-w-[80%] flex flex-col ${
                            esMio ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-0.5 px-0.5">
                            <span className="text-[10px] font-semibold text-slate-300">
                              {esMio ? 'Tú' : mensaje.usuario.nombre}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {horaDe(mensaje.enviadoEn)}
                            </span>
                          </div>
                          <p
                            className={`rounded-xl px-3 py-2 text-xs leading-relaxed break-words whitespace-pre-wrap ${
                              esMio
                                ? 'bg-[#0B4FC4] text-white rounded-tr-sm'
                                : 'bg-slate-900/70 text-slate-200 border border-slate-700/50 rounded-tl-sm'
                            }`}
                          >
                            {mensaje.contenido}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {errorChat && (
                <div
                  role="alert"
                  className="mx-3 mb-2 rounded-lg border border-red-700/60 bg-red-900/30 px-2.5 py-2 text-[10px] leading-relaxed text-red-200"
                >
                  {errorChat}
                </div>
              )}

              <form
                onSubmit={handleEnviarMensaje}
                className="p-3 bg-slate-900 border-t border-slate-700 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={mensajeTexto}
                  onChange={(e) => setMensajeTexto(e.target.value)}
                  maxLength={MAX_MENSAJE}
                  disabled={!puedeEscribir || enviandoMensaje}
                  placeholder={
                    !sala.participando
                      ? 'Únete para escribir en el chat'
                      : !conectadoChat
                        ? 'Conectando al chat…'
                        : 'Escribe un mensaje…'
                  }
                  aria-label="Mensaje del chat"
                  className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={
                    !puedeEscribir || enviandoMensaje || !mensajeTexto.trim()
                  }
                  aria-label="Enviar mensaje"
                  className="p-2 bg-[#0B4FC4] hover:bg-[#093fa3] text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {enviandoMensaje ? '…' : '➤'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'participantes' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {participantes.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="text-3xl mb-2">👥</div>
                  <p className="text-xs font-semibold text-slate-300">
                    Todavía no hay participantes
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Sé la primera persona en unirte a esta sala.
                  </p>
                </div>
              ) : (
                participantes.map((participante) => {
                  const esYo = participante.id === user.id;
                  const enLinea = usuariosEnLinea.includes(participante.id);
                  const rol = participante.esAnfitrion
                    ? 'Anfitrión/a'
                    : esYo
                      ? 'Tú'
                      : participante.rol === 'TUTOR'
                        ? 'Monitor'
                        : 'Estudiante';

                  return (
                    <div
                      key={participante.id}
                      className="flex items-center justify-between p-2.5 bg-slate-900/50 rounded-xl border border-slate-700/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center font-bold text-xs">
                          {inicialesDe(participante.nombre)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">
                            {participante.nombre}
                            {esYo ? ' (Tú)' : ''}
                          </h4>
                          <p className="text-[10px] text-slate-400">{rol}</p>
                        </div>
                      </div>
                      {sala.participando && (
                        <span
                          className={`text-[10px] font-medium flex items-center gap-1 ${
                            enLinea ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              enLinea ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                          ></span>
                          {enLinea ? 'En línea' : 'Desconectado'}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'materiales' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-700/60 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                <span>
                  {sala.participando
                    ? `${materiales.length} material${materiales.length === 1 ? '' : 'es'}`
                    : 'Solo participantes'}
                </span>
                {sala.participando && (
                  <button
                    type="button"
                    onClick={() => materialInputRef.current?.click()}
                    disabled={subiendoMaterial}
                    className="rounded-lg bg-[#0B4FC4] px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    + Subir material
                  </button>
                )}
              </div>

              {!sala.participando ? (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                  <div className="text-3xl mb-3">🔒</div>
                  <p className="text-xs font-semibold text-slate-300">
                    Materiales para participantes
                  </p>
                  <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-slate-500">
                    Únete a la sala para consultar, descargar y compartir los
                    archivos de estudio del grupo.
                  </p>
                </div>
              ) : (
                <>
                  <form
                    onSubmit={handleSubirMaterial}
                    className="space-y-2 border-b border-slate-700/60 p-3"
                  >
                    <input
                      ref={materialInputRef}
                      type="file"
                      accept={EXTENSIONES_MATERIALES.join(',')}
                      onChange={handleSeleccionarArchivo}
                      className="sr-only"
                      aria-label="Seleccionar material de estudio"
                    />

                    {archivoSeleccionado ? (
                      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-2.5">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
                            iconoDeMaterial(archivoSeleccionado.name).clase
                          }`}
                        >
                          {iconoDeMaterial(archivoSeleccionado.name).emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-[11px] font-semibold text-slate-200"
                            title={archivoSeleccionado.name}
                          >
                            {archivoSeleccionado.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {formatearTamano(archivoSeleccionado.size)} · Listo
                            para subir
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={limpiarArchivo}
                          disabled={subiendoMaterial}
                          aria-label="Quitar archivo seleccionado"
                          className="rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => materialInputRef.current?.click()}
                        className="w-full rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-3 py-4 text-center transition-colors hover:border-blue-500/60 hover:bg-slate-900/70"
                      >
                        <span className="block text-lg">📎</span>
                        <span className="mt-1 block text-[11px] font-semibold text-slate-300">
                          Elegir archivo
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
                          PDF, Word, PowerPoint, Excel, TXT o imágenes · máx.
                          10 MB
                        </span>
                      </button>
                    )}

                    {archivoSeleccionado && (
                      <>
                        <input
                          type="text"
                          value={descripcionMaterial}
                          onChange={(e) =>
                            setDescripcionMaterial(e.target.value)
                          }
                          maxLength={MAX_DESCRIPCION_MATERIAL}
                          disabled={subiendoMaterial}
                          placeholder="Descripción opcional"
                          aria-label="Descripción del material"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] disabled:opacity-60"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={limpiarArchivo}
                            disabled={subiendoMaterial}
                            className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 transition-colors hover:bg-slate-600 disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={subiendoMaterial}
                            className="rounded-lg bg-[#0B4FC4] px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {subiendoMaterial ? 'Subiendo…' : 'Subir material'}
                          </button>
                        </div>
                      </>
                    )}
                  </form>

                  {errorMateriales && (
                    <div
                      role="alert"
                      className="mx-3 mt-2 flex items-start justify-between gap-2 rounded-lg border border-red-700/60 bg-red-900/30 px-2.5 py-2 text-[10px] leading-relaxed text-red-200"
                    >
                      <span>{errorMateriales}</span>
                      {materiales.length === 0 && (
                        <button
                          type="button"
                          onClick={() => cargarMateriales()}
                          disabled={cargandoMateriales}
                          className="shrink-0 rounded-lg bg-red-800/60 px-2 py-1 font-bold text-red-100 transition-colors hover:bg-red-700 disabled:opacity-60"
                        >
                          Reintentar
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                    {cargandoMateriales ? (
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
                        <p className="mt-3 text-[11px] text-slate-400">
                          Cargando materiales…
                        </p>
                      </div>
                    ) : materiales.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="text-3xl mb-3">📄</div>
                        <p className="text-xs font-semibold text-slate-300">
                          Aún no hay materiales
                        </p>
                        <p className="mt-1 max-w-[230px] text-[11px] leading-relaxed text-slate-500">
                          Sube guías, talleres o apuntes para que el grupo los
                          tenga a mano.
                        </p>
                      </div>
                    ) : (
                      materiales.map((material) => {
                        const icono = iconoDeMaterial(material.nombre);
                        const confirmando =
                          confirmarEliminarId === material.id;

                        return (
                          <div
                            key={material.id}
                            className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-2.5"
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${icono.clase}`}
                              >
                                {icono.emoji}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="break-words text-[11px] font-semibold leading-snug text-slate-200"
                                  title={material.nombre}
                                >
                                  {material.nombre}
                                </p>
                                {material.descripcion && (
                                  <p className="mt-0.5 break-words text-[10px] leading-relaxed text-slate-400">
                                    {material.descripcion}
                                  </p>
                                )}
                                <p className="mt-1 text-[9px] text-slate-500">
                                  {material.usuario.id === user.id
                                    ? 'Tú'
                                    : material.usuario.nombre}{' '}
                                  · {fechaCortaDe(material.creadoEn)} ·{' '}
                                  {formatearTamano(material.tamano)}
                                </p>
                              </div>
                            </div>

                            {confirmando ? (
                              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-900/20 px-2 py-1.5">
                                <span className="text-[10px] text-red-200">
                                  ¿Eliminar este material?
                                </span>
                                <div className="flex shrink-0 gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmarEliminarId(null)}
                                    disabled={
                                      eliminandoMaterialId === material.id
                                    }
                                    className="rounded-lg bg-slate-700 px-2 py-1 text-[10px] font-bold text-slate-200 transition-colors hover:bg-slate-600 disabled:opacity-60"
                                  >
                                    No
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleEliminarMaterial(material)
                                    }
                                    disabled={
                                      eliminandoMaterialId === material.id
                                    }
                                    className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {eliminandoMaterialId === material.id
                                      ? 'Eliminando…'
                                      : 'Sí, eliminar'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDescargarMaterial(material)
                                  }
                                  disabled={
                                    descargandoMaterialId === material.id
                                  }
                                  className="rounded-lg bg-slate-700 px-2 py-1 text-[10px] font-bold text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {descargandoMaterialId === material.id
                                    ? 'Descargando…'
                                    : '↓ Descargar'}
                                </button>
                                {material.puedeEliminar && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmarEliminarId(material.id)
                                    }
                                    aria-label={`Eliminar ${material.nombre}`}
                                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-300 transition-colors hover:bg-red-600 hover:text-white"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Footer indicador de conexión */}
          <div className="p-2 bg-slate-900 border-t border-slate-700 text-center text-[10px] text-slate-400 flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${estadoConexion.color}`}></span>
            <span>{estadoConexion.texto}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
