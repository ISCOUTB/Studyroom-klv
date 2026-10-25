'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { UTBLogo } from '@/components/layout/UTBLogo';
import { useRouter } from 'next/navigation';

/* ------------------------------------------------------------------ */
/* Iconos SVG                                                          */
/* ------------------------------------------------------------------ */

type IconProps = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const IconMail = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base} strokeWidth="1.8" className={className}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m3.8 7.5 8.2 5.4 8.2-5.4" />
  </svg>
);

const IconLock = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base} strokeWidth="1.8" className={className}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3" />
  </svg>
);

const IconUser = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base} strokeWidth="1.8" className={className}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5.2 20c.8-3.25 3.25-5 6.8-5s6 1.75 6.8 5" />
  </svg>
);

const IconEye = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base} strokeWidth="1.8" className={className}>
    <path d="M2.6 12S6.2 5.6 12 5.6 21.4 12 21.4 12 17.8 18.4 12 18.4 2.6 12 2.6 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

const IconEyeOff = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base} strokeWidth="1.8" className={className}>
    <path d="M3.5 3.5l17 17" />
    <path d="M10.2 5.9A10 10 0 0 1 12 5.6c5.8 0 9.4 6.4 9.4 6.4a17.6 17.6 0 0 1-3.4 4.2" />
    <path d="M6.5 7.9A17.3 17.3 0 0 0 2.6 12s3.6 6.4 9.4 6.4c1.2 0 2.3-.25 3.3-.7" />
    <path d="M9.9 10a2.8 2.8 0 0 0 4.1 4.1" />
  </svg>
);

const IconShield = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg {...base} strokeWidth="1.8" className={className}>
    <path d="M12 3.5 19 6v5.35c0 4.35-2.97 7.7-7 9.15-4.03-1.45-7-4.8-7-9.15V6l7-2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconArrowRight = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg {...base} strokeWidth="2" className={className}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const IconChevronDown = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg {...base} strokeWidth="1.8" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconPin = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg {...base} strokeWidth="1.8" className={className}>
    <path d="M20 10.5c0 5.4-8 10.5-8 10.5s-8-5.1-8-10.5a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10.5" r="2.4" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Clases reutilizables                                                */
/* ------------------------------------------------------------------ */

const LABEL_CLASS =
  'mb-2 block text-[11px] font-bold uppercase tracking-[0.09em] text-slate-600';

const INPUT_CLASS =
  'h-12 w-full rounded-xl border border-slate-200 bg-[#F7F8FA] px-4 text-sm text-slate-800 ' +
  'placeholder:text-slate-400 transition-all duration-200 hover:border-slate-300 ' +
  'focus:border-[#0758C9] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0758C9]/10';

const SELECT_CLASS =
  'h-12 w-full appearance-none truncate rounded-xl border border-slate-200 bg-[#F7F8FA] pl-3.5 pr-9 ' +
  'text-[13px] text-slate-800 transition-all duration-200 hover:border-slate-300 ' +
  'focus:border-[#0758C9] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0758C9]/10';

const PRIMARY_BUTTON =
  'group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#0B66E4] to-[#0758C9] ' +
  'text-[15px] font-semibold text-white shadow-[0_12px_24px_-10px_rgba(7,88,201,0.85)] transition-all duration-200 ' +
  'hover:-translate-y-px hover:shadow-[0_16px_28px_-10px_rgba(7,88,201,0.9)] active:translate-y-0 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0758C9]/25 ' +
  'disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70';

