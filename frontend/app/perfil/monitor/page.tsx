'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/AppShell';
import { apiRequest } from '@/lib/api';
import { useNotificaciones } from '@/lib/notifications-context';
import { useCatalogo } from '@/lib/catalogo';
import { inicialesDe } from '@/lib/salas';
import {
  type ContextoTutorias,
  type DisponibilidadMonitor,
  type Monitor,
  fechaLocalISO,
  formatearChipHorario,
  formatearRango,
} from '@/lib/tutorias';

const PASOS = [
  {
    titulo: '1. Postulas',
    descripcion: 'Cuéntanos qué asignaturas dominas y cómo quieres atender.',
    icono: 'documento' as const,
  },
  {
    titulo: '2. Un administrador revisa',
    descripcion: 'Verificamos tu perfil. Te avisamos aquí y por correo.',
    icono: 'escudo' as const,
  },
  {
    titulo: '3. Publicas tus horarios',
    descripcion: 'Define tus bloques y empieza a recibir solicitudes.',
    icono: 'calendario' as const,
  },
];

export default function PerfilMonitorPage() {
  const { user, token, isLoading } = useAuth();
  const { ultimaNotificacion } = useNotificaciones();
  const { activas, colorDe } = useCatalogo();
  const router = useRouter();

  const [contexto, setContexto] = useState<ContextoTutorias | null>(null);
  const [perfil, setPerfil] = useState<Monitor | null>(null);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadMonitor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [carrera, setCarrera] = useState('');
  const [semestre, setSemestre] = useState('6');
  const [biografia, setBiografia] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [modalidad, setModalidad] = useState<'Virtual' | 'Presencial'>('Virtual');
  const [ubicacion, setUbicacion] = useState('');
  const [asignaturas, setAsignaturas] = useState<string[]>([]);

  const [fechaBloque, setFechaBloque] = useState('');
  const [horaIni, setHoraIni] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [agregandoBloque, setAgregandoBloque] = useState(false);
  const [eliminandoBloque, setEliminandoBloque] = useState<string | null>(null);

  const headers = useCallback(
    (json = false) => ({
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const cargar = useCallback(async () => {
    if (!token) return;

    setCargando(true);
    setError('');

    try {
      const datosContexto = await apiRequest<ContextoTutorias>(
        '/api/tutorias/contexto',
        { headers: headers() }
      );
      setContexto(datosContexto);

      if (datosContexto.solicitud) {
        const datosPerfil = await apiRequest<{ monitor: Monitor }>(
          '/api/tutorias/perfil-monitor',
          { headers: headers() }
        );
        setPerfil(datosPerfil.monitor);

        const fuente = datosPerfil.monitor;
        setCarrera(fuente.carrera);
        setSemestre(String(fuente.semestre));
        setBiografia(fuente.biografia ?? '');
        setExperiencia(fuente.experiencia ?? '');
        setModalidad(fuente.modalidad);
        setUbicacion(fuente.ubicacion ?? '');
        setAsignaturas(fuente.asignaturas);
      }

      if (datosContexto.esMonitor) {
        const datosDisponibilidad = await apiRequest<{
          disponibilidad: DisponibilidadMonitor[];
        }>('/api/tutorias/disponibilidad', { headers: headers() });
        setDisponibilidad(datosDisponibilidad.disponibilidad ?? []);
      } else {
        setDisponibilidad([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar tu perfil de monitor.'
      );
    } finally {
      setCargando(false);
    }
  }, [token, headers]);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      router.push('/login');
      return;
    }

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    setFechaBloque(fechaLocalISO(manana));

    void cargar();
  }, [isLoading, user, token, router, cargar]);

  // Aprobación o rechazo de la postulación: actualizamos el perfil al instante.
  useEffect(() => {
    if (
      ultimaNotificacion?.tipo === 'MONITOR_APROBADO' ||
      ultimaNotificacion?.tipo === 'MONITOR_RECHAZADO'
    ) {
      void cargar();
    }
  }, [ultimaNotificacion, cargar]);

  const alternarAsignatura = (nombre: string) => {
    setAsignaturas((actuales) =>
      actuales.includes(nombre)
        ? actuales.filter((asignatura) => asignatura !== nombre)
        : [...actuales, nombre]
    );
  };

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError('');
    setExito('');

    if (carrera.trim().length < 2) {
      setError('Ingresa tu carrera.');
      return;
    }
    const numeroSemestre = Number(semestre);
    if (!Number.isInteger(numeroSemestre) || numeroSemestre < 1 || numeroSemestre > 12) {
      setError('El semestre debe estar entre 1 y 12.');
      return;
    }
    if (asignaturas.length === 0) {
      setError('Selecciona al menos una asignatura que dominas.');
      return;
    }
    if (modalidad === 'Presencial' && ubicacion.trim().length < 3) {
      setError('Indica el salón o la ubicación en el campus.');
      return;
    }

    setGuardando(true);
    try {
      const cuerpo = {
        carrera: carrera.trim(),
        semestre: numeroSemestre,
        biografia: biografia.trim(),
        experiencia: experiencia.trim(),
        modalidad,
        ubicacion: ubicacion.trim(),
        asignaturas,
      };

      if (contexto?.esMonitor) {
        await apiRequest('/api/tutorias/perfil-monitor', {
          method: 'PUT',
          headers: headers(true),
          body: JSON.stringify(cuerpo),
        });
        setExito('Perfil de monitor actualizado con éxito.');
      } else {
        await apiRequest('/api/tutorias/solicitud-monitor', {
          method: 'POST',
          headers: headers(true),
          body: JSON.stringify(cuerpo),
        });
        setExito(
          contexto?.solicitud
            ? 'Solicitud actualizada. Un administrador la revisará pronto.'
            : 'Solicitud enviada. Un administrador revisará tu perfil.'
        );
      }

      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar la información.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const agregarBloque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError('');
    setExito('');

    if (!fechaBloque) {
      setError('Selecciona una fecha para el bloque.');
      return;
    }

    setAgregandoBloque(true);
    try {
      await apiRequest('/api/tutorias/disponibilidad', {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ fecha: fechaBloque, horaIni, horaFin }),
      });
      setExito('Bloque de disponibilidad agregado.');
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo agregar el bloque.'
      );
    } finally {
      setAgregandoBloque(false);
    }
  };

  const eliminarBloque = async (id: string) => {
    if (!token) return;

    setError('');
    setExito('');
    setEliminandoBloque(id);

    try {
      await apiRequest(`/api/tutorias/disponibilidad/${id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      setExito('Bloque de disponibilidad eliminado.');
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo eliminar el bloque.'
      );
    } finally {
      setEliminandoBloque(null);
    }
  };

  if (isLoading || !user) return null;

  const esMonitor = Boolean(contexto?.esMonitor);
  const solicitudPendiente = Boolean(contexto?.solicitud && !contexto.esMonitor);

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {esMonitor ? 'Mi perfil de monitor' : 'Conviértete en monitor'}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              {esMonitor
                ? 'Administra tu perfil público y los bloques en los que puedes atender tutorías.'
                : 'Ayuda a otros estudiantes con las asignaturas que dominas y gana experiencia.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/tutorias')}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            ← Tutorías
          </button>
        </div>

        {solicitudPendiente && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-amber-800">
              Solicitud en revisión
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Un administrador debe aprobar tu perfil. Mientras tanto puedes
              actualizar tus datos.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="font-bold"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}
        {exito && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>{exito}</span>
            <button
              onClick={() => setExito('')}
              className="font-bold"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}

        {cargando ? (
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        ) : (
          <div className="space-y-6">
            {!esMonitor && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {PASOS.map((paso) => (
                  <div
                    key={paso.titulo}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0B4FC4]">
                      <Icono nombre={paso.icono} className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      {paso.titulo}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                      {paso.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-1 flex items-center gap-2">
                <Icono nombre="documento" className="h-5 w-5 text-[#0B4FC4]" />
                <h2 className="text-base font-bold text-slate-900">
                  {esMonitor ? 'Tu perfil público' : 'Cuéntanos sobre ti'}
                </h2>
              </div>
              <p className="mb-6 text-xs text-slate-500">
                Los campos con <span className="font-bold">*</span> son
                obligatorios.
              </p>

              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0B4FC4] text-lg font-black text-white">
                  {inicialesDe(user.nombre)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {user.nombre}
                  </h3>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      esMonitor
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border border-blue-200 bg-blue-50 text-[#0B4FC4]'
                    }`}
                  >
                    {esMonitor ? 'Monitor aprobado' : 'Solicitud de monitor'}
                  </span>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {user.correo}
                  </p>
                </div>
              </div>

              <form onSubmit={guardarPerfil} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Carrera *
                    </label>
                    <input
                      type="text"
                      value={carrera}
                      onChange={(e) => setCarrera(e.target.value)}
                      maxLength={120}
                      placeholder="Ej. Ingeniería de Sistemas"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Semestre actual *
                    </label>
                    <select
                      value={semestre}
                      onChange={(e) => setSemestre(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                    >
                      {Array.from({ length: 12 }, (_, indice) => indice + 1).map(
                        (numero) => (
                          <option key={numero} value={numero}>
                            {numero}.° semestre
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Asignaturas que dominas *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activas.map((asignatura) => {
                      const activa = asignaturas.includes(asignatura.nombre);
                      const color = colorDe(asignatura.nombre);
                      return (
                        <button
                          key={asignatura.id}
                          type="button"
                          onClick={() => alternarAsignatura(asignatura.nombre)}
                          aria-pressed={activa}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            activa
                              ? `${color.chip} ring-1 ring-inset`
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              activa ? color.punto : 'bg-slate-300'
                            }`}
                          />
                          {asignatura.nombre}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Toca las asignaturas que puedes explicar. Elige al menos una.
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Biografía
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {biografia.length}/300
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={300}
                    value={biografia}
                    onChange={(e) => setBiografia(e.target.value)}
                    placeholder="Cuéntales a los estudiantes cómo puedes ayudarlos."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Experiencia
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {experiencia.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={experiencia}
                    onChange={(e) => setExperiencia(e.target.value)}
                    placeholder="Monitorías previas, cursos, logros."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Modalidad de atención
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(['Virtual', 'Presencial'] as const).map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => setModalidad(opcion)}
                        className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                          modalidad === opcion
                            ? 'border-[#0B4FC4] bg-blue-50/50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`mt-0.5 ${
                            modalidad === opcion
                              ? 'text-[#0B4FC4]'
                              : 'text-slate-400'
                          }`}
                        >
                          <Icono
                            nombre={opcion === 'Virtual' ? 'video' : 'pin'}
                            className="h-5 w-5"
                          />
                        </span>
                        <span>
                          <span className="block text-xs font-bold text-slate-800">
                            {opcion}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {opcion === 'Virtual'
                              ? 'Acompañamiento en línea'
                              : 'En el campus de la UTB'}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {modalidad === 'Presencial' && (
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Salón / ubicación en campus *
                    </label>
                    <input
                      type="text"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      maxLength={120}
                      placeholder="Ej. Bloque C · Salón 204"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="rounded-xl bg-[#0B4FC4] px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {guardando
                      ? 'Guardando…'
                      : esMonitor
                        ? 'Guardar cambios'
                        : contexto?.solicitud
                          ? 'Actualizar solicitud'
                          : 'Enviar solicitud'}
                  </button>
                  {perfil?.aprobado && (
                    <span className="text-[11px] text-slate-500">
                      Tu perfil es visible para los estudiantes.
                    </span>
                  )}
                </div>
              </form>
            </div>

            {esMonitor && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-1 flex items-center gap-2">
                  <Icono nombre="calendario" className="h-5 w-5 text-[#0B4FC4]" />
                  <h2 className="text-base font-bold text-slate-900">
                    Disponibilidad
                  </h2>
                </div>
                <p className="mb-4 text-xs text-slate-500">
                  Publica los bloques en los que puedes atender tutorías.
                </p>

                <div className="mb-5 space-y-2">
                  {disponibilidad.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                      <p className="text-xs text-slate-500">
                        Aún no tienes bloques publicados. Los estudiantes no
                        podrán agendarte hasta que agregues uno.
                      </p>
                    </div>
                  )}
                  {disponibilidad.map((bloque) => (
                    <div
                      key={bloque.id}
                      className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-bold text-[#0B4FC4]">
                          {formatearChipHorario(bloque.fecha, bloque.horaIni)}
                        </p>
                        <p className="text-slate-600">
                          {formatearRango(bloque.horaIni, bloque.horaFin)}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            bloque.ocupado
                              ? 'bg-emerald-100 text-emerald-700'
                              : bloque.solicitado
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-50 text-[#0B4FC4]'
                          }`}
                        >
                          {bloque.ocupado
                            ? 'Agendado'
                            : bloque.solicitado
                              ? 'Con solicitud'
                              : 'Libre'}
                        </span>
                      </div>
                      <button
                        onClick={() => eliminarBloque(bloque.id)}
                        disabled={bloque.ocupado || eliminandoBloque === bloque.id}
                        className="self-end text-xs font-bold text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300 sm:self-auto"
                      >
                        {eliminandoBloque === bloque.id
                          ? 'Eliminando…'
                          : 'Eliminar'}
                      </button>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={agregarBloque}
                  className="space-y-3 border-t border-slate-100 pt-4"
                >
                  <h3 className="text-xs font-bold text-slate-700">
                    Agregar bloque
                  </h3>
                  <input
                    type="date"
                    value={fechaBloque}
                    min={fechaLocalISO(new Date())}
                    onChange={(e) => setFechaBloque(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500">
                        Hora inicio
                      </label>
                      <input
                        type="time"
                        value={horaIni}
                        onChange={(e) => setHoraIni(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500">
                        Hora fin
                      </label>
                      <input
                        type="time"
                        value={horaFin}
                        onChange={(e) => setHoraFin(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={agregandoBloque}
                    className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                  >
                    {agregandoBloque ? 'Agregando…' : '+ Agregar bloque'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}

function Icono({
  nombre,
  className = 'h-4 w-4',
}: {
  nombre: 'documento' | 'escudo' | 'calendario' | 'video' | 'pin';
  className?: string;
}) {
  const comunes = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };

  switch (nombre) {
    case 'documento':
      return (
        <svg {...comunes}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M8 13h8M8 17h5" />
        </svg>
      );
    case 'escudo':
      return (
        <svg {...comunes}>
          <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'calendario':
      return (
        <svg {...comunes}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'video':
      return (
        <svg {...comunes}>
          <rect x="2" y="6" width="13" height="12" rx="2" />
          <path d="m15 10 6-3v10l-6-3" />
        </svg>
      );
    case 'pin':
    default:
      return (
        <svg {...comunes}>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
  }
}
