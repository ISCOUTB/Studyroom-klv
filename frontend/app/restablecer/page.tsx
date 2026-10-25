'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AuthShell,
} from '@/components/auth/AuthShell';
import {
  IconAlertCircle,
  IconArrowRight,
  IconCheckCircle,
  IconEye,
  IconEyeOff,
  IconLock,
} from '@/components/auth/AuthIcons';
import { apiRequest } from '@/lib/api';

type Estado = 'cargando' | 'formulario' | 'exito' | 'sin-token';

export default function RestablecerPage() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenUrl = new URLSearchParams(window.location.search).get('token');

    if (!tokenUrl) {
      setEstado('sin-token');
      return;
    }

    setToken(tokenUrl);
    setEstado('formulario');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La nueva contraseña debe tener mínimo 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Verifícalas e inténtalo de nuevo.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest<{ message: string }>('/api/auth/restablecer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaContrasena: password }),
      });

      setMensaje(
        data.message || 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.'
      );
      setPassword('');
      setConfirmPassword('');
      setEstado('exito');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo restablecer la contraseña. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Crea una contraseña segura para volver a entrar a tu cuenta."
    >
      {estado === 'cargando' && (
        <div className="py-6 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-[#0B4FC4]/20 border-t-[#0B4FC4]" />
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Preparando el formulario…
          </p>
        </div>
      )}

      {estado === 'sin-token' && (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <IconAlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-800">
            Enlace incompleto
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            El enlace no contiene un token de recuperación. Solicita uno nuevo
            desde la pantalla de recuperación.
          </p>
          <Link href="/recuperar" className={`${AUTH_BUTTON_CLASS} mt-6`}>
            Solicitar un enlace
            <IconArrowRight />
          </Link>
          <div className="mt-5">
            <Link href="/login" className={AUTH_LINK_CLASS}>
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      )}

      {estado === 'exito' && (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <IconCheckCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-800">
            Contraseña actualizada
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{mensaje}</p>
          <Link href="/login" className={`${AUTH_BUTTON_CLASS} mt-6`}>
            Iniciar sesión
            <IconArrowRight />
          </Link>
        </div>
      )}

      {estado === 'formulario' && (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="restablecer-password" className={AUTH_LABEL_CLASS}>
              Nueva contraseña
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                <IconLock />
              </span>
              <input
                id="restablecer-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${AUTH_INPUT_CLASS} pl-12 pr-12`}
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

          <div>
            <label htmlFor="restablecer-confirmar" className={AUTH_LABEL_CLASS}>
              Confirmar contraseña
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                <IconLock />
              </span>
              <input
                id="restablecer-confirmar"
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${AUTH_INPUT_CLASS} pl-12 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={
                  showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'
                }
                className="absolute inset-y-0 right-4 flex items-center text-slate-500 transition-colors hover:text-slate-700"
              >
                {showConfirm ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Usa al menos 8 caracteres.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            >
              <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className={AUTH_BUTTON_CLASS}>
            {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
            {!loading && <IconArrowRight />}
          </button>

          <div className="space-y-2 pt-1 text-center">
            <Link href="/recuperar" className={`${AUTH_LINK_CLASS} block`}>
              Solicitar un enlace nuevo
            </Link>
            <Link href="/login" className={`${AUTH_LINK_CLASS} block`}>
              Volver a iniciar sesión
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
