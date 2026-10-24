'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'ingresar' | 'registro'>('ingresar');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nombre, setNombre] = useState('');
  const [carrera, setCarrera] = useState('Ingeniería de Sistemas y Computación');
  const [semestre, setSemestre] = useState(1);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!correo.endsWith('@utb.edu.co')) {
      setError('Por favor ingrese un correo institucional válido (@utb.edu.co)');
      return;
    }
    setLoading(true);
    try {
      await login(correo, password);
      router.push('/salas');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!correo.endsWith('@utb.edu.co')) {
      setError('El registro requiere obligatoriamente un correo @utb.edu.co');
      return;
    }
    setLoading(true);
    try {
      await register(nombre, correo, password, carrera, semestre);
      setSuccessMsg('¡Registro exitoso! Correo de verificación enviado. Ingresando...');
      setTimeout(() => {
        router.push('/salas');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col justify-center items-center p-4">
      {/* Cabecera institucional */}
      <div className="text-center mb-6">
        <div className="inline-block mb-3">
          <UTBLogo className="h-12 justify-center" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0B4FC4] tracking-tight">
          Campus Collaborative Study
        </h1>
        <div className="w-16 h-1 bg-[#0B4FC4] mx-auto mt-2 rounded-full"></div>
      </div>

      {/* Tarjeta principal */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-blue-100 overflow-hidden transition-all">
        {/* Pestañas Ingresar / Registro */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setActiveTab('ingresar'); setError(''); }}
            className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${
              activeTab === 'ingresar'
                ? 'text-[#0B4FC4] border-b-2 border-[#0B4FC4] bg-blue-50/50'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Ingresar
          </button>
          <button
            onClick={() => { setActiveTab('registro'); setError(''); }}
            className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${
              activeTab === 'registro'
                ? 'text-[#0B4FC4] border-b-2 border-[#0B4FC4] bg-blue-50/50'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Registro (Demo)
          </button>
        </div>

        <div className="p-6 md:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg">
              {successMsg}
            </div>
          )}

          {activeTab === 'ingresar' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Correo Institucional
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    ✉️
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="nombre@utb.edu.co"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] focus:bg-white transition-all text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    🔒
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] focus:bg-white transition-all text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group"
              >
                <span>{loading ? 'Verificando...' : 'Iniciar sesión'}</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <div className="text-center mt-3">
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Se ha enviado un enlace de recuperación a tu correo institucional.'); }} className="text-xs text-[#0B4FC4] hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre y apellido"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] focus:bg-white transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Correo Institucional (@utb.edu.co)
                </label>
                <input
                  type="email"
                  required
                  placeholder="nombre@utb.edu.co"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] focus:bg-white transition-all text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Carrera
                  </label>
                  <select
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] text-gray-800"
                  >
                    <option>Ingeniería de Sistemas y Computación</option>
                    <option>Ingeniería Civil</option>
                    <option>Ingeniería Industrial</option>
                    <option>Matemáticas / Ciencias Básicas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Semestre
                  </label>
                  <select
                    value={semestre}
                    onChange={(e) => setSemestre(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] text-gray-800"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                      <option key={s} value={s}>{s}° Semestre</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4FC4] focus:bg-white transition-all text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#0B4FC4] hover:bg-[#093fa3] text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group"
              >
                <span>{loading ? 'Registrando...' : 'Completar Registro'}</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 text-center flex items-center justify-center gap-2 text-xs text-gray-400">
            <span>🛡️</span>
            <span>Credenciales protegidas con cifrado seguro</span>
          </div>
        </div>
      </div>
    </div>
  );
}
