'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { useRouter } from 'next/navigation';

/* ------------------------------------------------------------------ */
/* Iconos SVG de contorno — mismo trazo (1.7) y color gris oscuro      */
/* ------------------------------------------------------------------ */

type IconProps = { className?: string };

const IconMail = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m3.8 7.5 8.2 5.4 8.2-5.4" />
  </svg>
);

const IconLock = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3" />
  </svg>
);

const IconEye = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M2.6 12S6.2 5.6 12 5.6 21.4 12 21.4 12 17.8 18.4 12 18.4 2.6 12 2.6 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

const IconEyeOff = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3.5 3.5l17 17" />
    <path d="M10.2 5.9A10 10 0 0 1 12 5.6c5.8 0 9.4 6.4 9.4 6.4a17.6 17.6 0 0 1-3.4 4.2" />
    <path d="M6.5 7.9A17.3 17.3 0 0 0 2.6 12s3.6 6.4 9.4 6.4c1.2 0 2.3-.25 3.3-.7" />
    <path d="M9.9 10a2.8 2.8 0 0 0 4.1 4.1" />
  </svg>
);

const IconShield = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2.6 4.7 5.4v5.5c0 4.6 3.1 8.6 7.3 9.8 4.2-1.2 7.3-5.2 7.3-9.8V5.4L12 2.6Z" />
  </svg>
);

const IconArrowRight = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const IconChevronDown = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/* ------------------------------------------------------------------ */

const LABEL_CLASS =
  'mb-2 block text-[11px] font-bold uppercase tracking-[0.09em] text-slate-600';

const INPUT_CLASS =
  'h-12 w-full rounded-xl border border-slate-200 bg-[#F7F8FA] px-4 text-sm text-slate-800 ' +
  'placeholder:text-slate-400 transition-colors focus:border-[#0B4FC4] focus:bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/15';