const ICON_LEFT = 'pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400';
const EYE_BUTTON =
  'absolute inset-y-0 right-3 flex w-9 items-center justify-center rounded-lg text-slate-400 ' +
  'transition-colors hover:text-[#0758C9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0758C9]/30';

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

  const switchTab = (tab: 'ingresar' | 'registro') => {
    setActiveTab(tab);
    setError('');
    setSuccessMsg('');
  };

  /* ---------------- Lógica (idéntica a la de Kevin) ---------------- */

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

  /* ---------------- Presentación ---------------- */

  const tabClass = (active: boolean) =>
    `relative py-4 text-center text-sm font-bold transition-colors duration-200 ${
      active
        ? 'bg-white text-[#0758C9] after:absolute after:inset-x-6 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[#0758C9]'
        : 'bg-[#F3F7FF] text-slate-400 hover:text-slate-600'
    }`;

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-start overflow-x-hidden bg-[#E7EEFD] bg-[linear-gradient(180deg,#FFFFFF_0%,#F2F7FF_42%,#E7EEFD_100%)] px-4 py-6 sm:justify-center sm:py-5"
      style={{ fontFamily: 'var(--font-manrope), ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Decoración de fondo */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-br-[64px] bg-[#0758C9]/[0.07]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-tl-[64px] bg-[#0758C9]/[0.07]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-[8%] top-[18%] h-64 w-64 rounded-full bg-[#4C8DF6]/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[10%] right-[6%] h-72 w-72 rounded-full bg-[#0758C9]/15 blur-3xl" />

      <div className="relative w-full max-w-[440px] lg:max-w-[960px]">
        {/* Encabezado de marca */}
        <header className="flex flex-col items-center text-center">
          <UTBLogo className="h-[64px] sm:h-[68px]" priority />
          <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Plataforma académica
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight text-[#0758C9] sm:text-[26px]">
            Campus Collaborative Study
          </h1>
          <div className="mt-2 h-[3px] w-[60px] rounded-full bg-[#0758C9]" />
        </header>

        {/* Tarjeta */}
        <section
          aria-label="Acceso al campus"
          className="relative mt-5 grid overflow-hidden rounded-[24px] bg-white shadow-[0_28px_60px_-24px_rgba(7,88,201,0.45)] ring-1 ring-[#0758C9]/10 lg:grid-cols-[1fr_1.05fr]"
        >
          {/* Panel con foto del campus (solo pantallas grandes) */}
          <aside
            aria-label="Vida universitaria en el campus UTB"
            className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#0B66E4_0%,#0758C9_55%,#053F94_100%)] lg:block"
          >
            {/* La foto está en public/campus.jpg; si no existe se ve el degradado */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/campus.jpg')" }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,63,148,0.25)_0%,rgba(5,63,148,0.55)_55%,rgba(3,40,98,0.92)_100%)]"
            />
            <div className="relative flex h-full flex-col justify-between p-8 text-white">
              <p className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
                <span className="h-[2px] w-7 rounded-full bg-white/80" />
                Vida universitaria
              </p>
              <div>
                <h2 className="text-[28px] font-extrabold leading-[1.15] tracking-tight">
                  Donde las ideas encuentran su camino.
                </h2>
                <p className="mt-3 max-w-[300px] text-sm leading-relaxed text-white/80">
                  Conecta con tu aprendizaje, tu comunidad y tu futuro.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[12px] font-semibold backdrop-blur-sm ring-1 ring-white/25">
                  <IconPin className="h-4 w-4" />
                  <span>Universidad Tecnológica de Bolívar</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Contenido de acceso */}
          <div className="flex flex-col">
            {/* Pestañas */}
            <div role="tablist" aria-label="Opciones de acceso" className="grid grid-cols-2 border-b border-slate-200">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ingresar'}
                onClick={() => switchTab('ingresar')}
                className={tabClass(activeTab === 'ingresar')}
              >
                Ingresar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'registro'}
                onClick={() => switchTab('registro')}
                className={tabClass(activeTab === 'registro')}
              >
                Registro
              </button>
            </div>

            <div className="flex flex-1 flex-col px-6 py-5 sm:px-8">
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900">
                  {activeTab === 'ingresar' ? 'Tu espacio de aprendizaje' : 'Crea tu acceso'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeTab === 'ingresar'
                    ? 'Ingresa con tu correo institucional.'
                    : 'Usa tu correo institucional para comenzar.'}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
                >
                  {error}
                </div>
              )}
              {successMsg && (
                <div
                  role="status"
                  className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700"
                >
                  {successMsg}
                </div>
              )}

              {activeTab === 'ingresar' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="login-correo" className={LABEL_CLASS}>
                      Correo institucional
                    </label>
                    <div className="relative">
                      <span className={ICON_LEFT}>
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
                      <span className={ICON_LEFT}>
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
                        aria-pressed={showPassword}
                        className={EYE_BUTTON}
                      >
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className={PRIMARY_BUTTON}>
                    <span>{loading ? 'Verificando acceso…' : 'Iniciar sesión'}</span>
                    {!loading && <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                  </button>

                  <div className="text-center">
                    <Link
                      href="/recuperar"
                      className="rounded-md text-[13px] font-semibold text-[#0758C9] transition-colors hover:text-[#053F94] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0758C9]/30"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label htmlFor="reg-nombre" className={LABEL_CLASS}>
                      Nombre completo
                    </label>
                    <div className="relative">
                      <span className={ICON_LEFT}>
                        <IconUser />
                      </span>
                      <input
                        id="reg-nombre"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Tu nombre y apellido"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className={`${INPUT_CLASS} pl-12`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-correo" className={LABEL_CLASS}>
                      Correo institucional
                    </label>
                    <div className="relative">
                      <span className={ICON_LEFT}>
                        <IconMail />
                      </span>
                      <input
                        id="reg-correo"
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
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
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
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
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
                      <span className={ICON_LEFT}>
                        <IconLock />
                      </span>
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${INPUT_CLASS} pl-12 pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={showPassword}
                        className={EYE_BUTTON}
                      >
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className={PRIMARY_BUTTON}>
                    <span>{loading ? 'Registrando…' : 'Completar Registro'}</span>
                    {!loading && <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </form>
              )}

              {/* Leyenda de seguridad */}
              <div className="mt-auto pt-5">
                <div className="border-t border-slate-100 pt-4">
                  <p className="flex items-center justify-center gap-2 text-[12px] text-slate-400">
                    <IconShield className="h-[15px] w-[15px] text-[#0758C9]" />
                    <span>
                      Credenciales protegidas con <strong className="font-bold text-slate-500">cifrado seguro</strong>
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}