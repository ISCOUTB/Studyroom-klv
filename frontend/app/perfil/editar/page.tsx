'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/AppShell';
import { AvatarEditor } from '@/components/perfil/AvatarEditor';
import { apiRequest } from '@/lib/api';

const PAISES = [
  'Colombia',
  'Venezuela',
  'Ecuador',
  'Panamá',
  'Perú',
  'México',
  'Argentina',
  'Chile',
  'España',
];

const ZONAS_HORARIAS: { valor: string; etiqueta: string }[] = [
  { valor: 'America/Bogota', etiqueta: 'América/Bogotá' },
  { valor: 'America/Caracas', etiqueta: 'América/Caracas' },
  { valor: 'America/Guayaquil', etiqueta: 'América/Guayaquil' },
  { valor: 'America/Lima', etiqueta: 'América/Lima' },
  { valor: 'America/Panama', etiqueta: 'América/Panamá' },
  { valor: 'America/Mexico_City', etiqueta: 'América/Ciudad de México' },
  { valor: 'America/Santiago', etiqueta: 'América/Santiago' },
  {
    valor: 'America/Argentina/Buenos_Aires',
    etiqueta: 'América/Buenos Aires',
  },
  { valor: 'Europe/Madrid', etiqueta: 'Europa/Madrid' },
];

const VISIBILIDADES = [
  { valor: 'CURSO', etiqueta: 'Visible para los participantes del curso' },
  { valor: 'OCULTO', etiqueta: 'Oculto para todos' },
];

/**
 * El nombre completo se guarda en un solo campo. Si el usuario ya tiene
 * apellidos separados los respetamos; si no, aplicamos una separación
 * razonable (dos nombres + dos apellidos) para no perder información.
 */
function dividirNombre(
  nombreCompleto: string,
  apellidoGuardado?: string | null
): { nombres: string; apellidos: string } {
  const completo = nombreCompleto.trim();

  if (
    apellidoGuardado &&
    completo.toLowerCase().endsWith(apellidoGuardado.toLowerCase())
  ) {
    return {
      nombres: completo.slice(0, completo.length - apellidoGuardado.length).trim(),
      apellidos: apellidoGuardado.trim(),
    };
  }

  const partes = completo.split(/\s+/).filter(Boolean);

  if (partes.length >= 4) {
    return {
      nombres: partes.slice(0, 2).join(' '),
      apellidos: partes.slice(2).join(' '),
    };
  }
  if (partes.length === 3) {
    return { nombres: partes[0], apellidos: partes.slice(1).join(' ') };
  }
  if (partes.length === 2) {
    return { nombres: partes[0], apellidos: partes[1] };
  }
  return { nombres: completo, apellidos: '' };
}

