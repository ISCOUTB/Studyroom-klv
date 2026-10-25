'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { apiRequest } from '@/lib/api';
import { useNotificaciones } from '@/lib/notifications-context';
import { inicialesDe } from '@/lib/salas';
import {
  type ContextoTutorias,
  type Monitor,
  type Tutoria,
  estadoTutoriaClase,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
} from '@/lib/tutorias';

type Tab = 'monitores' | 'tutorias';

export default function TutoriasPage() {
  const { user, token, isLoading, logout } = useAuth();
  const { ultimaNotificacion } = useNotificaciones();
  const router = useRouter();

  const [contexto, setContexto] = useState<ContextoTutorias | null>(null);
  const [monitores, setMonitores] = useState<Monitor[]>([]);
  const [tutorias, setTutorias] = useState<Tutoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [tab, setTab] = useState<Tab>('monitores');

  const [busqueda, setBusqueda] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState('Todas');

  const [monitorSeleccionado, setMonitorSeleccionado] = useState<Monitor | null>(null);
  const [bloqueId, setBloqueId] = useState('');
  const [modalidad, setModalidad] = useState<'Virtual' | 'Presencial'>('Virtual');
  const [ubicacion, setUbicacion] = useState('');
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [accionId, setAccionId] = useState<string | null>(null);

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const cargarDatos = useCallback(async () => {
    if (!token) return;

    setCargando(true);
    setError('');

    try {
      const [datosContexto, datosMonitores, datosTutorias] = await Promise.all([
        apiRequest<ContextoTutorias>('/api/tutorias/contexto', { headers: headers() }),
        apiRequest<{ monitores: Monitor[] }>('/api/tutorias/monitores', { headers: headers() }),
        apiRequest<{ tutorias: Tutoria[] }>('/api/tutorias', { headers: headers() }),
      ]);

      setContexto(datosContexto);
      setMonitores(datosMonitores.monitores ?? []);
      setTutorias(datosTutorias.tutorias ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las tutorías.'
      );
    } finally {
      setCargando(false);
    }
  }, [token, headers]);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      router.push('/login');
      return;
    }

    cargarDatos();
  }, [isLoading, user, token, router, cargarDatos]);

  // Cualquier cambio en una tutoría refresca las tarjetas sin recargar la página.
  useEffect(() => {
    if (ultimaNotificacion?.tipo.startsWith('TUTORIA_')) {
      cargarDatos();
    }
  }, [ultimaNotificacion, cargarDatos]);

  // Enlaces como /tutorias#mis-tutorias abren directamente la pestaña correcta.
  useEffect(() => {
    const aplicarHash = () => {
      if (window.location.hash === '#mis-tutorias') {
        setTab('tutorias');
      }
    };

    aplicarHash();
    window.addEventListener('hashchange', aplicarHash);
    window.addEventListener('utb:navegacion', aplicarHash);

    return () => {
      window.removeEventListener('hashchange', aplicarHash);
      window.removeEventListener('utb:navegacion', aplicarHash);
    };
  }, []);

  useEffect(() => {
    if (tab !== 'tutorias' || window.location.hash !== '#mis-tutorias') return;

    const temporizador = window.setTimeout(() => {
      document
        .getElementById('mis-tutorias')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    return () => window.clearTimeout(temporizador);
  }, [tab, cargando]);

  const monitoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return monitores.filter((monitor) => {
      if (monitor.id === user?.id) return false;

      const coincideBusqueda =
        !termino ||
        monitor.nombre.toLowerCase().includes(termino) ||
        monitor.carrera.toLowerCase().includes(termino) ||
        monitor.asignaturas.some((asignatura) =>
          asignatura.toLowerCase().includes(termino)
        );

      const coincideModalidad =
        filtroModalidad === 'Todas' || monitor.modalidad === filtroModalidad;

      return coincideBusqueda && coincideModalidad;
    });
  }, [monitores, busqueda, filtroModalidad, user?.id]);

  const activas = useMemo(
    () =>
      tutorias.filter((tutoria) =>
        ['Solicitada', 'Agendada'].includes(tutoria.estado)
      ),
    [tutorias]
  );

  const historial = useMemo(
    () =>
      tutorias.filter(
        (tutoria) => !['Solicitada', 'Agendada'].includes(tutoria.estado)
      ),
    [tutorias]
  );

  const abrirAgenda = (monitor: Monitor) => {
    const primerBloque = monitor.disponibilidad.find((bloque) => !bloque.ocupado);

    setMonitorSeleccionado(monitor);
    setBloqueId(primerBloque?.id ?? '');
    setModalidad(monitor.modalidad);
    setUbicacion(monitor.ubicacion ?? '');
    setNotas('');
    setErrorModal('');
    setExito('');
  };

  const cerrarAgenda = () => {
    if (enviando) return;
    setMonitorSeleccionado(null);
    setErrorModal('');
  };

  const enviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monitorSeleccionado || !token) return;

    setErrorModal('');

    if (!bloqueId) {
      setErrorModal('Selecciona un bloque de disponibilidad.');
      return;
    }
    if (modalidad === 'Presencial' && ubicacion.trim().length < 3) {
      setErrorModal('Indica el salón o la ubicación en el campus.');
      return;
    }

    setEnviando(true);
    try {
      await apiRequest('/api/tutorias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers(),
        },
        body: JSON.stringify({
          monitorId: monitorSeleccionado.id,
          disponibilidadId: bloqueId,
          modalidad,
          ubicacion: modalidad === 'Presencial' ? ubicacion.trim() : undefined,
          notas: notas.trim() || undefined,
        }),
      });

      setMonitorSeleccionado(null);
      setExito('Solicitud enviada. El monitor tiene 24 horas (o hasta el inicio del bloque) para responder.');
      setTab('tutorias');
      await cargarDatos();
    } catch (err) {
      setErrorModal(
        err instanceof Error ? err.message : 'No se pudo solicitar la tutoría.'
      );
    } finally {
      setEnviando(false);
    }
  };

  const ejecutarAccion = async (
    tutoria: Tutoria,
    accion: 'aceptar' | 'rechazar' | 'cancelar' | 'finalizar'
  ) => {
    if (!token) return;

    setError('');
    setExito('');
    setAccionId(tutoria.id);

    try {
      if (accion === 'aceptar' || accion === 'rechazar') {
        await apiRequest(`/api/tutorias/${tutoria.id}/responder`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...headers(),
          },
          body: JSON.stringify({ aceptar: accion === 'aceptar' }),
        });
      } else {
        await apiRequest(`/api/tutorias/${tutoria.id}/${accion}`, {
          method: 'PATCH',
          headers: headers(),
        });
      }

      const mensajes: Record<typeof accion, string> = {
        aceptar: 'Tutoría aceptada y agendada.',
        rechazar: 'Solicitud rechazada.',
        cancelar: 'Tutoría cancelada.',
        finalizar: 'Tutoría finalizada.',
      };
      setExito(mensajes[accion]);
      await cargarDatos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo completar la acción.'
      );
    } finally {
      setAccionId(null);
    }
  };

  if (isLoading || !user) return null;

  const esMonitor = Boolean(contexto?.esMonitor);
  const solicitudPendiente = Boolean(contexto?.solicitud && !contexto.esMonitor);
  const soloMonitorActual =
    monitores.length > 0 && monitores.every((monitor) => monitor.id === user?.id);
  const puedeFinalizar = (tutoria: Tutoria) =>
    tutoria.soyMonitor &&
    tutoria.estado === 'Agendada' &&
    Boolean(tutoria.programadaEn && new Date(tutoria.programadaEn) <= new Date());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <UTBLogo className="h-9 sm:h-10 shrink-0" />
            <span className="hidden md:inline font-bold text-slate-800 text-lg border-l border-slate-200 pl-6">
              Campus Collaborative Study
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/salas')}
              className="text-xs font-semibold text-slate-600 hover:text-[#0B4FC4] px-2 py-2"
            >
              ← <span className="hidden sm:inline">Salas</span>
            </button>

            {contexto?.esAdmin && (
              <button
                onClick={() => router.push('/admin/monitores')}
                className="hidden sm:inline text-xs font-semibold text-[#0B4FC4] hover:underline px-2 py-2"
              >
                Monitores
              </button>
            )}

            {(esMonitor || solicitudPendiente) && (
              <button
                onClick={() => router.push('/perfil/monitor')}
                className="hidden sm:inline text-xs font-semibold text-[#0B4FC4] hover:underline px-2 py-2"
              >
                Mi perfil
              </button>
            )}

            <NotificationBell />

            <button
              onClick={logout}
              className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#0B4FC4] tracking-tight mb-2">
            Tutorías académicas
          </h1>
          <p className="text-slate-600 text-sm">
            Agenda acompañamiento con monitores de semestres avanzados.
          </p>
        </div>

        {solicitudPendiente && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-amber-800">
                Tu solicitud de monitor está en revisión
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Un administrador verificará tu perfil. Mientras tanto puedes agendar tutorías como estudiante.
              </p>
            </div>
            <button
              onClick={() => router.push('/perfil/monitor')}
              className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
            >
              Ver mi solicitud
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold" aria-label="Cerrar">✕</button>
          </div>
        )}
        {exito && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start justify-between gap-3">
            <span>{exito}</span>
            <button onClick={() => setExito('')} className="font-bold" aria-label="Cerrar">✕</button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 inline-flex mb-6 w-full sm:w-auto">
          <button
            onClick={() => setTab('monitores')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              tab === 'monitores'
                ? 'bg-[#0B4FC4] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0B4FC4]'
            }`}
          >
            Buscar monitor
          </button>
          <button
            onClick={() => setTab('tutorias')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              tab === 'tutorias'
                ? 'bg-[#0B4FC4] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0B4FC4]'
            }`}
          >
            Mis tutorías
            {activas.length > 0 && (
              <span
                className={`ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] ${
                  tab === 'tutorias' ? 'bg-white text-[#0B4FC4]' : 'bg-[#0B4FC4] text-white'
                }`}
              >
                {activas.length}
              </span>
            )}
          </button>
        </div>

        {cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-slate-200 rounded" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                <div className="h-3 w-4/5 bg-slate-100 rounded mb-5" />
                <div className="h-10 w-full bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : tab === 'monitores' ? (
          <section>
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por monitor, carrera o asignatura…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
                  <span className="text-slate-400">💻 Modalidad:</span>
                  <select
                    value={filtroModalidad}
                    onChange={(e) => setFiltroModalidad(e.target.value)}
                    className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Virtual">Virtual</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </div>

                {!esMonitor && !solicitudPendiente && (
                  <button
                    onClick={() => router.push('/perfil/monitor')}
                    className="w-full md:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                  >
                    + Quiero ser monitor
                  </button>
                )}
              </div>
            </div>

            {monitoresFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                <div className="text-4xl mb-3">🎓</div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">
                  {monitores.length === 0
                    ? 'Todavía no hay monitores disponibles'
                    : soloMonitorActual
                      ? 'Eres el único monitor registrado'
                      : 'No encontramos monitores con esos filtros'}
                </h2>
                <p className="text-sm text-slate-500 mb-5">
                  {monitores.length === 0
                    ? 'Cuando un monitor sea aprobado y publique su disponibilidad aparecerá aquí.'
                    : soloMonitorActual
                      ? 'Tu perfil ya está activo. Los estudiantes podrán agendarte desde sus cuentas.'
                      : 'Prueba con otra modalidad o borra la búsqueda.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {monitoresFiltrados.map((monitor) => {
                  const cupos = monitor.disponibilidad.filter((bloque) => !bloque.ocupado);
                  return (
                    <article
                      key={monitor.id}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {monitor.fotoUrl ? (
                          <img
                            src={monitor.fotoUrl}
                            alt={monitor.nombre}
                            className="w-14 h-14 rounded-full object-cover border-2 border-blue-100 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-blue-100 text-[#0B4FC4] flex items-center justify-center font-black text-sm shrink-0">
                            {inicialesDe(monitor.nombre)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-slate-800 leading-tight truncate">
                            {monitor.nombre}
                          </h2>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {monitor.carrera} · {monitor.semestre}.° semestre
                          </p>
                          <span className="inline-block mt-1 bg-blue-50 text-[#0B4FC4] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                            Monitor UTB
                          </span>
                        </div>
                      </div>

                      {monitor.biografia && (
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                          {monitor.biografia}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {monitor.asignaturas.slice(0, 4).map((asignatura) => (
                          <span
                            key={asignatura}
                            className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-1 rounded-lg"
                          >
                            {asignatura}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] text-slate-500 mb-3">
                        <span className="font-semibold text-slate-700">
                          {monitor.modalidad === 'Virtual' ? '💻 Virtual' : '📍 Presencial'}
                        </span>
                        {monitor.modalidad === 'Presencial' && monitor.ubicacion
                          ? ` · ${monitor.ubicacion}`
                          : ''}
                      </p>

                      <div className="border-t border-slate-100 pt-3 mt-auto">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Próximos espacios
                        </p>
                        {cupos.length === 0 ? (
                          <p className="text-xs text-slate-400 mb-3">
                            Sin horarios disponibles por ahora.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {cupos.slice(0, 3).map((bloque) => (
                              <span
                                key={bloque.id}
                                className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-semibold px-2 py-1 rounded-lg"
                              >
                                {formatearFecha(bloque.fecha)} · {formatearHora(bloque.horaIni)}
                              </span>
                            ))}
                            {cupos.length > 3 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{cupos.length - 3} más
                              </span>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => abrirAgenda(monitor)}
                          disabled={cupos.length === 0}
                          className="w-full py-2.5 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs shadow-sm shadow-blue-500/20 transition-all disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                        >
                          {cupos.length === 0 ? 'Sin cupos disponibles' : 'Agendar tutoría'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section id="mis-tutorias" className="scroll-mt-24 space-y-8">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3">
                Tutorías activas
              </h2>
              {activas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
                  <div className="text-4xl mb-3">📅</div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    No tienes tutorías activas
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Busca un monitor y agenda tu primer espacio de acompañamiento.
                  </p>
                  <button
                    onClick={() => setTab('monitores')}
                    className="px-5 py-2.5 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-semibold rounded-xl text-xs"
                  >
                    Buscar monitor
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activas.map((tutoria) => (
                    <TutoriaCard
                      key={tutoria.id}
                      tutoria={tutoria}
                      accionId={accionId}
                      puedeFinalizar={puedeFinalizar(tutoria)}
                      onAccion={ejecutarAccion}
                    />
                  ))}
                </div>
              )}
            </div>

            {historial.length > 0 && (
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3">
                  Historial
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {historial.map((tutoria) => (
                    <TutoriaCard
                      key={tutoria.id}
                      tutoria={tutoria}
                      accionId={accionId}
                      puedeFinalizar={false}
                      onAccion={ejecutarAccion}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {monitorSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start gap-4 mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#0B4FC4]">
                  Agendar tutoría
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Con {monitorSeleccionado.nombre} · {monitorSeleccionado.carrera}
                </p>
              </div>
              <button
                onClick={cerrarAgenda}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={enviarSolicitud} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Bloque de disponibilidad
                </label>
                <select
                  value={bloqueId}
                  onChange={(e) => setBloqueId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                >
                  <option value="">Selecciona un horario</option>
                  {monitorSeleccionado.disponibilidad
                    .filter((bloque) => !bloque.ocupado)
                    .map((bloque) => (
                      <option key={bloque.id} value={bloque.id}>
                        {formatearFecha(bloque.fecha)} ·{' '}
                        {formatearHora(bloque.horaIni)} – {formatearHora(bloque.horaFin)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Modalidad
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Virtual', 'Presencial'] as const).map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setModalidad(opcion)}
                      className={`px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        modalidad === opcion
                          ? 'border-[#0B4FC4] bg-blue-50 text-[#0B4FC4]'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {opcion === 'Virtual' ? '💻 Virtual' : '📍 Presencial'}
                    </button>
                  ))}
                </div>
              </div>

              {modalidad === 'Presencial' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Salón / ubicación en campus
                  </label>
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    maxLength={120}
                    placeholder="Ej. Bloque C · Salón 204"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-600">
                    Notas para el monitor (opcional)
                  </label>
                  <span className="text-[10px] text-slate-400">{notas.length}/300</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej. Necesito repasar derivadas implícitas."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
              </div>

              {errorModal && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorModal}
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-3 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {enviando ? 'Enviando solicitud…' : 'Enviar solicitud de tutoría'}
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                El monitor tiene 24 horas (o hasta el inicio del bloque) para aceptar. Si no responde, la solicitud expira.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TutoriaCard({
  tutoria,
  accionId,
  puedeFinalizar,
  onAccion,
}: {
  tutoria: Tutoria;
  accionId: string | null;
  puedeFinalizar: boolean;
  onAccion: (
    tutoria: Tutoria,
    accion: 'aceptar' | 'rechazar' | 'cancelar' | 'finalizar'
  ) => void;
}) {
  const ocupado = accionId === tutoria.id;
  const activa = ['Solicitada', 'Agendada'].includes(tutoria.estado);

  return (
    <article className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {tutoria.soyMonitor ? 'Solicitud de' : 'Monitor'}
          </p>
          <h3 className="text-sm font-bold text-slate-800">
            {tutoria.soyMonitor ? tutoria.solicitante.nombre : tutoria.monitor.nombre}
          </h3>
          <p className="text-[11px] text-slate-500">
            {tutoria.soyMonitor
              ? tutoria.solicitante.correo
              : `${tutoria.monitor.carrera} · ${tutoria.monitor.semestre}.° semestre`}
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${estadoTutoriaClase(tutoria.estado)}`}>
          {tutoria.estado}
        </span>
      </div>

      <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-3 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">
          📅{' '}
          {tutoria.programadaEn
            ? formatearFechaHora(tutoria.programadaEn)
            : tutoria.disponibilidad
              ? `${formatearFecha(tutoria.disponibilidad.fecha)} · ${formatearHora(
                  tutoria.disponibilidad.horaIni
                )} – ${formatearHora(tutoria.disponibilidad.horaFin)}`
              : 'Horario por definir'}
        </p>
        <p>
          {tutoria.modalidad === 'Virtual' ? '💻 Virtual' : '📍 Presencial'}
          {tutoria.ubicacion ? ` · ${tutoria.ubicacion}` : ''}
        </p>
        {tutoria.notas && (
          <p className="text-slate-500 italic">“{tutoria.notas}”</p>
        )}
      </div>

      {tutoria.estado === 'Solicitada' && (
        <p className="text-[10px] text-amber-600 mb-3">
          Responde antes de {formatearFechaHora(tutoria.expiraEn)}
        </p>
      )}

      {activa && (
        <div className="flex flex-wrap gap-2">
          {tutoria.soyMonitor && tutoria.estado === 'Solicitada' && (
            <>
              <button
                onClick={() => onAccion(tutoria, 'aceptar')}
                disabled={ocupado}
                className="flex-1 min-w-[120px] py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-60"
              >
                {ocupado ? 'Procesando…' : 'Aceptar'}
              </button>
              <button
                onClick={() => onAccion(tutoria, 'rechazar')}
                disabled={ocupado}
                className="flex-1 min-w-[120px] py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl disabled:opacity-60"
              >
                Rechazar
              </button>
            </>
          )}

          {puedeFinalizar && (
            <button
              onClick={() => onAccion(tutoria, 'finalizar')}
              disabled={ocupado}
              className="flex-1 min-w-[120px] py-2 bg-[#0B4FC4] hover:bg-[#093fa3] text-white text-xs font-bold rounded-xl disabled:opacity-60"
            >
              Finalizar tutoría
            </button>
          )}

          {(tutoria.soyMonitor || tutoria.soySolicitante) && (
            <button
              onClick={() => onAccion(tutoria, 'cancelar')}
              disabled={ocupado}
              className="flex-1 min-w-[120px] py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl disabled:opacity-60"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </article>
  );
}
