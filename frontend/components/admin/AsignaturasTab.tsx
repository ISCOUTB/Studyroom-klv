'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useCatalogo } from '@/lib/catalogo';
import { type AsignaturaAdmin } from '@/lib/admin';
import { IconoAdmin } from './IconoAdmin';

interface AsignaturasTabProps {
  token: string;
}

const COLORES: Array<{ clave: string; etiqueta: string; punto: string }> = [
  { clave: 'blue', etiqueta: 'Azul', punto: 'bg-blue-600' },
  { clave: 'emerald', etiqueta: 'Verde', punto: 'bg-emerald-500' },
  { clave: 'amber', etiqueta: 'Ámbar', punto: 'bg-amber-500' },
  { clave: 'rose', etiqueta: 'Rosa', punto: 'bg-rose-500' },
  { clave: 'violet', etiqueta: 'Violeta', punto: 'bg-violet-500' },
  { clave: 'sky', etiqueta: 'Cielo', punto: 'bg-sky-500' },
  { clave: 'indigo', etiqueta: 'Índigo', punto: 'bg-indigo-500' },
  { clave: 'teal', etiqueta: 'Turquesa', punto: 'bg-teal-500' },
  { clave: 'orange', etiqueta: 'Naranja', punto: 'bg-orange-500' },
  { clave: 'slate', etiqueta: 'Gris', punto: 'bg-slate-400' },
];

function colorPunto(clave: string): string {
  return COLORES.find((color) => color.clave === clave)?.punto ?? 'bg-slate-400';
}

export function AsignaturasTab({ token }: AsignaturasTabProps) {
  const { recargar: recargarCatalogo } = useCatalogo();

  const [asignaturas, setAsignaturas] = useState<AsignaturaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoColor, setNuevoColor] = useState('blue');

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [colorEditado, setColorEditado] = useState('blue');
  const [accionId, setAccionId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await apiRequest<{ asignaturas: AsignaturaAdmin[] }>(
        '/api/admin/asignaturas',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAsignaturas(datos.asignaturas ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el catálogo.'
      );
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (guardando) return;

    setGuardando(true);
    setError('');
    setExito('');
    try {
      await apiRequest('/api/admin/asignaturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre: nuevoNombre, color: nuevoColor }),
      });
      setNuevoNombre('');
      setNuevoColor('blue');
      setExito('Asignatura creada.');
      await cargar();
      await recargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la asignatura.');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (asignatura: AsignaturaAdmin) => {
    setEditandoId(asignatura.id);
    setNombreEditado(asignatura.nombre);
    setColorEditado(asignatura.color);
    setError('');
    setExito('');
  };

  const guardarEdicion = async (asignatura: AsignaturaAdmin) => {
    if (accionId) return;
    setAccionId(asignatura.id);
    setError('');
    setExito('');
    try {
      await apiRequest(`/api/admin/asignaturas/${asignatura.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: nombreEditado,
          color: colorEditado,
        }),
      });
      setEditandoId(null);
      setExito('Asignatura actualizada.');
      await cargar();
      await recargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar.');
    } finally {
      setAccionId(null);
    }
  };

  const alternarActiva = async (asignatura: AsignaturaAdmin) => {
    if (accionId) return;
    setAccionId(asignatura.id);
    setError('');
    setExito('');
    try {
      await apiRequest(`/api/admin/asignaturas/${asignatura.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activa: !asignatura.activa }),
      });
      setExito(
        asignatura.activa
          ? `“${asignatura.nombre}” quedó inactiva.`
          : `“${asignatura.nombre}” quedó activa.`
      );
      await cargar();
      await recargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
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

      <form
        onSubmit={crear}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-bold text-slate-800">Nueva asignatura</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          El catálogo alimenta los filtros y formularios de salas, tutorías y foro.
        </p>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={nuevoNombre}
            onChange={(evento) => setNuevoNombre(evento.target.value)}
            placeholder="Ej.: Química General"
            aria-label="Nombre de la nueva asignatura"
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
          />
          <select
            value={nuevoColor}
            onChange={(evento) => setNuevoColor(evento.target.value)}
            aria-label="Color de la nueva asignatura"
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
          >
            {COLORES.map((color) => (
              <option key={color.clave} value={color.clave}>
                {color.etiqueta}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0B4FC4] px-4 text-sm font-bold text-white transition-colors hover:bg-[#093fa3] disabled:opacity-60"
          >
            <IconoAdmin nombre="mas" className="h-4 w-4" />
            {guardando ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-800">Catálogo de asignaturas</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Renombra, cambia el color o desactiva una asignatura sin borrar su historial.
          </p>
        </div>

        {cargando ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : asignaturas.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            El catálogo está vacío. Crea la primera asignatura.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {asignaturas.map((asignatura) => {
              const editando = editandoId === asignatura.id;
              return (
                <li
                  key={asignatura.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  {editando ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={nombreEditado}
                        onChange={(evento) => setNombreEditado(evento.target.value)}
                        maxLength={80}
                        aria-label="Nuevo nombre"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                      />
                      <select
                        value={colorEditado}
                        onChange={(evento) => setColorEditado(evento.target.value)}
                        aria-label="Nuevo color"
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-[#0B4FC4] focus:outline-none"
                      >
                        {COLORES.map((color) => (
                          <option key={color.clave} value={color.clave}>
                            {color.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full ${colorPunto(
                          asignatura.color
                        )}`}
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {asignatura.nombre}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          asignatura.activa
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {asignatura.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  )}

                  <div className="flex shrink-0 items-center gap-2">
                    {editando ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditandoId(null)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => guardarEdicion(asignatura)}
                          disabled={accionId === asignatura.id}
                          className="rounded-lg bg-[#0B4FC4] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#093fa3] disabled:opacity-60"
                        >
                          {accionId === asignatura.id ? 'Guardando…' : 'Guardar'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(asignatura)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                        >
                          <IconoAdmin nombre="editar" className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarActiva(asignatura)}
                          disabled={accionId === asignatura.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
                            asignatura.activa
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {asignatura.activa ? 'Desactivar' : 'Activar'}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
