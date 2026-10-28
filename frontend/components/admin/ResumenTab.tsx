'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { type ResumenAdmin } from '@/lib/admin';
import { IconoAdmin, type IconoAdminNombre } from './IconoAdmin';

interface ResumenTabProps {
  token: string;
}

interface TarjetaProps {
  titulo: string;
  icono: IconoAdminNombre;
  colorIcono: string;
  valor: string;
  auxiliar: string;
  extra?: React.ReactNode;
}

function Tarjeta({ titulo, icono, colorIcono, valor, auxiliar, extra }: TarjetaProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-600">{titulo}</h3>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorIcono}`}
        >
          <IconoAdmin nombre={icono} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
        {valor}
      </p>
      {extra}
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{auxiliar}</p>
    </article>
  );
}

export function ResumenTab({ token }: ResumenTabProps) {
  const [datos, setDatos] = useState<ResumenAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await apiRequest<ResumenAdmin>('/api/admin/resumen', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDatos(respuesta);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar las métricas.'
      );
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700">
        <p>{error || 'No se pudieron cargar las métricas.'}</p>
        <button
          type="button"
          onClick={cargar}
          className="mt-3 font-bold underline underline-offset-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const estrellasLlenas = Math.max(0, Math.min(5, Math.round(datos.calificacion.promedio)));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Tarjeta
        titulo="Usuarios registrados"
        icono="usuarios"
        colorIcono="bg-blue-50 text-blue-600"
        valor={String(datos.usuarios.total)}
        auxiliar={`${datos.usuarios.nuevos7dias} nuevos en los últimos 7 días`}
      />
      <Tarjeta
        titulo="Activación"
        icono="activacion"
        colorIcono="bg-emerald-50 text-emerald-600"
        valor={`${datos.activacion.porcentaje}%`}
        auxiliar="Estudiantes que ya participaron en una sala."
      />
      <Tarjeta
        titulo="Salas activas"
        icono="salas"
        colorIcono="bg-emerald-50 text-emerald-600"
        valor={String(datos.salas.activas)}
        auxiliar={`${datos.salas.total} salas en total`}
      />
      <Tarjeta
        titulo="Tutorías finalizadas"
        icono="tutorias"
        colorIcono="bg-blue-50 text-blue-600"
        valor={String(datos.tutorias.finalizadas)}
        auxiliar={`${datos.tutorias.total} solicitadas en total`}
      />
      <Tarjeta
        titulo="Calificación promedio"
        icono="calificacion"
        colorIcono="bg-amber-50 text-amber-500"
        valor={datos.calificacion.promedio.toFixed(1)}
        auxiliar="De las tutorías calificadas"
        extra={
          <div className="mt-1 flex items-center gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((estrella) => (
              <span
                key={estrella}
                className={`text-sm ${
                  estrella <= estrellasLlenas ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                ★
              </span>
            ))}
            <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
              {datos.calificacion.calificadas} calificada
              {datos.calificacion.calificadas === 1 ? '' : 's'}
            </span>
          </div>
        }
      />
      <Tarjeta
        titulo="Preguntas en el foro"
        icono="foro"
        colorIcono="bg-blue-50 text-blue-600"
        valor={String(datos.foro.preguntas)}
        auxiliar="Dudas publicadas por la comunidad."
      />
      <Tarjeta
        titulo="Ejercicios resueltos"
        icono="ejercicios"
        colorIcono="bg-blue-50 text-blue-600"
        valor={String(datos.ejercicios.resueltos)}
        auxiliar="El banco de ejercicios aún no está disponible."
      />
      <Tarjeta
        titulo="Materiales publicados"
        icono="materiales"
        colorIcono="bg-blue-50 text-blue-600"
        valor={String(datos.materiales.total)}
        auxiliar="Archivos compartidos en las salas."
      />
      <Tarjeta
        titulo="Reportes pendientes"
        icono="pendientes"
        colorIcono="bg-rose-50 text-rose-500"
        valor={String(datos.reportes.pendientes)}
        auxiliar={
          datos.reportes.pendientes === 0
            ? 'Nada por revisar'
            : 'Contenido esperando moderación.'
        }
      />
    </div>
  );
}
