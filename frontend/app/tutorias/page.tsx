'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/AppShell';
import { apiRequest } from '@/lib/api';
import { useNotificaciones } from '@/lib/notifications-context';
import { useCatalogo } from '@/lib/catalogo';
import { inicialesDe } from '@/lib/salas';
import {
  type ContextoTutorias,
  type Monitor,
  type Tutoria,
  agruparPorDia,
  estadoTutoriaClase,
  formatearChipHorario,
  formatearFechaHora,
  formatearHora,
  formatearRango,
} from '@/lib/tutorias';

type Tab = 'monitores' | 'tutorias';
type Orden = 'mejor-calificados' | 'mas-horarios' | 'mas-resenas';
type ModalidadFiltro = 'Todas' | 'Virtual' | 'Presencial';

const OPCIONES_ORDEN: Array<{ valor: Orden; etiqueta: string }> = [
  { valor: 'mejor-calificados', etiqueta: 'Mejor calificados' },
  { valor: 'mas-horarios', etiqueta: 'Más horarios' },
  { valor: 'mas-resenas', etiqueta: 'Más reseñas' },
];

const AVATAR_COLORES = [
  'bg-violet-600',
  'bg-teal-600',
  'bg-blue-700',
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-600',
];

function colorAvatar(nombre: string): string {
  let hash = 0;
  for (const caracter of nombre) {
    hash = (hash * 31 + caracter.charCodeAt(0)) % 9973;
  }
  return AVATAR_COLORES[hash % AVATAR_COLORES.length];
}

