'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from './AppShell';
import { useAuth } from '@/lib/auth-context';

interface ProximamenteProps {
  titulo: string;
  descripcion: string;
  emoji: string;
  detalles: string[];
}

export function Proximamente({
  titulo,
  descripcion,
  emoji,
  detalles,
}: ProximamenteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative bg-gradient-to-br from-[#0B4FC4] to-[#072f7d] px-6 py-10 text-center text-white sm:px-10 sm:py-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl ring-1 ring-inset ring-white/25">
                {emoji}
              </div>
              <span className="mt-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-50 ring-1 ring-inset ring-white/20">
                Próximamente
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                {titulo}
              </h1>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-blue-50/90">
                {descripcion}
              </p>
            </div>
          </div>

          <div className="px-6 py-7 sm:px-10">
            <h2 className="text-sm font-bold text-slate-800">
              Esto es lo que estamos preparando
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {detalles.map((detalle) => (
                <li
                  key={detalle}
                  className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-xs font-medium text-slate-600"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-black text-emerald-700">
                    ✓
                  </span>
                  {detalle}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-2.5 border-t border-slate-100 pt-5 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push('/inicio')}
                className="rounded-xl bg-[#0B4FC4] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#093fa3]"
              >
                Volver al inicio
              </button>
              <button
                type="button"
                onClick={() => router.push('/salas')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#0B4FC4]/30 hover:text-[#0B4FC4]"
              >
                Ir a salas de estudio
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
