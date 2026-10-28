'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export type VarianteToast = 'exito' | 'error' | 'info';

export interface ToastProps {
  abierto: boolean;
  mensaje: string;
  detalle?: string;
  variante?: VarianteToast;
  /** Milisegundos antes de cerrarse. Usa 0 para no cerrar automáticamente. */
  duracion?: number;
  onCerrar: () => void;
}

const ESTILOS: Record<
  VarianteToast,
  { contenedor: string; icono: string; simbolo: string }
> = {
  exito: {
    contenedor:
      'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-900/10',
    icono: 'bg-emerald-500 text-white',
    simbolo: '✓',
  },
  error: {
    contenedor: 'border-red-200 bg-red-50 text-red-900 shadow-red-900/10',
    icono: 'bg-red-500 text-white',
    simbolo: '!',
  },
  info: {
    contenedor: 'border-blue-200 bg-blue-50 text-blue-900 shadow-blue-900/10',
    icono: 'bg-[#0B4FC4] text-white',
    simbolo: 'i',
  },
};

export function Toast({
  abierto,
  mensaje,
  detalle,
  variante = 'exito',
  duracion = 5000,
  onCerrar,
}: ToastProps) {
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    if (!abierto || duracion <= 0) return;

    const temporizador = window.setTimeout(() => {
      cerrarRef.current();
    }, duracion);

    return () => window.clearTimeout(temporizador);
  }, [abierto, duracion, mensaje]);

  if (!abierto) return null;

  const estilo = ESTILOS[variante];

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-3 z-[90] flex justify-end sm:inset-x-auto sm:right-5 sm:top-5"
      aria-live="polite"
    >
      <div
        role="status"
        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${estilo.contenedor}`}
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${estilo.icono}`}
          aria-hidden="true"
        >
          {estilo.simbolo}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug">{mensaje}</p>
          {detalle && (
            <p className="mt-1 break-words text-[11px] leading-relaxed opacity-80">
              {detalle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => cerrarRef.current()}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded-lg p-1 text-current opacity-60 transition-opacity hover:opacity-100"
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
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export interface ToastState {
  mensaje: string;
  detalle?: string;
  variante: VarianteToast;
  duracion?: number;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const mostrar = useCallback(
    (
      mensaje: string,
      opciones?: {
        detalle?: string;
        variante?: VarianteToast;
        duracion?: number;
      }
    ) => {
      setToast({
        mensaje,
        detalle: opciones?.detalle,
        variante: opciones?.variante ?? 'exito',
        duracion: opciones?.duracion,
      });
    },
    []
  );

  const cerrar = useCallback(() => setToast(null), []);

  return { toast, mostrar, cerrar };
}
