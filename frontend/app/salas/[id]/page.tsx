'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { type SalaDetalle, inicialesDe } from '@/lib/salas';

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
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="text-3xl mb-3">💬</div>
                <p className="text-xs font-semibold text-slate-300">
                  Chat en tiempo real
                </p>
                <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-slate-500">
                  El chat de la sala se conectará en la siguiente fase del
                  proyecto.
                </p>
              </div>

              <form className="p-3 bg-slate-900 border-t border-slate-700 flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  placeholder="Chat disponible próximamente"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled
                  className="p-2 bg-[#0B4FC4] text-white rounded-xl text-xs font-bold opacity-50 cursor-not-allowed"
                >
                  ➤
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
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        En línea
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'materiales' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="text-3xl mb-3">📄</div>
              <p className="text-xs font-semibold text-slate-300">
                Aún no hay materiales
              </p>
              <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-slate-500">
                La carga y descarga de archivos se habilitará en una fase
                posterior.
              </p>
            </div>
          )}

          {/* Footer indicador de conexión */}
          <div className="p-2 bg-slate-900 border-t border-slate-700 text-center text-[10px] text-slate-400 flex items-center justify-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400' : 'bg-red-500'
              }`}
            ></span>
            <span>{isOnline ? 'Conectado' : 'Sin conexión'} · datos actualizados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
