'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { useRouter } from 'next/navigation';

export default function AdminMonitoresPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState([
    { id: '1', nombre: 'Valentina Rojas', correo: 'v.rojas@utb.edu.co', carrera: 'Ingeniería de Sistemas', semestre: '7.°', estado: 'Pendiente' },
    { id: '2', nombre: 'Carlos Mendoza', correo: 'c.mendoza@utb.edu.co', carrera: 'Ingeniería Civil', semestre: '6.°', estado: 'Pendiente' },
  ]);

  if (!user || user.rol !== 'ADMINISTRADOR') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center max-w-md w-full">
          <div className="text-4xl mb-3">⛔</div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Acceso Denegado</h2>
          <p className="text-xs text-slate-500 mb-6">
            Esta sección es exclusiva para administradores de la plataforma. Si eres estudiante, no tienes permisos para acceder.
          </p>
          <button
            onClick={() => router.push('/salas')}
            className="w-full py-2.5 bg-[#0B4FC4] text-white font-bold rounded-xl text-xs"
          >
            Volver a Salas de Estudio
          </button>
        </div>
      </div>
    );
  }

  const aprobar = (id: string) => {
    setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, estado: 'Aprobado' } : s));
  };

  const rechazar = (id: string) => {
    setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, estado: 'Rechazado' } : s));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <UTBLogo className="h-10" />
            <span className="font-bold text-slate-800 text-lg border-l border-slate-200 pl-6">
              Panel de Administración
            </span>
          </div>
          <button onClick={logout} className="text-xs font-semibold text-red-600">Cerrar sesión</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-black text-[#0B4FC4] mb-2">Aprobación de Monitores</h1>
        <p className="text-slate-600 text-sm mb-8">Revisa y aprueba las solicitudes de estudiantes para convertirse en monitores.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-sm text-slate-800">Solicitudes pendientes</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {solicitudes.map((sol) => (
              <div key={sol.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-[#0B4FC4] rounded-full flex items-center justify-center font-bold text-sm">
                    {sol.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">{sol.nombre}</h3>
                    <p className="text-xs text-slate-500">{sol.correo} · {sol.carrera} ({sol.semestre})</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    sol.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                    sol.estado === 'Rechazado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {sol.estado}
                  </span>

                  {sol.estado === 'Pendiente' && (
                    <>
                      <button
                        onClick={() => aprobar(sol.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => rechazar(sol.id)}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs transition-colors"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
