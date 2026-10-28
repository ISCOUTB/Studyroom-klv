'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useCatalogo } from '@/lib/catalogo';
import { type PreguntaForo } from '@/lib/foro';

interface ModalPreguntaProps {
  abierto: boolean;
  token: string | null;
  onCerrar: () => void;
  onCreada: (pregunta: PreguntaForo) => void;
}

export function ModalPregunta({
  abierto,
  token,
  onCerrar,
  onCreada,
}: ModalPreguntaProps) {
  const [titulo, setTitulo] = useState('');
  const [asignatura, setAsignatura] = useState('');
  const [tema, setTema] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { activas } = useCatalogo();

  // Formulario limpio cada vez que se abre.
  useEffect(() => {
    if (!abierto) return;
    setTitulo('');
    setAsignatura('');
    setTema('');
    setDescripcion('');
    setError('');
    setEnviando(false);
  }, [abierto]);

  // Cerrar con Escape y bloquear el scroll de fondo.
  useEffect(() => {
    if (!abierto) return;

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !enviando) onCerrar();
    };

    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alPresionar);

    return () => {
      document.body.style.overflow = overflowOriginal;
      window.removeEventListener('keydown', alPresionar);
    };
  }, [abierto, enviando, onCerrar]);

  if (!abierto) return null;

  const handleSubmit = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setError('');

    const tituloLimpio = titulo.trim();
    const descripcionLimpia = descripcion.trim();
    const temaLimpio = tema.trim();

    if (tituloLimpio.length < 5) {
      setError('El título debe tener al menos 5 caracteres.');
      return;
    }
    if (!asignatura) {
      setError('Selecciona una asignatura.');
      return;
    }
    if (descripcionLimpia.length < 10) {
      setError('La descripción debe tener al menos 10 caracteres.');
      return;
    }
    if (!token) {
      setError('Tu sesión no está activa. Inicia sesión de nuevo.');
      return;
    }

    setEnviando(true);
    try {
      const data = await apiRequest<{ pregunta: PreguntaForo }>('/api/foro', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo: tituloLimpio,
          asignatura,
          tema: temaLimpio,
          descripcion: descripcionLimpia,
        }),
      });

      onCreada(data.pregunta);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo publicar tu pregunta.'
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        onClick={() => {
          if (!enviando) onCerrar();
        }}
        className="absolute inset-0 cursor-default"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-pregunta-titulo"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="shrink-0 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="modal-pregunta-titulo"
                className="text-lg font-black tracking-tight text-slate-900"
              >
                Hacer una pregunta
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Comparte tu duda con compañeros y monitores.
              </p>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              disabled={enviando}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="foro-titulo"
                  className="mb-1.5 block text-xs font-bold text-slate-700"
                >
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  id="foro-titulo"
                  type="text"
                  required
                  maxLength={150}
                  value={titulo}
                  onChange={(evento) => setTitulo(evento.target.value)}
                  placeholder="Ej.: ¿Cómo identifico una función par?"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="foro-asignatura"
                  className="mb-1.5 block text-xs font-bold text-slate-700"
                >
                  Asignatura <span className="text-red-500">*</span>
                </label>
                <select
                  id="foro-asignatura"
                  required
                  value={asignatura}
                  onChange={(evento) => setAsignatura(evento.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                >
                  <option value="">Elige una asignatura…</option>
                  {activas.map((materia) => (
                    <option key={materia.id} value={materia.nombre}>
                      {materia.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="foro-tema"
                  className="mb-1.5 block text-xs font-bold text-slate-700"
                >
                  Tema{' '}
                  <span className="font-medium text-slate-400">(opcional)</span>
                </label>
                <input
                  id="foro-tema"
                  type="text"
                  maxLength={80}
                  value={tema}
                  onChange={(evento) => setTema(evento.target.value)}
                  placeholder="Ej.: Límites"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="foro-descripcion"
                  className="mb-1.5 block text-xs font-bold text-slate-700"
                >
                  Descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="foro-descripcion"
                  required
                  rows={5}
                  maxLength={1000}
                  value={descripcion}
                  onChange={(evento) => setDescripcion(evento.target.value)}
                  placeholder="Describe tu duda con el detalle suficiente para que puedan ayudarte…"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/20"
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">
                  {descripcion.length}/1000
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
                >
                  {error}
                </div>
              )}
            </div>
          </div>

          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCerrar}
              disabled={enviando}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-[#0B4FC4] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Publicando…' : 'Publicar pregunta'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
