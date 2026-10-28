'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { UTBLogo } from './UTBLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { inicialesDe } from '@/lib/salas';

type IconoNombre =
  | 'inicio'
  | 'salas'
  | 'tutorias'
  | 'foro'
  | 'repositorio'
  | 'banco'
  | 'admin'
  | 'buscar'
  | 'sol'
  | 'luna'
  | 'menu'
  | 'cerrar'
  | 'salir'
  | 'flecha';

function Icono({
  nombre,
  className = 'h-5 w-5',
}: {
  nombre: IconoNombre;
  className?: string;
}) {
  const comunes = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (nombre) {
    case 'inicio':
      return (
        <svg {...comunes}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );
    case 'salas':
      return (
        <svg {...comunes}>
          <path d="M4 19.5V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5" />
          <path d="M16 8h2a2 2 0 0 1 2 2v9.5" />
          <path d="M2 21h20" />
          <path d="M8 8h4M8 12h4" />
        </svg>
      );
    case 'tutorias':
      return (
        <svg {...comunes}>
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
          <path d="m8.5 14.5 2 2 4-4" />
        </svg>
      );
    case 'foro':
      return (
        <svg {...comunes}>
          <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case 'repositorio':
      return (
        <svg {...comunes}>
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5Z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M8 6h8M8 10h6" />
        </svg>
      );
    case 'banco':
      return (
        <svg {...comunes}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5Z" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      );
    case 'admin':
      return (
        <svg {...comunes}>
          <path d="M12 3 4 6.5v5.2c0 4.6 3.2 8.1 8 9.3 4.8-1.2 8-4.7 8-9.3V6.5Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'buscar':
      return (
        <svg {...comunes}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case 'sol':
      return (
        <svg {...comunes}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      );
    case 'luna':
      return (
        <svg {...comunes}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...comunes}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case 'cerrar':
      return (
        <svg {...comunes}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'salir':
      return (
        <svg {...comunes}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5M21 12H9" />
        </svg>
      );
    case 'flecha':
      return (
        <svg {...comunes}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}

interface ItemNav {
  href: string;
  etiqueta: string;
  icono: IconoNombre;
  soloAdmin?: boolean;
  alias?: string;
}

const ITEMS_NAV: ItemNav[] = [
  { href: '/inicio', etiqueta: 'Inicio', icono: 'inicio', alias: 'panel principal' },
  { href: '/salas', etiqueta: 'Salas', icono: 'salas', alias: 'estudiar grupo salas de estudio' },
  { href: '/tutorias', etiqueta: 'Tutorías', icono: 'tutorias', alias: 'monitores agendar' },
  { href: '/foro', etiqueta: 'Foro', icono: 'foro', alias: 'preguntas dudas' },
  { href: '/repositorio', etiqueta: 'Repositorio', icono: 'repositorio', alias: 'materiales archivos' },
  { href: '/banco-ejercicios', etiqueta: 'Banco de ejercicios', icono: 'banco', alias: 'ejercicios practicar' },
  {
    href: '/admin/monitores',
    etiqueta: 'Administración',
    icono: 'admin',
    soloAdmin: true,
    alias: 'aprobar monitores panel admin',
  },
];

function etiquetaRol(rol?: string | null): string {
  if (rol === 'ADMINISTRADOR') return 'Administrador';
  if (rol === 'TUTOR') return 'Monitor';
  return 'Estudiante';
}

function normalizar(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { temaOscuro, alternarTema } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');
  const buscadorRef = useRef<HTMLInputElement | null>(null);

  const itemsVisibles = useMemo(
    () => ITEMS_NAV.filter((item) => !item.soloAdmin || user?.rol === 'ADMINISTRADOR'),
    [user?.rol]
  );

  const resultados = useMemo(() => {
    const texto = normalizar(consulta.trim());
    const extras: ItemNav[] = [
      { href: '/perfil', etiqueta: 'Mi perfil', icono: 'inicio', alias: 'cuenta usuario' },
    ];
    if (user?.rol === 'TUTOR') {
      extras.push({
        href: '/perfil/monitor',
        etiqueta: 'Perfil de monitor',
        icono: 'tutorias',
        alias: 'disponibilidad biografia monitor',
      });
    }
    const todos = [...itemsVisibles, ...extras];
    if (!texto) return todos;

    return todos.filter((item) =>
      normalizar(`${item.etiqueta} ${item.alias ?? ''} ${item.href}`).includes(texto)
    );
  }, [consulta, itemsVisibles, user?.rol]);

  useEffect(() => {
    setSidebarAbierta(false);
  }, [pathname]);

  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        setBuscadorAbierto((valor) => !valor);
      }
      if (evento.key === 'Escape') {
        setBuscadorAbierto(false);
        setSidebarAbierta(false);
      }
    };

    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, []);

  useEffect(() => {
    if (!buscadorAbierto) {
      setConsulta('');
      return;
    }

    const temporizador = window.setTimeout(() => buscadorRef.current?.focus(), 40);
    return () => window.clearTimeout(temporizador);
  }, [buscadorAbierto]);

  const irA = (href: string) => {
    setBuscadorAbierto(false);
    setSidebarAbierta(false);
    router.push(href);
  };

  const cerrarSesion = () => {
    logout();
    router.push('/login');
  };

  const itemActivo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const iniciales = inicialesDe(user?.nombre ?? '');
  const rol = etiquetaRol(user?.rol);

  return (
    <div
      className={`app-shell ${
        temaOscuro ? 'dark' : ''
      } min-h-screen bg-slate-50 text-slate-800`}
    >
      {/* Fondo del menú móvil */}
      {sidebarAbierta && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setSidebarAbierta(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Barra lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[17.5rem] max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarAbierta ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[4.75rem] items-center justify-between gap-3 border-b border-slate-100 px-5">
          <Link
            href="/inicio"
            className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4FC4]/40"
          >
            <UTBLogo className="h-8 shrink-0" priority />
            <span className="min-w-0 leading-tight">
              <span className="block text-[15px] font-black tracking-tight text-[#0B4FC4]">
                StudyRoom
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                UTB
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarAbierta(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Cerrar menú"
          >
            <Icono nombre="cerrar" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Espacio de estudio
          </p>
          <ul className="space-y-1">
            {itemsVisibles.map((item) => {
              const activo = itemActivo(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={activo ? 'page' : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      activo
                        ? 'bg-blue-50 text-[#0B4FC4]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        activo
                          ? 'bg-[#0B4FC4] text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[#0B4FC4]'
                      }`}
                    >
                      <Icono nombre={item.icono} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="truncate">{item.etiqueta}</span>
                    {activo && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0B4FC4]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-100 p-3">
          <Link
            href="/perfil"
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B4FC4] text-xs font-black text-white">
              {iniciales || 'SR'}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-xs font-bold text-slate-800">
                {user?.nombre ?? 'Mi cuenta'}
              </span>
              <span className="block text-[11px] text-slate-500">{rol}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={cerrarSesion}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Icono nombre="salir" className="h-[18px] w-[18px]" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="lg:pl-[17.5rem]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="flex h-[4.75rem] items-center gap-2 px-3 sm:gap-4 sm:px-5 lg:px-7">
            <button
              type="button"
              onClick={() => setSidebarAbierta(true)}
              className="shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:hidden"
              aria-label="Abrir menú"
            >
              <Icono nombre="menu" className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={() => setBuscadorAbierto(true)}
              className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-400 transition-colors hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4FC4]/30 sm:max-w-md"
              aria-label="Buscar o ir a una sección"
            >
              <Icono nombre="buscar" className="h-[18px] w-[18px] shrink-0" />
              <span className="min-w-0 flex-1 truncate">Buscar o ir a…</span>
              <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:inline">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={alternarTema}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0B4FC4]"
                aria-label={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
                title={temaOscuro ? 'Modo claro' : 'Modo oscuro'}
              >
                <Icono nombre={temaOscuro ? 'sol' : 'luna'} className="h-5 w-5" />
              </button>

              <NotificationBell />

              <button
                type="button"
                onClick={() => router.push('/perfil')}
                title="Ver mi perfil"
                aria-label="Ver mi perfil"
                className="ml-0.5 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-1 transition-colors hover:border-[#0B4FC4]/40 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4FC4]/40 sm:pr-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B4FC4] text-[11px] font-black text-white">
                  {iniciales || 'SR'}
                </span>
                <span className="hidden max-w-[8rem] truncate text-xs font-bold text-slate-700 sm:inline">
                  {user?.nombre?.split(/\s+/)[0] ?? 'Perfil'}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>

      {/* Buscador / paleta de navegación */}
      {buscadorAbierto && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/50 px-3 pt-[12vh] backdrop-blur-sm sm:px-4">
          <button
            type="button"
            aria-label="Cerrar buscador"
            className="absolute inset-0 cursor-default"
            onClick={() => setBuscadorAbierto(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4">
              <Icono nombre="buscar" className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                ref={buscadorRef}
                value={consulta}
                onChange={(evento) => setConsulta(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter' && resultados[0]) {
                    evento.preventDefault();
                    irA(resultados[0].href);
                  }
                }}
                placeholder="Buscar o ir a…"
                className="h-14 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                aria-label="Buscar o ir a una sección"
              />
              <button
                type="button"
                onClick={() => setBuscadorAbierto(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar buscador"
              >
                <Icono nombre="cerrar" className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {resultados.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">
                  No encontramos secciones con “{consulta}”.
                </p>
              ) : (
                <>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Ir a
                  </p>
                  <ul>
                    {resultados.map((item) => (
                      <li key={item.href}>
                        <button
                          type="button"
                          onClick={() => irA(item.href)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#0B4FC4]"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <Icono nombre={item.icono} className="h-[18px] w-[18px]" />
                          </span>
                          <span className="flex-1">{item.etiqueta}</span>
                          <Icono nombre="flecha" className="h-4 w-4 text-slate-300" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-400">
              <span>Enter para abrir · Esc para cerrar</span>
              <span className="font-semibold">StudyRoom</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
