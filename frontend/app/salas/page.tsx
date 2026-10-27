'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  ASIGNATURAS,
  type Asignatura,
  type Sala,
  colorDeMateria,
  formatearFechaProgramada,
  inicialesDe,
} from '@/lib/salas';

type FiltroEstado = 'Todas' | 'En vivo' | 'Programadas';
type FiltroMateria = 'Todas' | Asignatura;
type CuandoSala = 'ahora' | 'programar';
type PrivacidadSala = 'publica' | 'privada';

const MATERIAS_CHIPS: Asignatura[] = [
  'Álgebra Lineal',
  'Cálculo I',
  'Cálculo Integral',
  'Estadística',
  'Física I',
];

const FILTROS_ESTADO: FiltroEstado[] = ['Todas', 'En vivo', 'Programadas'];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function fechaHoyLocal(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function IconoBuscar({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconoPlay({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function IconoMas({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconoCandado({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4.5" y="10" width="15" height="10.5" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  );
}

function IconoCalendario({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 9.5h17" />
    </svg>
  );
}

function IconoCopiar({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

export default function SalasPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  const [salas, setSalas] = useState<Sala[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [accionError, setAccionError] = useState('');
  const [uniendoId, setUniendoId] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('Todas');
  const [filtroMateria, setFiltroMateria] = useState<FiltroMateria>('Todas');

  const [modalCrear, setModalCrear] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [asignatura, setAsignatura] = useState<Asignatura | ''>('');
  const [tema, setTema] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cuando, setCuando] = useState<CuandoSala>('ahora');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [privacidad, setPrivacidad] = useState<PrivacidadSala>('publica');
  const [cupo, setCupo] = useState(10);
  const [creando, setCreando] = useState(false);
  const [modalError, setModalError] = useState('');
  const [salaCreada, setSalaCreada] = useState<Sala | null>(null);
  const [codigoCopiado, setCodigoCopiado] = useState('');

  const [accesoAbierto, setAccesoAbierto] = useState(false);
  const [salaDestino, setSalaDestino] = useState<Sala | null>(null);
  const [codigo, setCodigo] = useState('');
  const [codigoError, setCodigoError] = useState('');
  const [codigoCargando, setCodigoCargando] = useState(false);

  const cargarSalas = useCallback(async () => {
    if (!token) return;

    setCargando(true);
    setError('');
    try {
      const data = await apiRequest<{ salas: Sala[] }>('/api/salas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSalas(data.salas ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las salas de estudio.'
      );
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      router.push('/login');
      return;
    }

    cargarSalas();
    const intervalo = window.setInterval(cargarSalas, 60_000);
    return () => window.clearInterval(intervalo);
  }, [isLoading, user, token, router, cargarSalas]);

  const reiniciarFormulario = () => {
    setTitulo('');
    setAsignatura('');
    setTema('');
    setDescripcion('');
    setCuando('ahora');
    setFecha('');
    setHora('');
    setPrivacidad('publica');
    setCupo(10);
    setModalError('');
    setSalaCreada(null);
    setCodigoCopiado('');
  };

  const abrirModalCrear = () => {
    reiniciarFormulario();
    setModalCrear(true);
  };

  const cerrarModalCrear = () => {
    if (creando) return;
    setModalCrear(false);
    reiniciarFormulario();
  };

  const abrirAcceso = (sala: Sala | null) => {
    setSalaDestino(sala);
    setCodigo('');
    setCodigoError('');
    setAccesoAbierto(true);
  };

  const cerrarAcceso = () => {
    if (codigoCargando) return;
    setAccesoAbierto(false);
    setSalaDestino(null);
    setCodigo('');
    setCodigoError('');
  };

  const copiarCodigo = async (valor: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCodigoCopiado(clave);
    } catch {
      setCodigoCopiado('');
    }
  };

  const handleCrearSala = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setModalError('');

    if (!token) return;

    if (titulo.trim().length < 3) {
      setModalError('El título debe tener al menos 3 caracteres.');
      return;
    }
    if (!asignatura) {
      setModalError('Selecciona una asignatura.');
      return;
    }
    if (tema.trim().length < 3) {
      setModalError('El tema debe tener al menos 3 caracteres.');
      return;
    }
    if (descripcion.trim().length < 5) {
      setModalError('La descripción debe tener al menos 5 caracteres.');
      return;
    }

    let programadaEn: string | null = null;
    if (cuando === 'programar') {
      if (!fecha || !hora) {
        setModalError('Selecciona la fecha y la hora de la sala.');
        return;
      }

      const fechaHora = new Date(`${fecha}T${hora}:00`);
      if (Number.isNaN(fechaHora.getTime())) {
        setModalError('La fecha y la hora no son válidas.');
        return;
      }
      if (fechaHora.getTime() <= Date.now()) {
        setModalError('La fecha y la hora deben ser futuras.');
        return;
      }
      programadaEn = fechaHora.toISOString();
    }

    if (!Number.isInteger(cupo) || cupo < 2 || cupo > 50) {
      setModalError('El cupo debe estar entre 2 y 50 personas.');
      return;
    }

    setCreando(true);
    try {
      const data = await apiRequest<{ message: string; sala: Sala }>('/api/salas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titulo: titulo.trim(),
          asignatura,
          tema: tema.trim(),
          descripcion: descripcion.trim(),
          estado: cuando === 'programar' ? 'Programada' : 'Activa',
          privacidad: privacidad === 'privada' ? 'Privada' : 'Pública',
          cupoMaximo: cupo,
          programadaEn,
        }),
      });

      setSalas((prev) => [data.sala, ...prev]);
      setSalaCreada(data.sala);
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la sala de estudio.'
      );
    } finally {
      setCreando(false);
    }
  };

  const entrarSala = async (sala: Sala, codigoIngresado?: string) => {
    if (!token) return;
    setAccionError('');

    await apiRequest(`/api/salas/${sala.id}/unirse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: codigoIngresado
        ? JSON.stringify({ codigoAcceso: codigoIngresado })
        : undefined,
    });
  };

  const handleEntrarSala = async (sala: Sala) => {
    if (sala.participando || sala.esAnfitrion) {
      router.push(`/salas/${sala.id}`);
      return;
    }

    if (sala.privacidad === 'Privada') {
      abrirAcceso(sala);
      return;
    }

    if (
      sala.estado === 'Programada' &&
      sala.programadaEn &&
      new Date(sala.programadaEn).getTime() > Date.now()
    ) {
      setAccionError(
        `La sala “${sala.titulo}” comienza el ${formatearFechaProgramada(
          sala.programadaEn
        )}. Te esperamos.`
      );
      return;
    }

    setUniendoId(sala.id);
    try {
      await entrarSala(sala);
      setSalas((prev) =>
        prev.map((item) =>
          item.id === sala.id
            ? {
                ...item,
                participando: true,
                participantesActuales: Math.min(
                  item.cupoMaximo,
                  item.participantesActuales + 1
                ),
              }
            : item
        )
      );
      router.push(`/salas/${sala.id}`);
    } catch (err) {
      setAccionError(
        err instanceof Error ? err.message : 'No se pudo entrar a la sala.'
      );
    } finally {
      setUniendoId(null);
    }
  };

  const handleEstudiarAhora = async () => {
    setAccionError('');
    const activas = salas.filter((sala) => sala.estado === 'Activa');
    const propia = activas.find(
      (sala) => sala.participando || sala.esAnfitrion
    );

    if (propia) {
      router.push(`/salas/${propia.id}`);
      return;
    }

    const disponible = activas.find(
      (sala) =>
        sala.privacidad !== 'Privada' &&
        sala.participantesActuales < sala.cupoMaximo
    );

    if (disponible) {
      await handleEntrarSala(disponible);
      return;
    }

    setAccionError(
      'No hay salas en vivo con cupo disponible. Crea una sala para empezar ahora mismo.'
    );
    abrirModalCrear();
  };

  const handleAcceso = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCodigoError('');

    const valor = codigo.trim().toUpperCase();
    if (valor.length < 4) {
      setCodigoError('Ingresa el código de acceso de la sala.');
      return;
    }

    if (!token) return;
    setCodigoCargando(true);

    try {
      if (salaDestino) {
        await entrarSala(salaDestino, valor);
        setAccesoAbierto(false);
        router.push(`/salas/${salaDestino.id}`);
        return;
      }

      const data = await apiRequest<{ salas: Sala[] }>(
        `/api/salas?codigo=${encodeURIComponent(valor)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const encontrada = data.salas?.[0];

      if (!encontrada) {
        setCodigoError(
          'No encontramos una sala con ese código. Verifica e inténtalo de nuevo.'
        );
        return;
      }

      if (!encontrada.participando && !encontrada.esAnfitrion) {
        await entrarSala(encontrada, valor);
      }

      setAccesoAbierto(false);
      router.push(`/salas/${encontrada.id}`);
    } catch (err) {
      setCodigoError(
        err instanceof Error ? err.message : 'No se pudo entrar a la sala.'
      );
    } finally {
      setCodigoCargando(false);
    }
  };

  const filtradas = useMemo(() => {
    const texto = normalizar(busqueda.trim());

    return salas.filter((sala) => {
      const coincideTexto =
        !texto ||
        normalizar(
          `${sala.titulo} ${sala.tema} ${sala.descripcion} ${sala.asignatura}`
        ).includes(texto);

      const coincideEstado =
        filtroEstado === 'Todas' ||
        (filtroEstado === 'En vivo'
          ? sala.estado === 'Activa'
          : sala.estado === 'Programada');

      const coincideMateria =
        filtroMateria === 'Todas' || sala.asignatura === filtroMateria;

      return coincideTexto && coincideEstado && coincideMateria;
    });
  }, [salas, busqueda, filtroEstado, filtroMateria]);

  if (isLoading || !user) return null;

  const hayFiltrosActivos =
    Boolean(busqueda.trim()) ||
    filtroEstado !== 'Todas' ||
    filtroMateria !== 'Todas';

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Encabezado */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B4FC4]">
              Comunidad StudyRoom
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Salas de estudio
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
              Encuentra compañeros de tu materia, estudia en vivo y resuelvan
              ejercicios juntos.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <button
              type="button"
              onClick={handleEstudiarAhora}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-[#0B4FC4]/30 hover:text-[#0B4FC4]"
            >
              <IconoPlay className="h-3.5 w-3.5" />
              Estudiar ahora
            </button>
            <button
              type="button"
              onClick={abrirModalCrear}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B4FC4] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-[#093fa3]"
            >
              <IconoMas />
              Crear sala
            </button>
          </div>
        </div>

        {/* Buscador y filtros */}
        <div className="mt-6 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1 md:max-w-xl">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <IconoBuscar className="h-[18px] w-[18px]" />
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Busca por título, tema o descripción…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                aria-label="Buscar salas por título, tema o descripción"
              />
            </div>

            <button
              type="button"
              onClick={() => abrirAcceso(null)}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:border-[#0B4FC4]/40 hover:text-[#0B4FC4] md:self-auto"
            >
              <IconoCandado className="h-3.5 w-3.5" />
              Tengo un código
            </button>

            <div
              className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-white p-1 md:ml-auto"
              role="tablist"
              aria-label="Filtrar por estado"
            >
              {FILTROS_ESTADO.map((filtro) => {
                const activo = filtroEstado === filtro;
                return (
                  <button
                    key={filtro}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => setFiltroEstado(filtro)}
                    className={`flex-1 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors md:flex-none ${
                      activo
                        ? 'bg-[#0B4FC4] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {filtro}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setFiltroMateria('Todas')}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filtroMateria === 'Todas'
                  ? 'border-[#0B4FC4] bg-blue-50 text-[#0B4FC4]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#0B4FC4]" />
              Todas las materias
            </button>
            {MATERIAS_CHIPS.map((materia) => {
              const color = colorDeMateria(materia);
              const activo = filtroMateria === materia;
              return (
                <button
                  key={materia}
                  type="button"
                  onClick={() => setFiltroMateria(materia)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    activo
                      ? 'border-[#0B4FC4] bg-blue-50 text-[#0B4FC4]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${color.punto}`} />
                  {materia}
                </button>
              );
            })}
          </div>
        </div>

        {accionError && (
          <div
            role="alert"
            className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <span className="min-w-0">{accionError}</span>
            <button
              type="button"
              onClick={() => setAccionError('')}
              aria-label="Cerrar aviso"
              className="shrink-0 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={cargarSalas}
              className="mt-2 font-bold underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Tarjetas */}
        <div className="mt-6">
          {cargando ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="h-1.5 bg-slate-200" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-1/3 rounded bg-slate-100" />
                    <div className="h-5 w-4/5 rounded bg-slate-200" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                    <div className="h-12 w-full rounded bg-slate-100" />
                    <div className="h-8 w-full rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
                🔎
              </div>
              <h2 className="mt-3 text-base font-bold text-slate-800">
                {salas.length === 0
                  ? 'Todavía no hay salas de estudio'
                  : 'No encontramos salas con esos filtros'}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {salas.length === 0
                  ? 'Crea la primera sala y empieza a estudiar en equipo.'
                  : 'Prueba con otra materia, otro estado o borra la búsqueda.'}
              </p>
              <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
                {hayFiltrosActivos && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda('');
                      setFiltroEstado('Todas');
                      setFiltroMateria('Todas');
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300"
                  >
                    Limpiar filtros
                  </button>
                )}
                <button
                  type="button"
                  onClick={abrirModalCrear}
                  className="rounded-xl bg-[#0B4FC4] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#093fa3]"
                >
                  + Crear sala
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs font-semibold text-slate-400">
                {filtradas.length}{' '}
                {filtradas.length === 1 ? 'sala encontrada' : 'salas encontradas'}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtradas.map((sala) => {
                  const color = colorDeMateria(sala.asignatura);
                  const llena = sala.participantesActuales >= sala.cupoMaximo;
                  const uniendo = uniendoId === sala.id;
                  const progreso = Math.min(
                    100,
                    Math.round(
                      (sala.participantesActuales / Math.max(1, sala.cupoMaximo)) *
                        100
                    )
                  );
                  const esPrivada = sala.privacidad === 'Privada';

                  return (
                    <article
                      key={sala.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className={`h-1.5 w-full ${color.franja}`} />

                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${color.chip}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${color.punto}`}
                            />
                            {sala.asignatura}
                          </span>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${
                                sala.estado === 'Activa'
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : 'bg-blue-50 text-[#0B4FC4] ring-blue-200'
                              }`}
                            >
                              {sala.estado === 'Activa' ? (
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                              ) : (
                                <IconoCalendario className="h-3 w-3" />
                              )}
                              {sala.estado === 'Activa' ? 'En vivo' : 'Programada'}
                            </span>
                            {esPrivada && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400"
                                title="Sala privada"
                              >
                                <IconoCandado className="h-3 w-3" />
                                Privada
                              </span>
                            )}
                          </div>
                        </div>

                        {sala.estado === 'Programada' &&
                          sala.programadaEn && (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                              <IconoCalendario className="h-3.5 w-3.5 text-[#0B4FC4]" />
                              {formatearFechaProgramada(sala.programadaEn)}
                            </p>
                          )}

                        <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-slate-900">
                          {sala.titulo}
                        </h2>
                        <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#0B4FC4]">
                          {sala.tema}
                        </p>
                        <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-500">
                          {sala.descripcion}
                        </p>

                        <div className="mt-4 flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                            {inicialesDe(sala.anfitrion.nombre)}
                          </span>
                          <span className="min-w-0 text-xs text-slate-500">
                            <span className="block text-[10px] uppercase tracking-wide text-slate-400">
                              Anfitrión
                            </span>
                            <span className="block truncate font-semibold text-slate-700">
                              {sala.anfitrion.nombre}
                            </span>
                          </span>
                        </div>

                        {esPrivada && sala.codigoAcceso && (
                          <button
                            type="button"
                            onClick={() =>
                              copiarCodigo(
                                sala.codigoAcceso ?? '',
                                `sala-${sala.id}`
                              )
                            }
                            className="mt-3 inline-flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[#0B4FC4]/40 hover:text-[#0B4FC4]"
                            title="Copiar código de acceso"
                          >
                            <span>
                              Código:{' '}
                              <span className="font-mono font-bold tracking-wider">
                                {sala.codigoAcceso}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                              <IconoCopiar />
                              {codigoCopiado === `sala-${sala.id}`
                                ? 'Copiado'
                                : 'Copiar'}
                            </span>
                          </button>
                        )}

                        <div className="mt-auto pt-4">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>Cupo</span>
                            <span>
                              {sala.participantesActuales}/{sala.cupoMaximo}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${color.franja}`}
                              style={{ width: `${progreso}%` }}
                            />
                          </div>

                          <div className="mt-4 border-t border-slate-100 pt-3">
                            {sala.participando || sala.esAnfitrion ? (
                              <button
                                type="button"
                                onClick={() => handleEntrarSala(sala)}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-[#0B4FC4] transition-colors hover:bg-blue-100"
                              >
                                Ya estás en esta sala
                                <span aria-hidden="true">→</span>
                              </button>
                            ) : llena ? (
                              <button
                                type="button"
                                disabled
                                className="w-full cursor-not-allowed rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400"
                              >
                                Cupo lleno
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleEntrarSala(sala)}
                                disabled={uniendo}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-[#0B4FC4]/40 hover:text-[#0B4FC4] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {uniendo ? 'Entrando…' : esPrivada ? 'Unirme con código' : 'Unirme'}
                                {!uniendo && <span aria-hidden="true">→</span>}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal crear sala */}
      {modalCrear && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={cerrarModalCrear}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <header className="shrink-0 border-b border-slate-100 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-black tracking-tight text-slate-900">
                    {salaCreada ? 'Tu sala está lista' : 'Crear una sala de estudio'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {salaCreada
                      ? 'Comparte el acceso con tus compañeros y empiecen a estudiar.'
                      : 'Reúnete con compañeros de tu materia y resuelvan dudas juntos.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cerrarModalCrear}
                  disabled={creando}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
            </header>

            {salaCreada ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-8">
                  <div className="mx-auto max-w-md text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl ring-1 ring-inset ring-emerald-100">
                      ✓
                    </div>
                    <h3 className="mt-4 text-xl font-black text-slate-900">
                      {salaCreada.titulo}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {salaCreada.asignatura} · {salaCreada.tema}
                    </p>

                    {salaCreada.estado === 'Programada' &&
                      salaCreada.programadaEn && (
                        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#0B4FC4]">
                          <IconoCalendario className="h-3.5 w-3.5" />
                          {formatearFechaProgramada(salaCreada.programadaEn)}
                        </p>
                      )}

                    {salaCreada.privacidad === 'Privada' &&
                      salaCreada.codigoAcceso && (
                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Código de acceso
                          </p>
                          <div className="mt-2 flex items-center justify-center gap-3">
                            <span className="font-mono text-2xl font-black tracking-[0.2em] text-[#0B4FC4]">
                              {salaCreada.codigoAcceso}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                copiarCodigo(
                                  salaCreada.codigoAcceso ?? '',
                                  'creada'
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-[#0B4FC4]/40 hover:text-[#0B4FC4]"
                            >
                              <IconoCopiar />
                              {codigoCopiado === 'creada' ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-500">
                            Solo entra quien tenga este código o el enlace de la
                            sala.
                          </p>
                        </div>
                      )}

                    <p className="mt-5 text-xs leading-relaxed text-slate-500">
                      {salaCreada.estado === 'Programada'
                        ? 'La sala se activará automáticamente en la fecha y hora elegidas.'
                        : 'La sala ya está activa. Puedes entrar ahora mismo.'}
                    </p>
                  </div>
                </div>

                <footer className="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={cerrarModalCrear}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      Cerrar
                    </button>
                    {salaCreada.estado === 'Activa' && (
                      <button
                        type="button"
                        onClick={() => {
                          const id = salaCreada.id;
                          setModalCrear(false);
                          reiniciarFormulario();
                          router.push(`/salas/${id}`);
                        }}
                        className="rounded-xl bg-[#0B4FC4] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#093fa3]"
                      >
                        Entrar a la sala
                      </button>
                    )}
                  </div>
                </footer>
              </>
            ) : (
              <form onSubmit={handleCrearSala} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="sala-titulo"
                        className="mb-1.5 block text-xs font-bold text-slate-700"
                      >
                        Título de la sala <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="sala-titulo"
                        type="text"
                        required
                        maxLength={100}
                        value={titulo}
                        onChange={(evento) => setTitulo(evento.target.value)}
                        placeholder="Ej.: Repaso de límites para el parcial"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="sala-asignatura"
                          className="mb-1.5 block text-xs font-bold text-slate-700"
                        >
                          Asignatura <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="sala-asignatura"
                          required
                          value={asignatura}
                          onChange={(evento) =>
                            setAsignatura(evento.target.value as Asignatura | '')
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                        >
                          <option value="">Elige una asignatura…</option>
                          {ASIGNATURAS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="sala-tema"
                          className="mb-1.5 block text-xs font-bold text-slate-700"
                        >
                          Tema <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="sala-tema"
                          type="text"
                          required
                          maxLength={140}
                          value={tema}
                          onChange={(evento) => setTema(evento.target.value)}
                          placeholder="Ej.: Límites y continuidad"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="sala-descripcion"
                        className="mb-1.5 block text-xs font-bold text-slate-700"
                      >
                        Descripción <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="sala-descripcion"
                        required
                        rows={3}
                        maxLength={600}
                        value={descripcion}
                        onChange={(evento) => setDescripcion(evento.target.value)}
                        placeholder="Cuéntales a tus compañeros de qué trata la sesión…"
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        ¿Qué van a hacer? ¿Qué deben traer?
                      </p>
                    </div>

                    <fieldset>
                      <legend className="mb-2 text-xs font-bold text-slate-700">
                        ¿Cuándo?
                      </legend>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setCuando('ahora')}
                          aria-pressed={cuando === 'ahora'}
                          className={`rounded-xl border p-3.5 text-left transition-colors ${
                            cuando === 'ahora'
                              ? 'border-[#0B4FC4] bg-blue-50 ring-1 ring-[#0B4FC4]/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                cuando === 'ahora'
                                  ? 'border-[#0B4FC4] bg-[#0B4FC4]'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {cuando === 'ahora' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                            </span>
                            Ahora mismo
                          </span>
                          <span className="mt-1 block pl-6 text-[11px] leading-relaxed text-slate-500">
                            La sala queda abierta de inmediato.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCuando('programar')}
                          aria-pressed={cuando === 'programar'}
                          className={`rounded-xl border p-3.5 text-left transition-colors ${
                            cuando === 'programar'
                              ? 'border-[#0B4FC4] bg-blue-50 ring-1 ring-[#0B4FC4]/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                cuando === 'programar'
                                  ? 'border-[#0B4FC4] bg-[#0B4FC4]'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {cuando === 'programar' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                            </span>
                            Programarla
                          </span>
                          <span className="mt-1 block pl-6 text-[11px] leading-relaxed text-slate-500">
                            Elige día y hora; avisaremos a quien siga la materia.
                          </span>
                        </button>
                      </div>

                      {cuando === 'programar' && (
                        <div className="mt-3 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="sala-fecha"
                              className="mb-1 block text-[11px] font-bold text-slate-600"
                            >
                              Fecha <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="sala-fecha"
                              type="date"
                              required
                              min={fechaHoyLocal()}
                              value={fecha}
                              onChange={(evento) => setFecha(evento.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="sala-hora"
                              className="mb-1 block text-[11px] font-bold text-slate-600"
                            >
                              Hora <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="sala-hora"
                              type="time"
                              required
                              value={hora}
                              onChange={(evento) => setHora(evento.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                            />
                          </div>
                        </div>
                      )}
                    </fieldset>

                    <fieldset>
                      <legend className="mb-2 text-xs font-bold text-slate-700">
                        Privacidad
                      </legend>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setPrivacidad('publica')}
                          aria-pressed={privacidad === 'publica'}
                          className={`rounded-xl border p-3.5 text-left transition-colors ${
                            privacidad === 'publica'
                              ? 'border-[#0B4FC4] bg-blue-50 ring-1 ring-[#0B4FC4]/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                privacidad === 'publica'
                                  ? 'border-[#0B4FC4] bg-[#0B4FC4]'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {privacidad === 'publica' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                            </span>
                            Pública
                          </span>
                          <span className="mt-1 block pl-6 text-[11px] leading-relaxed text-slate-500">
                            Cualquier estudiante la encuentra y se une.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrivacidad('privada')}
                          aria-pressed={privacidad === 'privada'}
                          className={`rounded-xl border p-3.5 text-left transition-colors ${
                            privacidad === 'privada'
                              ? 'border-[#0B4FC4] bg-blue-50 ring-1 ring-[#0B4FC4]/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                privacidad === 'privada'
                                  ? 'border-[#0B4FC4] bg-[#0B4FC4]'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {privacidad === 'privada' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                            </span>
                            Privada
                          </span>
                          <span className="mt-1 block pl-6 text-[11px] leading-relaxed text-slate-500">
                            Solo entra quien tenga el código o el enlace.
                          </span>
                        </button>
                      </div>
                    </fieldset>

                    <div>
                      <div className="flex items-end justify-between gap-3">
                        <label
                          htmlFor="sala-cupo"
                          className="text-xs font-bold text-slate-700"
                        >
                          Cupo máximo
                        </label>
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#0B4FC4]">
                          {cupo} {cupo === 1 ? 'persona' : 'personas'}
                        </span>
                      </div>
                      <input
                        id="sala-cupo"
                        type="range"
                        min={2}
                        max={50}
                        step={1}
                        value={cupo}
                        onChange={(evento) => setCupo(Number(evento.target.value))}
                        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#0B4FC4]"
                      />
                      <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400">
                        <span>2</span>
                        <span>50</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Para trabajar bien en grupo, 4 a 10 personas funciona mejor.
                      </p>
                    </div>

                    {modalError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700"
                      >
                        {modalError}
                      </div>
                    )}
                  </div>
                </div>

                <footer className="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={cerrarModalCrear}
                      disabled={creando}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creando}
                      className="rounded-xl bg-[#0B4FC4] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {creando ? 'Creando…' : 'Crear sala'}
                    </button>
                  </div>
                </footer>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal acceso privado */}
      {accesoAbierto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={cerrarAcceso}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {salaDestino ? 'Sala privada' : 'Acceder con código'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {salaDestino
                    ? `Ingresa el código para unirte a “${salaDestino.titulo}”.`
                    : 'Escribe el código que te compartió el anfitrión.'}
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarAcceso}
                disabled={codigoCargando}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAcceso} className="px-5 py-5">
              <label
                htmlFor="codigo-acceso"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                Código de acceso
              </label>
              <input
                id="codigo-acceso"
                value={codigo}
                onChange={(evento) =>
                  setCodigo(evento.target.value.toUpperCase().slice(0, 8))
                }
                placeholder="Ej.: K7M2QX"
                autoFocus
                maxLength={8}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-center font-mono text-lg font-bold tracking-[0.25em] text-slate-800 placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
              />

              {codigoError && (
                <div
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
                >
                  {codigoError}
                </div>
              )}

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarAcceso}
                  disabled={codigoCargando}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={codigoCargando}
                  className="rounded-xl bg-[#0B4FC4] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {codigoCargando ? 'Verificando…' : 'Entrar a la sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