export default function TutoriasPage() {
  const { user, token, isLoading } = useAuth();
  const { ultimaNotificacion } = useNotificaciones();
  const { activas: asignaturasCatalogo, colorDe } = useCatalogo();
  const router = useRouter();

  const [contexto, setContexto] = useState<ContextoTutorias | null>(null);
  const [monitores, setMonitores] = useState<Monitor[]>([]);
  const [tutorias, setTutorias] = useState<Tutoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [tab, setTab] = useState<Tab>('monitores');

  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<Orden>('mejor-calificados');
  const [filtroModalidad, setFiltroModalidad] = useState<ModalidadFiltro>('Todas');
  const [filtroAsignatura, setFiltroAsignatura] = useState('Todas');

  const [monitorSeleccionado, setMonitorSeleccionado] = useState<Monitor | null>(null);
  const [bloqueId, setBloqueId] = useState('');
  const [notas, setNotas] = useState('');
  const [mostrarNotas, setMostrarNotas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [accionId, setAccionId] = useState<string | null>(null);

  const [tutoriaCalificar, setTutoriaCalificar] = useState<Tutoria | null>(null);
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false);
  const [errorCalificacion, setErrorCalificacion] = useState('');

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const cargarMonitores = useCallback(
    async (ordenActual: Orden) => {
      if (!token) return;
      try {
        const datos = await apiRequest<{ monitores: Monitor[] }>(
          `/api/tutorias/monitores?orden=${ordenActual}`,
          { headers: headers() }
        );
        setMonitores(datos.monitores ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los monitores.'
        );
      }
    },
    [token, headers]
  );

  const cargarTutorias = useCallback(async () => {
    if (!token) return;

    setCargando(true);
    setError('');

    try {
      const [datosContexto, datosTutorias] = await Promise.all([
        apiRequest<ContextoTutorias>('/api/tutorias/contexto', {
          headers: headers(),
        }),
        apiRequest<{ tutorias: Tutoria[] }>('/api/tutorias', {
          headers: headers(),
        }),
      ]);

      setContexto(datosContexto);
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

    void cargarTutorias();
  }, [isLoading, user, token, router, cargarTutorias]);

  useEffect(() => {
    if (!token) return;
    void cargarMonitores(orden);
  }, [token, orden, cargarMonitores]);

  // Cualquier cambio en una tutoría refresca las tarjetas sin recargar la página.
  useEffect(() => {
    if (ultimaNotificacion?.tipo.startsWith('TUTORIA_')) {
      void cargarTutorias();
      void cargarMonitores(orden);
    }
  }, [ultimaNotificacion, cargarTutorias, cargarMonitores, orden]);

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

      const coincideAsignatura =
        filtroAsignatura === 'Todas' ||
        monitor.asignaturas.includes(filtroAsignatura);

      return coincideBusqueda && coincideModalidad && coincideAsignatura;
    });
  }, [monitores, busqueda, filtroModalidad, filtroAsignatura, user?.id]);

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
    setMonitorSeleccionado(monitor);
    setBloqueId('');
    setNotas('');
    setMostrarNotas(false);
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
      setErrorModal('Selecciona un horario disponible.');
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
          modalidad: monitorSeleccionado.modalidad,
          ubicacion: monitorSeleccionado.ubicacion ?? undefined,
          notas: notas.trim() || undefined,
        }),
      });

      setMonitorSeleccionado(null);
      setExito(
        'Solicitud enviada. El monitor tiene 24 horas (o hasta el inicio del bloque) para responder.'
      );
      setTab('tutorias');
      await Promise.all([cargarTutorias(), cargarMonitores(orden)]);
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
      await Promise.all([cargarTutorias(), cargarMonitores(orden)]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo completar la acción.'
      );
    } finally {
      setAccionId(null);
    }
  };

  const abrirCalificacion = (tutoria: Tutoria) => {
    setTutoriaCalificar(tutoria);
    setPuntaje(0);
    setComentario('');
    setErrorCalificacion('');
  };

  const enviarCalificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutoriaCalificar || !token) return;

    setErrorCalificacion('');

    if (puntaje < 1 || puntaje > 5) {
      setErrorCalificacion('Elige de 1 a 5 estrellas.');
      return;
    }

    setEnviandoCalificacion(true);
    try {
      await apiRequest(`/api/tutorias/${tutoriaCalificar.id}/calificar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers(),
        },
        body: JSON.stringify({
          puntaje,
          comentario: comentario.trim() || undefined,
        }),
      });

      setTutoriaCalificar(null);
      setExito('Gracias por calificar la tutoría.');
      await Promise.all([cargarTutorias(), cargarMonitores(orden)]);
    } catch (err) {
      setErrorCalificacion(
        err instanceof Error ? err.message : 'No se pudo guardar la calificación.'
      );
    } finally {
      setEnviandoCalificacion(false);
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

  const bloquesLibres = monitorSeleccionado
    ? monitorSeleccionado.disponibilidad.filter(
        (bloque) => !bloque.ocupado && !bloque.solicitado
      )
    : [];

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Tutorías
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-xl">
              Agenda acompañamiento con monitores de semestres avanzados y
              gestiona tus sesiones.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/perfil/monitor')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Icono nombre="usuarios" className="h-4 w-4 text-slate-500" />
            {esMonitor ? 'Mi perfil de monitor' : 'Quiero ser monitor'}
          </button>
        </div>

        {solicitudPendiente && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-amber-800">
                Tu solicitud de monitor está en revisión
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Un administrador verificará tu perfil. Mientras tanto puedes
                agendar tutorías como estudiante.
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
            <button
              onClick={() => setError('')}
              className="font-bold"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}
        {exito && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start justify-between gap-3">
            <span>{exito}</span>
            <button
              onClick={() => setExito('')}
              className="font-bold"
              aria-label="Cerrar"
            >
              ✕
            </button>
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
                  tab === 'tutorias'
                    ? 'bg-white text-[#0B4FC4]'
                    : 'bg-[#0B4FC4] text-white'
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
              <div
                key={item}
                className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse"
              >
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
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Icono
                    nombre="buscar"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Busca por nombre, carrera o tema"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="orden-monitores"
                    className="text-xs font-semibold text-slate-500"
                  >
                    Ordenar
                  </label>
                  <select
                    id="orden-monitores"
                    value={orden}
                    onChange={(e) => setOrden(e.target.value as Orden)}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] cursor-pointer"
                  >
                    {OPCIONES_ORDEN.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(['Todas', 'Virtual', 'Presencial'] as const).map((opcion) => (
                  <Chip
                    key={opcion}
                    activo={filtroModalidad === opcion}
                    onClick={() => setFiltroModalidad(opcion)}
                  >
                    {opcion === 'Todas' ? 'Cualquier modalidad' : opcion}
                  </Chip>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip
                  activo={filtroAsignatura === 'Todas'}
                  onClick={() => setFiltroAsignatura('Todas')}
                >
                  Todas las asignaturas
                </Chip>
                {asignaturasCatalogo.map((asignatura) => {
                  const color = colorDe(asignatura.nombre);
                  return (
                    <Chip
                      key={asignatura.id}
                      activo={filtroAsignatura === asignatura.nombre}
                      onClick={() => setFiltroAsignatura(asignatura.nombre)}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${color.punto}`}
                      />
                      {asignatura.nombre}
                    </Chip>
                  );
                })}
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
                      : 'Prueba con otra modalidad, asignatura o borra la búsqueda.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {monitoresFiltrados.map((monitor) => (
                  <TarjetaMonitor
                    key={monitor.id}
                    monitor={monitor}
                    onAgendar={() => abrirAgenda(monitor)}
                  />
                ))}
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
                    <TarjetaTutoria
                      key={tutoria.id}
                      tutoria={tutoria}
                      accionId={accionId}
                      puedeFinalizar={puedeFinalizar(tutoria)}
                      onAccion={ejecutarAccion}
                      onCalificar={abrirCalificacion}
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
                    <TarjetaTutoria
                      key={tutoria.id}
                      tutoria={tutoria}
                      accionId={accionId}
                      puedeFinalizar={false}
                      onAccion={ejecutarAccion}
                      onCalificar={abrirCalificacion}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {monitorSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Agendar tutoría
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Con {monitorSeleccionado.nombre} ·{' '}
                  {monitorSeleccionado.carrera}
                </p>
              </div>
              <button
                onClick={cerrarAgenda}
                className="text-lg font-bold text-slate-400 hover:text-slate-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={enviarSolicitud} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${colorAvatar(
                      monitorSeleccionado.nombre
                    )}`}
                  >
                    {inicialesDe(monitorSeleccionado.nombre)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">
                      {monitorSeleccionado.nombre}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {monitorSeleccionado.asignaturas.join(' · ')}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold text-slate-700">
                    Elige un horario *
                  </p>

                  {bloquesLibres.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                      Este monitor ya no tiene horarios libres. Prueba con otro
                      monitor.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {agruparPorDia(bloquesLibres).map((grupo) => (
                        <div key={grupo.fecha}>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {grupo.etiqueta}
                          </p>
                          <div className="space-y-2">
                            {grupo.bloques.map((bloque) => {
                              const activo = bloqueId === bloque.id;
                              return (
                                <button
                                  key={bloque.id}
                                  type="button"
                                  onClick={() => setBloqueId(bloque.id)}
                                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                                    activo
                                      ? 'border-[#0B4FC4] bg-blue-50 text-[#0B4FC4] ring-1 ring-[#0B4FC4]'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <Icono nombre="reloj" className="h-4 w-4" />
                                  {formatearRango(bloque.horaIni, bloque.horaFin)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                    <Icono
                      nombre={
                        monitorSeleccionado.modalidad === 'Virtual'
                          ? 'video'
                          : 'pin'
                      }
                      className="h-4 w-4 text-slate-500"
                    />
                    {monitorSeleccionado.modalidad}
                  </span>
                  {monitorSeleccionado.modalidad === 'Presencial' &&
                    monitorSeleccionado.ubicacion && (
                      <span className="text-slate-500">
                        {' '}
                        · {monitorSeleccionado.ubicacion}
                      </span>
                    )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setMostrarNotas((valor) => !valor)}
                    className="text-xs font-semibold text-[#0B4FC4] hover:underline"
                  >
                    {mostrarNotas ? 'Ocultar notas' : '+ Agregar notas (opcional)'}
                  </button>

                  {mostrarNotas && (
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-600">
                          Notas para el monitor
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {notas.length}/300
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={300}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="Ej. Necesito repasar derivadas implícitas."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                      />
                    </div>
                  )}
                </div>

                {errorModal && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {errorModal}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
                <button
                  type="button"
                  onClick={cerrarAgenda}
                  disabled={enviando}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || !bloqueId}
                  className="rounded-xl bg-[#0B4FC4] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                >
                  {enviando ? 'Enviando…' : 'Enviar solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tutoriaCalificar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Calificar tutoría
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Con {tutoriaCalificar.monitor.nombre}
                </p>
              </div>
              <button
                onClick={() => setTutoriaCalificar(null)}
                className="text-lg font-bold text-slate-400 hover:text-slate-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={enviarCalificacion} className="space-y-4 p-5">
              <div>
                <p className="mb-2 text-xs font-bold text-slate-700">
                  ¿Cómo fue tu experiencia? *
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setPuntaje(valor)}
                      aria-label={`${valor} estrellas`}
                      className={`text-3xl leading-none transition-transform hover:scale-110 ${
                        valor <= puntaje ? 'text-amber-500' : 'text-slate-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Comentario (opcional)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {comentario.length}/300
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Cuéntales a otros estudiantes cómo fue la tutoría."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
              </div>

              {errorCalificacion && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorCalificacion}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTutoriaCalificar(null)}
                  disabled={enviandoCalificacion}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoCalificacion || puntaje === 0}
                  className="rounded-xl bg-[#0B4FC4] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                >
                  {enviandoCalificacion ? 'Enviando…' : 'Enviar calificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
        activo
          ? 'border-[#0B4FC4] bg-[#0B4FC4] text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function TarjetaMonitor({
  monitor,
  onAgendar,
}: {
  monitor: Monitor;
  onAgendar: () => void;
}) {
  const { colorDe } = useCatalogo();
  const cupos = monitor.disponibilidad.filter(
    (bloque) => !bloque.ocupado && !bloque.solicitado
  );
  const visibles = cupos.slice(0, 4);
  const restantes = cupos.length - visibles.length;

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${colorAvatar(
            monitor.nombre
          )}`}
        >
          {inicialesDe(monitor.nombre)}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold leading-tight text-slate-900">
            {monitor.nombre}
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
            <Icono nombre="graduacion" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {monitor.carrera} · {monitor.semestre}.° semestre
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-600">
            <span className="text-amber-500">
              {'★'.repeat(Math.round(monitor.promedio))}
              <span className="text-slate-300">
                {'★'.repeat(5 - Math.round(monitor.promedio))}
              </span>
            </span>
            <span className="font-bold text-slate-800">
              {monitor.promedio.toFixed(1)}
            </span>
            <span className="text-slate-400">
              ({monitor.totalResenas}{' '}
              {monitor.totalResenas === 1 ? 'reseña' : 'reseñas'})
            </span>
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {monitor.asignaturas.slice(0, 4).map((asignatura) => {
          const color = colorDe(asignatura);
          return (
            <span
              key={asignatura}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${color.punto}`} />
              {asignatura}
            </span>
          );
        })}
      </div>

      {monitor.biografia && (
        <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-slate-600">
          {monitor.biografia}
        </p>
      )}

      {monitor.experiencia && (
        <p className="mb-3 text-xs leading-relaxed text-slate-600">
          <span className="font-bold text-slate-800">Experiencia: </span>
          {monitor.experiencia}
        </p>
      )}

      <p className="mb-4 flex items-center gap-1.5 text-[11px] text-slate-600">
        <Icono
          nombre={monitor.modalidad === 'Virtual' ? 'video' : 'pin'}
          className="h-3.5 w-3.5 text-slate-500"
        />
        <span className="font-semibold text-slate-700">{monitor.modalidad}</span>
        {monitor.modalidad === 'Presencial' && monitor.ubicacion && (
          <span className="truncate text-slate-500">· {monitor.ubicacion}</span>
        )}
      </p>

      <div className="mt-auto border-t border-slate-100 pt-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Próximos horarios
        </p>

        {visibles.length === 0 ? (
          <p className="mb-3 text-xs text-slate-400">
            Sin horarios disponibles por ahora.
          </p>
        ) : (
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            {visibles.map((bloque) => (
              <span
                key={bloque.id}
                className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
              >
                {formatearChipHorario(bloque.fecha, bloque.horaIni)}
              </span>
            ))}
          </div>
        )}

        {restantes > 0 && (
          <button
            type="button"
            onClick={onAgendar}
            className="mb-3 text-[10px] font-bold text-[#0B4FC4] hover:underline"
          >
            ver más (+{restantes})
          </button>
        )}

        <button
          type="button"
          onClick={onAgendar}
          disabled={cupos.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B4FC4] py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 disabled:shadow-none"
        >
          <Icono nombre="calendario" className="h-4 w-4" />
          {cupos.length === 0 ? 'Sin horarios' : 'Agendar'}
        </button>
      </div>
    </article>
  );
}

