'use client';

import React, { useEffect, useRef, useState } from 'react';
import { API_URL, apiRequest } from '@/lib/api';

interface AvatarEditorProps {
  nombre: string;
  fotoUrl: string | null;
  token: string | null;
  onChange: (fotoUrl: string | null) => void;
  onError: (mensaje: string) => void;
}

const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function urlAbsoluta(fotoUrl: string | null): string | null {
  if (!fotoUrl) return null;
  return fotoUrl.startsWith('http') ? fotoUrl : `${API_URL}${fotoUrl}`;
}

export function AvatarEditor({
  nombre,
  fotoUrl,
  token,
  onChange,
  onError,
}: AvatarEditorProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!menuAbierto) return;

    const cerrar = (evento: MouseEvent) => {
      if (contenedorRef.current?.contains(evento.target as Node)) return;
      setMenuAbierto(false);
    };

    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [menuAbierto]);

  useEffect(() => {
    if (!confirmarEliminar) return;

    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !eliminando) {
        setConfirmarEliminar(false);
      }
    };

    document.addEventListener('keydown', cerrarConEscape);
    return () => document.removeEventListener('keydown', cerrarConEscape);
  }, [confirmarEliminar, eliminando]);

  const subirFoto = async (archivo: File) => {
    if (!token) {
      onError('Tu sesión no está activa. Inicia sesión de nuevo.');
      return;
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      onError('Formato no permitido. Usa una imagen JPG, PNG o WEBP.');
      return;
    }

    if (archivo.size > MAX_FOTO_BYTES) {
      onError('La foto supera el límite de 5 MB.');
      return;
    }

    onError('');
    setSubiendo(true);

    try {
      const formulario = new FormData();
      formulario.append('foto', archivo);

      const data = await apiRequest<{ fotoUrl: string }>('/api/auth/foto', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formulario,
      });

      onChange(data.fotoUrl);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'No se pudo subir la foto.'
      );
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarFoto = async () => {
    if (!token) {
      onError('Tu sesión no está activa. Inicia sesión de nuevo.');
      return;
    }

    onError('');
    setEliminando(true);
    setMenuAbierto(false);

    try {
      await apiRequest('/api/auth/foto', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onChange(null);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'No se pudo eliminar la foto.'
      );
    } finally {
      setEliminando(false);
      setConfirmarEliminar(false);
    }
  };

  const ocupado = subiendo || eliminando;
  const imagen = urlAbsoluta(fotoUrl);

  return (
    <div ref={contenedorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuAbierto((abierto) => !abierto)}
        disabled={ocupado}
        aria-haspopup="menu"
        aria-expanded={menuAbierto}
        aria-label="Opciones de foto de perfil"
        className="group relative block h-24 w-24 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0B4FC4]/40 disabled:cursor-wait"
      >
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagen}
            alt={`Foto de ${nombre}`}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-sm"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-[#0B4FC4] text-2xl font-black text-white ring-4 ring-white shadow-sm"
          >
            {iniciales(nombre)}
          </span>
        )}

        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-[10px] font-bold uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
          Editar
        </span>

        {ocupado && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          </span>
        )}
      </button>

      {menuAbierto && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuAbierto(false);
              inputRef.current?.click();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            📷 Editar foto
          </button>

          {fotoUrl && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuAbierto(false);
                setConfirmarEliminar(true);
              }}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              🗑️ Eliminar foto
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_PERMITIDOS.join(',')}
        className="sr-only"
        aria-label="Seleccionar foto de perfil"
        onChange={(e) => {
          const archivo = e.target.files?.[0] ?? null;
          e.target.value = '';
          if (archivo) subirFoto(archivo);
        }}
      />

      {confirmarEliminar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          onClick={() => {
            if (!eliminando) setConfirmarEliminar(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-eliminar-foto"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-lg"
              >
                🗑️
              </span>
              <div>
                <h2
                  id="titulo-eliminar-foto"
                  className="text-base font-bold text-slate-900"
                >
                  ¿Deseas eliminar la foto?
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Se quitará de tu perfil y no se podrá recuperar.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmarEliminar(false)}
                disabled={eliminando}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={eliminarFoto}
                disabled={eliminando}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {eliminando ? 'Eliminando…' : 'Eliminar foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
