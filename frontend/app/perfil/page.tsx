'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { API_URL } from '@/lib/api';

const ROL_LABEL: Record<string, string> = {
  ESTUDIANTE: 'Estudiante',
  TUTOR: 'Estudiante / Monitor',
  ADMINISTRADOR: 'Administrador',
};

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function formatearFecha(iso?: string): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function urlAbsoluta(fotoUrl?: string | null): string | null {
  if (!fotoUrl) return null;
  return fotoUrl.startsWith('http') ? fotoUrl : `${API_URL}${fotoUrl}`;
}

export default function PerfilPage() {
  const { user, token, isLoading, logout, refreshUser } = useAuth();
  const router = useRouter();

  const refrescadoRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      router.push('/login');
      return;
    }

    // Tras un login reciente el contexto puede no traer todos los datos.
    if (refrescadoRef.current) return;
    refrescadoRef.current = true;
    refreshUser().catch(() => {
      // Si falla, la página sigue mostrando los datos disponibles.
    });
  }, [isLoading, user, token, router, refreshUser]);

  if (isLoading || !user) return null;

  const datosAcademicos = user.estudiante ?? user.tutor ?? null;
  const imagen = urlAbsoluta(user.fotoUrl ?? datosAcademicos?.fotoUrl);
  const visibilidad = user.visibilidadCorreo ?? 'CURSO';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Barra superior */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <UTBLogo className="h-10" />
            <span className="hidden md:inline font-bold text-slate-800 text-lg border-l border-slate-200 pl-6">
              Campus Collaborative Study
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/salas')}
              className="text-xs font-semibold text-slate-600 hover:text-[#0B4FC4] px-2 py-2"
            >
              ← <span className="hidden sm:inline">Salas</span>
            </button>

            <NotificationBell />

            <button
              onClick={logout}
              className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabecera del perfil */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B4FC4] to-[#093fa3] px-6 py-6 sm:px-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => router.push('/perfil/editar')}
                title="Editar foto de perfil"
                aria-label="Editar foto de perfil"
                className="group relative shrink-0 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                {imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagen}
                    alt={`Foto de ${user.nombre}`}
                    className="h-20 w-20 shrink-0 rounded-full object-cover ring-4 ring-white/25"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-black text-white ring-4 ring-white/25"
                  >
                    {iniciales(user.nombre)}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-[10px] font-bold uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Editar
                </span>
              </button>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100/80">
                  {ROL_LABEL[user.rol] ?? user.rol}
                </p>
                <h1 className="mt-0.5 truncate text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {user.nombre}
                </h1>
                <p className="mt-1 truncate text-xs text-blue-100/90">
                  {datosAcademicos
                    ? `${datosAcademicos.carrera} · Semestre ${datosAcademicos.semestre}`
                    : 'Cuenta institucional UTB'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Detalles de usuario */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="h-5 w-1.5 rounded-full bg-[#0B4FC4]" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-800">
                Detalles de usuario
              </h2>
            </div>

            <button
              type="button"
              onClick={() => router.push('/perfil/editar')}
              className="text-xs font-bold text-[#0B4FC4] hover:underline"
            >
              Editar perfil
            </button>
          </div>

          <dl className="grid gap-x-8 gap-y-6 px-6 py-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Dirección de correo
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {user.correo}{' '}
                <span className="text-slate-400">
                  {visibilidad === 'OCULTO'
                    ? '(Oculto para otros participantes)'
                    : '(Visible para otros participantes del curso)'}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Rol
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {ROL_LABEL[user.rol] ?? user.rol}
              </dd>
            </div>

            {datosAcademicos && (
              <>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Carrera
                  </dt>
                  <dd className="mt-1 text-sm text-slate-700">
                    {datosAcademicos.carrera}
                  </dd>
                </div>

                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Semestre
                  </dt>
                  <dd className="mt-1 text-sm text-slate-700">
                    {datosAcademicos.semestre}
                  </dd>
                </div>
              </>
            )}

            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Ciudad/Pueblo
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {user.ciudad || '—'}
              </dd>
            </div>

            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                País
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {user.pais || 'Colombia'}
              </dd>
            </div>

            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Zona horaria
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {user.zonaHoraria || 'America/Bogota'}
              </dd>
            </div>

            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Miembro desde
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {formatearFecha(user.creadoEn)}
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