export default function EditarPerfilPage() {
  const { user, token, isLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [pais, setPais] = useState('Colombia');
  const [zonaHoraria, setZonaHoraria] = useState('America/Bogota');
  const [visibilidad, setVisibilidad] = useState('CURSO');
  const [carrera, setCarrera] = useState('');
  const [semestre, setSemestre] = useState('1');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  const [generalAbierto, setGeneralAbierto] = useState(true);
  const [mostrarInfoVisibilidad, setMostrarInfoVisibilidad] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const refrescadoRef = useRef(false);
  const prellenadoRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      router.push('/login');
      return;
    }

    if (refrescadoRef.current) return;
    refrescadoRef.current = true;
    refreshUser().catch(() => {
      // Si falla seguimos con los datos disponibles en el contexto.
    });
  }, [isLoading, user, token, router, refreshUser]);

  useEffect(() => {
    if (!user) return;
    if (prellenadoRef.current === user.id) return;
    prellenadoRef.current = user.id;

    const { nombres: n, apellidos: a } = dividirNombre(
      user.nombre,
      user.apellido
    );

    setNombres(n);
    setApellidos(a);
    setCiudad(user.ciudad ?? '');
    setPais(user.pais ?? 'Colombia');
    setZonaHoraria(user.zonaHoraria ?? 'America/Bogota');
    setVisibilidad(user.visibilidadCorreo ?? 'CURSO');
    setFotoUrl(user.fotoUrl ?? null);
    setCarrera(user.estudiante?.carrera ?? '');
    setSemestre(String(user.estudiante?.semestre ?? 1));
  }, [user]);

  if (isLoading || !user) return null;

  const nombreCompleto = `${nombres.trim()} ${apellidos.trim()}`.trim();

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (!token) return;

    if (nombres.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    const numeroSemestre = Number(semestre);
    if (
      user.estudiante &&
      (!Number.isInteger(numeroSemestre) ||
        numeroSemestre < 1 ||
        numeroSemestre > 12)
    ) {
      setError('El semestre debe ser un número entre 1 y 12.');
      return;
    }

    setGuardando(true);
    try {
      await apiRequest('/api/auth/perfil', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: nombres.trim(),
          apellido: apellidos.trim(),
          ciudad: ciudad.trim(),
          pais,
          zonaHoraria,
          visibilidadCorreo: visibilidad,
          ...(user.estudiante
            ? { carrera: carrera.trim(), semestre: numeroSemestre }
            : {}),
        }),
      });

      await refreshUser();
      setExito('Cambios guardados correctamente.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron guardar los cambios.'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppShell>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Migas de pan */}
        <nav aria-label="Ruta de navegación" className="mb-6 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => router.push('/perfil')}
            className="font-semibold hover:text-[#0B4FC4] hover:underline"
          >
            Preferencias
          </button>
          <span className="mx-2 text-slate-300">/</span>
          <span className="font-semibold text-slate-700">Editar perfil</span>
        </nav>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {exito && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {exito}
          </div>
        )}

        {/* Cabecera con foto y nombre */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <AvatarEditor
            nombre={nombreCompleto || user.nombre}
            fotoUrl={fotoUrl}
            token={token}
            onChange={(nuevaFoto) => {
              setFotoUrl(nuevaFoto);
              refreshUser().catch(() => {});
            }}
            onError={setError}
          />

          <div className="flex flex-1 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {nombreCompleto || user.nombre}
            </h1>
          </div>
        </div>

        <h2 className="mt-8 text-3xl font-black tracking-tight text-slate-900">
          {nombreCompleto || user.nombre}
        </h2>

        <form onSubmit={handleGuardar} className="mt-6">
          {/* Sección General */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setGeneralAbierto((abierto) => !abierto)}
              aria-expanded={generalAbierto}
              aria-controls="seccion-general"
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform ${
                    generalAbierto ? 'rotate-180' : ''
                  }`}
                >
                  <path d="M5 8l5 5 5-5" />
                </svg>
              </span>
              <span className="text-xl font-bold text-slate-900">General</span>
            </button>

            {generalAbierto && (
              <div
                id="seccion-general"
                className="space-y-4 border-t border-slate-100 px-5 py-5 sm:px-6"
              >
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                  <label
                    htmlFor="perfil-nombres"
                    className="text-sm font-medium text-slate-700"
                  >
                    Nombre
                  </label>
                  <input
                    id="perfil-nombres"
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    maxLength={80}
                    required
                    disabled={guardando}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/30 disabled:opacity-60"
                  />

                  <label
                    htmlFor="perfil-apellidos"
                    className="text-sm font-medium text-slate-700"
                  >
                    Apellido(s)
                  </label>
                  <input
                    id="perfil-apellidos"
                    type="text"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    maxLength={80}
                    disabled={guardando}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/30 disabled:opacity-60"
                  />

                  <label
                    htmlFor="perfil-correo"
                    className="text-sm font-medium text-slate-700"
                  >
                    Dirección de correo
                  </label>
                  <input
                    id="perfil-correo"
                    type="email"
                    value={user.correo}
                    readOnly
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500"
                  />

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="perfil-visibilidad"
                      className="text-sm font-medium text-slate-700"
                    >
                      Visibilidad del correo electrónico
                    </label>
                    <button
                      type="button"
                      onClick={() => setMostrarInfoVisibilidad((v) => !v)}
                      aria-expanded={mostrarInfoVisibilidad}
                      aria-label="Qué significa la visibilidad del correo"
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0B4FC4] text-[10px] font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4FC4]/40"
                    >
                      ?
                    </button>
                  </div>
                  <div>
                    <select
                      id="perfil-visibilidad"
                      value={visibilidad}
                      onChange={(e) => setVisibilidad(e.target.value)}
                      disabled={guardando}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/30 disabled:opacity-60"
                    >
                      {VISIBILIDADES.map((opcion) => (
                        <option key={opcion.valor} value={opcion.valor}>
                          {opcion.etiqueta}
                        </option>
                      ))}
                    </select>
                    {mostrarInfoVisibilidad && (
                      <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800">
                        Si eliges «Visible», los participantes de tus salas de
                        estudio podrán ver tu correo institucional. Si eliges
                        «Oculto», solo tú y los administradores podrán verlo.
                      </p>
                    )}
                  </div>

                  <label
                    htmlFor="perfil-ciudad"
                    className="text-sm font-medium text-slate-700"
                  >
                    Ciudad/Pueblo
                  </label>
                  <input
                    id="perfil-ciudad"
                    type="text"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    maxLength={80}
                    placeholder="Ej. Cartagena"
                    disabled={guardando}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/30 disabled:opacity-60"
                  />

                  <label
                    htmlFor="perfil-pais"
                    className="text-sm font-medium text-slate-700"
                  >
                    Seleccione su país
                  </label>
                  <select
                    id="perfil-pais"
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    disabled={guardando}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/30 disabled:opacity-60"
                  >
                    {!PAISES.includes(pais) && (
                      <option value={pais}>{pais}</option>
                    )}
                    {PAISES.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion}
                      </option>
                    ))}
                  </select>

                  <label
                    htmlFor="perfil-zona"
                    className="text-sm font-medium text-slate-700"
                  >
                    Zona horaria
                  </label>
                  <select
                    id="perfil-zona"
                    value={zonaHoraria}
                    onChange={(e) => setZonaHoraria(e.target.value)}
                    disabled={guardando}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/30 disabled:opacity-60"
                  >
                    {!ZONAS_HORARIAS.some((z) => z.valor === zonaHoraria) && (
                      <option value={zonaHoraria}>{zonaHoraria}</option>
                    )}
                    {ZONAS_HORARIAS.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* Información académica (solo estudiantes) */}
          {user.estudiante && (
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  🎓
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  Información académica
                </h2>
              </div>

              <div className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center sm:px-6">
                <label
                  htmlFor="perfil-carrera"
                  className="text-sm font-medium text-slate-700"
                >
                  Carrera
                </label>
                <input
                  id="perfil-carrera"
                  type="text"
                  value={carrera}
                  onChange={(e) => setCarrera(e.target.value)}
                  maxLength={80}
                  required
                  disabled={guardando}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-[#0B4FC4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/30 disabled:opacity-60"
                />

                <label
                  htmlFor="perfil-semestre"
                  className="text-sm font-medium text-slate-700"
                >
                  Semestre
                </label>
                <select
                  id="perfil-semestre"
                  value={semestre}
                  onChange={(e) => setSemestre(e.target.value)}
                  disabled={guardando}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#0B4FC4] focus:outline-none focus:ring-2 focus:ring-[#0B4FC4]/30 disabled:opacity-60"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          {user.rol === 'TUTOR' && (
            <p className="mt-5 text-xs text-slate-500">
              ¿Quieres editar tu biografía, asignaturas y disponibilidad?{' '}
              <button
                type="button"
                onClick={() => router.push('/perfil/monitor')}
                className="font-bold text-[#0B4FC4] hover:underline"
              >
                Editar perfil de monitor
              </button>
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push('/perfil')}
              disabled={guardando}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 transition-colors hover:bg-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-[#0B4FC4] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#093fa3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </main>
    </AppShell>
  );
}
