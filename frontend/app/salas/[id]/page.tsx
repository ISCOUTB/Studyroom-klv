'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Pizarra } from '@/components/sala/Pizarra';
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
    return { emoji: '📕', clase: 'bg-red-50 text-red-600' };
  }
  if (extension === '.doc' || extension === '.docx') {
    return { emoji: '📘', clase: 'bg-blue-50 text-blue-600' };
  }
  if (extension === '.ppt' || extension === '.pptx') {
    return { emoji: '📊', clase: 'bg-orange-50 text-orange-600' };
  }
  if (extension === '.xls' || extension === '.xlsx') {
    return { emoji: '📈', clase: 'bg-emerald-50 text-emerald-600' };
  }
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    return { emoji: '🖼️', clase: 'bg-purple-50 text-purple-600' };
  }
  if (extension === '.txt') {
    return { emoji: '📝', clase: 'bg-slate-100 text-slate-600' };
  }

  return { emoji: '📎', clase: 'bg-slate-100 text-slate-600' };
}

export default function SalaEnVivoPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const salaId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [activeTab, setActiveTab] = useState<'chat' | 'participantes' | 'materiales'>('chat');
  const [vista, setVista] = useState<'dividida' | 'video' | 'pizarra'>('dividida');
  const [socketPizarra, setSocketPizarra] = useState<Socket | null>(null);
  const [sala, setSala] = useState<SalaDetalle | null>(null);
  const [loadingSala, setLoadingSala] = useState(true);
  const [errorSala, setErrorSala] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [uniendose, setUniendose] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [cronometro, setCronometro] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Mensajería en tiempo real
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
          : 'No se pudo cargar el historial de mensajes.'
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
    if (!sala?.participando) return;
    void cargarMateriales();
  }, [sala?.participando, cargarMateriales]);

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

  // Conexión de la mensajería: solo para participantes activos de la sala.
  useEffect(() => {
    if (!token || !salaId || !sala?.participando) {
      setConectadoChat(false);
      setSocketPizarra(null);
      return;
    }

    const socket = io(API_URL, {
      auth: { token },
      reconnection: true,
    });
    socketRef.current = socket;
    setSocketPizarra(socket);
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
            setErrorChat('La mensajería tardó demasiado en responder. Reintentando…');
            return;
          }
          if (!respuesta?.ok) {
            setConectadoChat(false);
            setErrorChat(
              respuesta?.error || 'No se pudo conectar a la mensajería de la sala.'
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
      const esMensajeDelServidor = /sesión|usuario|sala|particip/i.test(mensaje);
      setErrorChat(
        esMensajeDelServidor
          ? mensaje
          : 'No se pudo conectar a la mensajería. Reintentando…'
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
            'Tu participación en la sala terminó. Vuelve a unirte para usar la mensajería.'
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
      setSocketPizarra(null);
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
        'Formato no permitido. Puedes subir PDF, documentos, presentaciones, hojas de cálculo, texto o imágenes JPG, PNG o WEBP.'
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <UTBLogo className="mb-8 h-10" />
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#0B4FC4]" />
        <p className="mt-4 text-sm font-semibold text-slate-500">
          Cargando sala de estudio…
        </p>
      </div>
    );
  }

  if (errorSala || !sala) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-4xl">⚠️</div>
          <h1 className="mb-2 text-lg font-bold text-slate-900">
            No pudimos abrir la sala
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            {errorSala || 'La sala de estudio no existe.'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={cargarSala}
              className="rounded-xl bg-[#0B4FC4] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#093fa3]"
            >
              Reintentar
            </button>
            <button
              onClick={() => router.push('/salas')}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
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
      ? {
          color: 'bg-slate-400',
          texto: 'Únete a la sala para usar el chat y la pizarra',
        }
      : conectadoChat
        ? {
            color: 'bg-emerald-500',
            texto: `Conectado · ${usuariosEnLinea.length} en línea`,
          }
        : { color: 'bg-amber-400', texto: 'Conectando a la sala…' };

  const vistas: Array<{
    id: 'dividida' | 'video' | 'pizarra';
    etiqueta: string;
    icono: string;
  }> = [
    { id: 'dividida', etiqueta: 'Vista dividida', icono: '▤' },
    { id: 'video', etiqueta: 'Videollamada', icono: '📹' },
    { id: 'pizarra', etiqueta: 'Pizarra', icono: '✏️' },
  ];

  const pestañas: Array<{
    id: 'chat' | 'participantes' | 'materiales';
    etiqueta: string;
    contador: number;
  }> = [
    { id: 'chat', etiqueta: 'Chat', contador: mensajes.length },
    { id: 'participantes', etiqueta: 'Participantes', contador: participantes.length },
    { id: 'materiales', etiqueta: 'Materiales', contador: materiales.length },
  ];

  const estadoSala =
    sala.estado === 'Activa'
      ? { color: 'bg-emerald-500', texto: 'Sala activa' }
      : sala.estado === 'Finalizada'
        ? { color: 'bg-slate-400', texto: 'Sala finalizada' }
        : { color: 'bg-blue-500', texto: 'Sala programada' };

  const tileParticipante = (
    participante: (typeof participantes)[number],
    compacto: boolean
  ) => {
    const esYo = participante.id === user.id;
    const enLinea = usuariosEnLinea.includes(participante.id);

    return (
      <div
        key={participante.id}
        className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 ring-1 ${
          enLinea ? 'ring-emerald-400/50' : 'ring-slate-200'
        }`}
      >
        <div
          className={`flex items-center justify-center ${
            compacto ? 'aspect-[4/3]' : 'aspect-video'
          }`}
        >
          <div
            className={`flex items-center justify-center rounded-full bg-white/10 font-bold text-white ${
              compacto ? 'h-11 w-11 text-xs' : 'h-16 w-16 text-lg'
            }`}
          >
            {inicialesDe(participante.nombre)}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-slate-950/90 to-transparent px-2 py-1.5">
          <span className="truncate text-[10px] font-semibold text-white">
            {esYo ? 'Tú' : participante.nombre}
            {participante.esAnfitrion && !esYo ? ' · Anfitrión' : ''}
          </span>
          <span className="shrink-0 text-[10px] text-slate-300" title="Micrófono apagado">
            🔇
          </span>
        </div>

        <span
          className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${
            enLinea ? 'bg-emerald-400' : 'bg-slate-500'
          }`}
        />
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 lg:h-screen lg:overflow-hidden">
      {/* Encabezado */}
      <header className="z-20 shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <UTBLogo className="h-8 shrink-0" />
            <div className="hidden h-9 w-px bg-slate-200 md:block" />
            <div className="hidden min-w-0 md:block">
              <h1 className="truncate text-sm font-bold text-slate-900">
                {sala.asignatura} · {sala.titulo}
              </h1>
              <p className="truncate text-[11px] text-slate-400">{sala.tema}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-600 sm:px-3">
              <span aria-hidden="true">⏱</span>
              <span className="tabular-nums">{formatTime(cronometro)}</span>
            </div>

            <NotificationBell variant="light" />

            {sala.participando ? (
              <button
                onClick={handleAbandonar}
                disabled={saliendo}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-70 sm:px-4"
              >
                <span aria-hidden="true">➜</span>
                <span>{saliendo ? 'Saliendo…' : 'Abandonar Sala'}</span>
              </button>
            ) : (
              <button
                onClick={handleUnirse}
                disabled={uniendose}
                className="flex items-center gap-2 rounded-xl bg-[#0B4FC4] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-70 sm:px-4"
              >
                <span aria-hidden="true">+</span>
                <span>{uniendose ? 'Entrando…' : 'Unirse a la Sala'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {errorAccion && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-center text-xs font-medium text-red-700">
          {errorAccion}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3 px-3 py-3 sm:px-5 sm:py-4 lg:min-h-0">
        {/* Selector de vista y estado */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {vistas.map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                onClick={() => setVista(opcion.id)}
                aria-pressed={vista === opcion.id}
                aria-label={opcion.etiqueta}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors sm:px-3 ${
                  vista === opcion.id
                    ? 'bg-[#0B4FC4] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <span aria-hidden="true">{opcion.icono}</span>
                <span>
                  {opcion.id === 'dividida'
                    ? 'Dividida'
                    : opcion.id === 'video'
                      ? 'Video'
                      : 'Pizarra'}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              <span className={`h-2 w-2 rounded-full ${estadoSala.color}`} />
              {estadoSala.texto}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              👥 {sala.participantesActuales}/{sala.cupoMaximo}
            </span>
            <span className="max-w-[150px] truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 md:hidden">
              {sala.titulo}
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">
          {/* Columna de participantes / videollamada */}
          {vista !== 'pizarra' && (
            <aside className="flex w-full shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:w-60">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-700">
                  {vista === 'video' ? 'En la videollamada' : 'En la sala'}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {sala.participantesActuales}
                </span>
              </div>

              {participantes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                  {participantes.map((participante) =>
                    tileParticipante(participante, true)
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Aún no hay participantes
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Sé la primera persona en unirte.
                  </p>
                </div>
              )}

              {!sala.participando && (
                <button
                  type="button"
                  onClick={handleUnirse}
                  disabled={uniendose}
                  className="rounded-xl bg-[#0B4FC4] px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uniendose ? 'Entrando…' : 'Unirme a la sala'}
                </button>
              )}

              <p className="mt-auto rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-400">
                🎥 La transmisión de audio, video y pantalla compartida se
                habilitará en la siguiente fase.
              </p>
            </aside>
          )}

          {/* Zona central: pizarra o videollamada */}
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {vista === 'video' ? (
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
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                    Vista previa
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {participantes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {participantes.map((participante) =>
                        tileParticipante(participante, false)
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
                      <div className="mb-3 text-3xl">👥</div>
                      <p className="text-xs font-semibold text-slate-600">
                        Todavía no hay participantes
                      </p>
                      <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-slate-400">
                        Únete a la sala para ver aquí a las personas conectadas.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] leading-relaxed text-slate-500">
                  La transmisión de audio y video entre participantes llega en
                  la siguiente fase. La pizarra y el chat ya están sincronizados.
                </div>
              </section>
            ) : (
              <div className="flex min-h-[460px] flex-1 flex-col xl:min-h-0">
                <Pizarra
                  salaId={salaId ?? ''}
                  socket={socketPizarra}
                  participando={sala.participando}
                  conexionLista={conectadoChat}
                  esAnfitrion={sala.esAnfitrion}
                  usuario={{ id: user.id, nombre: user.nombre }}
                />
              </div>
            )}
          </div>

          {/* Panel de colaboración */}
          <aside className="flex h-[540px] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:h-auto xl:w-[360px]">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-800">
                  Colaboración de la sala
                </h2>
                <span
                  className={`h-2 w-2 rounded-full ${
                    conectadoChat ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Chat, participantes y materiales en tiempo real
              </p>
            </div>

            <div className="border-b border-slate-100 p-2">
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {pestañas.map((pestaña) => (
                  <button
                    key={pestaña.id}
                    type="button"
                    onClick={() => setActiveTab(pestaña.id)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-bold transition-all ${
                      activeTab === pestaña.id
                        ? 'bg-white text-[#0B4FC4] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span>{pestaña.etiqueta}</span>
                    {pestaña.id !== 'chat' && (
                      <span
                        className={`rounded-full px-1.5 text-[9px] ${
                          activeTab === pestaña.id
                            ? 'bg-blue-50 text-[#0B4FC4]'
                            : 'bg-white text-slate-400'
                        }`}
                      >
                        {pestaña.contador}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat */}
            {activeTab === 'chat' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        conectadoChat ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
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
                  className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
                >
                  {!sala.participando ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="mb-3 text-3xl">💬</div>
                      <p className="text-xs font-semibold text-slate-600">
                        Únete para participar en la mensajería
                      </p>
                      <p className="mt-1 max-w-[230px] text-[11px] leading-relaxed text-slate-400">
                        Solo los participantes activos de la sala pueden leer y
                        enviar mensajes.
                      </p>
                    </div>
                  ) : cargandoHistorial ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0B4FC4]" />
                      <p className="mt-3 text-[11px] text-slate-400">
                        Cargando mensajes…
                      </p>
                    </div>
                  ) : mensajes.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="mb-3 text-3xl">💬</div>
                      <p className="text-xs font-semibold text-slate-600">
                        Aún no hay mensajes
                      </p>
                      <p className="mt-1 max-w-[230px] text-[11px] leading-relaxed text-slate-400">
                        Escribe el primer mensaje y comienza a estudiar en
                        equipo.
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
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-[#0B4FC4]">
                            {inicialesDe(mensaje.usuario.nombre)}
                          </div>
                          <div
                            className={`flex max-w-[80%] flex-col ${
                              esMio ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div className="mb-0.5 flex items-center gap-2 px-0.5">
                              <span className="text-[10px] font-semibold text-slate-500">
                                {esMio ? 'Tú' : mensaje.usuario.nombre}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {horaDe(mensaje.enviadoEn)}
                              </span>
                            </div>
                            <p
                              className={`whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                esMio
                                  ? 'rounded-tr-sm bg-[#0B4FC4] text-white'
                                  : 'rounded-tl-sm border border-slate-200 bg-slate-50 text-slate-700'
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
                    className="mx-3 mb-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] leading-relaxed text-red-700"
                  >
                    {errorChat}
                  </div>
                )}

                <form
                  onSubmit={handleEnviarMensaje}
                  className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5"
                >
                  <input
                    type="text"
                    value={mensajeTexto}
                    onChange={(e) => setMensajeTexto(e.target.value)}
                    maxLength={MAX_MENSAJE}
                    disabled={!puedeEscribir || enviandoMensaje}
                    placeholder={
                      !sala.participando
                        ? 'Únete para escribir en la mensajería'
                        : !conectadoChat
                          ? 'Conectando a la mensajería…'
                          : 'Escribe un mensaje…'
                    }
                    aria-label="Mensaje para la sala"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={
                      !puedeEscribir || enviandoMensaje || !mensajeTexto.trim()
                    }
                    aria-label="Enviar mensaje"
                    className="rounded-xl bg-[#0B4FC4] p-2 text-xs font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {enviandoMensaje ? '…' : '➤'}
                  </button>
                </form>
              </div>
            )}

            {/* Participantes */}
            {activeTab === 'participantes' && (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {participantes.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-2 text-3xl">👥</div>
                    <p className="text-xs font-semibold text-slate-600">
                      Todavía no hay participantes
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
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
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#0B4FC4]">
                            {inicialesDe(participante.nombre)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-700">
                              {participante.nombre}
                              {esYo ? ' (Tú)' : ''}
                            </h4>
                            <p className="text-[10px] text-slate-400">{rol}</p>
                          </div>
                        </div>
                        {sala.participando && (
                          <span
                            className={`flex items-center gap-1 text-[10px] font-medium ${
                              enLinea ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                enLinea ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                            {enLinea ? 'En línea' : 'Desconectado'}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Materiales */}
            {activeTab === 'materiales' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-[10px] text-slate-400">
                  <span>
                    {sala.participando
                      ? `${materiales.length} material${
                          materiales.length === 1 ? '' : 'es'
                        }`
                      : 'Solo participantes'}
                  </span>
                  {sala.participando && (
                    <button
                      type="button"
                      onClick={() => materialInputRef.current?.click()}
                      disabled={subiendoMaterial}
                      className="rounded-lg bg-[#0B4FC4] px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      + Subir archivo
                    </button>
                  )}
                </div>

                {!sala.participando ? (
                  <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                    <div className="mb-3 text-3xl">🔒</div>
                    <p className="text-xs font-semibold text-slate-600">
                      Materiales para participantes
                    </p>
                    <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-slate-400">
                      Únete a la sala para consultar, descargar y compartir los
                      archivos de estudio del grupo.
                    </p>
                  </div>
                ) : (
                  <>
                    <form
                      onSubmit={handleSubirMaterial}
                      className="space-y-2 border-b border-slate-100 p-3"
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
                        <>
                          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
                                iconoDeMaterial(archivoSeleccionado.name).clase
                              }`}
                            >
                              {iconoDeMaterial(archivoSeleccionado.name).emoji}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-[11px] font-semibold text-slate-700"
                                title={archivoSeleccionado.name}
                              >
                                {archivoSeleccionado.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {formatearTamano(archivoSeleccionado.size)} ·
                                Listo para subir
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={limpiarArchivo}
                              disabled={subiendoMaterial}
                              aria-label="Quitar archivo seleccionado"
                              className="rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50"
                            >
                              ✕
                            </button>
                          </div>

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
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] disabled:opacity-60"
                          />

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={limpiarArchivo}
                              disabled={subiendoMaterial}
                              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-60"
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
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => materialInputRef.current?.click()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500 transition-colors hover:border-[#0B4FC4] hover:text-[#0B4FC4]"
                          >
                            <span aria-hidden="true">📎</span>
                            <span>Subir archivo</span>
                          </button>
                          <p className="text-center text-[10px] leading-relaxed text-slate-400">
                            PDF, documentos, presentaciones, hojas de cálculo,
                            texto o imágenes · máx. 10 MB
                          </p>
                        </>
                      )}
                    </form>

                    {errorMateriales && (
                      <div
                        role="alert"
                        className="mx-3 mt-2 flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] leading-relaxed text-red-700"
                      >
                        <span>{errorMateriales}</span>
                        {materiales.length === 0 && (
                          <button
                            type="button"
                            onClick={() => cargarMateriales()}
                            disabled={cargandoMateriales}
                            className="shrink-0 rounded-lg bg-red-100 px-2 py-1 font-bold text-red-700 transition-colors hover:bg-red-200 disabled:opacity-60"
                          >
                            Reintentar
                          </button>
                        )}
                      </div>
                    )}

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                      {cargandoMateriales ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0B4FC4]" />
                          <p className="mt-3 text-[11px] text-slate-400">
                            Cargando materiales…
                          </p>
                        </div>
                      ) : materiales.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <div className="mb-3 text-3xl">📄</div>
                          <p className="text-xs font-semibold text-slate-600">
                            Aún no hay materiales
                          </p>
                          <p className="mt-1 max-w-[230px] text-[11px] leading-relaxed text-slate-400">
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
                              className="rounded-xl border border-slate-200 bg-white p-2.5"
                            >
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${icono.clase}`}
                                >
                                  {icono.emoji}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="break-words text-[11px] font-semibold leading-snug text-slate-700"
                                    title={material.nombre}
                                  >
                                    {material.nombre}
                                  </p>
                                  {material.descripcion && (
                                    <p className="mt-0.5 break-words text-[10px] leading-relaxed text-slate-500">
                                      {material.descripcion}
                                    </p>
                                  )}
                                  <p className="mt-1 text-[9px] text-slate-400">
                                    {material.usuario.id === user.id
                                      ? 'Tú'
                                      : material.usuario.nombre}{' '}
                                    · {fechaCortaDe(material.creadoEn)} ·{' '}
                                    {formatearTamano(material.tamano)}
                                  </p>
                                </div>
                              </div>

                              {confirmando ? (
                                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 px-2 py-1.5">
                                  <span className="text-[10px] text-red-700">
                                    ¿Eliminar este material?
                                  </span>
                                  <div className="flex shrink-0 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setConfirmarEliminarId(null)}
                                      disabled={
                                        eliminandoMaterialId === material.id
                                      }
                                      className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-60"
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
                                    className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
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
                                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-600 hover:text-white"
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

            {/* Indicador de conexión */}
            <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2 text-center text-[10px] text-slate-500">
              <span className={`h-2 w-2 rounded-full ${estadoConexion.color}`} />
              <span>{estadoConexion.texto}</span>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
