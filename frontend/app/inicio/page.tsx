'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ModalPregunta } from '@/components/foro/ModalPregunta';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  type Sala,
  colorDeMateria,
  inicialesDe,
} from '@/lib/salas';
import {
  type Tutoria,
  formatearFechaHora,
} from '@/lib/tutorias';
import {
  type PreguntaForo,
  tiempoRelativoForo,
} from '@/lib/foro';

function saludoSegunHora(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function etiquetaRol(rol?: string | null): string {
  if (rol === 'ADMINISTRADOR') return 'Administrador';
  if (rol === 'TUTOR') return 'Monitor';
  return 'Estudiante';
}

function IconoFlecha({ className = 'h-4 w-4' }: { className?: string }) {
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
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconoComentario({ className = 'h-4 w-4' }: { className?: string }) {
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

export default function InicioPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  const [salas, setSalas] = useState<Sala[]>([]);
  const [tutorias, setTutorias] = useState<Tutoria[]>([]);
  const [dudas, setDudas] = useState<PreguntaForo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [uniendoId, setUniendoId] = useState<string | null>(null);
  const [accionError, setAccionError] = useState('');
  const [modalPregunta, setModalPregunta] = useState(false);

  const cargar = useCallback(async () => {
    if (!token) return;

    try {
      const [respuestaSalas, respuestaTutorias, respuestaForo] =
        await Promise.all([
          apiRequest<{ salas: Sala[] }>('/api/salas', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiRequest<{ tutorias: Tutoria[] }>('/api/tutorias', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiRequest<{ preguntas: PreguntaForo[] }>(
            '/api/foro?estado=sin-resolver',
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);

      setSalas(respuestaSalas.salas ?? []);
      setTutorias(respuestaTutorias.tutorias ?? []);
      setDudas(respuestaForo.preguntas ?? []);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar tu resumen de StudyRoom.'
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

    cargar();
    const intervalo = window.setInterval(cargar, 60_000);
    return () => window.clearInterval(intervalo);
  }, [isLoading, user, token, router, cargar]);

  const salasEnVivo = salas.filter((sala) => sala.estado === 'Activa');
  const proximasTutorias = tutorias
    .filter((tutoria) => {
      if (tutoria.estadoCodigo !== 'AGENDADA' || !tutoria.programadaEn) {
        return false;
      }
      return new Date(tutoria.programadaEn).getTime() >= Date.now() - 15 * 60_000;
    })
    .sort(
      (a, b) =>
        new Date(a.programadaEn ?? 0).getTime() -
        new Date(b.programadaEn ?? 0).getTime()
    )
    .slice(0, 3);

  const entrarSala = async (sala: Sala) => {
    setAccionError('');

    if (sala.participando || sala.esAnfitrion) {
      router.push(`/salas/${sala.id}`);
      return;
    }

    if (!token) return;

    if (sala.privacidad === 'Privada') {
      router.push('/salas');
      return;
    }

    setUniendoId(sala.id);
    try {
      await apiRequest(`/api/salas/${sala.id}/unirse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push(`/salas/${sala.id}`);
    } catch (err) {
      setAccionError(
        err instanceof Error ? err.message : 'No se pudo entrar a la sala.'
      );
    } finally {
      setUniendoId(null);
    }
  };

  const handlePreguntaCreada = (pregunta: PreguntaForo) => {
    setModalPregunta(false);
    router.push(`/foro/${pregunta.id}?creada=1`);
  };

  if (isLoading || !user) return null;

  const nombre = user.nombre?.trim() || etiquetaRol(user.rol);
  const cantidadEnVivo = salasEnVivo.length;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Banner de bienvenida */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B4FC4] via-[#0B4FC4] to-[#072f7d] px-5 py-7 text-white shadow-lg shadow-blue-900/10 sm:px-8 sm:py-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-20 h-48 w-48 rounded-full bg-white/5"
          />

          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-50 ring-1 ring-inset ring-white/20">
              {etiquetaRol(user.rol)} · UTB
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {saludoSegunHora()}, {nombre} 👋
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-50/90 sm:text-base">
              {cantidadEnVivo > 0
                ? `Hay ${cantidadEnVivo} ${
                    cantidadEnVivo === 1 ? 'sala' : 'salas'
                  } en vivo ahora mismo. ¿Te sumas?`
                : 'Todavía no hay salas en vivo. Crea una y empieza a estudiar en equipo.'}
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => router.push('/salas')}
                className="keep-white inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0B4FC4] shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Estudiar ahora
                <IconoFlecha />
              </button>
              <button
                type="button"
                onClick={() => router.push('/tutorias')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Agendar tutoría
              </button>
              <button
                type="button"
                onClick={() => setModalPregunta(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Hacer una pregunta
              </button>
            </div>
          </div>
        </section>

        {accionError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {accionError}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
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

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* En vivo ahora */}
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B4FC4]">
                  Ahora
                </p>
                <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                  En vivo ahora
                </h2>
              </div>
              <button
                type="button"
                onClick={() => router.push('/salas')}
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#0B4FC4] hover:underline"
              >
                Ver todas las salas
                <IconoFlecha className="h-3.5 w-3.5" />
              </button>
            </div>

            {cargando ? (
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : salasEnVivo.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-2xl">
                  📚
                </div>
                <p className="mt-3 text-sm font-bold text-slate-800">
                  No hay salas en vivo ahora mismo
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                  Sé el primero en abrir un espacio y reúne a tus compañeros de
                  materia.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/salas')}
                  className="mt-4 rounded-xl bg-[#0B4FC4] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#093fa3]"
                >
                  Crear una sala
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {salasEnVivo.slice(0, 3).map((sala) => {
                  const color = colorDeMateria(sala.asignatura);
                  const uniendo = uniendoId === sala.id;
                  const llena = sala.participantesActuales >= sala.cupoMaximo;

                  return (
                    <article
                      key={sala.id}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex">
                        <div className={`w-1.5 shrink-0 ${color.franja}`} />
                        <div className="min-w-0 flex-1 p-4 sm:p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${color.chip}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${color.punto}`}
                              />
                              {sala.asignatura}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                              En vivo
                            </span>
                            {sala.privacidad === 'Privada' && (
                              <span
                                className="text-xs text-slate-400"
                                title="Sala privada"
                                aria-label="Sala privada"
                              >
                                🔒
                              </span>
                            )}
                          </div>

                          <h3 className="mt-2 truncate text-base font-bold text-slate-900">
                            {sala.titulo}
                          </h3>
                          <p className={`truncate text-xs font-semibold ${color.texto}`}>
                            {sala.tema}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                                {inicialesDe(sala.anfitrion.nombre)}
                              </span>
                              <span className="truncate text-xs text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  {sala.anfitrion.nombre}
                                </span>{' '}
                                · {sala.participantesActuales}/{sala.cupoMaximo}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => entrarSala(sala)}
                              disabled={uniendo || (llena && !sala.participando)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0B4FC4] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                              {uniendo
                                ? 'Entrando…'
                                : sala.participando || sala.esAnfitrion
                                  ? 'Entrar'
                                  : llena
                                    ? 'Cupo lleno'
                                    : 'Unirme'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* Próximas tutorías */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B4FC4]">
                    Agenda
                  </p>
                  <h2 className="text-lg font-black tracking-tight text-slate-900">
                    Próximas tutorías
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/tutorias')}
                  className="shrink-0 text-xs font-bold text-[#0B4FC4] hover:underline"
                >
                  Ver agenda
                </button>
              </div>

              {cargando ? (
                <div className="mt-4 space-y-2.5">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : proximasTutorias.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                    📅
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    No tienes tutorías agendadas
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Encuentra un monitor que te acompañe con tu materia.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/tutorias')}
                    className="mt-3 rounded-lg bg-[#0B4FC4] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#093fa3]"
                  >
                    Buscar un monitor
                  </button>
                </div>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {proximasTutorias.map((tutoria) => (
                    <li key={tutoria.id}>
                      <button
                        type="button"
                        onClick={() => router.push('/tutorias')}
                        className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-[#0B4FC4]/30 hover:bg-blue-50/50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-[#0B4FC4]">
                          {new Date(tutoria.programadaEn ?? '').getDate()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-slate-800">
                            {tutoria.soyMonitor
                              ? `Con ${tutoria.solicitante.nombre}`
                              : `Con ${tutoria.monitor.nombre}`}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {formatearFechaHora(tutoria.programadaEn)}
                          </span>
                          <span className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            {tutoria.modalidad}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Dudas sin resolver */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  Dudas sin resolver
                </h2>
                <Link
                  href="/foro"
                  className="shrink-0 text-[11px] font-bold text-[#0B4FC4] hover:underline"
                >
                  Ver foro
                </Link>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Preguntas de tus compañeros que aún esperan una respuesta.
              </p>

              {cargando ? (
                <div className="mt-4 space-y-2.5">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
                    />
                  ))}
                </div>
              ) : dudas.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm">
                      💬
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700">
                        Aún no hay dudas sin resolver
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        Comparte tu pregunta y deja que compañeros y monitores te
                        ayuden.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {dudas.slice(0, 3).map((duda) => {
                    const color = colorDeMateria(duda.asignatura);

                    return (
                      <li key={duda.id}>
                        <Link
                          href={`/foro/${duda.id}`}
                          className="block rounded-xl border border-slate-200 p-3 transition-colors hover:border-[#0B4FC4]/30 hover:bg-blue-50/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 text-xs font-bold leading-snug text-slate-800">
                              {duda.titulo}
                            </p>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${color.chip}`}
                            >
                              {duda.asignatura}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0B4FC4] text-[9px] font-black text-white">
                              {inicialesDe(duda.autor.nombre)}
                            </span>
                            <span className="truncate font-semibold text-slate-500">
                              {duda.autor.nombre}
                            </span>
                            <span className="shrink-0">
                              · {tiempoRelativoForo(duda.creadoEn)}
                            </span>
                            <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-slate-500">
                              <IconoComentario className="h-3.5 w-3.5" />
                              {duda.totalRespuestas}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setModalPregunta(true)}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#0B4FC4]/30 bg-blue-50/60 px-3 py-2 text-[11px] font-bold text-[#0B4FC4] transition-colors hover:bg-blue-50"
              >
                + Hacer una pregunta
              </button>
            </section>
          </div>
        </div>
      </div>

      <ModalPregunta
        abierto={modalPregunta}
        token={token}
        onCerrar={() => setModalPregunta(false)}
        onCreada={handlePreguntaCreada}
      />
    </AppShell>
  );
}
