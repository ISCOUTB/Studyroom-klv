export type TipoReporte = 'MATERIAL' | 'PREGUNTA' | 'RESPUESTA' | 'MENSAJE';
export type EstadoReporte = 'PENDIENTE' | 'RESUELTO';

export interface ResumenAdmin {
  usuarios: { total: number; nuevos7dias: number };
  activacion: { porcentaje: number; estudiantes: number; participantes: number };
  salas: { activas: number; total: number };
  tutorias: { finalizadas: number; total: number };
  calificacion: { promedio: number; calificadas: number };
  foro: { preguntas: number };
  ejercicios: { resueltos: number };
  materiales: { total: number };
  reportes: { pendientes: number };
}

export interface AsignaturaAdmin {
  id: string;
  nombre: string;
  color: string;
  activa: boolean;
}

export interface ReporteAdmin {
  id: string;
  tipo: TipoReporte;
  referenciaId: string;
  motivo: string;
  estado: EstadoReporte;
  creadoEn: string;
  resueltoEn: string | null;
  reportante: { id: string; nombre: string };
  resueltoPor: { id: string; nombre: string } | null;
}

export interface RegistroAuditoria {
  id: string;
  accion: string;
  detalle: string;
  creadoEn: string;
  admin: { id: string; nombre: string };
}

export interface PaginacionAuditoria {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export const ETIQUETA_TIPO_REPORTE: Record<TipoReporte, string> = {
  MATERIAL: 'Material',
  PREGUNTA: 'Pregunta',
  RESPUESTA: 'Respuesta',
  MENSAJE: 'Mensaje',
};

export const ETIQUETA_ACCION_AUDITORIA: Record<string, string> = {
  MONITOR_APROBADO: 'Monitor aprobado',
  MONITOR_RECHAZADO: 'Monitor rechazado',
  CONTENIDO_RETIRADO: 'Contenido retirado',
  REPORTE_DESCARTADO: 'Reporte descartado',
  ASIGNATURA_CREADA: 'Asignatura creada',
  ASIGNATURA_ACTUALIZADA: 'Asignatura actualizada',
};

/** "28 oct 2026, 2:30 p. m." */
export function formatearFechaAdmin(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(fecha);
}
