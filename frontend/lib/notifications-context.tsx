'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { API_URL, apiRequest } from './api';
import { useAuth } from './auth-context';
import {
  LIMITE_NOTIFICACIONES,
  type Notificacion,
} from './notificaciones';

interface ListaNotificaciones {
  notificaciones: Notificacion[];
  noLeidas: number;
}

interface NotificationsContextType {
  notificaciones: Notificacion[];
  noLeidas: number;
  cargando: boolean;
  error: string;
  conectado: boolean;
  ultimaNotificacion: Notificacion | null;
  toast: Notificacion | null;
  descartarToast: () => void;
  recargar: () => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  abrirNotificacion: (notificacion: Notificacion) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(
  undefined
);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token, user } = useAuth();
  const router = useRouter();

  const socketRef = useRef<Socket | null>(null);

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [conectado, setConectado] = useState(false);
  const [ultimaNotificacion, setUltimaNotificacion] =
    useState<Notificacion | null>(null);
  const [toast, setToast] = useState<Notificacion | null>(null);

  const recargar = useCallback(async () => {
    if (!token) {
      setNotificaciones([]);
      setNoLeidas(0);
      setCargando(false);
      return;
    }

    try {
      const data = await apiRequest<ListaNotificaciones>('/api/notificaciones', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificaciones(data.notificaciones ?? []);
      setNoLeidas(data.noLeidas ?? 0);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las notificaciones.'
      );
    } finally {
      setCargando(false);
    }
  }, [token]);

  // Carga inicial y al cambiar de sesión.
  useEffect(() => {
    if (!token) {
      setNotificaciones([]);
      setNoLeidas(0);
      setError('');
      setUltimaNotificacion(null);
      setToast(null);
      return;
    }

    setCargando(true);
    recargar();
  }, [token, recargar]);

  // Conexión en tiempo real a la sala privada del usuario.
  useEffect(() => {
    if (!token || !user) {
      setConectado(false);
      return;
    }

    const socket = io(API_URL, {
      auth: { token },
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));
    socket.on('connect_error', () => setConectado(false));

    socket.on('notificacion:nueva', (notificacion: Notificacion) => {
      if (!notificacion?.id) return;

      setNotificaciones((actuales) => {
        if (actuales.some((item) => item.id === notificacion.id)) {
          return actuales;
        }
        return [notificacion, ...actuales].slice(0, LIMITE_NOTIFICACIONES);
      });

      if (!notificacion.leida) {
        setNoLeidas((total) => total + 1);
      }

      setUltimaNotificacion(notificacion);
      setToast(notificacion);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConectado(false);
    };
  }, [token, user]);

  // El aviso flotante desaparece solo.
  useEffect(() => {
    if (!toast) return;
    const temporizador = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(temporizador);
  }, [toast]);

  const marcarTodasLeidas = useCallback(async () => {
    if (!token || noLeidas === 0) return;

    const previas = notificaciones;
    const previoTotal = noLeidas;

    setNoLeidas(0);
    setNotificaciones((actuales) =>
      actuales.map((notificacion) => ({ ...notificacion, leida: true }))
    );

    try {
      await apiRequest('/api/notificaciones/leer-todas', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      setNotificaciones(previas);
      setNoLeidas(previoTotal);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron marcar las notificaciones como leídas.'
      );
    }
  }, [token, noLeidas, notificaciones]);

  const marcarLeida = useCallback(
    async (notificacion: Notificacion) => {
      if (!token || notificacion.leida) return;

      setNotificaciones((actuales) =>
        actuales.map((item) =>
          item.id === notificacion.id ? { ...item, leida: true } : item
        )
      );
      setNoLeidas((total) => Math.max(0, total - 1));

      try {
        await apiRequest(`/api/notificaciones/${notificacion.id}/leer`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Si falla, el siguiente refresco recupera el estado real del servidor.
        recargar();
      }
    },
    [token, recargar]
  );

  const navegar = useCallback(
    (enlace: string | null) => {
      if (!enlace) return;
      router.push(enlace);

      // Next.js puede cambiar el hash sin emitir "hashchange"; avisamos a las
      // pantallas que dependen de la sección destino (p. ej. #mis-tutorias).
      if (enlace.includes('#')) {
        window.setTimeout(() => {
          window.dispatchEvent(new Event('utb:navegacion'));
        }, 60);
      }
    },
    [router]
  );

  const abrirNotificacion = useCallback(
    (notificacion: Notificacion) => {
      if (!notificacion.leida) {
        marcarLeida(notificacion);
      }
      navegar(notificacion.enlace);
    },
    [marcarLeida, navegar]
  );

  return (
    <NotificationsContext.Provider
      value={{
        notificaciones,
        noLeidas,
        cargando,
        error,
        conectado,
        ultimaNotificacion,
        toast,
        descartarToast: () => setToast(null),
        recargar,
        marcarTodasLeidas,
        abrirNotificacion,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotificaciones = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      'useNotificaciones debe usarse dentro de un NotificationsProvider'
    );
  }
  return context;
};
