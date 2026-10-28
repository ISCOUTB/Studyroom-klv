import prisma from '../../config/prisma';

/**
 * Catálogo inicial. Se usa como respaldo si la tabla `asignaturas` todavía
 * no tiene registros (por ejemplo, en una base recién creada sin migración).
 */
export const ASIGNATURAS_RESPALDO = [
  'Cálculo I',
  'Física I',
  'Álgebra Lineal',
  'Estadística',
  'Cálculo Integral',
] as const;

export const COLORES_ASIGNATURA = [
  'blue',
  'emerald',
  'amber',
  'rose',
  'violet',
  'sky',
  'indigo',
  'teal',
  'orange',
  'slate',
] as const;

const COLOR_RESPALDO: Record<string, string> = {
  'Cálculo I': 'blue',
  'Física I': 'emerald',
  'Álgebra Lineal': 'amber',
  Estadística: 'rose',
  'Cálculo Integral': 'violet',
};

export interface AsignaturaPublica {
  id: string;
  nombre: string;
  color: string;
  activa: boolean;
}

export function esColorValido(color: string): boolean {
  return (COLORES_ASIGNATURA as readonly string[]).includes(color);
}

function respaldo(): AsignaturaPublica[] {
  return ASIGNATURAS_RESPALDO.map((nombre, indice) => ({
    id: `respaldo-${indice + 1}`,
    nombre,
    color: COLOR_RESPALDO[nombre] ?? 'slate',
    activa: true,
  }));
}

export async function listarAsignaturas(
  soloActivas = false,
  usarRespaldo = true
): Promise<AsignaturaPublica[]> {
  const total = await prisma.asignatura.count();
  if (total === 0) {
    return usarRespaldo ? respaldo() : [];
  }

  const asignaturas = await prisma.asignatura.findMany({
    where: soloActivas ? { activa: true } : undefined,
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, color: true, activa: true },
  });

  return asignaturas;
}

export async function catalogoVacio(): Promise<boolean> {
  return (await prisma.asignatura.count()) === 0;
}

export async function nombresAsignaturasActivas(): Promise<string[]> {
  const total = await prisma.asignatura.count();
  if (total === 0) return [...ASIGNATURAS_RESPALDO];

  const activas = await prisma.asignatura.findMany({
    where: { activa: true },
    orderBy: { nombre: 'asc' },
    select: { nombre: true },
  });

  return activas.map((asignatura) => asignatura.nombre);
}

export async function esAsignaturaActiva(nombre: string): Promise<boolean> {
  const nombres = await nombresAsignaturasActivas();
  return nombres.includes(nombre);
}