const SELECT_CLASS =
  'h-12 w-full appearance-none truncate rounded-xl border border-slate-200 bg-[#F7F8FA] pl-3.5 pr-9 ' +
  'text-[13px] text-slate-800 transition-colors focus:border-[#0B4FC4] focus:bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/15';

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
    setSuccessMsg('');

    const correoNormalizado = correo.trim().toLowerCase();

    if (!correoNormalizado.endsWith('@utb.edu.co')) {
      setError('Por favor ingresa un correo institucional válido (@utb.edu.co).');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña.');
      return;
    }

    setLoading(true);
    try {
      await login(correoNormalizado, password);
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
    setSuccessMsg('');

    const correoNormalizado = correo.trim().toLowerCase();

    if (!nombre.trim()) {
      setError('Ingresa tu nombre completo.');
      return;
    }
    if (!correoNormalizado.endsWith('@utb.edu.co')) {
      setError('El registro requiere obligatoriamente un correo @utb.edu.co.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        nombre: nombre.trim(),
        correo: correoNormalizado,
        contrasena: password,
        carrera: carrera.trim(),
        semestre: Number(semestre),
      });

      // El registro NO inicia sesión: primero se debe verificar el correo.
      setSuccessMsg(
        res.message ||
          'Cuenta creada. Revisa tu correo institucional para verificar tu cuenta.'
      );
      setCorreo(correoNormalizado);
      setPassword('');
      setShowPassword(false);
      setActiveTab('ingresar');
    } catch (err: any) {
      setError(err.message || 'Error al registrar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-[#E7EEFD] bg-[linear-gradient(180deg,#FFFFFF_0%,#F2F7FF_42%,#E7EEFD_100%)] px-4 py-10 sm:justify-center sm:py-12">
      <div className="relative w-full max-w-[440px]">
        {/* Logo institucional */}
        <div className="flex justify-center">
          <UTBLogo className="h-[88px] sm:h-24" priority />
        </div>

        {/* Título */}
        <div className="mt-4 text-center">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-[#0B4FC4] sm:text-[28px]">
            Campus Collaborative Study
          </h1>
          <div className="mx-auto mt-2 h-[3px] w-[68px] rounded-full bg-[#0B4FC4]" />
        </div>

        {/* Tarjeta */}
        <div className="mt-7 overflow-hidden rounded-[20px] bg-white shadow-[0_18px_45px_-18px_rgba(11,79,196,0.35)]">
          {/* Pestañas */}
          <div className="grid grid-cols-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('ingresar');
                setError('');
                setSuccessMsg('');
              }}
              className={`-mb-px border-b-2 py-4 text-center text-sm font-bold transition-colors ${
                activeTab === 'ingresar'
                  ? 'border-transparent bg-white text-[#0B4FC4]'
                  : 'border-[#0B4FC4] bg-[#F3F7FF] text-slate-400 hover:text-slate-600'
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('registro');
                setError('');
                setSuccessMsg('');
              }}
              className={`-mb-px border-b-2 py-4 text-center text-sm font-bold transition-colors ${
                activeTab === 'registro'
                  ? 'border-transparent bg-white text-[#0B4FC4]'
                  : 'border-[#0B4FC4] bg-[#F3F7FF] text-slate-400 hover:text-slate-600'
              }`}
            >
              Registro
            </button>
          </div>

          <div className="px-6 py-7 sm:px-8">
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
              >
                {error}
              </div>
            )}
            {successMsg && (
              <div
                role="status"
                className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700"
              >
                {successMsg}
              </div>
            )}

            {activeTab === 'ingresar' ? (
              <form onSubmit={handleLogin} className="space-y-5" noValidate={false}>
                <div>
                  <label htmlFor="login-correo" className={LABEL_CLASS}>
                    Correo institucional
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                      <IconMail />
                    </span>
                    <input
                      id="login-correo"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="nombre@utb.edu.co"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      className={`${INPUT_CLASS} pl-12`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className={LABEL_CLASS}>
                    Contraseña
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                      <IconLock />
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${INPUT_CLASS} pl-12 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-500 transition-colors hover:text-slate-700"
                    >
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0B4FC4] text-[15px] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(11,79,196,0.85)] transition-colors hover:bg-[#0A45AB] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span>{loading ? 'Verificando…' : 'Iniciar sesión'}</span>
                  <IconArrowRight />
                </button>

                <div className="pt-1 text-center">
                  <Link
                    href="/recuperar"
                    className="text-[13px] font-semibold text-[#0B4FC4] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label htmlFor="reg-nombre" className={LABEL_CLASS}>
                    Nombre completo
                  </label>
                  <input
                    id="reg-nombre"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Tu nombre y apellido"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="reg-correo" className={LABEL_CLASS}>
                    Correo institucional
                  </label>
                  <input
                    id="reg-correo"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="nombre@utb.edu.co"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-[1.35fr_1fr]">
                  <div className="min-w-0">
                    <label htmlFor="reg-carrera" className={LABEL_CLASS}>
                      Carrera
                    </label>
                    <div className="relative">
                      <select
                        id="reg-carrera"
                        value={carrera}
                        onChange={(e) => setCarrera(e.target.value)}
                        className={SELECT_CLASS}
                      >
                        <option>Ingeniería de Sistemas y Computación</option>
                        <option>Ingeniería Civil</option>
                        <option>Ingeniería Industrial</option>
                        <option>Matemáticas / Ciencias Básicas</option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                        <IconChevronDown />
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="reg-semestre" className={LABEL_CLASS}>
                      Semestre
                    </label>
                    <div className="relative">
                      <select
                        id="reg-semestre"
                        value={semestre}
                        onChange={(e) => setSemestre(Number(e.target.value))}
                        className={SELECT_CLASS}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                          <option key={s} value={s}>
                            {s}° Semestre
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                        <IconChevronDown />
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-password" className={LABEL_CLASS}>
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${INPUT_CLASS} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-500 transition-colors hover:text-slate-700"
                    >
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#0B4FC4] text-[15px] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(11,79,196,0.85)] transition-colors hover:bg-[#0A45AB] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Registrando…' : 'Completar Registro'}
                </button>
              </form>
            )}

            {/* Leyenda de seguridad */}
            <div className="mt-7 border-t border-slate-100 pt-5">
              <p className="flex items-center justify-center gap-2 text-[12px] text-slate-400">
                <IconShield className="h-[14px] w-[14px] text-[#1473E6]" />
                <span>Credenciales protegidas con cifrado seguro</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
