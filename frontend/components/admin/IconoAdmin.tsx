'use client';

import React from 'react';

export type IconoAdminNombre =
  | 'resumen'
  | 'monitores'
  | 'asignaturas'
  | 'reportes'
  | 'auditoria'
  | 'usuarios'
  | 'activacion'
  | 'salas'
  | 'tutorias'
  | 'calificacion'
  | 'foro'
  | 'ejercicios'
  | 'materiales'
  | 'pendientes'
  | 'mas'
  | 'editar'
  | 'flecha-izquierda'
  | 'flecha-derecha';

export function IconoAdmin({
  nombre,
  className = 'h-5 w-5',
}: {
  nombre: IconoAdminNombre;
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
    case 'resumen':
      return (
        <svg {...comunes}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case 'monitores':
    case 'usuarios':
      return (
        <svg {...comunes}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M17 5.5a3 3 0 0 1 0 5.6M18.5 20a5.5 5.5 0 0 0-2.2-4.4" />
        </svg>
      );
    case 'asignaturas':
      return (
        <svg {...comunes}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5Z" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      );
    case 'reportes':
    case 'pendientes':
      return (
        <svg {...comunes}>
          <path d="M5 21V4" />
          <path d="M5 4h11l-1.5 4L16 12H5" />
        </svg>
      );
    case 'auditoria':
      return (
        <svg {...comunes}>
          <rect x="4" y="3" width="16" height="18" rx="2.5" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case 'activacion':
      return (
        <svg {...comunes}>
          <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />
        </svg>
      );
    case 'salas':
      return (
        <svg {...comunes}>
          <rect x="3" y="5" width="13" height="14" rx="2.5" />
          <path d="m16 10 5-3v10l-5-3" />
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
    case 'calificacion':
      return (
        <svg {...comunes}>
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" />
        </svg>
      );
    case 'foro':
      return (
        <svg {...comunes}>
          <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case 'ejercicios':
      return (
        <svg {...comunes}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <path d="m7.5 12 3 3 6-6" />
        </svg>
      );
    case 'materiales':
      return (
        <svg {...comunes}>
          <path d="M6 3h8l4 4v14H6Z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      );
    case 'mas':
      return (
        <svg {...comunes}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'editar':
      return (
        <svg {...comunes}>
          <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
          <path d="m13.5 6.5 4 4" />
        </svg>
      );
    case 'flecha-izquierda':
      return (
        <svg {...comunes}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      );
    case 'flecha-derecha':
      return (
        <svg {...comunes}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}
