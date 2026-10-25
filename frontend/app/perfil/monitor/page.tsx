'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { apiRequest } from '@/lib/api';
import { ASIGNATURAS, inicialesDe } from '@/lib/salas';
import {
  type ContextoTutorias,
  type DisponibilidadMonitor,
  type Monitor,
  fechaLocalISO,
  formatearFecha,
  formatearHora,
} from '@/lib/tutorias';

export default function PerfilMonitorPage() {
  const { user, token, isLoading, logout } = useAuth();
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
  const [modalidad, setModalidad] = useState<'Virtual' | 'Presencial'>('Virtual');
  const [ubicacion, setUbicacion] = useState('');
  const [asignaturas, setAsignaturas] = useState<string[]>([]);
  const [nuevaAsignatura, setNuevaAsignatura] = useState('');

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
      const datosContexto = await apiRequest<ContextoTutorias>('/api/tutorias/contexto', {
        headers: headers(),
      });
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
        err instanceof Error ? err.message : 'No se pudo cargar tu perfil de monitor.'
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

    cargar();
  }, [isLoading, user, token, router, cargar]);

  const agregarAsignatura = (valor: string) => {
    const asignatura = valor.trim();
    if (!asignatura || asignaturas.includes(asignatura)) return;
    setAsignaturas([...asignaturas, asignatura]);
    setNuevaAsignatura('');
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
      setError('Agrega al menos una asignatura que dominas.');
      return;
    }
    if (modalidad === 'Presencial' && ubicacion.trim().length < 3) {
      setError('Indica el salón o la ubicación en el campus.');
      return;
    }

    setGuardando(true);
    try {
      if (contexto?.esMonitor) {
        await apiRequest('/api/tutorias/perfil-monitor', {
          method: 'PUT',
          headers: headers(true),
          body: JSON.stringify({
            carrera: carrera.trim(),
            semestre: numeroSemestre,
            biografia: biografia.trim(),
            modalidad,
            ubicacion: ubicacion.trim(),
            asignaturas,
          }),
        });
        setExito('Perfil de monitor actualizado con éxito.');
      } else {
        await apiRequest('/api/tutorias/solicitud-monitor', {
          method: 'POST',
          headers: headers(true),
          body: JSON.stringify({
            carrera: carrera.trim(),
            semestre: numeroSemestre,
            biografia: biografia.trim(),
            modalidad,
            ubicacion: ubicacion.trim(),
            asignaturas,
          }),
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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <UTBLogo className="h-9 sm:h-10 shrink-0" />
            <span className="hidden md:inline font-bold text-slate-800 text-lg border-l border-slate-200 pl-6">
              Campus Collaborative Study
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/salas')}
              className="text-xs font-semibold text-slate-600 hover:text-[#0B4FC4] px-2 py-2"
            >
              ← <span className="hidden sm:inline">Salas</span>
            </button>
            <button
              onClick={() => router.push('/tutorias')}
              className="text-xs font-semibold text-[#0B4FC4] hover:underline px-2 py-2"
            >
              Tutorías
            </button>
            {contexto?.esAdmin && (
              <button
                onClick={() => router.push('/admin/monitores')}
                className="hidden sm:inline text-xs font-semibold text-[#0B4FC4] hover:underline px-2 py-2"
              >
                Monitores
              </button>
            )}
            <button
              onClick={logout}
              className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#0B4FC4] tracking-tight mb-2">
            {esMonitor ? 'Mi perfil de monitor' : 'Quiero ser monitor'}
          </h1>
          <p className="text-slate-600 text-sm">
            {esMonitor
              ? 'Administra tu perfil público y los bloques en los que puedes atender tutorías.'
              : 'Comparte tu perfil con estudiantes que necesitan apoyo académico.'}
          </p>
        </div>

        {solicitudPendiente && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-amber-800">
              Solicitud en revisión
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Un administrador debe aprobar tu perfil. Mientras tanto puedes actualizar tus datos.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold" aria-label="Cerrar">✕</button>
          </div>
        )}
        {exito && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start justify-between gap-3">
            <span>{exito}</span>
            <button onClick={() => setExito('')} className="font-bold" aria-label="Cerrar">✕</button>
          </div>
        )}

        {cargando ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((item) => (
              <div key={item} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse h-96" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                Perfil público
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Esta información será visible para los estudiantes que buscan tutorías.
              </p>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-blue-100 text-[#0B4FC4] flex items-center justify-center font-black text-xl border-2 border-[#0B4FC4]">
                  {inicialesDe(user.nombre)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{user.nombre}</h3>
                  <div className="inline-block bg-blue-50 text-[#0B4FC4] font-bold text-[11px] px-3 py-1 rounded-full my-1 border border-blue-200">
                    {esMonitor ? 'Monitor aprobado' : 'Solicitud de monitor'}
                  </div>
                  <p className="text-xs text-slate-500">{user.correo}</p>
                </div>
              </div>

              <form onSubmit={guardarPerfil} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Carrera
                    </label>
                    <input
                      type="text"
                      value={carrera}
                      onChange={(e) => setCarrera(e.target.value)}
                      maxLength={120}
                      placeholder="Ej. Ingeniería de Sistemas"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Semestre actual
                    </label>
                    <select
                      value={semestre}
                      onChange={(e) => setSemestre(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                    >
                      {Array.from({ length: 12 }, (_, indice) => indice + 1).map((numero) => (
                        <option key={numero} value={numero}>
                          {numero}.° semestre
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Asignaturas que dominas
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[42px]">
                    {asignaturas.length === 0 && (
                      <span className="text-xs text-slate-400 px-1 py-0.5">
                        Agrega al menos una asignatura.
                      </span>
                    )}
                    {asignaturas.map((asignatura) => (
                      <span
                        key={asignatura}
                        className="bg-blue-100 text-[#0B4FC4] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        {asignatura}
                        <button
                          type="button"
                          onClick={() =>
                            setAsignaturas(asignaturas.filter((item) => item !== asignatura))
                          }
                          className="text-blue-500 hover:text-red-600 font-bold"
                          aria-label={`Quitar ${asignatura}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Añadir asignatura…"
                      value={nuevaAsignatura}
                      onChange={(e) => setNuevaAsignatura(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          agregarAsignatura(nuevaAsignatura);
                        }
                      }}
                      maxLength={60}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                    />
                    <button
                      type="button"
                      onClick={() => agregarAsignatura(nuevaAsignatura)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      Agregar
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ASIGNATURAS.filter((asignatura) => !asignaturas.includes(asignatura)).map(
                      (asignatura) => (
                        <button
                          key={asignatura}
                          type="button"
                          onClick={() => agregarAsignatura(asignatura)}
                          className="text-[10px] font-semibold text-slate-500 hover:text-[#0B4FC4] bg-slate-100 hover:bg-blue-50 px-2 py-1 rounded-lg"
                        >
                          + {asignatura}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-600">
                      Descripción / biografía
                    </label>
                    <span className="text-[10px] text-slate-400">{biografia.length}/300</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={biografia}
                    onChange={(e) => setBiografia(e.target.value)}
                    placeholder="Cuéntales a los estudiantes cómo puedes ayudarlos."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Modalidad de atención
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['Virtual', 'Presencial'] as const).map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => setModalidad(opcion)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          modalidad === opcion
                            ? 'border-[#0B4FC4] bg-blue-50/40'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <span className="text-lg">{opcion === 'Virtual' ? '💻' : '📍'}</span>
                        <p className="font-bold text-xs text-slate-800 mt-1">{opcion}</p>
                        <p className="text-[10px] text-slate-500">
                          {opcion === 'Virtual'
                            ? 'Acompañamiento en línea'
                            : 'En campus de la UTB'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {modalidad === 'Presencial' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Salón / ubicación en campus
                    </label>
                    <input
                      type="text"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      maxLength={120}
                      placeholder="Ej. Bloque C · Salón 204"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full py-3 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {guardando
                    ? 'Guardando…'
                    : esMonitor
                      ? 'Guardar perfil'
                      : contexto?.solicitud
                        ? 'Actualizar solicitud'
                        : 'Enviar solicitud de monitor'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-5 space-y-6">
              {esMonitor ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                    Disponibilidad
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Publica los bloques en los que puedes atender tutorías.
                  </p>

                  <div className="space-y-2 mb-4">
                    {disponibilidad.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                        <p className="text-xs text-slate-500">
                          Aún no tienes bloques publicados. Los estudiantes no podrán agendarte hasta que agregues uno.
                        </p>
                      </div>
                    )}
                    {disponibilidad.map((bloque) => (
                      <div
                        key={bloque.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#0B4FC4]">
                            {formatearFecha(bloque.fecha)}
                          </p>
                          <p className="text-slate-600">
                            {formatearHora(bloque.horaIni)} – {formatearHora(bloque.horaFin)}
                          </p>
                          <span
                            className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                          className="text-red-500 hover:text-red-700 font-bold text-xs disabled:text-slate-300 disabled:cursor-not-allowed self-end sm:self-auto"
                        >
                          {eliminandoBloque === bloque.id ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={agregarBloque} className="border-t border-slate-100 pt-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-700">
                      Agregar bloque
                    </h3>
                    <input
                      type="date"
                      value={fechaBloque}
                      min={fechaLocalISO(new Date())}
                      onChange={(e) => setFechaBloque(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Hora inicio
                        </label>
                        <input
                          type="time"
                          value={horaIni}
                          onChange={(e) => setHoraIni(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Hora fin
                        </label>
                        <input
                          type="time"
                          value={horaFin}
                          onChange={(e) => setHoraFin(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={agregandoBloque}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-60"
                    >
                      {agregandoBloque ? 'Agregando…' : '+ Agregar bloque'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="text-3xl mb-3">🎓</div>
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                    ¿Cómo funciona?
                  </h2>
                  <ol className="space-y-3 text-xs text-slate-600">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-[#0B4FC4] flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                      Envía tu perfil con las asignaturas que dominas.
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-[#0B4FC4] flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                      Un administrador revisa y aprueba tu solicitud.
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-[#0B4FC4] flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                      Publica tus bloques de disponibilidad y recibe solicitudes.
                    </li>
                  </ol>
                  <button
                    onClick={() => router.push('/tutorias')}
                    className="w-full mt-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Volver a tutorías
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
