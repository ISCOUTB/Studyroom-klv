'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiRequest } from './api';
import { useAuth } from './auth-context';
import { ASIGNATURAS, colorDeMateria, type ColorMateria } from './salas';

export interface AsignaturaCatalogo {
  id: string;
  nombre: string;
  color: string;
  activa: boolean;
}

const COLOR_RESPALDO: Record<string, string> = {
  'Cálculo I': 'blue',
  'Física I': 'emerald',
  'Álgebra Lineal': 'amber',
  Estadística: 'rose',
  'Cálculo Integral': 'violet',
};

/** Lista fija usada solo si el catálogo del backend no está disponible. */
const RESPALDO: AsignaturaCatalogo[] = ASIGNATURAS.map((nombre, indice) => ({
  id: `respaldo-${indice + 1}`,
  nombre,
  color: COLOR_RESPALDO[nombre] ?? 'slate',
  activa: true,
}));

interface CatalogoContexto {
  asignaturas: AsignaturaCatalogo[];
  activas: AsignaturaCatalogo[];
  cargando: boolean;
  recargar: () => Promise<void>;
  colorDe: (nombre: string) => ColorMateria;
}

const CatalogoContext = createContext<CatalogoContexto | null>(null);

export function CatalogoProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [asignaturas, setAsignaturas] = useState<AsignaturaCatalogo[]>(RESPALDO);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    if (!token) {
      setAsignaturas(RESPALDO);
      return;
    }

    setCargando(true);
    try {
      const datos = await apiRequest<{
        asignaturas: AsignaturaCatalogo[];
        respaldo?: boolean;
      }>('/api/asignaturas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAsignaturas(
        datos.respaldo ? RESPALDO : datos.asignaturas ?? []
      );
    } catch {
      // Sin conexión o catálogo vacío: se conserva la lista fija como respaldo.
      setAsignaturas(RESPALDO);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const activas = useMemo(
    () => asignaturas.filter((asignatura) => asignatura.activa),
    [asignaturas]
  );

  const colorDe = useCallback(
    (nombre: string) =>
      colorDeMateria(
        nombre,
        asignaturas.find((asignatura) => asignatura.nombre === nombre)?.color
      ),
    [asignaturas]
  );

  const valor = useMemo(
    () => ({ asignaturas, activas, cargando, recargar, colorDe }),
    [asignaturas, activas, cargando, recargar, colorDe]
  );

  return (
    <CatalogoContext.Provider value={valor}>{children}</CatalogoContext.Provider>
  );
}

export function useCatalogo(): CatalogoContexto {
  const contexto = useContext(CatalogoContext);
  if (!contexto) {
    throw new Error('useCatalogo debe usarse dentro de CatalogoProvider.');
  }
  return contexto;
}
