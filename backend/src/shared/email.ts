import nodemailer from 'nodemailer';

export const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);

const EMAIL_FROM =
  process.env.EMAIL_FROM || 'StudyRoom <noreply@utb.edu.co>';

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export function buildEmailHtml(options: {
  title: string;
  intro: string;
  buttonText: string;
  url: string;
  note: string;
}) {
  const { title, intro, buttonText, url, note } = options;

  return `
  <div style="margin:0;padding:32px 16px;background:#E7EEFD;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
    <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(11,79,196,0.12);">
      <div style="background:#0B4FC4;padding:24px 32px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:0.2px;">StudyRoom</p>
        <p style="margin:4px 0 0;font-size:12px;color:#DCE9FB;">Universidad Tecnológica de Bolívar</p>
      </div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0F172A;">${title}</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">${intro}</p>
        <a href="${url}" style="display:inline-block;background:#1473E6;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:10px;">${buttonText}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748B;">${note}</p>
        <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#94A3B8;word-break:break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br />${url}</p>
      </div>
      <div style="padding:16px 32px;background:#F3F7FF;border-top:1px solid #E2E8F0;">
        <p style="margin:0;font-size:11px;color:#64748B;">Este es un mensaje automático. Por favor, no respondas a este correo.</p>
      </div>
    </div>
  </div>`;
}

/**
 * Envía un correo con la plantilla institucional. Si SMTP no está configurado,
 * imprime el enlace en consola para poder probar el flujo en desarrollo.
 * Un fallo de envío se registra, pero nunca interrumpe la acción que lo originó.
 */
export async function deliverEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  devLabel: string;
  devUrl: string;
  devDetalle?: string;
}) {
  const { to, subject, html, text, devLabel, devUrl, devDetalle } = options;

  if (!smtpConfigured) {
    console.log('\n============================================================');
    console.log(`[MODO DESARROLLO] ${devLabel} para ${to}:`);
    if (devDetalle) console.log(devDetalle);
    console.log(devUrl);
    console.log('============================================================\n');
    return;
  }

  try {
    await getTransporter().sendMail({ from: EMAIL_FROM, to, subject, html, text });
    console.log(`[EMAIL] ${devLabel} enviado a ${to}`);
  } catch (error) {
    console.error(`[EMAIL] No se pudo enviar ${devLabel} a ${to}.`);
    console.error(error);
    console.log('\n============================================================');
    console.log(`[ENLACE DE RESPALDO] ${devLabel} para ${to}:`);
    console.log(devUrl);
    console.log('============================================================\n');
  }
}
