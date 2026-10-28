'use client';

import React from 'react';
import { API_URL } from '@/lib/api';
import { inicialesDe } from '@/lib/salas';

interface AvatarForoProps {
  nombre: string;
  fotoUrl?: string | null;
  tamano?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TAMANOS: Record<NonNullable<AvatarForoProps['tamano']>, string> = {
  sm: 'h-6 w-6 text-[9px]',
  md: 'h-8 w-8 text-[10px]',
  lg: 'h-10 w-10 text-xs',
};

function urlAbsoluta(fotoUrl: string): string {
  return fotoUrl.startsWith('http') ? fotoUrl : `${API_URL}${fotoUrl}`;
}

export function AvatarForo({
  nombre,
  fotoUrl,
  tamano = 'md',
  className = '',
}: AvatarForoProps) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0B4FC4] font-black uppercase text-white ${TAMANOS[tamano]} ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 flex items-center justify-center">
        {inicialesDe(nombre) || 'SR'}
      </span>
      {fotoUrl && (
        <img
          src={urlAbsoluta(fotoUrl)}
          alt=""
          className="relative h-full w-full object-cover"
          onError={(evento) => {
            evento.currentTarget.style.display = 'none';
          }}
        />
      )}
    </span>
  );
}
