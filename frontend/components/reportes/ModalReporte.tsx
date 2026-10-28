'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { ETIQUETA_TIPO_REPORTE, type TipoReporte } from '@/lib/admin';

interface ModalReporteProps {
  abierto: boolean;
  token: string | null;
  tipo: TipoReporte;
  referenciaId: string | null;
  onCerrar: () => void;
  onEnviado?: (mensaje: string) => void;
}

export function ModalReporte({
  abierto,
  token,
  tipo,
  referenciaId,
  onCerrar,
  onEnviado,
}: ModalReporteProps) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setMotivo('');
      setError('');
      setEnviando(false);
    }
  }, [abierto]);

  if (!abierto || !referenciaId) return null;

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!token || enviando) return;

    const texto = motivo.trim();
    if (texto.length < 5) {
      setError('Cuéntanos brevemente qué ocurre (mínimo 5 caracteres).');
      return;
    }

    setEnviando(true);
    setError('');
    try {
      const datos = await apiRequest<{ message: string }>('/api/reportes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipo, referenciaId, motivo: texto }),
      });
      onEnviado?.(datos.message);
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el reporte.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative w-full rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900">
              Reportar {ETIQUETA_TIPO_REPORTE[tipo].toLowerCase()}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Un administrador revisará el contenido reportado.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            ✕
          </button>
        </header>

        <form onSubmit={enviar} className="px-5 py-4">
          <label htmlFor="reporte-motivo" className="mb-1.5 block text-xs font-bold text-slate-700">
            Motivo <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reporte-motivo"
            rows={4}
            maxLength={500}
            required
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            placeholder="Ej.: el material contiene información ofensiva…"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">{motivo.length}/500</span>
            {error && <span className="text-[11px] font-semibold text-red-600">{error}</span>}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={enviando}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || motivo.trim().length < 5}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
