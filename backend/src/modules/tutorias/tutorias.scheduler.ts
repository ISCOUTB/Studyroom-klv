import {
  actualizarSolicitudesExpiradas,
  enviarRecordatoriosProximos,
  MINUTOS_RECORDATORIO,
} from './tutorias.service';
import { activarSalasProgramadas } from '../salas/salas.service';

/**
 * Cada cuánto se ejecuta el ciclo de mantenimiento. En producción conviene
 * dejarlo en 60 s; en desarrollo se puede bajar con SCHEDULER_INTERVAL_MS.
 */
const INTERVALO_MS = Math.max(
  Number(process.env.SCHEDULER_INTERVAL_MS) || 60_000,
  1_000
);

let temporizador: NodeJS.Timeout | null = null;
let ejecutando = false;

async function ejecutarCiclo() {
  if (ejecutando) return;
  ejecutando = true;

  try {
    const expiradas = await actualizarSolicitudesExpiradas();
    const recordatorios = await enviarRecordatoriosProximos();
    const salasActivadas = await activarSalasProgramadas();

    if (expiradas > 0 || recordatorios > 0 || salasActivadas > 0) {
      console.log(
        `[scheduler] ${expiradas} solicitud(es) expirada(s), ${recordatorios} recordatorio(s) enviado(s), ${salasActivadas} sala(s) activada(s).`
      );
    }
  } catch (error) {
    console.error('[scheduler] Error en el ciclo de tutorías:', error);
  } finally {
    ejecutando = false;
  }
}

/**
 * Inicia el mantenimiento periódico de tutorías:
 * - expira solicitudes vencidas aunque nadie consulte la API;
 * - envía recordatorios de las tutorías que comienzan pronto.
 *
 * El flag `ejecutando` evita solapar ciclos si una consulta tarda más que el
 * intervalo configurado.
 */
export function iniciarSchedulerTutorias() {
  if (process.env.SCHEDULER_ENABLED === 'false') {
    console.log('[scheduler] Deshabilitado por SCHEDULER_ENABLED=false.');
    return;
  }
  if (temporizador) return;

  console.log(
    `[scheduler] Activo cada ${Math.round(INTERVALO_MS / 1000)} s; recordatorios con ${MINUTOS_RECORDATORIO} min de anticipación.`
  );

  void ejecutarCiclo();
  temporizador = setInterval(() => {
    void ejecutarCiclo();
  }, INTERVALO_MS);

  // No impide que el proceso termine si el servidor HTTP se cierra.
  temporizador.unref?.();
}

export function detenerSchedulerTutorias() {
  if (!temporizador) return;
  clearInterval(temporizador);
  temporizador = null;
}
