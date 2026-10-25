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
  IconMail,
} from '@/components/auth/AuthIcons';
import { apiRequest } from '@/lib/api';

type Estado = 'cargando' | 'exito' | 'error' | 'sin-token';

export default function VerificarPage() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensaje, setMensaje] = useState('');
  const [correo, setCorreo] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const [mensajeReenvio, setMensajeReenvio] = useState('');
  const [errorReenvio, setErrorReenvio] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
      setEstado('sin-token');
      setMensaje('El enlace no contiene un token de verificación.');
      return;
    }

    let activo = true;

    const verificar = async () => {
      try {
        const data = await apiRequest<{ message: string }>(
          `/api/auth/verificar/${encodeURIComponent(token)}`
        );
        if (activo) {
          setEstado('exito');
          setMensaje(data.message || 'Correo verificado con éxito.');
        }
      } catch (error) {
        if (activo) {
          setEstado('error');
          setMensaje(
            error instanceof Error
              ? error.message
              : 'No se pudo verificar la cuenta.'
          );
        }
      }
    };

    verificar();

    return () => {
      activo = false;
    };
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeReenvio('');
    setErrorReenvio('');

    const correoNormalizado = correo.trim().toLowerCase();

    if (!correoNormalizado.endsWith('@utb.edu.co')) {
      setErrorReenvio('Ingresa un correo institucional válido (@utb.edu.co).');
      return;
    }

    setReenviando(true);
    try {
      const data = await apiRequest<{ message: string }>(
        '/api/auth/reenviar-verificacion',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo: correoNormalizado }),
        }
      );
      setMensajeReenvio(
        data.message ||
          'Enviamos un nuevo enlace de verificación a tu correo institucional.'
      );
    } catch (error) {
      setErrorReenvio(
        error instanceof Error
          ? error.message
          : 'No se pudo reenviar el enlace de verificación.'
      );
    } finally {
      setReenviando(false);
    }
  };

  return (
    <AuthShell
      title="Verificación de correo"
      subtitle="Estamos confirmando tu cuenta institucional."
    >
      {estado === 'cargando' && (
        <div className="py-6 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-[#0B4FC4]/20 border-t-[#0B4FC4]" />
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Verificando tu correo…
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Esto solo tarda un momento.
          </p>
        </div>
      )}

      {estado === 'exito' && (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <IconCheckCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-800">
            ¡Cuenta verificada!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {mensaje}
          </p>
          <Link href="/login" className={`${AUTH_BUTTON_CLASS} mt-6`}>
            Iniciar sesión
            <IconArrowRight />
          </Link>
        </div>
      )}

      {(estado === 'error' || estado === 'sin-token') && (
        <div>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IconAlertCircle className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-800">
              No pudimos verificar tu correo
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {mensaje}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-[#F7F8FA] p-4">
            <p className="text-[13px] font-semibold text-slate-700">
              ¿Necesitas un enlace nuevo?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Escribe tu correo institucional y te enviaremos otro enlace de
              verificación.
            </p>

            <form onSubmit={handleResend} className="mt-4">
              <label htmlFor="verificar-correo" className={AUTH_LABEL_CLASS}>
                Correo institucional
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                  <IconMail />
                </span>
                <input
                  id="verificar-correo"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="nombre@utb.edu.co"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className={`${AUTH_INPUT_CLASS} pl-12`}
                />
              </div>

              {errorReenvio && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  {errorReenvio}
                </p>
              )}
              {mensajeReenvio && (
                <p
                  role="status"
                  className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
                >
                  {mensajeReenvio}
                </p>
              )}

              <button
                type="submit"
                disabled={reenviando}
                className={`${AUTH_BUTTON_CLASS} mt-4`}
              >
                {reenviando ? 'Enviando…' : 'Reenviar enlace'}
              </button>
            </form>
          </div>

          <div className="mt-5 text-center">
            <Link href="/login" className={AUTH_LINK_CLASS}>
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
