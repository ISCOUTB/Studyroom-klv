'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import {
  ETIQUETA_ACCION_AUDITORIA,
  formatearFechaAdmin,
  type PaginacionAuditoria,
  type RegistroAuditoria,
} from '@/lib/admin';
import { IconoAdmin } from './IconoAdmin';

interface AuditoriaTabProps {
  token: string;
}

export function AuditoriaTab({ token }: AuditoriaTabProps) {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionAuditoria | null>(null);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await apiRequest<{
        registros: RegistroAuditoria[];
        paginacion: PaginacionAuditoria;
      }>(`/api/admin/auditoria?page=${pagina}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRegistros(datos.registros ?? []);
      setPaginacion(datos.paginacion ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la auditoría.');
    } finally {
      setCargando(false);
    }
  }, [token, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Registro de acciones</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Historial de solo lectura de las decisiones administrativas.
          </p>
        </div>
        {paginacion && (
          <p className="text-[11px] font-semibold text-slate-400">
            {paginacion.total} registro{paginacion.total === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold" aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {cargando ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : registros.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">Sin acciones registradas</p>
            <p className="mt-1 text-xs text-slate-500">
              Las aprobaciones, retiros y cambios al catálogo aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-5 py-3 font-bold">
                    Fecha
                  </th>
                  <th scope="col" className="whitespace-nowrap px-5 py-3 font-bold">
                    Responsable
                  </th>
                  <th scope="col" className="whitespace-nowrap px-5 py-3 font-bold">
                    Acción
                  </th>
                  <th scope="col" className="px-5 py-3 font-bold">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.map((registro) => (
                  <tr key={registro.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                      {formatearFechaAdmin(registro.creadoEn)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-700">
                      {registro.admin.nombre}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0B4FC4]">
                        {ETIQUETA_ACCION_AUDITORIA[registro.accion] ?? registro.accion}
                      </span>
                    </td>
                    <td className="min-w-[16rem] px-5 py-3 leading-relaxed text-slate-600">
                      {registro.detalle}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paginacion && paginacion.totalPaginas > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
              disabled={pagina <= 1 || cargando}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <IconoAdmin nombre="flecha-izquierda" className="h-3.5 w-3.5" />
              Anterior
            </button>
            <span className="text-[11px] font-semibold text-slate-500">
              Página {paginacion.pagina} de {paginacion.totalPaginas}
            </span>
            <button
              type="button"
              onClick={() =>
                setPagina((valor) => Math.min(paginacion.totalPaginas, valor + 1))
              }
              disabled={pagina >= paginacion.totalPaginas || cargando}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Siguiente
              <IconoAdmin nombre="flecha-derecha" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
