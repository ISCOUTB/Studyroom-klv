'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { apiRequest } from '@/lib/api';
import { type MonitorAdmin, formatearFechaHora } from '@/lib/tutorias';

export default function AdminMonitoresPage() {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<MonitorAdmin[]>([]);
  const [monitores, setMonitores] = useState<MonitorAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [accionId, setAccionId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;

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
    if (isLoading) return;

    if (!user || !token) {
      router.push('/login');
      return;
    }

    if (user.rol !== 'ADMINISTRADOR') return;
    cargar();
  }, [isLoading, user, token, router, cargar]);

  const responder = async (monitor: MonitorAdmin, aprobado: boolean) => {
    if (!token) return;

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

  if (isLoading) return null;

  if (!user || user.rol !== 'ADMINISTRADOR') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center max-w-md w-full">
          <div className="text-4xl mb-3">⛔</div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Acceso denegado</h2>
          <p className="text-xs text-slate-500 mb-6">
            Esta sección es exclusiva para administradores de la plataforma.
          </p>
          <button
            onClick={() => router.push('/salas')}
            className="w-full py-2.5 bg-[#0B4FC4] text-white font-bold rounded-xl text-xs"
          >
            Volver a salas de estudio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <UTBLogo className="h-9 sm:h-10 shrink-0" />
            <span className="hidden md:inline font-bold text-slate-800 text-lg border-l border-slate-200 pl-6">
              Panel de Administración
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/salas')}
              className="text-xs font-semibold text-slate-600 hover:text-[#0B4FC4] px-2 py-2"
            >
              ← <span className="hidden sm:inline">Salas</span>
            </button>
            <button
              onClick={() => router.push('/tutorias')}
              className="text-xs font-semibold text-[#0B4FC4] hover:underline px-2 py-2"
            >
              Tutorías
            </button>
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
        <h1 className="text-3xl font-black text-[#0B4FC4] mb-2">
          Aprobación de monitores
        </h1>
        <p className="text-slate-600 text-sm mb-8">
          Revisa las solicitudes y activa a los estudiantes que acompañarán las tutorías.
        </p>

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

        {cargando ? (
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <div key={item} className="bg-white rounded-2xl border border-slate-200 h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-bold text-sm text-slate-800">Solicitudes pendientes</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Al aprobar, el estudiante podrá publicar disponibilidad y recibir tutorías.
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full self-start sm:self-auto">
                  {solicitudes.length} pendiente{solicitudes.length === 1 ? '' : 's'}
                </span>
              </div>

              {solicitudes.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm font-semibold text-slate-700">
                    No hay solicitudes pendientes
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Las nuevas solicitudes aparecerán aquí automáticamente.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {solicitudes.map((solicitud) => (
                    <article
                      key={solicitud.id}
                      className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-11 h-11 bg-blue-100 text-[#0B4FC4] rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                            {solicitud.nombre.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-800 truncate">
                              {solicitud.nombre}
                            </h3>
                            <p className="text-xs text-slate-500 truncate">
                              {solicitud.correo} · {solicitud.carrera} ({solicitud.semestre}.° semestre)
                            </p>
                          </div>
                        </div>

                        {solicitud.biografia && (
                          <p className="text-xs text-slate-600 leading-relaxed mb-2">
                            {solicitud.biografia}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {solicitud.asignaturas.map((asignatura) => (
                            <span
                              key={asignatura}
                              className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-1 rounded-lg"
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

                      <div className="flex items-center gap-2 w-full lg:w-auto justify-end shrink-0">
                        <button
                          onClick={() => responder(solicitud, false)}
                          disabled={accionId === solicitud.id}
                          className="flex-1 lg:flex-none px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs transition-colors disabled:opacity-60"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => responder(solicitud, true)}
                          disabled={accionId === solicitud.id}
                          className="flex-1 lg:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-60"
                        >
                          {accionId === solicitud.id ? 'Procesando…' : 'Aprobar'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-bold text-sm text-slate-800">Monitores activos</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Perfiles aprobados que ya pueden recibir solicitudes.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full self-start sm:self-auto">
                  {monitores.length} activo{monitores.length === 1 ? '' : 's'}
                </span>
              </div>

              {monitores.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-slate-500">
                    Todavía no hay monitores aprobados.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {monitores.map((monitor) => (
                    <div
                      key={monitor.id}
                      className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                            {monitor.nombre.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-800 truncate">
                              {monitor.nombre}
                            </h3>
                            <p className="text-xs text-slate-500 truncate">
                              {monitor.carrera} · {monitor.semestre}.° semestre · {monitor.bloquesDisponibles} bloque(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {monitor.asignaturas.slice(0, 5).map((asignatura) => (
                            <span
                              key={asignatura}
                              className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded"
                            >
                              {asignatura}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
                        Aprobado
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
