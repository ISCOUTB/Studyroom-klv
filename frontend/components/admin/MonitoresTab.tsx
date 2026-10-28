'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useNotificaciones } from '@/lib/notifications-context';
import { type MonitorAdmin, formatearFechaHora } from '@/lib/tutorias';

interface MonitoresTabProps {
  token: string;
}

export function MonitoresTab({ token }: MonitoresTabProps) {
  const { ultimaNotificacion } = useNotificaciones();

  const [solicitudes, setSolicitudes] = useState<MonitorAdmin[]>([]);
  const [monitores, setMonitores] = useState<MonitorAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [accionId, setAccionId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const datos = await apiRequest<{
        solicitudes: MonitorAdmin[];
        monitores: MonitorAdmin[];
      }>('/api/admin/monitores', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSolicitudes(datos.solicitudes ?? []);
      setMonitores(datos.monitores ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las solicitudes de monitor.'
      );
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (ultimaNotificacion?.tipo === 'SOLICITUD_MONITOR') {
      void cargar();
    }
  }, [ultimaNotificacion, cargar]);

  const responder = async (monitor: MonitorAdmin, aprobado: boolean) => {
    setError('');
    setExito('');
    setAccionId(monitor.id);

    try {
      const data = await apiRequest<{ message: string }>(
        `/api/admin/monitores/${monitor.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ aprobado }),
        }
      );
      setExito(data.message);
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo procesar la solicitud.'
      );
    } finally {
      setAccionId(null);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold" aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}
      {exito && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{exito}</span>
          <button onClick={() => setExito('')} className="font-bold" aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}

      {cargando ? (
        <div className="space-y-4">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Solicitudes pendientes</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Al aprobar, el estudiante podrá publicar disponibilidad y recibir tutorías.
                </p>
              </div>
              <span className="self-start rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 sm:self-auto">
                {solicitudes.length} pendiente{solicitudes.length === 1 ? '' : 's'}
              </span>
            </div>

            {solicitudes.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mb-2 text-3xl">✅</div>
                <p className="text-sm font-semibold text-slate-700">
                  No hay solicitudes pendientes
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Las nuevas solicitudes aparecerán aquí automáticamente.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {solicitudes.map((solicitud) => (
                  <article
                    key={solicitud.id}
                    className="flex flex-col justify-between gap-4 p-5 sm:p-6 lg:flex-row lg:items-start"
                  >
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#0B4FC4]">
                          {solicitud.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-slate-800">
                            {solicitud.nombre}
                          </h3>
                          <p className="truncate text-xs text-slate-500">
                            {solicitud.correo} · {solicitud.carrera} ({solicitud.semestre}.°
                            semestre)
                          </p>
                        </div>
                      </div>

                      {solicitud.biografia && (
                        <p className="mb-2 text-xs leading-relaxed text-slate-600">
                          {solicitud.biografia}
                        </p>
                      )}

                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {solicitud.asignaturas.map((asignatura) => (
                          <span
                            key={asignatura}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"
                          >
                            {asignatura}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] text-slate-500">
                        {solicitud.modalidad === 'Virtual' ? '💻 Virtual' : '📍 Presencial'}
                        {solicitud.ubicacion ? ` · ${solicitud.ubicacion}` : ''}
                        {' · '}
                        Solicitud enviada el {formatearFechaHora(solicitud.solicitudEn)}
                      </p>
                    </div>

                    <div className="flex w-full shrink-0 items-center justify-end gap-2 lg:w-auto">
                      <button
                        onClick={() => responder(solicitud, false)}
                        disabled={accionId === solicitud.id}
                        className="flex-1 rounded-xl bg-red-100 px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-200 disabled:opacity-60 lg:flex-none"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => responder(solicitud, true)}
                        disabled={accionId === solicitud.id}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 lg:flex-none"
                      >
                        {accionId === solicitud.id ? 'Procesando…' : 'Aprobar'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Monitores activos</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Perfiles aprobados que ya pueden recibir solicitudes.
                </p>
              </div>
              <span className="self-start rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 sm:self-auto">
                {monitores.length} activo{monitores.length === 1 ? '' : 's'}
              </span>
            </div>

            {monitores.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-slate-500">Todavía no hay monitores aprobados.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {monitores.map((monitor) => (
                  <div
                    key={monitor.id}
                    className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center sm:p-6"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {monitor.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-slate-800">
                            {monitor.nombre}
                          </h3>
                          <p className="truncate text-xs text-slate-500">
                            {monitor.carrera} · {monitor.semestre}.° semestre ·{' '}
                            {monitor.bloquesDisponibles} bloque(s)
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {monitor.asignaturas.slice(0, 5).map((asignatura) => (
                          <span
                            key={asignatura}
                            className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                          >
                            {asignatura}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 sm:self-auto">
                      Aprobado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
