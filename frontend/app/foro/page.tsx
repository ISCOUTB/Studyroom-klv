'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AvatarForo } from '@/components/foro/AvatarForo';
import { ModalPregunta } from '@/components/foro/ModalPregunta';
import { Toast, useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { colorDeMateria } from '@/lib/salas';
import {
  ASIGNATURAS_FORO,
  type EstadoForo,
  type PreguntaForo,
  tiempoRelativoForo,
} from '@/lib/foro';

function IconoBuscar({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
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

function IconoRespuestas({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

const PESTANAS: Array<{ valor: EstadoForo; etiqueta: string }> = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'sin-resolver', etiqueta: 'Sin resolver' },
  { valor: 'resueltas', etiqueta: 'Resueltas' },
];

export default function ForoPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  const [preguntas, setPreguntas] = useState<PreguntaForo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tema, setTema] = useState('');
  const [asignatura, setAsignatura] = useState('Todas');
  const [estado, setEstado] = useState<EstadoForo>('todas');
  const [modalAbierto, setModalAbierto] = useState(false);

  const { toast, mostrar, cerrar } = useToast();
  const solicitudRef = useRef(0);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !token) {
      router.push('/login');
    }
  }, [isLoading, user, token, router]);

  // El botón "Hacer una pregunta" de Inicio llega con ?preguntar=1.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('preguntar') === '1') {
      setModalAbierto(true);
      window.history.replaceState({}, '', '/foro');
    }
    if (params.get('eliminada') === '1') {
      mostrar('Pregunta eliminada.', { variante: 'info' });
      window.history.replaceState({}, '', '/foro');
    }
  }, [mostrar]);

  const cargar = useCallback(async () => {
    if (!token) return;

    const solicitud = ++solicitudRef.current;
    setCargando(true);

    try {
      const params = new URLSearchParams();
      if (asignatura !== 'Todas') params.set('asignatura', asignatura);
      if (estado !== 'todas') params.set('estado', estado);
      if (busqueda.trim()) params.set('q', busqueda.trim());
      if (tema.trim()) params.set('tema', tema.trim());

      const consulta = params.toString();
      const data = await apiRequest<{ preguntas: PreguntaForo[] }>(
        `/api/foro${consulta ? `?${consulta}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (solicitud === solicitudRef.current) {
        setPreguntas(data.preguntas ?? []);
        setError('');
      }
    } catch (err) {
      if (solicitud === solicitudRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar las preguntas del foro.'
        );
      }
    } finally {
      if (solicitud === solicitudRef.current) {
        setCargando(false);
      }
    }
  }, [token, asignatura, estado, busqueda, tema]);

  useEffect(() => {
    if (!token) return;
    const temporizador = window.setTimeout(cargar, 300);
    return () => window.clearTimeout(temporizador);
  }, [cargar, token]);

  const handleCreada = (pregunta: PreguntaForo) => {
    setModalAbierto(false);
    router.push(`/foro/${pregunta.id}?creada=1`);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setTema('');
    setAsignatura('Todas');
    setEstado('todas');
  };

  if (isLoading || !user) return null;

  const hayFiltros =
    busqueda.trim() !== '' ||
    tema.trim() !== '' ||
    asignatura !== 'Todas' ||
    estado !== 'todas';

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Encabezado */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Foro de dudas
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Pregunta cuando quieras y recibe respuestas de compañeros y
              monitores, sin necesidad de coincidir en horario.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0B4FC4] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#093fa3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4FC4]/40"
          >
            <span className="text-lg leading-none" aria-hidden="true">
              +
            </span>
            Hacer una pregunta
          </button>
        </div>

        {/* Buscador y tema */}
        <div className="mt-6 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="relative">
            <IconoBuscar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por palabra clave…"
              aria-label="Buscar por palabra clave"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
            />
          </div>
          <input
            type="text"
            value={tema}
            onChange={(evento) => setTema(evento.target.value)}
            placeholder="Tema (opcional)"
            aria-label="Filtrar por tema"
            maxLength={80}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
          />
        </div>

        {/* Chips de asignatura */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAsignatura('Todas')}
            aria-pressed={asignatura === 'Todas'}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              asignatura === 'Todas'
                ? 'border-[#0B4FC4] bg-[#0B4FC4] text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            Todas
          </button>

          {ASIGNATURAS_FORO.map((materia) => {
            const color = colorDeMateria(materia);
            const activo = asignatura === materia;

            return (
              <button
                key={materia}
                type="button"
                onClick={() => setAsignatura(materia)}
                aria-pressed={activo}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  activo
                    ? color.relleno
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    activo ? 'bg-white' : color.punto
                  }`}
                />
                {materia}
              </button>
            );
          })}
        </div>

        {/* Pestañas de estado */}
        <div
          role="tablist"
          aria-label="Filtrar preguntas por estado"
          className="mt-5 flex items-center gap-6 border-b border-slate-200"
        >
          {PESTANAS.map((pestana) => {
            const activa = estado === pestana.valor;
            return (
              <button
                key={pestana.valor}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setEstado(pestana.valor)}
                className={`relative -mb-px pb-2.5 text-sm font-bold transition-colors ${
                  activa
                    ? 'text-[#0B4FC4]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {pestana.etiqueta}
                {activa && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#0B4FC4]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Listado */}
        <div className="mt-4">
          {error && (
            <div
              role="alert"
              className="mb-4 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={cargar}
                className="self-start font-bold underline underline-offset-2 sm:self-auto"
              >
                Reintentar
              </button>
            </div>
          )}

          {cargando ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : preguntas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-2xl">
                💬
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">
                No encontramos preguntas
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                {hayFiltros
                  ? 'Prueba con otros filtros o publica una nueva duda para la comunidad.'
                  : 'Sé el primero en preguntar. Compañeros y monitores podrán ayudarte.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {hayFiltros && (
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Limpiar filtros
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalAbierto(true)}
                  className="rounded-xl bg-[#0B4FC4] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#093fa3]"
                >
                  + Hacer una pregunta
                </button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {preguntas.map((pregunta) => {
                const color = colorDeMateria(pregunta.asignatura);

                return (
                  <li key={pregunta.id}>
                    <Link
                      href={`/foro/${pregunta.id}`}
                      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0B4FC4]/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4FC4]/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="min-w-0 text-base font-bold leading-snug tracking-tight text-slate-900 group-hover:text-[#0B4FC4] sm:text-lg">
                          {pregunta.titulo}
                        </h2>
                        {pregunta.resuelta && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            <span aria-hidden="true">✓</span>
                            Resuelta
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
                        {pregunta.descripcion}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${color.chip}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${color.punto}`}
                          />
                          {pregunta.asignatura}
                        </span>
                        {pregunta.tema && (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                            {pregunta.tema}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <AvatarForo
                            nombre={pregunta.autor.nombre}
                            fotoUrl={pregunta.autor.fotoUrl}
                          />
                          <span className="truncate text-xs font-bold text-slate-700">
                            {pregunta.autor.nombre}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            · {tiempoRelativoForo(pregunta.creadoEn)}
                          </span>
                        </div>

                        <span
                          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-500"
                          title={`${pregunta.totalRespuestas} ${
                            pregunta.totalRespuestas === 1
                              ? 'respuesta'
                              : 'respuestas'
                          }`}
                        >
                          <IconoRespuestas className="h-4 w-4" />
                          {pregunta.totalRespuestas}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <ModalPregunta
        abierto={modalAbierto}
        token={token}
        onCerrar={() => setModalAbierto(false)}
        onCreada={handleCreada}
      />

      <Toast
        abierto={!!toast}
        mensaje={toast?.mensaje ?? ''}
        detalle={toast?.detalle}
        variante={toast?.variante}
        duracion={toast?.duracion}
        onCerrar={cerrar}
      />
    </AppShell>
  );
}
