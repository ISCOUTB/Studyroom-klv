'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { useRouter } from 'next/navigation';

export interface Sala {
  id: string;
  titulo: string;
  asignatura: 'Cálculo I' | 'Física I' | 'Álgebra Lineal' | 'Estadística' | 'Cálculo Integral';
  tema: string;
  descripcion: string;
  anfitriona: string;
  participantesActuales: number;
  cupoMaximo: number;
  estado: 'Activa' | 'Programada';
  imagenUrl: string;
}

const MOCK_SALAS: Sala[] = [
  {
    id: 'sala-1',
    titulo: 'Límites y continuidad',
    asignatura: 'Cálculo I',
    tema: 'Resolución de indeterminaciones y continuidad lateral',
    descripcion: 'Espacio de práctica para resolver la guía del segundo corte paso a paso.',
    anfitriona: 'Camila Torres',
    participantesActuales: 3,
    cupoMaximo: 10,
    estado: 'Activa',
    imagenUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'sala-2',
    titulo: 'Cinemática y movimiento',
    asignatura: 'Física I',
    tema: 'Leyes de Newton y planos inclinados',
    descripcion: 'Repaso de ejercicios complejos del taller práctico de física.',
    anfitriona: 'Andrés Pérez',
    participantesActuales: 8,
    cupoMaximo: 10,
    estado: 'Activa',
    imagenUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'sala-3',
    titulo: 'Repaso de integrales',
    asignatura: 'Cálculo Integral',
    tema: 'Integración por sustitución trigonométrica',
    descripcion: 'Preparación para el examen parcial. Traigan sus dudas.',
    anfitriona: 'Laura Méndez',
    participantesActuales: 10,
    cupoMaximo: 10,
    estado: 'Programada',
    imagenUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'
  }
];

export default function SalasPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [salas, setSalas] = useState<Sala[]>(MOCK_SALAS);
  const [searchQuery, setSearchQuery] = useState('');
  const [asignaturaFilter, setAsignaturaFilter] = useState('Todas');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario nueva sala
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaAsignatura, setNuevaAsignatura] = useState<any>('Cálculo I');
  const [nuevoTema, setNuevoTema] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<'Activa' | 'Programada'>('Activa');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleCrearSala = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevaSala: Sala = {
      id: 'sala-' + Date.now(),
      titulo: nuevoTitulo,
      asignatura: nuevaAsignatura,
      tema: nuevoTema,
      descripcion: nuevaDesc,
      anfitriona: user?.nombre || 'Anfitrión UTB',
      participantesActuales: 1,
      cupoMaximo: 10,
      estado: nuevoEstado,
      imagenUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80'
    };
    setSalas([nuevaSala, ...salas]);
    setIsModalOpen(false);
    setNuevoTitulo('');
    setNuevoTema('');
    setNuevaDesc('');
  };

  const filteredSalas = salas.filter((s) => {
    const matchesSearch = s.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.tema.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.asignatura.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAsignatura = asignaturaFilter === 'Todas' || s.asignatura === asignaturaFilter;
    const matchesEstado = estadoFilter === 'Todos' || s.estado === estadoFilter;
    return matchesSearch && matchesAsignatura && matchesEstado;
  });

  if (!user) return null;

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
                {user.rol === 'TUTOR' ? 'Estudiante / Monitor' : user.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Estudiante'}
              </span>
            </div>

            <button className="relative p-2 text-slate-600 hover:text-[#0B4FC4] transition-colors">
              🔔
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>

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
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#0B4FC4] tracking-tight mb-2">
            Salas de estudio
          </h1>
          <p className="text-slate-600 text-sm">
            Encuentra tu grupo y aprende en equipo.
          </p>
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
                <option value="Cálculo I">Cálculo I</option>
                <option value="Física I">Física I</option>
                <option value="Álgebra Lineal">Álgebra Lineal</option>
                <option value="Estadística">Estadística</option>
                <option value="Cálculo Integral">Cálculo Integral</option>
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
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto px-5 py-2.5 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>+</span>
              <span>Crear Sala de Estudio</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Salas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSalas.map((sala) => {
            const isFull = sala.participantesActuales >= sala.cupoMaximo;
            return (
              <div
                key={sala.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                    <img
                      src={sala.imagenUrl}
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
                      Anfitrión/a: <span className="text-slate-800 font-semibold">{sala.anfitriona}</span>
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 mt-auto">
                  <div className="flex items-center justify-between mb-4 pt-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      👥 {sala.participantesActuales}/{sala.cupoMaximo} participantes
                    </span>
                  </div>

                  {isFull ? (
                    <button
                      disabled
                      className="w-full py-3 bg-slate-200 text-slate-500 font-bold rounded-xl text-xs cursor-not-allowed"
                    >
                      Cupo lleno
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/salas/${sala.id}`)}
                      className="w-full py-3 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs shadow-sm shadow-blue-500/20 transition-all text-center"
                    >
                      Unirse
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal Crear Sala */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-[#0B4FC4]">Crear Nueva Sala de Estudio</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearSala} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Título de la Sala</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Derivadas y optimización"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Asignatura</label>
                  <select
                    value={nuevaAsignatura}
                    onChange={(e) => setNuevaAsignatura(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  >
                    <option value="Cálculo I">Cálculo I</option>
                    <option value="Física I">Física I</option>
                    <option value="Álgebra Lineal">Álgebra Lineal</option>
                    <option value="Estadística">Estadística</option>
                    <option value="Cálculo Integral">Cálculo Integral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estado</label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  >
                    <option value="Activa">Activa</option>
                    <option value="Programada">Programada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tema Principal</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Máximos y mínimos en problemas aplicados"
                  value={nuevoTema}
                  onChange={(e) => setNuevoTema(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Descripción Breve</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe el objetivo de la sesión y materiales recomendados..."
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all"
                >
                  Crear Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
