'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import {
  ASIGNATURAS,
  type Asignatura,
  type Sala,
  imagenDeAsignatura,
} from '@/lib/salas';

export default function SalasPage() {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();

  const [salas, setSalas] = useState<Sala[]>([]);
  const [loadingSalas, setLoadingSalas] = useState(true);
  const [errorSalas, setErrorSalas] = useState('');
  const [accionError, setAccionError] = useState('');
  const [uniendoId, setUniendoId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [asignaturaFilter, setAsignaturaFilter] = useState('Todas');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario nueva sala
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaAsignatura, setNuevaAsignatura] = useState<Asignatura>('Cálculo I');
  const [nuevoTema, setNuevoTema] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<'Activa' | 'Programada'>('Activa');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState('');

  const cargarSalas = useCallback(async () => {
    if (!token) return;

    setLoadingSalas(true);
    setErrorSalas('');

    try {
      const data = await apiRequest<{ salas: Sala[] }>('/api/salas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSalas(data.salas ?? []);
    } catch (err) {
      setErrorSalas(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las salas de estudio.'
      );
    } finally {
      setLoadingSalas(false);
    }
  }, [token]);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      router.push('/login');
      return;
    }

    cargarSalas();
  }, [isLoading, user, token, router, cargarSalas]);

  const resetFormulario = () => {
    setNuevoTitulo('');
    setNuevaAsignatura('Cálculo I');
    setNuevoTema('');
    setNuevaDesc('');
    setNuevoEstado('Activa');
    setModalError('');
  };

  const handleCrearSala = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!token) return;

    if (nuevoTitulo.trim().length < 3) {
      setModalError('El título debe tener al menos 3 caracteres.');
      return;
    }
    if (nuevoTema.trim().length < 3) {
      setModalError('El tema debe tener al menos 3 caracteres.');
      return;
    }
    if (nuevaDesc.trim().length < 5) {
      setModalError('La descripción debe tener al menos 5 caracteres.');
      return;
    }

    setCreating(true);
    try {
      const data = await apiRequest<{ message: string; sala: Sala }>('/api/salas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titulo: nuevoTitulo.trim(),
          asignatura: nuevaAsignatura,
          tema: nuevoTema.trim(),
          descripcion: nuevaDesc.trim(),
          estado: nuevoEstado,
        }),
      });

      setSalas((prev) => [data.sala, ...prev]);
      setIsModalOpen(false);
      resetFormulario();
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la sala de estudio.'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleEntrarSala = async (sala: Sala) => {
    setAccionError('');

    if (sala.participando) {
      router.push(`/salas/${sala.id}`);
      return;
    }

    if (!token) return;

    setUniendoId(sala.id);
    try {
      await apiRequest(`/api/salas/${sala.id}/unirse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      setSalas((prev) =>
        prev.map((item) =>
          item.id === sala.id
            ? {
                ...item,
                participando: true,
                participantesActuales: Math.min(
                  item.cupoMaximo,
                  item.participantesActuales + 1
                ),
              }
            : item
        )
      );

      router.push(`/salas/${sala.id}`);
    } catch (err) {
      setAccionError(
        err instanceof Error ? err.message : 'No se pudo entrar a la sala.'
      );
    } finally {
      setUniendoId(null);
    }
  };

  const filteredSalas = salas.filter((s) => {
    const matchesSearch =
      s.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tema.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.asignatura.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAsignatura =
      asignaturaFilter === 'Todas' || s.asignatura === asignaturaFilter;
    const matchesEstado = estadoFilter === 'Todos' || s.estado === estadoFilter;
    return matchesSearch && matchesAsignatura && matchesEstado;
  });

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Barra superior (Navbar referencia visual 2) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <UTBLogo className="h-10" />
            <span className="hidden md:inline font-bold text-slate-800 text-lg border-l border-slate-200 pl-6">
              Campus Collaborative Study
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-7 h-7 bg-[#0B4FC4] text-white rounded-full flex items-center justify-center font-bold text-xs">
                {user.nombre.substring(0, 2).toUpperCase()}
              </span>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                {user.rol === 'TUTOR'
                  ? 'Estudiante / Monitor'
                  : user.rol === 'ADMINISTRADOR'
                    ? 'Administrador'
                    : 'Estudiante'}
              </span>
            </div>

            <button
              onClick={() => router.push('/tutorias')}
              className="text-xs font-semibold text-[#0B4FC4] hover:underline px-2 py-2"
            >
              📅 <span className="hidden sm:inline">Tutorías</span>
            </button>

            <NotificationBell />

            <button
              onClick={logout}
              className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#0B4FC4] tracking-tight mb-2">
              Salas de estudio
            </h1>
            <p className="text-slate-600 text-sm">
              Encuentra tu grupo y aprende en equipo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {user.rol === 'TUTOR' && (
              <button
                onClick={() => router.push('/perfil/monitor')}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:border-[#0B4FC4] text-[#0B4FC4] font-semibold rounded-xl text-xs transition-colors"
              >
                Mi perfil de monitor
              </button>
            )}
            {user.rol === 'ADMINISTRADOR' && (
              <button
                onClick={() => router.push('/admin/monitores')}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:border-[#0B4FC4] text-[#0B4FC4] font-semibold rounded-xl text-xs transition-colors"
              >
                Panel de monitores
              </button>
            )}
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por tema o asignatura…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
              <span className="text-slate-400">📚 Asignatura:</span>
              <select
                value={asignaturaFilter}
                onChange={(e) => setAsignaturaFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Todas">Todas las asignaturas</option>
                {ASIGNATURAS.map((asignatura) => (
                  <option key={asignatura} value={asignatura}>
                    {asignatura}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
              <span className="text-slate-400">⚡ Estado:</span>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Activa">Activa</option>
                <option value="Programada">Programada</option>
              </select>
            </div>

            <button
              onClick={() => {
                setModalError('');
                setIsModalOpen(true);
              }}
              className="w-full md:w-auto px-5 py-2.5 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>+</span>
              <span>Crear Sala de Estudio</span>
            </button>
          </div>
        </div>

        {accionError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {accionError}
          </div>
        )}

        {/* Tarjetas de Salas */}
        {loadingSalas ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse"
              >
                <div className="h-40 w-full bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-2/3 rounded bg-slate-200" />
                  <div className="h-3 w-full rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
                <div className="p-5 pt-0">
                  <div className="h-10 w-full rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : errorSalas ? (
          <div className="rounded-2xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              No pudimos cargar las salas
            </h2>
            <p className="text-sm text-slate-500 mb-5">{errorSalas}</p>
            <button
              onClick={cargarSalas}
              className="px-5 py-2.5 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-semibold rounded-xl text-xs transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : filteredSalas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-4xl mb-3">📚</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              {salas.length === 0
                ? 'Todavía no hay salas de estudio'
                : 'No encontramos salas con esos filtros'}
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              {salas.length === 0
                ? 'Crea la primera sala y empieza a estudiar en equipo.'
                : 'Prueba con otra asignatura, otro estado o borra la búsqueda.'}
            </p>
            {salas.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-semibold rounded-xl text-xs transition-all"
              >
                + Crear la primera sala
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSalas.map((sala) => {
              const isFull = sala.participantesActuales >= sala.cupoMaximo;
              const uniendo = uniendoId === sala.id;
              return (
                <div
                  key={sala.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                      <img
                        src={imagenDeAsignatura(sala.asignatura)}
                        alt={sala.titulo}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="bg-white/90 backdrop-blur-xs text-[#0B4FC4] font-bold text-[11px] px-3 py-1 rounded-full shadow-xs">
                          📖 {sala.asignatura}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span
                          className={`text-[11px] font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1 ${
                            sala.estado === 'Activa'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                          {sala.estado}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight">
                        {sala.titulo}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-1">
                        {sala.tema}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mb-4">
                        Anfitrión/a:{' '}
                        <span className="text-slate-800 font-semibold">
                          {sala.anfitrion.nombre}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-slate-100 mt-auto">
                    <div className="flex items-center justify-between mb-4 pt-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        👥 {sala.participantesActuales}/{sala.cupoMaximo} participantes
                      </span>
                    </div>

                    {isFull && !sala.participando ? (
                      <button
                        disabled
                        className="w-full py-3 bg-slate-200 text-slate-500 font-bold rounded-xl text-xs cursor-not-allowed"
                      >
                        Cupo lleno
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEntrarSala(sala)}
                        disabled={uniendo}
                        className="w-full py-3 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs shadow-sm shadow-blue-500/20 transition-all text-center disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {uniendo
                          ? 'Entrando…'
                          : sala.participando
                            ? 'Entrar'
                            : 'Unirse'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Crear Sala */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-[#0B4FC4]">
                Crear Nueva Sala de Estudio
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetFormulario();
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearSala} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Título de la Sala
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Ej. Derivadas y optimización"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Asignatura
                  </label>
                  <select
                    value={nuevaAsignatura}
                    onChange={(e) =>
                      setNuevaAsignatura(e.target.value as Asignatura)
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  >
                    {ASIGNATURAS.map((asignatura) => (
                      <option key={asignatura} value={asignatura}>
                        {asignatura}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Estado
                  </label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) =>
                      setNuevoEstado(e.target.value as 'Activa' | 'Programada')
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  >
                    <option value="Activa">Activa</option>
                    <option value="Programada">Programada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tema Principal
                </label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  placeholder="Ej. Máximos y mínimos en problemas aplicados"
                  value={nuevoTema}
                  onChange={(e) => setNuevoTema(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Descripción Breve
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={600}
                  placeholder="Describe el objetivo de la sesión y materiales recomendados..."
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
              </div>

              {modalError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
                >
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetFormulario();
                  }}
                  disabled={creating}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors disabled:opacity-70"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creando…' : 'Crear Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
