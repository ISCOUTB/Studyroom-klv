'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AvatarForo } from '@/components/foro/AvatarForo';
import { Toast, useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { colorDeMateria } from '@/lib/salas';
import {
  formatearFechaForo,
  tiempoRelativoForo,
  type PreguntaForoDetalle,
} from '@/lib/foro';

function IconoVolver({ className = 'h-4 w-4' }: { className?: string }) {
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
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export default function PreguntaForoPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [pregunta, setPregunta] = useState<PreguntaForoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aceptandoId, setAceptandoId] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const { toast, mostrar, cerrar } = useToast();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !token) {
      router.push('/login');
    }
  }, [isLoading, user, token, router]);

  const cargar = useCallback(async () => {
    if (!token || !id) return;

    setCargando(true);
    try {
      const data = await apiRequest<{ pregunta: PreguntaForoDetalle }>(
        `/api/foro/${encodeURIComponent(id)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPregunta(data.pregunta);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar la pregunta.'
      );
    } finally {
      setCargando(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (token && id) cargar();
  }, [token, id, cargar]);

  // Aviso al llegar desde el modal de creación.
  useEffect(() => {
    if (typeof window === 'undefined' || !id) return;

    const paramsUrl = new URLSearchParams(window.location.search);
    if (paramsUrl.get('creada') === '1') {
      mostrar('Pregunta publicada. ¡La comunidad ya puede responderte!');
      window.history.replaceState({}, '', `/foro/${id}`);
    }
  }, [id, mostrar]);

  const handleResponder = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!token || !pregunta) return;

    const contenido = respuestaTexto.trim();
    if (contenido.length < 3) {
      mostrar('Escribe una respuesta de al menos 3 caracteres.', {
        variante: 'error',
      });
      return;
    }

    setEnviando(true);
    try {
      await apiRequest(`/api/foro/${pregunta.id}/respuestas`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contenido }),
      });

      setRespuestaTexto('');
      mostrar('Tu respuesta fue publicada.');
      await cargar();
    } catch (err) {
      mostrar(
        err instanceof Error ? err.message : 'No se pudo publicar tu respuesta.',
        { variante: 'error' }
      );
    } finally {
      setEnviando(false);
    }
  };

  const handleAceptar = async (respuestaId: string) => {
    if (!token || !pregunta) return;

    setAceptandoId(respuestaId);
    try {
      await apiRequest(
        `/api/foro/${pregunta.id}/respuestas/${respuestaId}/aceptar`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      mostrar('Respuesta marcada como aceptada.');
      await cargar();
    } catch (err) {
      mostrar(
        err instanceof Error ? err.message : 'No se pudo aceptar la respuesta.',
        { variante: 'error' }
      );
    } finally {
      setAceptandoId(null);
    }
  };

  const handleEliminarPregunta = async () => {
    if (!token || !pregunta || eliminando) return;

    if (
      !window.confirm(
        '¿Eliminar esta pregunta y todas sus respuestas? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    setEliminando(true);
    try {
      await apiRequest(`/api/foro/${pregunta.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/foro?eliminada=1');
    } catch (err) {
      mostrar(
        err instanceof Error ? err.message : 'No se pudo eliminar la pregunta.',
        { variante: 'error' }
      );
      setEliminando(false);
    }
  };

  const handleEliminarRespuesta = async (respuestaId: string) => {
    if (!token || !pregunta) return;

    if (!window.confirm('¿Eliminar esta respuesta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await apiRequest(`/api/foro/${pregunta.id}/respuestas/${respuestaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      mostrar('Respuesta eliminada.', { variante: 'info' });
      await cargar();
    } catch (err) {
      mostrar(
        err instanceof Error ? err.message : 'No se pudo eliminar la respuesta.',
        { variante: 'error' }
      );
    }
  };

  if (isLoading || !user) return null;

  const esAdmin = user.rol === 'ADMINISTRADOR';
  const color = pregunta ? colorDeMateria(pregunta.asignatura) : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link
          href="/foro"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-[#0B4FC4]"
        >
          <IconoVolver className="h-3.5 w-3.5" />
          Volver al foro
        </Link>

        {cargando ? (
          <div className="mt-4 space-y-3">
            <div className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        ) : error || !pregunta ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
            <p className="text-sm font-bold text-red-700">
              {error || 'La pregunta no existe o fue eliminada.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={cargar}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
              >
                Reintentar
              </button>
              <Link
                href="/foro"
                className="rounded-xl bg-[#0B4FC4] px-4 py-2 text-xs font-bold text-white hover:bg-[#093fa3]"
              >
                Ir al foro
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Pregunta */}
            <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="min-w-0 flex-1 text-xl font-black leading-tight tracking-tight text-slate-900 sm:text-2xl">
                  {pregunta.titulo}
                </h1>
                {pregunta.resuelta && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    <span aria-hidden="true">✓</span>
                    Resuelta
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${color?.chip ?? ''}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${color?.punto ?? ''}`}
                  />
                  {pregunta.asignatura}
                </span>
                {pregunta.tema && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                    {pregunta.tema}
                  </span>
                )}
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {pregunta.descripcion}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <AvatarForo
                    nombre={pregunta.autor.nombre}
                    fotoUrl={pregunta.autor.fotoUrl}
                    tamano="lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {pregunta.autor.nombre}
                      {pregunta.soyAutor && (
                        <span className="font-medium text-slate-400"> (tú)</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {tiempoRelativoForo(pregunta.creadoEn)} ·{' '}
                      {formatearFechaForo(pregunta.creadoEn)}
                    </p>
                  </div>
                </div>

                {(pregunta.soyAutor || esAdmin) && (
                  <button
                    type="button"
                    onClick={handleEliminarPregunta}
                    disabled={eliminando}
                    className="text-[11px] font-bold text-red-600 transition-colors hover:text-red-700 hover:underline disabled:opacity-60"
                  >
                    {eliminando ? 'Eliminando…' : 'Eliminar pregunta'}
                  </button>
                )}
              </div>
            </article>

            {/* Respuestas */}
            <section className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  Respuestas
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                  {pregunta.respuestas.length}
                </span>
              </div>

              {pregunta.respuestas.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-lg">
                    💬
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    Aún no hay respuestas
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sé la primera persona en ayudar con esta duda.
                  </p>
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {pregunta.respuestas.map((respuesta) => (
                    <li
                      key={respuesta.id}
                      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
                        respuesta.aceptada
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <AvatarForo
                            nombre={respuesta.autor.nombre}
                            fotoUrl={respuesta.autor.fotoUrl}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-800">
                              {respuesta.autor.nombre}
                              {respuesta.soyAutor && (
                                <span className="font-medium text-slate-400">
                                  {' '}
                                  (tú)
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {tiempoRelativoForo(respuesta.creadoEn)}
                            </p>
                          </div>
                        </div>

                        {respuesta.aceptada && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            <span aria-hidden="true">✓</span>
                            Respuesta aceptada
                          </span>
                        )}
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {respuesta.contenido}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
                        {pregunta.soyAutor && !respuesta.aceptada && (
                          <button
                            type="button"
                            onClick={() => handleAceptar(respuesta.id)}
                            disabled={aceptandoId === respuesta.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
                          >
                            <span aria-hidden="true">✓</span>
                            {aceptandoId === respuesta.id
                              ? 'Marcando…'
                              : 'Marcar como respuesta'}
                          </button>
                        )}

                        {(respuesta.soyAutor || esAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleEliminarRespuesta(respuesta.id)}
                            className="text-[11px] font-bold text-red-600 transition-colors hover:text-red-700 hover:underline"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Responder */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-black tracking-tight text-slate-900">
                Tu respuesta
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Ayuda a resolver la duda con una explicación clara.
              </p>

              <form onSubmit={handleResponder} className="mt-3">
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={respuestaTexto}
                  onChange={(evento) => setRespuestaTexto(evento.target.value)}
                  placeholder="Escribe tu respuesta…"
                  aria-label="Escribe tu respuesta"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    {respuestaTexto.length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={enviando || respuestaTexto.trim().length < 3}
                    className="rounded-xl bg-[#0B4FC4] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviando ? 'Publicando…' : 'Publicar respuesta'}
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </div>

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
