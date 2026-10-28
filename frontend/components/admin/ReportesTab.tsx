'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import {
  ETIQUETA_TIPO_REPORTE,
  formatearFechaAdmin,
  type ReporteAdmin,
} from '@/lib/admin';

interface ReportesTabProps {
  token: string;
}

type Filtro = 'todos' | 'pendientes' | 'resueltos';

const FILTROS: Array<{ valor: Filtro; etiqueta: string }> = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'pendientes', etiqueta: 'Pendientes' },
  { valor: 'resueltos', etiqueta: 'Resueltos' },
];

export function ReportesTab({ token }: ReportesTabProps) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [reportes, setReportes] = useState<ReporteAdmin[]>([]);
  const [totales, setTotales] = useState({ pendientes: 0, resueltos: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [accionId, setAccionId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await apiRequest<{
        reportes: ReporteAdmin[];
        totales: { pendientes: number; resueltos: number };
      }>(`/api/admin/reportes?estado=${filtro}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReportes(datos.reportes ?? []);
      setTotales(datos.totales ?? { pendientes: 0, resueltos: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes.');
    } finally {
      setCargando(false);
    }
  }, [token, filtro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resolver = async (reporte: ReporteAdmin, accion: 'retirar' | 'descartar') => {
    if (accionId) return;

    if (
      accion === 'retirar' &&
      !window.confirm(
        `¿Retirar este ${ETIQUETA_TIPO_REPORTE[reporte.tipo].toLowerCase()}? El contenido se eliminará de forma permanente.`
      )
    ) {
      return;
    }

    setAccionId(reporte.id);
    setError('');
    setExito('');
    try {
      const datos = await apiRequest<{ message: string }>(
        `/api/admin/reportes/${reporte.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ accion }),
        }
      );
      setExito(datos.message);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo resolver el reporte.');
    } finally {
      setAccionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {FILTROS.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setFiltro(opcion.valor)}
              aria-pressed={filtro === opcion.valor}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filtro === opcion.valor
                  ? 'border-[#0B4FC4] bg-[#0B4FC4] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
        <p className="text-[11px] font-semibold text-slate-400">
          {totales.pendientes} pendiente{totales.pendientes === 1 ? '' : 's'} ·{' '}
          {totales.resueltos} resuelto{totales.resueltos === 1 ? '' : 's'}
        </p>
      </div>

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
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : reportes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl">
            🛡️
          </div>
          <p className="mt-3 text-sm font-bold text-slate-800">Nada por revisar</p>
          <p className="mt-1 text-xs text-slate-500">
            {filtro === 'todos'
              ? 'Todavía no se ha reportado contenido.'
              : 'No hay reportes en este estado.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reportes.map((reporte) => (
            <li
              key={reporte.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      {ETIQUETA_TIPO_REPORTE[reporte.tipo]}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        reporte.estado === 'PENDIENTE'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {reporte.estado === 'PENDIENTE' ? 'Pendiente' : 'Resuelto'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {reporte.motivo}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Reportado por{' '}
                    <span className="font-semibold text-slate-600">
                      {reporte.reportante.nombre}
                    </span>{' '}
                    · {formatearFechaAdmin(reporte.creadoEn)}
                    {reporte.resueltoPor && (
                      <>
                        {' '}
                        · Revisado por{' '}
                        <span className="font-semibold text-slate-600">
                          {reporte.resueltoPor.nombre}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {reporte.estado === 'PENDIENTE' && (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resolver(reporte, 'descartar')}
                      disabled={accionId === reporte.id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={() => resolver(reporte, 'retirar')}
                      disabled={accionId === reporte.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                    >
                      {accionId === reporte.id ? 'Retirando…' : 'Retirar contenido'}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
