'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useNotificaciones } from '@/lib/notifications-context';
import {
  iconoNotificacion,
  tiempoRelativo,
} from '@/lib/notificaciones';

function BellIcon({ className = '' }: { className?: string }) {
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
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

interface NotificationBellProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export function NotificationBell({
  variant = 'light',
  className = '',
}: NotificationBellProps) {
  const {
    notificaciones,
    noLeidas,
    cargando,
    error,
    conectado,
    recargar,
    marcarTodasLeidas,
    abrirNotificacion,
  } = useNotificaciones();

  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!abierto) return;

    const alTocarFuera = (evento: MouseEvent | TouchEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', alTocarFuera);
    document.addEventListener('touchstart', alTocarFuera);
    window.addEventListener('keydown', alPresionarTecla);

    return () => {
      document.removeEventListener('mousedown', alTocarFuera);
      document.removeEventListener('touchstart', alTocarFuera);
      window.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto]);

  const botonClase =
    variant === 'dark'
      ? 'text-slate-300 hover:text-white hover:bg-slate-700'
      : 'text-slate-600 hover:text-[#0B4FC4] hover:bg-blue-50';

  const abrir = (notificacion: Parameters<typeof abrirNotificacion>[0]) => {
    setAbierto(false);
    abrirNotificacion(notificacion);
  };

  return (
    <div ref={contenedorRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        className={`relative p-2 rounded-xl transition-colors ${botonClase}`}
        aria-label={
          noLeidas > 0
            ? `Notificaciones: ${noLeidas} sin leer`
            : 'Notificaciones'
        }
        aria-expanded={abierto}
        aria-haspopup="dialog"
        title="Notificaciones"
      >
        <BellIcon className="w-5 h-5" />
        {noLeidas > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none ${
              variant === 'dark' ? 'ring-2 ring-slate-800' : 'ring-2 ring-white'
            }`}
          >
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="fixed left-3 right-3 top-[5.25rem] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[24rem]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Notificaciones</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    conectado ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                {conectado ? 'En tiempo real' : 'Sin conexión en vivo'}
                {noLeidas > 0 && (
                  <span className="text-[#0B4FC4] font-semibold">
                    · {noLeidas} sin leer
                  </span>
                )}
              </p>
            </div>
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={marcarTodasLeidas}
                className="shrink-0 text-[11px] font-bold text-[#0B4FC4] hover:underline"
              >
                Marcar leídas
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-2 text-[11px] text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={recargar}
                className="shrink-0 font-bold hover:underline"
              >
                Reintentar
              </button>
            </div>
          )}

          <div className="max-h-[min(60vh,26rem)] overflow-y-auto">
            {cargando && notificaciones.length === 0 ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-3 animate-pulse">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2 py-0.5">
                      <div className="h-3 w-2/3 rounded bg-slate-200" />
                      <div className="h-2.5 w-full rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mb-2 text-3xl">🔔</div>
                <p className="text-sm font-semibold text-slate-700">
                  Estás al día
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Aquí aparecerán las novedades de tus tutorías y solicitudes.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notificaciones.map((notificacion) => (
                  <li key={notificacion.id}>
                    <button
                      type="button"
                      onClick={() => abrir(notificacion)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                        notificacion.leida ? 'bg-white' : 'bg-blue-50/60'
                      }`}
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm ring-1 ring-slate-100">
                        {iconoNotificacion(notificacion.tipo)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {notificacion.titulo}
                          </span>
                          {!notificacion.leida && (
                            <span
                              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1473E6]"
                              aria-label="Sin leer"
                            />
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-600">
                          {notificacion.mensaje}
                        </span>
                        <span className="mt-1.5 block text-[10px] font-medium text-slate-400">
                          {tiempoRelativo(notificacion.creadaEn)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
