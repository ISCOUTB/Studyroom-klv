import {
  APP_URL,
  buildEmailHtml,
  deliverEmail,
} from '../../shared/email';

interface RecordatorioTutoria {
  correo: string;
  nombre: string;
  contraparte: string;
  esMonitor: boolean;
  fecha: string;
  modalidad: 'Virtual' | 'Presencial';
  ubicacion: string | null;
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Envía el correo de recordatorio a una de las dos partes de la tutoría.
 * El enlace abre directamente la pestaña "Mis tutorías".
 */
export async function enviarRecordatorioTutoria({
  correo,
  nombre,
  contraparte,
  esMonitor,
  fecha,
  modalidad,
  ubicacion,
}: RecordatorioTutoria) {
  const url = `${APP_URL}/tutorias#mis-tutorias`;
  const detalleLugar =
    modalidad === 'Presencial'
      ? ubicacion
        ? ` La tutoría será en ${ubicacion}.`
        : ' La tutoría será presencial.'
      : ' La tutoría será virtual.';

  const construirIntro = (
    nombreSeguro: string,
    contraparteSegura: string,
    lugarSeguro: string
  ) =>
    esMonitor
      ? `Hola ${nombreSeguro}, tienes una tutoría con ${contraparteSegura} programada para ${fecha}.${lugarSeguro} Ingresa a la plataforma unos minutos antes para revisar los detalles.`
      : `Hola ${nombreSeguro}, tu tutoría con ${contraparteSegura} está programada para ${fecha}.${lugarSeguro} Ingresa a la plataforma unos minutos antes para revisar los detalles.`;

  const intro = construirIntro(nombre, contraparte, detalleLugar);
  const introHtml = construirIntro(
    escaparHtml(nombre),
    escaparHtml(contraparte),
    escaparHtml(detalleLugar)
  );

  const text = `${intro}\n\nVer mi tutoría: ${url}\n\nSi no puedes asistir, cancela la tutoría desde la plataforma para liberar el horario.`;

  await deliverEmail({
    to: correo,
    subject: `Recordatorio: tutoría el ${fecha} — Campus Collaborative Study`,
    devLabel: 'Recordatorio de tutoría',
    devUrl: url,
    devDetalle: `${fecha} · ${modalidad}${
      modalidad === 'Presencial' && ubicacion ? ` · ${ubicacion}` : ''
    } · con ${contraparte}`,
    text,
    html: buildEmailHtml({
      title: 'Tu tutoría empieza pronto',
      intro: introHtml,
      buttonText: 'Ver mi tutoría',
      url,
      note: 'Te enviamos este recordatorio antes del inicio de la tutoría. Si no puedes asistir, cancela la tutoría desde la plataforma para liberar el horario.',
    }),
  });
}
