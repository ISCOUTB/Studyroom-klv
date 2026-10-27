import React from 'react';
import { UTBLogo } from '@/components/layout/UTBLogo';

export const AUTH_LABEL_CLASS =
  'mb-2 block text-[11px] font-bold uppercase tracking-[0.09em] text-slate-600';

export const AUTH_INPUT_CLASS =
  'h-12 w-full rounded-xl border border-slate-200 bg-[#F7F8FA] px-4 text-sm text-slate-800 ' +
  'placeholder:text-slate-400 transition-colors focus:border-[#0B4FC4] focus:bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/15';

export const AUTH_BUTTON_CLASS =
  'flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0B4FC4] ' +
  'text-[15px] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(11,79,196,0.85)] ' +
  'transition-colors hover:bg-[#0A45AB] disabled:cursor-not-allowed disabled:opacity-70';

export const AUTH_LINK_CLASS =
  'text-[13px] font-semibold text-[#0B4FC4] hover:underline';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Contenedor visual compartido por las pantallas de autenticación.
 * Mantiene el mismo fondo, logo y tarjeta del login.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-[#E7EEFD] bg-[linear-gradient(180deg,#FFFFFF_0%,#F2F7FF_42%,#E7EEFD_100%)] px-4 py-10 sm:justify-center sm:py-12">
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center">
          <UTBLogo className="h-[88px] sm:h-24" priority />
        </div>

        <div className="mt-4 text-center">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-[#0B4FC4] sm:text-[28px]">
            {title}
          </h1>
          <div className="mx-auto mt-2 h-[3px] w-[68px] rounded-full bg-[#0B4FC4]" />
          {subtitle ? (
            <p className="mx-auto mt-3 max-w-[340px] text-[13px] leading-relaxed text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="mt-7 rounded-[20px] bg-white p-6 shadow-[0_18px_45px_-18px_rgba(11,79,196,0.35)] sm:p-8">
          {children}
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400">
          StudyRoom · Universidad Tecnológica de Bolívar
        </p>
      </div>
    </div>
  );
}
