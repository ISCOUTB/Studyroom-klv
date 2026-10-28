export interface DisponibilidadMonitor {
  id: string;
  fecha: string;
  diaSemana: string;
  horaIni: string;
  horaFin: string;
  ocupado: boolean;
  solicitado: boolean;
}

export interface Monitor {
  id: string;
  nombre: string;
  correo: string;
  carrera: string;
  semestre: number;
  fotoUrl: string | null;
  biografia: string | null;
  experiencia: string | null;
  modalidad: 'Virtual' | 'Presencial';
  ubicacion: string | null;
  asignaturas: string[];
  promedio: number;
  totalResenas: number;
  disponibilidad: DisponibilidadMonitor[];
  aprobado?: boolean;
  solicitudEn?: string;
}

export interface Tutoria {
  id: string;
  estado: string;
  estadoCodigo:
    | 'SOLICITADA'
    | 'AGENDADA'
    | 'RECHAZADA'
    | 'EXPIRADA'
    | 'CANCELADA'
    | 'FINALIZADA';
  solicitadaEn: string;
  expiraEn: string;
  respondidaEn: string | null;
  programadaEn: string | null;
  modalidad: 'Virtual' | 'Presencial';
  ubicacion: string | null;
  notas: string | null;
  monitor: {
    id: string;
    nombre: string;
    correo: string;
    carrera: string;
    semestre: number;
  };
  solicitante: {
    id: string;
    nombre: string;
    correo: string;
  };
  disponibilidad: {
    id: string;
    fecha: string;
    diaSemana: string;
    horaIni: string;
    horaFin: string;
  } | null;
  soyMonitor: boolean;
  soySolicitante: boolean;
  calificacion: { puntaje: number; comentario: string | null } | null;
  puedeCalificar: boolean;
}

export interface SolicitudMonitor {
  aprobado: boolean;
  carrera: string;
  semestre: number;
  biografia: string | null;
  experiencia: string | null;
  modalidad: 'Virtual' | 'Presencial';
  ubicacion: string | null;
  asignaturas: string[];
  solicitudEn: string;
}

export interface ContextoTutorias {
  esMonitor: boolean;
  esAdmin: boolean;
  solicitud: SolicitudMonitor | null;
}

export interface MonitorAdmin {
  id: string;
  nombre: string;
  correo: string;
  carrera: string;
  semestre: number;
  biografia: string | null;
  modalidad: 'Virtual' | 'Presencial';
  ubicacion: string | null;
  asignaturas: string[];
  aprobado: boolean;
  estado: 'Aprobado' | 'Pendiente';
  solicitudEn: string;
  bloquesDisponibles: number;
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "2026-10-30" -> "vie, 30 oct" */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return fecha;
  return FORMATO_FECHA.format(new Date(anio, mes - 1, dia)).replace('.', '');
}

/** "09:00" -> "9:00 a. m." */
export function formatearHora(hora: string): string {
  const [horas, minutos] = hora.split(':').map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return hora;
  const fecha = new Date(2020, 0, 1, horas, minutos);
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(fecha);
}

/** "14:00", "15:00" -> "2:00–3:00 p. m." (omite el sufijo repetido) */
export function formatearRango(horaIni: string, horaFin: string): string {
  const inicio = formatearHora(horaIni);
  const fin = formatearHora(horaFin);
  const sufijo = (valor: string) =>
    valor.match(/([ap])\.\s?m\.$/i)?.[1].toLowerCase() ?? null;

  const sufijoInicio = sufijo(inicio);
  const sufijoFin = sufijo(fin);

  if (sufijoInicio && sufijoInicio === sufijoFin) {
    return `${inicio.replace(/\s?[ap]\.\s?m\.$/i, '')}–${fin}`;
  }

  return `${inicio}–${fin}`;
}

export function formatearFechaHora(iso: string | null): string {
  if (!iso) return 'Por definir';
  return FORMATO_FECHA_HORA.format(new Date(iso)).replace('.', '');
}

export function fechaLocalISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** "2026-10-27" -> Date local a medianoche. */
export function parseFechaLocal(fecha: string): Date | null {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  const date = new Date(anio, mes - 1, dia);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-10-27", "14:00" -> "Mar 27 oct · 2:00 p. m." */
export function formatearChipHorario(fecha: string, hora: string): string {
  const date = parseFechaLocal(fecha);
  if (!date) return `${fecha} · ${formatearHora(hora)}`;

  const partes = new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(date);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  const diaSemana = valor('weekday').replace('.', '');
  const diaSemanaCapitalizado =
    diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

  return `${diaSemanaCapitalizado} ${valor('day')} ${valor('month').replace(
    '.',
    ''
  )} · ${formatearHora(hora)}`;
}

/** "2026-10-27" -> "MARTES, 27 DE OCTUBRE" */
export function formatearDiaLargo(fecha: string): string {
  const date = parseFechaLocal(fecha);
  if (!date) return fecha;

  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(date)
    .toUpperCase();
}

/** Agrupa bloques por fecha conservando el orden de llegada. */
export function agruparPorDia<T extends { fecha: string }>(
  bloques: T[]
): Array<{ fecha: string; etiqueta: string; bloques: T[] }> {
  const grupos = new Map<string, T[]>();

  for (const bloque of bloques) {
    const lista = grupos.get(bloque.fecha);
    if (lista) {
      lista.push(bloque);
    } else {
      grupos.set(bloque.fecha, [bloque]);
    }
  }

  return Array.from(grupos.entries()).map(([fecha, items]) => ({
    fecha,
    etiqueta: formatearDiaLargo(fecha),
    bloques: items,
  }));
}

export function estadoTutoriaClase(estado: string): string {
  switch (estado) {
    case 'Agendada':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Solicitada':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Finalizada':
      return 'bg-blue-100 text-[#0B4FC4] border-blue-200';
    case 'Rechazada':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'Cancelada':
    case 'Expirada':
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function nombreCorto(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}
