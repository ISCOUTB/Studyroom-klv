import {
  APP_URL,
  buildEmailHtml,
  deliverEmail,
} from '../../shared/email';

export const sendVerificationEmail = async (email: string, token: string) => {
  const url = `${APP_URL}/verificar?token=${encodeURIComponent(token)}`;

  await deliverEmail({
    to: email,
    subject: 'Verifica tu cuenta — StudyRoom',
    devLabel: 'Enlace de verificación',
    devUrl: url,
    text: `Verifica tu cuenta de StudyRoom: ${url}\n\nEste enlace vence en 24 horas.`,
    html: buildEmailHtml({
      title: 'Verifica tu correo institucional',
      intro:
        'Recibimos tu registro en StudyRoom. Confirma tu correo para activar tu cuenta y comenzar a estudiar en comunidad.',
      buttonText: 'Verificar mi cuenta',
      url,
      note: 'Este enlace vence en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.',
    }),
  });
};

export const sendResetPasswordEmail = async (email: string, token: string) => {
  const url = `${APP_URL}/restablecer?token=${encodeURIComponent(token)}`;

  await deliverEmail({
    to: email,
    subject: 'Recupera tu contraseña — StudyRoom',
    devLabel: 'Enlace de recuperación',
    devUrl: url,
    text: `Restablece tu contraseña de StudyRoom: ${url}\n\nEste enlace vence en 1 hora.`,
    html: buildEmailHtml({
      title: 'Restablece tu contraseña',
      intro:
        'Recibimos una solicitud para cambiar la contraseña de tu cuenta. Si fuiste tú, continúa con el botón de abajo.',
      buttonText: 'Cambiar mi contraseña',
      url,
      note: 'Este enlace vence en 1 hora. Si no solicitaste el cambio, ignora este mensaje: tu contraseña actual seguirá funcionando.',
    }),
  });
};
