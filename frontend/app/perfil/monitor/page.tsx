'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { useRouter } from 'next/navigation';

export default function PerfilMonitorPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [nombre, setNombre] = useState(user?.nombre || 'Valentina Rojas');
  const [carrera, setCarrera] = useState('Ingeniería de Sistemas y Computación');
  const [semestre, setSemestre] = useState('7.° semestre');
  const [biografia, setografia] = useState(
    'Estudiante de ingeniería. Explico conceptos paso a paso y conecto la teoría con ejercicios prácticos.'
  );
  const [modalidad, setModalidad] = useState<'Virtual' | 'Presencial'>('Presencial');
  const [ubicacion, setUbicacion] = useState('Bloque C · Salón 204');
  const [asignaturas, setAsignaturas] = useState<string[]>(['Cálculo I', 'Física I', 'Álgebra Lineal']);
  const [nuevaAsignatura, setNuevaAsignatura] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Disponibilidad semanal simulada
  const [disponibilidad, setDisponibilidad] = useState([
    { dia: 'Lun 23', hora: '09:00 - 10:00' },
    { dia: 'Mié 25', hora: '14:00 - 15:00' },
    { dia: 'Vie 27', hora: '11:00 - 12:00' },
  ]);
  const [fechaBloque, setFechaBloque] = useState('');
  const [horaIni, setHoraIni] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('¡Disponibilidad y perfil de monitor actualizados con éxito!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const agregarBloque = () => {
    if (!fechaBloque) return;
    setDisponibilidad([...disponibilidad, { dia: fechaBloque, hora: `${horaIni} - ${horaFin}` }]);
    setFechaBloque('');
  };

  // Redirección en cliente (no durante el render) para permitir el prerender.
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Barra superior */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <UTBLogo className="h-10" />
            <span className="hidden md:inline font-bold text-slate-800 text-lg border-l border-slate-200 pl-6">
              Campus Collaborative Study
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/salas')}
              className="text-xs font-semibold text-[#0B4FC4] hover:underline"
            >
              ← Volver a Salas
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
            Mi perfil de monitor
          </h1>
          <p className="text-slate-600 text-sm">
            Administra tu perfil público y la disponibilidad de tus tutorías.
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl font-medium">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Perfil Público (Izquierda) */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-1">
              Perfil público
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Esta información será visible para los estudiantes que buscan tutorías.
            </p>

            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                  alt="Monitor"
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#0B4FC4]"
                />
                <button className="absolute bottom-0 right-0 p-1 bg-[#0B4FC4] text-white rounded-full text-[10px] shadow-sm">
                  📷
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{nombre}</h3>
                <div className="inline-block bg-blue-50 text-[#0B4FC4] font-bold text-[11px] px-3 py-1 rounded-full my-1 border border-blue-200">
                  Estudiante / Monitor
                </div>
                <p className="text-xs text-slate-500">{carrera} · {semestre}</p>
                <p className="text-xs text-slate-400">Cartagena, Bolívar</p>
              </div>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Carrera(s)</label>
                  <select
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  >
                    <option>Ingeniería de Sistemas y Computación</option>
                    <option>Ingeniería Civil</option>
                    <option>Ingeniería Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Semestre actual</label>
                  <select
                    value={semestre}
                    onChange={(e) => setSemestre(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  >
                    <option>5.° semestre</option>
                    <option>6.° semestre</option>
                    <option>7.° semestre</option>
                    <option>8.° semestre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Asignaturas que domina</label>
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[42px]">
                  {asignaturas.map((asig, idx) => (
                    <span key={idx} className="bg-blue-100 text-[#0B4FC4] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                      {asig}
                      <button
                        type="button"
                        onClick={() => setAsignaturas(asignaturas.filter((_, i) => i !== idx))}
                        className="text-blue-500 hover:text-red-600 font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Añadir asignatura..."
                    value={nuevaAsignatura}
                    onChange={(e) => setNuevaAsignatura(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (nuevaAsignatura && !asignaturas.includes(nuevaAsignatura)) {
                        setAsignaturas([...asignaturas, nuevaAsignatura]);
                        setNuevaAsignatura('');
                      }
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-600">Descripción / biografía</label>
                  <span className="text-[10px] text-slate-400">{biografia.length}/300</span>
                </div>
                <textarea
                  maxLength={300}
                  rows={3}
                  value={biografia}
                  onChange={(e) => setografia(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                Guardar Perfil
              </button>
            </form>
          </div>

          {/* Modalidad y Disponibilidad (Derecha) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Modalidad de atención */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                Modalidad de atención
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Selecciona cómo prefieres realizar tus tutorías.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div
                  onClick={() => setModalidad('Virtual')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    modalidad === 'Virtual' ? 'border-[#0B4FC4] bg-blue-50/30' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl">💻</span>
                    <input type="radio" checked={modalidad === 'Virtual'} onChange={() => setModalidad('Virtual')} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Virtual</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Videollamada integrada en la plataforma</p>
                  </div>
                </div>

                <div
                  onClick={() => setModalidad('Presencial')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    modalidad === 'Presencial' ? 'border-[#0B4FC4] bg-blue-50/30' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl">📍</span>
                    <input type="radio" checked={modalidad === 'Presencial'} onChange={() => setModalidad('Presencial')} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Presencial</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">En campus de la UTB</p>
                  </div>
                </div>
              </div>

              {modalidad === 'Presencial' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Salón / ubicación en campus</label>
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Ej. Bloque C · Salón 204"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                </div>
              )}
            </div>

            {/* Disponibilidad semanal */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                Disponibilidad semanal
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Marca los bloques en los que puedes atender tutorías.
              </p>

              <div className="space-y-2 mb-4">
                {disponibilidad.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#0B4FC4]">{d.dia}</span>
                      <span className="text-slate-600">{d.hora}</span>
                    </div>
                    <button
                      onClick={() => setDisponibilidad(disponibilidad.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700">Agregar bloque de disponibilidad</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Lun 30"
                    value={fechaBloque}
                    onChange={(e) => setFechaBloque(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                  <input
                    type="text"
                    placeholder="09:00"
                    value={horaIni}
                    onChange={(e) => setHoraIni(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                  <input
                    type="text"
                    placeholder="10:00"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                  />
                </div>
                <button
                  type="button"
                  onClick={agregarBloque}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  + Agregar bloque
                </button>
              </div>

              <button
                onClick={handleGuardar}
                className="w-full mt-6 py-3 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>📅</span>
                <span>Guardar Disponibilidad</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
