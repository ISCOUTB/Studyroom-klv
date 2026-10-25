'use client';

import React from 'react';
import { useNotificaciones } from '@/lib/notifications-context';
import { iconoNotificacion } from '@/lib/notificaciones';

export function NotificationToast() {
  const { toast, descartarToast, abrirNotificacion } = useNotificaciones();

  if (!toast) return null;

  return (
    <div
      className="fixed bottom-4 left-3 right-3 z-[60] sm:left-auto sm:right-6 sm:bottom-6 sm:w-96"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={() => {
            descartarToast();
            abrirNotificacion(toast);
          }}
          className="flex w-full items-start gap-3 p-4 pr-10 text-left transition-colors hover:bg-slate-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg ring-1 ring-blue-100">
            {iconoNotificacion(toast.tipo)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-800">
              {toast.titulo}
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-600">
              {toast.mensaje}
            </span>
            <span className="mt-1.5 block text-[10px] font-bold text-[#0B4FC4]">
              Ver detalle →
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={descartarToast}
          className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Cerrar aviso"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#1473E6]/70" />
      </div>
    </div>
  );
}