function TarjetaTutoria({
  tutoria,
  accionId,
  puedeFinalizar,
  onAccion,
  onCalificar,
}: {
  tutoria: Tutoria;
  accionId: string | null;
  puedeFinalizar: boolean;
  onAccion: (
    tutoria: Tutoria,
    accion: 'aceptar' | 'rechazar' | 'cancelar' | 'finalizar'
  ) => void;
  onCalificar: (tutoria: Tutoria) => void;
}) {
  const ocupado = accionId === tutoria.id;
  const activa = ['Solicitada', 'Agendada'].includes(tutoria.estado);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {tutoria.soyMonitor ? 'Solicitud de' : 'Monitor'}
          </p>
          <h3 className="text-sm font-bold text-slate-800">
            {tutoria.soyMonitor
              ? tutoria.solicitante.nombre
              : tutoria.monitor.nombre}
          </h3>
          <p className="text-[11px] text-slate-500">
            {tutoria.soyMonitor
              ? tutoria.solicitante.correo
              : `${tutoria.monitor.carrera} · ${tutoria.monitor.semestre}.° semestre`}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${estadoTutoriaClase(
            tutoria.estado
          )}`}
        >
          {tutoria.estado}
        </span>
      </div>

      <div className="mb-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">
          📅{' '}
          {tutoria.programadaEn
            ? formatearFechaHora(tutoria.programadaEn)
            : tutoria.disponibilidad
              ? `${formatearChipHorario(
                  tutoria.disponibilidad.fecha,
                  tutoria.disponibilidad.horaIni
                )} – ${formatearHora(tutoria.disponibilidad.horaFin)}`
              : 'Horario por definir'}
        </p>
        <p>
          {tutoria.modalidad === 'Virtual' ? '💻 Virtual' : '📍 Presencial'}
          {tutoria.ubicacion ? ` · ${tutoria.ubicacion}` : ''}
        </p>
        {tutoria.notas && (
          <p className="italic text-slate-500">“{tutoria.notas}”</p>
        )}
      </div>

      {tutoria.estado === 'Solicitada' && (
        <p className="mb-3 text-[10px] text-amber-600">
          Responde antes de {formatearFechaHora(tutoria.expiraEn)}
        </p>
      )}

      {tutoria.calificacion && (
        <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <span className="font-bold">
            Tu calificación: {'★'.repeat(tutoria.calificacion.puntaje)}
          </span>
          {tutoria.calificacion.comentario && (
            <p className="mt-0.5 text-amber-700">
              “{tutoria.calificacion.comentario}”
            </p>
          )}
        </div>
      )}

      {activa && (
        <div className="flex flex-wrap gap-2">
          {tutoria.soyMonitor && tutoria.estado === 'Solicitada' && (
            <>
              <button
                onClick={() => onAccion(tutoria, 'aceptar')}
                disabled={ocupado}
                className="min-w-[120px] flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {ocupado ? 'Procesando…' : 'Aceptar'}
              </button>
              <button
                onClick={() => onAccion(tutoria, 'rechazar')}
                disabled={ocupado}
                className="min-w-[120px] flex-1 rounded-xl bg-red-100 py-2 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-60"
              >
                Rechazar
              </button>
            </>
          )}

          {puedeFinalizar && (
            <button
              onClick={() => onAccion(tutoria, 'finalizar')}
              disabled={ocupado}
              className="min-w-[120px] flex-1 rounded-xl bg-[#0B4FC4] py-2 text-xs font-bold text-white hover:bg-[#093fa3] disabled:opacity-60"
            >
              Finalizar tutoría
            </button>
          )}

          {(tutoria.soyMonitor || tutoria.soySolicitante) && (
            <button
              onClick={() => onAccion(tutoria, 'cancelar')}
              disabled={ocupado}
              className="min-w-[120px] flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {tutoria.puedeCalificar && (
        <button
          onClick={() => onCalificar(tutoria)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
        >
          ★ Calificar tutoría
        </button>
      )}
    </article>
  );
}

function Icono({
  nombre,
  className = 'h-4 w-4',
}: {
  nombre:
    | 'buscar'
    | 'reloj'
    | 'video'
    | 'pin'
    | 'calendario'
    | 'graduacion'
    | 'usuarios';
  className?: string;
}) {
  const comunes = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };

  switch (nombre) {
    case 'buscar':
      return (
        <svg {...comunes}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case 'reloj':
      return (
        <svg {...comunes}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'video':
      return (
        <svg {...comunes}>
          <rect x="2" y="6" width="13" height="12" rx="2" />
          <path d="m15 10 6-3v10l-6-3" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...comunes}>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'calendario':
      return (
        <svg {...comunes}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'graduacion':
      return (
        <svg {...comunes}>
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
        </svg>
      );
    case 'usuarios':
    default:
      return (
        <svg {...comunes}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5.5M18 20a6 6 0 0 0-2-4.5" />
        </svg>
      );
  }
}
