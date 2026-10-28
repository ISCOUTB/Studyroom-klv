'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { IconoAdmin, type IconoAdminNombre } from '@/components/admin/IconoAdmin';
import { ResumenTab } from '@/components/admin/ResumenTab';
import { MonitoresTab } from '@/components/admin/MonitoresTab';
import { AsignaturasTab } from '@/components/admin/AsignaturasTab';
import { ReportesTab } from '@/components/admin/ReportesTab';
import { AuditoriaTab } from '@/components/admin/AuditoriaTab';

type Tab = 'resumen' | 'monitores' | 'asignaturas' | 'reportes' | 'auditoria';

const TABS: Array<{ id: Tab; etiqueta: string; icono: IconoAdminNombre }> = [
  { id: 'resumen', etiqueta: 'Resumen', icono: 'resumen' },
  { id: 'monitores', etiqueta: 'Monitores', icono: 'monitores' },
  { id: 'asignaturas', etiqueta: 'Asignaturas', icono: 'asignaturas' },
  { id: 'reportes', etiqueta: 'Reportes', icono: 'reportes' },
  { id: 'auditoria', etiqueta: 'Auditoría', icono: 'auditoria' },
];

const IDS_TAB = new Set<string>(TABS.map((tab) => tab.id));

function tabDeUrl(): Tab {
  if (typeof window === 'undefined') return 'resumen';
  const valor = new URLSearchParams(window.location.search).get('tab') ?? 'resumen';
  return IDS_TAB.has(valor) ? (valor as Tab) : 'resumen';
}

export default function AdminPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('resumen');

  useEffect(() => {
    const aplicar = () => setTab(tabDeUrl());
    aplicar();

    if (typeof window !== 'undefined') {
      const actual = new URLSearchParams(window.location.search).get('tab');
      if (!actual || !IDS_TAB.has(actual)) {
        window.history.replaceState({}, '', '/admin?tab=resumen');
      }
    }

    window.addEventListener('popstate', aplicar);
    return () => window.removeEventListener('popstate', aplicar);
  }, []);

  const cambiarTab = (nuevo: Tab) => {
    setTab(nuevo);
    window.history.replaceState({}, '', `/admin?tab=${nuevo}`);
  };

  if (isLoading) return null;

  if (!user || user.rol !== 'ADMINISTRADOR') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md">
          <div className="mb-3 text-4xl">⛔</div>
          <h2 className="mb-1 text-lg font-bold text-slate-800">Acceso denegado</h2>
          <p className="mb-6 text-xs text-slate-500">
            Esta sección es exclusiva para administradores de la plataforma.
          </p>
          <button
            onClick={() => router.push('/salas')}
            className="w-full rounded-xl bg-[#0B4FC4] py-2.5 text-xs font-bold text-white"
          >
            Volver a salas de estudio
          </button>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Administración
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Métricas de la plataforma, monitores, catálogo y moderación.
          </p>
        </header>

        <nav
          aria-label="Secciones de administración"
          className="mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((opcion) => {
            const activa = tab === opcion.id;
            return (
              <button
                key={opcion.id}
                type="button"
                onClick={() => cambiarTab(opcion.id)}
                aria-current={activa ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm ${
                  activa
                    ? 'bg-blue-50 text-[#0B4FC4]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <IconoAdmin nombre={opcion.icono} className="h-4 w-4" />
                {opcion.etiqueta}
              </button>
            );
          })}
        </nav>

        <div className="mt-6">
          {tab === 'resumen' && <ResumenTab token={token} />}
          {tab === 'monitores' && <MonitoresTab token={token} />}
          {tab === 'asignaturas' && <AsignaturasTab token={token} />}
          {tab === 'reportes' && <ReportesTab token={token} />}
          {tab === 'auditoria' && <AuditoriaTab token={token} />}
        </div>
      </div>
    </AppShell>
  );
}
