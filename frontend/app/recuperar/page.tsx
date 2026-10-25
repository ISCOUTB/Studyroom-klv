'use client';

import React, { useState } from 'react';
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

export default function RecuperarPage() {
  const [correo, setCorreo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const correoNormalizado = correo.trim().toLowerCase();

    if (!correoNormalizado.endsWith('@utb.edu.co')) {
      setError('Ingresa un correo institucional válido (@utb.edu.co).');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest<{ message: string }>('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correoNormalizado }),
      });

      setMensaje(
        data.message ||
          'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      );
      setEnviado(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo procesar la solicitud. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtroCorreo = () => {
    setEnviado(false);
    setMensaje('');
    setError('');
    setCorreo('');
  };

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para que puedas crear una nueva contraseña."
    >
      {enviado ? (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <IconCheckCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-800">
            Revisa tu correo institucional
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{mensaje}</p>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            El enlace vence en 1 hora. Si no lo ves, revisa la carpeta de spam.
          </p>

          <Link href="/login" className={`${AUTH_BUTTON_CLASS} mt-6`}>
            Volver a iniciar sesión
            <IconArrowRight />
          </Link>

          <button
            type="button"
            onClick={handleOtroCorreo}
            className={`${AUTH_LINK_CLASS} mt-5 inline-block`}
          >
            Usar otro correo
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="rounded-xl border border-slate-200 bg-[#F7F8FA] px-4 py-3">
            <p className="text-xs leading-relaxed text-slate-500">
              Escribe el correo con el que te registraste. Por seguridad, no
              confirmamos si el correo existe o no.
            </p>
          </div>

          <div>
            <label htmlFor="recuperar-correo" className={AUTH_LABEL_CLASS}>
              Correo institucional
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                <IconMail />
              </span>
              <input
                id="recuperar-correo"
                type="email"
                required
                autoComplete="email"
                placeholder="nombre@utb.edu.co"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className={`${AUTH_INPUT_CLASS} pl-12`}
              />
            </div>
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
            {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
            {!loading && <IconArrowRight />}
          </button>

          <div className="pt-1 text-center">
            <Link href="/login" className={AUTH_LINK_CLASS}>
              Volver a iniciar sesión
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
