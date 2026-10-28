'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Pizarra } from '@/components/sala/Pizarra';
import {
  AudioRemotos,
  VideoStream,
  Videollamada,
  useVideollamada,
} from '@/components/sala/Videollamada';
import {
  IconoPizarra,
  IconoSalir,
  IconoVideo,
} from '@/components/sala/iconos-sala';
import { useParams, useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { apiRequest, API_URL } from '@/lib/api';
import { Toast, useToast } from '@/components/ui/Toast';
import { ModalReporte } from '@/components/reportes/ModalReporte';
import { useTheme } from '@/lib/theme-context';
import { useCatalogo } from '@/lib/catalogo';
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

type SeccionIzquierda = 'ejercicios' | 'pizarra' | 'video';
type SeccionDerecha = 'chat' | 'personas' | 'materiales';
type PestanaSala = SeccionIzquierda | SeccionDerecha;

const PESTANAS_IZQUIERDA: Array<{
  id: SeccionIzquierda;
  etiqueta: string;
}> = [
  { id: 'ejercicios', etiqueta: 'Ejercicios' },
  { id: 'pizarra', etiqueta: 'Pizarra' },
  { id: 'video', etiqueta: 'Video' },
];

const PESTANAS_DERECHA: Array<{
  id: SeccionDerecha;
  etiqueta: string;
}> = [
  { id: 'chat', etiqueta: 'Chat' },
  { id: 'personas', etiqueta: 'Personas' },
  { id: 'materiales', etiqueta: 'Materiales' },
];

function IconoBase({
  children,
  className = 'h-4 w-4',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

function IconoFlechaIzquierda({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </IconoBase>
  );
}

function IconoWifi({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </IconoBase>
  );
}

function IconoChat({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8 10h8M8 14h5" />
    </IconoBase>
  );
}

function IconoPersonas({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconoBase>
  );
}

function IconoMaterial({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </IconoBase>
  );
}

function IconoEjercicios({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
    </IconoBase>
  );
}

function IconoMenuPuntos({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </IconoBase>
  );
}

function IconoCorona({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M3 18h18l-2-10-4.5 4L12 5 9.5 12 5 8Z" />
      <path d="M3 21h18" />
    </IconoBase>
  );
}

function IconoInvitar({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </IconoBase>
  );
}

function IconoCandado({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </IconoBase>
  );
}

function IconoEnlace({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7L12 5" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19" />
    </IconoBase>
  );
}

function IconoMicrofono({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 17v4M8 21h8" />
    </IconoBase>
  );
}

function IconoMicrofonoOff({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M9 9v1a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M5 10a7 7 0 0 0 10.7 6.2M19 10v1a7 7 0 0 1-.5 2.5" />
      <path d="M12 17v4M8 21h8M3 3l18 18" />
    </IconoBase>
  );
}

function IconoCamara({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </IconoBase>
  );
}

function IconoCamaraOff({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L21.2 8.5a.5.5 0 0 1 .8.4v6.7" />
      <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
      <path d="M3 3l18 18" />
    </IconoBase>
  );
}

function IconoBasura({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </IconoBase>
  );
}

function IconoSol({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </IconoBase>
  );
}

function IconoLuna({ className }: { className?: string }) {
  return (
    <IconoBase className={className}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </IconoBase>
  );
}

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Se intenta el método alternativo.
  }

  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copiado = document.execCommand('copy');
    area.remove();
    return copiado;
  } catch {
    return false;
  }
}

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
  const { colorDe } = useCatalogo();
  const { temaOscuro, alternarTema } = useTheme();
  const { toast, mostrar: mostrarToast, cerrar: cerrarToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const salaId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [activeTab, setActiveTab] = useState<SeccionDerecha>('chat');
  const [seccion, setSeccion] = useState<SeccionIzquierda>('video');
  const [pestanaMovil, setPestanaMovil] = useState<PestanaSala>('video');
  const [socketPizarra, setSocketPizarra] = useState<Socket | null>(null);
  const [sala, setSala] = useState<SalaDetalle | null>(null);
  const [loadingSala, setLoadingSala] = useState(true);
  const [errorSala, setErrorSala] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [uniendose, setUniendose] = useState(false);
  const [modalCodigo, setModalCodigo] = useState(false);
  const [codigoAcceso, setCodigoAcceso] = useState('');
  const [errorCodigo, setErrorCodigo] = useState('');
  const [saliendo, setSaliendo] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Encabezado, menú y modo oscuro
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmar, setConfirmar] = useState<'abandonar' | 'limpiar' | null>(
    null
  );
  const [limpiandoPizarra, setLimpiandoPizarra] = useState(false);

  // Preferencias para entrar a la videollamada.
  const [micPrevio, setMicPrevio] = useState(true);
  const [camPrevio, setCamPrevio] = useState(false);
  const [pendienteVideo, setPendienteVideo] = useState(false);

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
  const [arrastrandoArchivo, setArrastrandoArchivo] = useState(false);
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
  const [materialReportado, setMaterialReportado] =
    useState<MaterialEstudio | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const materialInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Videollamada WebRTC: una sola instancia para toda la sala.
  const video = useVideollamada({
    socket: socketPizarra,
    salaId: salaId ?? '',
    participando: !!sala?.participando,
    usuarioId: user?.id ?? '',
    usuarioNombre: user?.nombre ?? '',
  });

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

  // Aviso verde al llegar desde la creación de una sala.
  useEffect(() => {
    if (!salaId) return;

    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get('creada') !== '1') return;

    mostrarToast('Sala creada. ¡Invita a tus compañeros!', {
      variante: 'exito',
      duracion: 5000,
    });
    window.history.replaceState(null, '', `/salas/${salaId}`);
  }, [salaId, mostrarToast]);

  // Cierra el menú ⋮ al hacer clic fuera o presionar Escape.
  useEffect(() => {
    if (!menuAbierto) return;

    const alTocarFuera = (evento: MouseEvent) => {
      if (!menuRef.current?.contains(evento.target as Node)) {
        setMenuAbierto(false);
      }
    };
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAbierto(false);
    };

    document.addEventListener('mousedown', alTocarFuera);
    window.addEventListener('keydown', alPresionarTecla);

    return () => {
      document.removeEventListener('mousedown', alTocarFuera);
      window.removeEventListener('keydown', alPresionarTecla);
    };
  }, [menuAbierto]);

  // Si se pidió la videollamada antes de unirse a la sala, se entra en
  // cuanto la mensajería (y por tanto el socket) esté conectada.
  useEffect(() => {
    if (!pendienteVideo) return;
    if (
      !sala?.participando ||
      !conectadoChat ||
      !socketPizarra ||
      video.enLlamada ||
      video.cargando
    ) {
      return;
    }

    setPendienteVideo(false);
    void video.unirse({ microfono: micPrevio, camara: camPrevio });
  }, [
    pendienteVideo,
    sala?.participando,
    conectadoChat,
    socketPizarra,
    video.enLlamada,
    video.cargando,
    video.unirse,
    micPrevio,
    camPrevio,
  ]);

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

  const handleUnirse = async (codigoIngresado?: string): Promise<boolean> => {
    if (!token || !sala) return false;

    const requiereCodigo = sala.privacidad === 'Privada' && !sala.esAnfitrion;
    const codigo = (codigoIngresado ?? '').trim().toUpperCase();

    if (requiereCodigo && !codigo) {
      setErrorAccion('');
      setErrorCodigo('');
      setModalCodigo(true);
      return false;
    }

    setErrorAccion('');
    setErrorCodigo('');
    setUniendose(true);
    try {
      await apiRequest(`/api/salas/${sala.id}/unirse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: codigo ? JSON.stringify({ codigoAcceso: codigo }) : undefined,
      });
      setModalCodigo(false);
      setCodigoAcceso('');
      await cargarSala();
      return true;
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : 'No se pudo entrar a la sala.';
      setErrorAccion(mensaje);
      if (requiereCodigo) {
        setErrorCodigo(mensaje);
      }
      return false;
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

  const seleccionarPestana = (id: PestanaSala) => {
    setPestanaMovil(id);
    if (id === 'ejercicios' || id === 'pizarra' || id === 'video') {
      setSeccion(id);
    } else {
      setActiveTab(id);
    }
  };

  const copiarEnlace = async () => {
    const enlace = `${window.location.origin}/salas/${salaId}`;
    const copiado = await copiarTexto(enlace);

    if (copiado) {
      mostrarToast('Enlace copiado. Compártelo con tus compañeros.', {
        variante: 'exito',
        detalle: enlace,
      });
    } else {
      mostrarToast('No pudimos copiar el enlace.', {
        variante: 'error',
        detalle: enlace,
      });
    }
  };

  const entrarALlamada = async () => {
    if (!sala) return;

    if (!sala.participando) {
      const ok = await handleUnirse();
      if (ok) {
        setPendienteVideo(true);
        mostrarToast('Ya estás en la sala. Preparando la videollamada…', {
          variante: 'info',
        });
      }
      return;
    }

    if (!conectadoChat || !socketPizarra) {
      mostrarToast('Espera a que la sala termine de conectarse.', {
        variante: 'info',
      });
      return;
    }

    if (video.enLlamada) return;
    void video.unirse({ microfono: micPrevio, camara: camPrevio });
  };

  const limpiarPizarra = () => {
    const socket = socketRef.current;

    if (!socket || !sala?.participando) {
      mostrarToast('Únete a la sala para limpiar la pizarra.', {
        variante: 'info',
      });
      return;
    }

    setLimpiandoPizarra(true);
    socket.timeout(8000).emit(
      'pizarra:limpiar',
      { salaId },
      (timeoutError: Error | null, respuesta: any) => {
        setLimpiandoPizarra(false);

        if (timeoutError || !respuesta?.ok) {
          mostrarToast(respuesta?.error || 'No se pudo limpiar la pizarra.', {
            variante: 'error',
          });
          return;
        }

        mostrarToast('Pizarra limpia.', {
          variante: 'exito',
          detalle: 'Todos los trazos se borraron para el grupo.',
        });
      }
    );
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
    setArrastrandoArchivo(false);
    if (materialInputRef.current) {
      materialInputRef.current.value = '';
    }
  };

  const seleccionarArchivo = (archivo: File | null) => {
    setErrorMateriales('');

    if (!archivo) {
      setArchivoSeleccionado(null);
      return;
    }

    const extension = extensionDe(archivo.name);
    if (!(EXTENSIONES_MATERIALES as readonly string[]).includes(extension)) {
      setArchivoSeleccionado(null);
      if (materialInputRef.current) {
        materialInputRef.current.value = '';
      }
      setErrorMateriales(
        'Formato no permitido. Puedes subir PDF, documentos, presentaciones, hojas de cálculo, texto o imágenes JPG, PNG o WEBP.'
      );
      return;
    }

    if (archivo.size > MAX_MATERIAL_BYTES) {
      setArchivoSeleccionado(null);
      if (materialInputRef.current) {
        materialInputRef.current.value = '';
      }
      setErrorMateriales('El archivo supera el límite de 10 MB.');
      return;
    }

    setArchivoSeleccionado(archivo);
  };

  const handleSeleccionarArchivo = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    seleccionarArchivo(e.target.files?.[0] ?? null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (subiendoMaterial) return;
    setArrastrandoArchivo(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setArrastrandoArchivo(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrandoArchivo(false);
    if (subiendoMaterial) return;
    seleccionarArchivo(e.dataTransfer.files?.[0] ?? null);
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
          texto: 'Únete a la sala para usar la mensajería y la pizarra',
        }
      : conectadoChat
        ? {
            color: 'bg-emerald-500',
            texto: `Conectado · ${usuariosEnLinea.length} en línea`,
          }
        : { color: 'bg-amber-400', texto: 'Conectando a la sala…' };

  const colorMateria = colorDe(sala.asignatura);
  const esPrivada = sala.privacidad === 'Privada';
  const enLineaTotal = sala.participando
    ? Math.max(usuariosEnLinea.length, 1)
    : sala.participantesActuales;
  const enPanelMovil =
    pestanaMovil === 'chat' ||
    pestanaMovil === 'personas' ||
    pestanaMovil === 'materiales';

  const iconosPestana: Record<PestanaSala, React.ReactNode> = {
    ejercicios: <IconoEjercicios className="h-3.5 w-3.5" />,
    pizarra: <IconoPizarra className="h-3.5 w-3.5" />,
    video: <IconoVideo className="h-3.5 w-3.5" />,
    chat: <IconoChat className="h-3.5 w-3.5" />,
    personas: <IconoPersonas className="h-3.5 w-3.5" />,
    materiales: <IconoMaterial className="h-3.5 w-3.5" />,
  };

  const clasePestana = (activa: boolean) =>
    `inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
      activa
        ? 'bg-[#0B4FC4] text-white shadow-sm'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 lg:h-screen lg:overflow-hidden">
      <AudioRemotos remotos={video.remotos} />

      <Toast
        abierto={!!toast}
        mensaje={toast?.mensaje ?? ''}
        detalle={toast?.detalle}
        variante={toast?.variante}
        duracion={toast?.duracion}
        onCerrar={cerrarToast}
      />

      {/* Encabezado de la sala */}
      <header className="z-20 shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-3 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => router.push('/salas')}
                aria-label="Volver a las salas"
                title="Volver a las salas"
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              >
                <IconoFlechaIzquierda className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                  {sala.titulo}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
            <div
              className="relative hidden h-9 w-9 items-center justify-center rounded-full bg-[#0B4FC4] text-[11px] font-black text-white sm:flex"
              title={user.nombre}
            >
              {inicialesDe(user.nombre)}
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  conectadoChat ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
            </div>

            {sala.participando ? (
              <button
                type="button"
                onClick={() => void copiarEnlace()}
                aria-label="Invitar a la sala"
                title="Copiar enlace de la sala"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#0B4FC4]/40 hover:bg-blue-50 hover:text-[#0B4FC4]"
              >
                <IconoInvitar className="h-4 w-4" />
                <span className="hidden sm:inline">Invitar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleUnirse()}
                disabled={uniendose}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0B4FC4] px-3 text-xs font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {esPrivada ? (
                  <IconoCandado className="h-4 w-4" />
                ) : (
                  <IconoInvitar className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {uniendose
                    ? 'Entrando…'
                    : esPrivada
                      ? 'Unirme con código'
                      : 'Unirme'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={alternarTema}
              aria-label={
                temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'
              }
              title={temaOscuro ? 'Modo claro' : 'Modo oscuro'}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0B4FC4]"
            >
              {temaOscuro ? (
                <IconoSol className="h-[18px] w-[18px]" />
              ) : (
                <IconoLuna className="h-[18px] w-[18px]" />
              )}
            </button>

            <NotificationBell variant={temaOscuro ? 'dark' : 'light'} />

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuAbierto((valor) => !valor)}
                aria-label="Más opciones de la sala"
                title="Más opciones"
                aria-expanded={menuAbierto}
                aria-haspopup="menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <IconoMenuPuntos className="h-5 w-5" />
              </button>

              {menuAbierto && (
                <div
                  role="menu"
                  aria-label="Opciones de la sala"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                >
                  {!sala.participando && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuAbierto(false);
                        void handleUnirse();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#0B4FC4] transition-colors hover:bg-blue-50"
                    >
                      <IconoInvitar className="h-4 w-4" />
                      Unirme a la sala
                    </button>
                  )}

                  {sala.participando && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuAbierto(false);
                        setConfirmar('abandonar');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <IconoSalir className="h-4 w-4" />
                      Abandonar sala
                    </button>
                  )}

                  {sala.esAnfitrion && sala.participando && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuAbierto(false);
                        setConfirmar('limpiar');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <IconoBasura className="h-4 w-4" />
                      Limpiar pizarra
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pl-[46px] sm:pl-12">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${colorMateria.chip}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${colorMateria.punto}`}
              />
              {sala.asignatura}
            </span>

            <span className="inline-flex max-w-[230px] items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
              <span className="truncate">{sala.tema}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {enLineaTotal} en línea
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold ${
                conectadoChat ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              <IconoWifi className="h-3 w-3" />
              {conectadoChat
                ? 'Conectado'
                : isOnline
                  ? 'Conectando…'
                  : 'Sin conexión'}
            </span>
          </div>
        </div>
      </header>

      {errorAccion && (
        <div
          role="alert"
          className="border-b border-red-100 bg-red-50 px-4 py-2 text-center text-xs font-medium text-red-700"
        >
          {errorAccion}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3 px-3 py-3 sm:px-5 sm:py-4 lg:min-h-0">
        {/* Barra única de pestañas en móvil */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:hidden">
          {[...PESTANAS_IZQUIERDA, ...PESTANAS_DERECHA].map((pestana) => (
            <button
              key={pestana.id}
              type="button"
              onClick={() => seleccionarPestana(pestana.id)}
              aria-pressed={pestanaMovil === pestana.id}
              className={clasePestana(pestanaMovil === pestana.id)}
            >
              {iconosPestana[pestana.id]}
              {pestana.etiqueta}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">
          {/* Columna principal: Ejercicios, Pizarra y Video */}
          <section
            className={`${
              enPanelMovil ? 'hidden' : 'flex'
            } min-h-0 min-w-0 flex-1 flex-col gap-3 xl:flex`}
          >
            <div className="hidden w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:flex">
              {PESTANAS_IZQUIERDA.map((pestana) => (
                <button
                  key={pestana.id}
                  type="button"
                  onClick={() => seleccionarPestana(pestana.id)}
                  aria-pressed={seccion === pestana.id}
                  className={clasePestana(seccion === pestana.id)}
                >
                  {iconosPestana[pestana.id]}
                  {pestana.etiqueta}
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {seccion === 'ejercicios' && (
                <div className="flex min-h-[420px] flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B4FC4]/10 text-[#0B4FC4]">
                    <IconoEjercicios className="h-8 w-8" />
                  </div>
                  <h2 className="mt-4 text-lg font-black text-slate-900">
                    Próximamente
                  </h2>
                  <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                    Estamos preparando ejercicios colaborativos para practicar
                    en grupo dentro de la sala.
                  </p>
                </div>
              )}

              {seccion === 'pizarra' && (
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

              {seccion === 'video' &&
                (video.enLlamada ? (
                  <Videollamada
                    video={video}
                    usuarioId={user.id}
                    participantes={participantes.map((participante) => ({
                      id: participante.id,
                      nombre: participante.nombre,
                      esAnfitrion: participante.esAnfitrion,
                    }))}
                    usuariosEnLinea={usuariosEnLinea}
                    puedeParticipar={sala.participando && conectadoChat}
                  />
                ) : (
                  <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">
                          Videollamada de la sala
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          {enLineaTotal} en línea ahora
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                        {video.cargando ? 'Conectando…' : 'Sin iniciar'}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-10 text-center sm:px-8">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B4FC4]/10 text-[#0B4FC4]">
                        <IconoVideo className="h-8 w-8" />
                      </div>

                      <div className="max-w-md">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                          Videollamada de la sala
                        </h2>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
                          Habla y comparte tu pantalla con el grupo. Tu cámara y
                          micrófono solo se activan cuando tú lo decidas.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMicPrevio((valor) => !valor)}
                          aria-pressed={micPrevio}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                            micPrevio
                              ? 'border-[#0B4FC4]/30 bg-blue-50 text-[#0B4FC4]'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {micPrevio ? (
                            <IconoMicrofono className="h-4 w-4" />
                          ) : (
                            <IconoMicrofonoOff className="h-4 w-4" />
                          )}
                          {micPrevio ? 'Micrófono activado' : 'Micrófono apagado'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setCamPrevio((valor) => !valor)}
                          aria-pressed={camPrevio}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                            camPrevio
                              ? 'border-[#0B4FC4]/30 bg-blue-50 text-[#0B4FC4]'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {camPrevio ? (
                            <IconoCamara className="h-4 w-4" />
                          ) : (
                            <IconoCamaraOff className="h-4 w-4" />
                          )}
                          {camPrevio ? 'Cámara encendida' : 'Cámara apagada'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void entrarALlamada()}
                        disabled={uniendose || video.cargando}
                        className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#0B4FC4] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <IconoVideo className="h-4 w-4" />
                        {video.cargando
                          ? 'Conectando…'
                          : 'Unirme a la videollamada'}
                      </button>

                      {!sala.participando && (
                        <p className="max-w-sm text-[11px] leading-relaxed text-slate-400">
                          Al unirte también entrarás a la sala y podrás usar el
                          chat, la pizarra y los materiales.
                        </p>
                      )}

                      {video.aviso && (
                        <p className="max-w-md text-[11px] leading-relaxed text-amber-600">
                          {video.aviso}
                        </p>
                      )}

                      {video.error && (
                        <p className="max-w-md text-[11px] leading-relaxed text-red-600">
                          {video.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* Panel lateral: Chat, Personas y Materiales */}
          <aside
            className={`${
              enPanelMovil ? 'flex' : 'hidden'
            } h-[560px] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:flex xl:h-auto xl:w-[360px]`}
          >
            <div className="hidden border-b border-slate-100 p-2 xl:block">
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {PESTANAS_DERECHA.map((pestana) => (
                  <button
                    key={pestana.id}
                    type="button"
                    onClick={() => seleccionarPestana(pestana.id)}
                    aria-pressed={activeTab === pestana.id}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all ${
                      activeTab === pestana.id
                        ? 'bg-white text-[#0B4FC4] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {iconosPestana[pestana.id]}
                    {pestana.etiqueta}
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
                        ? `${enLineaTotal} en línea`
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
                        Únete para participar en el chat
                      </p>
                      <p className="mt-1 max-w-[230px] text-[11px] leading-relaxed text-slate-400">
                        Solo los participantes activos de la sala pueden leer y
                        enviar mensajes.
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleUnirse()}
                        disabled={uniendose}
                        className="mt-4 rounded-xl bg-[#0B4FC4] px-4 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#093fa3] disabled:opacity-70"
                      >
                        {uniendose ? 'Entrando…' : 'Unirme a la sala'}
                      </button>
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
                          className={`flex gap-2 ${
                            esMio ? 'flex-row-reverse' : ''
                          }`}
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
                        ? 'Únete para escribir en el chat'
                        : !conectadoChat
                          ? 'Conectando al chat…'
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

            {/* Personas */}
            {activeTab === 'personas' && (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="p-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
                    <h3 className="text-xs font-bold text-slate-800">
                      Invita a tus compañeros
                    </h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      {esPrivada
                        ? 'Comparte el enlace o el código'
                        : 'Cualquier estudiante puede encontrar esta sala, pero también puedes compartirla.'}
                    </p>

                    <button
                      type="button"
                      onClick={() => void copiarEnlace()}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#0B4FC4]/20 bg-white px-3 py-2 text-[11px] font-bold text-[#0B4FC4] transition-colors hover:bg-blue-50"
                    >
                      <IconoEnlace className="h-3.5 w-3.5" />
                      Copiar enlace
                    </button>

                    {esPrivada && sala.codigoAcceso && (
                      <button
                        type="button"
                        onClick={async () => {
                          const copiado = await copiarTexto(
                            sala.codigoAcceso ?? ''
                          );
                          mostrarToast(
                            copiado
                              ? 'Código copiado.'
                              : 'No pudimos copiar el código.',
                            { variante: copiado ? 'exito' : 'error' }
                          );
                        }}
                        className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500 transition-colors hover:border-[#0B4FC4]/40 hover:text-[#0B4FC4]"
                        title="Copiar código de acceso"
                      >
                        <span>
                          Código:{' '}
                          <span className="font-mono font-bold tracking-wider">
                            {sala.codigoAcceso}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          <IconoEnlace className="h-3 w-3" />
                          Copiar
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Participantes · {sala.participantesActuales}/
                      {sala.cupoMaximo}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {enLineaTotal} en línea
                    </span>
                  </div>

                  {participantes.length === 0 ? (
                    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                      <div className="mb-2 text-3xl">👥</div>
                      <p className="text-xs font-semibold text-slate-600">
                        Todavía no hay participantes
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Comparte el enlace para que se unan a la sala.
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {participantes.map((participante) => {
                        const esYo = participante.id === user.id;
                        const enLinea =
                          usuariosEnLinea.includes(participante.id) ||
                          (esYo && sala.participando);

                        return (
                          <li
                            key={participante.id}
                            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-2.5 py-2"
                          >
                            <div className="relative shrink-0">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-[#0B4FC4]">
                                {inicialesDe(participante.nombre)}
                              </span>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                                  enLinea ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-800">
                                {participante.nombre}
                                {esYo && (
                                  <span className="font-normal text-slate-400">
                                    {' '}
                                    (tú)
                                  </span>
                                )}
                              </p>
                              <p
                                className={`text-[10px] font-medium ${
                                  enLinea
                                    ? 'text-emerald-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {enLinea ? 'En línea' : 'Desconectado'}
                              </p>
                            </div>

                            {participante.esAnfitrion && (
                              <span
                                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200"
                                title="Anfitrión de la sala"
                              >
                                <IconoCorona className="h-3 w-3" />
                                Anfitrión
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
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
                    <button
                      type="button"
                      onClick={() => void handleUnirse()}
                      disabled={uniendose}
                      className="mt-4 rounded-xl bg-[#0B4FC4] px-4 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#093fa3] disabled:opacity-70"
                    >
                      {uniendose ? 'Entrando…' : 'Unirme a la sala'}
                    </button>
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
                        <div
                          role="button"
                          tabIndex={subiendoMaterial ? -1 : 0}
                          aria-label="Arrastrar o elegir archivo de material"
                          onClick={() => {
                            if (subiendoMaterial) return;
                            materialInputRef.current?.click();
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            e.preventDefault();
                            if (subiendoMaterial) return;
                            materialInputRef.current?.click();
                          }}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`w-full cursor-pointer rounded-xl border border-dashed px-3 py-4 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4FC4] ${
                            arrastrandoArchivo
                              ? 'border-[#0B4FC4] bg-blue-50'
                              : 'border-slate-300 bg-slate-50 hover:border-[#0B4FC4] hover:bg-blue-50/40'
                          } ${
                            subiendoMaterial
                              ? 'cursor-not-allowed opacity-60'
                              : ''
                          }`}
                        >
                          <span className="block text-lg">
                            {arrastrandoArchivo ? '📥' : '📎'}
                          </span>
                          <span className="mt-1 block text-[11px] font-semibold text-slate-600">
                            {arrastrandoArchivo
                              ? 'Suelta el archivo aquí'
                              : 'Arrastra un archivo o haz clic aquí'}
                          </span>
                          <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-400">
                            PDF, documentos, presentaciones, hojas de cálculo,
                            texto o imágenes · máx. 10 MB
                          </span>
                        </div>
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
                                  {material.usuario.id !== user.id && (
                                    <button
                                      type="button"
                                      onClick={() => setMaterialReportado(material)}
                                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                    >
                                      Reportar
                                    </button>
                                  )}
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

      {/* Acceso con código para salas privadas */}
      {modalCodigo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => {
              if (uniendose) return;
              setModalCodigo(false);
              setErrorCodigo('');
              setErrorAccion('');
              setCodigoAcceso('');
            }}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-900">
                  Sala privada
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Ingresa el código para unirte a “{sala.titulo}”. Pídeselo al
                  anfitrión.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalCodigo(false);
                  setErrorCodigo('');
                  setErrorAccion('');
                  setCodigoAcceso('');
                }}
                disabled={uniendose}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(evento) => {
                evento.preventDefault();
                void handleUnirse(codigoAcceso);
              }}
              className="px-5 py-5"
            >
              <label
                htmlFor="codigo-sala"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                Código de acceso
              </label>
              <input
                id="codigo-sala"
                value={codigoAcceso}
                onChange={(evento) =>
                  setCodigoAcceso(
                    evento.target.value.toUpperCase().slice(0, 8)
                  )
                }
                placeholder="Ej.: K7M2QX"
                autoFocus
                maxLength={8}
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-center font-mono text-lg font-bold tracking-[0.25em] text-slate-800 placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
              />

              {errorCodigo && (
                <div
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
                >
                  {errorCodigo}
                </div>
              )}

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModalCodigo(false);
                    setErrorCodigo('');
                    setErrorAccion('');
                    setCodigoAcceso('');
                  }}
                  disabled={uniendose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uniendose || codigoAcceso.trim().length < 4}
                  className="rounded-xl bg-[#0B4FC4] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uniendose ? 'Verificando…' : 'Entrar a la sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación para abandonar o limpiar la pizarra */}
      {confirmar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar confirmación"
            onClick={() => {
              if (saliendo) return;
              setConfirmar(null);
            }}
            className="absolute inset-0 cursor-default"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmar-titulo"
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  confirmar === 'abandonar'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {confirmar === 'abandonar' ? (
                  <IconoSalir className="h-5 w-5" />
                ) : (
                  <IconoBasura className="h-5 w-5" />
                )}
              </span>

              <div className="min-w-0">
                <h2
                  id="confirmar-titulo"
                  className="text-base font-black text-slate-900"
                >
                  {confirmar === 'abandonar'
                    ? 'Abandonar sala'
                    : 'Limpiar pizarra'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {confirmar === 'abandonar'
                    ? 'Dejarás de participar en la sala. Podrás volver a unirte más tarde si queda cupo.'
                    : 'Se borrarán todos los trazos de la pizarra para todos los participantes. Esta acción no se puede deshacer.'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmar(null)}
                disabled={saliendo}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmar === 'abandonar') {
                    void handleAbandonar();
                  } else {
                    setConfirmar(null);
                    limpiarPizarra();
                  }
                }}
                disabled={saliendo}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                  confirmar === 'abandonar'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#0B4FC4] hover:bg-[#093fa3]'
                }`}
              >
                {confirmar === 'abandonar'
                  ? saliendo
                    ? 'Saliendo…'
                    : 'Sí, abandonar'
                  : 'Sí, limpiar pizarra'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ModalReporte
        abierto={!!materialReportado}
        token={token}
        tipo="MATERIAL"
        referenciaId={materialReportado?.id ?? null}
        onCerrar={() => setMaterialReportado(null)}
        onEnviado={(mensaje) => mostrarToast(mensaje)}
      />
    </div>
  );
}
