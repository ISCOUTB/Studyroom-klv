export type PuntoTrazo = { x: number; y: number };

export type TrazoPizarra = {
  id: string;
  tipo: 'trazo' | 'texto';
  color: string;
  grosor: number;
  datos: {
    puntos?: PuntoTrazo[];
    texto?: string;
    x?: number;
    y?: number;
  };
  creadoEn: string;
  usuarioId: string;
  usuarioNombre: string;
};

export type HerramientaPizarra = 'dibujar' | 'borrar' | 'texto';

export const COLORES_PIZARRA = [
  { nombre: 'Azul', valor: '#1D4ED8' },
  { nombre: 'Negro', valor: '#0F172A' },
  { nombre: 'Rojo', valor: '#DC2626' },
  { nombre: 'Verde', valor: '#059669' },
] as const;

export const GROSORES_PIZARRA = [2, 4, 7, 11] as const;

export const COLOR_POR_DEFECTO = COLORES_PIZARRA[0].valor;
export const GROSOR_POR_DEFECTO = GROSORES_PIZARRA[1];

/** Paleta estable por usuario para cursores y su nombre. */
const COLORES_USUARIO = [
  '#1D4ED8',
  '#DC2626',
  '#059669',
  '#7C3AED',
  '#EA580C',
  '#0891B2',
];

export function colorDeUsuario(id: string): string {
  let suma = 0;
  for (let i = 0; i < id.length; i += 1) {
    suma = (suma + id.charCodeAt(i)) % 997;
  }
  return COLORES_USUARIO[suma % COLORES_USUARIO.length];
}

export function distanciaASegmento(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const largo = dx * dx + dy * dy;

  if (largo === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / largo;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
