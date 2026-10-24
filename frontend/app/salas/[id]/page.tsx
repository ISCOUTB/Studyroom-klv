'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { useParams, useRouter } from 'next/navigation';

interface Mensaje {
  id: string;
  autor: string;
  iniciales: string;
  tiempo: string;
  texto: string;
}

const MOCK_MENSAJES_INICIALES: Mensaje[] = [
  { id: '1', autor: 'Camila Torres', iniciales: 'CT', tiempo: '10:41', texto: '¿Cómo resolvemos el límite?' },
  { id: '2', autor: 'Andrés Pérez', iniciales: 'AP', tiempo: '10:42', texto: 'Revisemos juntos la expresión en la pizarra.' },
  { id: '3', autor: 'Laura Méndez', iniciales: 'LM', tiempo: '10:43', texto: '¡Perfecto! Ahora tiene más sentido.' },
  { id: '4', autor: 'María López', iniciales: 'ML', tiempo: '10:44', texto: 'Sí, la asíntota horizontal es y = 2.' },
];

export default function SalaEnVivoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const salaId = params?.id || 'sala-1';

  const [activeTab, setActiveTab] = useState<'chat' | 'participantes' | 'materiales'>('chat');
  const [mensajes, setMensajes] = useState<Mensaje[]>(MOCK_MENSAJES_INICIALES);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [cronometro, setCronometro] = useState(2562); // 42:42 en segundos
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Cronómetro de sala
  useEffect(() => {
    const timer = setInterval(() => {
      setCronometro((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulación de reconexión y sincronización < 2s
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${pad(Math.floor(m / 60) > 0 ? Math.floor(m / 60) : 0)}:${pad(m % 60)}:${pad(s)}`;
  };

  const handleEnviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    const now = new Date();
    const tiempoStr = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`;

    const msg: Mensaje = {
      id: String(Date.now()),
      autor: user?.nombre || 'Tú',
      iniciales: (user?.nombre || 'T U').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase(),
      tiempo: tiempoStr,
      texto: nuevoMensaje,
    };

    setMensajes((prev) => [...prev, msg]);
    setNuevoMensaje('');
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Encabezado Sala en Vivo (Referencia visual 5) */}
      <header className="bg-slate-800 border-b border-slate-700 h-20 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-6">
          <UTBLogo className="h-9" />
          <div className="hidden md:flex items-center gap-3 border-l border-slate-700 pl-6">
            <span className="p-2 bg-slate-700 text-blue-400 rounded-lg">📖</span>
            <div>
              <h2 className="font-bold text-sm text-white">Cálculo I · Límites al infinito</h2>
              <p className="text-[11px] text-slate-400">Campus Collaborative Study</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-xl border border-slate-700 text-xs font-mono">
            <span>⏱️</span>
            <span className="text-emerald-400 font-bold">{formatTime(cronometro)}</span>
          </div>

          <button
            onClick={() => router.push('/salas')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>➔</span>
            <span>Abandonar Sala</span>
          </button>
        </div>
      </header>

      {/* Contenido de la Sala */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Zona principal (Video / Pizarra marcadores de posición) */}
        <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-200">Videollamada y Pizarra Activas</span>
            </div>
            <span className="text-slate-400">4 participantes conectados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[350px]">
            {/* Videollamada marcador */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
              <div className="absolute top-3 left-3 bg-slate-900/80 px-3 py-1 rounded-lg text-xs font-medium text-slate-300">
                📹 Videollamada (Jitsi / WebRTC Próximamente)
              </div>
              <div className="w-20 h-20 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-3xl font-bold mb-3 border border-blue-500/30">
                👥
              </div>
              <h3 className="font-bold text-sm text-slate-200">Sala de Estudio Simultáneo</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                La transmisión de video y audio en tiempo real se habilitará con el servicio de terceros integrado.
              </p>
            </div>

            {/* Pizarra marcador */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
              <div className="absolute top-3 left-3 bg-slate-900/80 px-3 py-1 rounded-lg text-xs font-medium text-slate-300">
                ✏️ Pizarra Colaborativa (tldraw Próximamente)
              </div>
              <div className="w-20 h-20 bg-emerald-600/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl font-bold mb-3 border border-emerald-500/30">
                📐
              </div>
              <h3 className="font-bold text-sm text-slate-200">Espacio de Ejercicios en Conjunto</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Resolución simultánea de fórmulas y gráficas matemáticas sincronizadas en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Panel Lateral: Chat | Participantes | Materiales (Referencia visual 5 derecha) */}
        <div className="w-full lg:w-96 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col h-[450px] lg:h-auto">
          <div className="p-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-full">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'chat' ? 'bg-[#0B4FC4] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('participantes')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'participantes' ? 'bg-[#0B4FC4] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Participantes (4)
              </button>
              <button
                onClick={() => setActiveTab('materiales')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'materiales' ? 'bg-[#0B4FC4] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Materiales (2)
              </button>
            </div>
          </div>

          {/* Contenido de la pestaña activa */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {mensajes.map((m) => {
                  const isMe = m.autor === user.nombre;
                  return (
                    <div key={m.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="w-7 h-7 bg-[#0B4FC4] text-white rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">
                        {m.iniciales}
                      </div>
                      <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold text-slate-300">{m.autor}</span>
                          <span className="text-[10px] text-slate-500">{m.tiempo}</span>
                        </div>
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-[#0B4FC4] text-white rounded-tr-xs'
                              : 'bg-slate-700 text-slate-200 rounded-tl-xs'
                          }`}
                        >
                          {m.texto}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulario de chat */}
              <form onSubmit={handleEnviarMensaje} className="p-3 bg-slate-900 border-t border-slate-700 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]"
                />
                <button
                  type="submit"
                  className="p-2 bg-[#0B4FC4] hover:bg-[#093fa3] text-white rounded-xl text-xs font-bold transition-colors"
                >
                  ➤
                </button>
              </form>
            </div>
          )}

          {activeTab === 'participantes' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {[
                { nombre: 'Camila Torres', rol: 'Anfitriona', estado: 'En línea' },
                { nombre: 'Andrés Pérez', rol: 'Estudiante', estado: 'En línea' },
                { nombre: 'Laura Méndez', rol: 'Estudiante', estado: 'En línea' },
                { nombre: user.nombre, rol: 'Tú', estado: 'En línea' },
              ].map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/50 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center font-bold text-xs">
                      {p.nombre.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{p.nombre}</h4>
                      <p className="text-[10px] text-slate-400">{p.rol}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {p.estado}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'materiales' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {[
                { nombre: 'Guía de límites.pdf', tamaño: '2.4 MB', tipo: 'PDF' },
                { nombre: 'Ejercicios resueltos_corte2.pdf', tamaño: '1.1 MB', tipo: 'PDF' },
              ].map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{m.nombre}</h4>
                      <p className="text-[10px] text-slate-400">{m.tipo} · {m.tamaño}</p>
                    </div>
                  </div>
                  <button onClick={() => alert(`Descargando ${m.nombre}...`)} className="text-xs text-blue-400 hover:underline font-bold">
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer indicador sincronización */}
          <div className="p-2 bg-slate-900 border-t border-slate-700 text-center text-[10px] text-slate-400 flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
            <span>Historial guardado · sincronización &lt; 2 s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
