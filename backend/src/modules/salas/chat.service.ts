import prisma from '../../config/prisma';

export async function esParticipanteActivo(
  salaId: string,
  usuarioId: string
): Promise<boolean> {
  const participacion = await prisma.participacionSala.findUnique({
    where: { salaId_usuarioId: { salaId, usuarioId } },
    select: { estado: true },
  });

  return participacion?.estado === 'ACTIVO';
}

type MensajeConUsuario = {
  id: string;
  contenido: string;
  enviadoEn: Date;
  usuario: {
    id: string;
    nombre: string;
    rol: string;
  };
};

export function serializarMensaje(mensaje: MensajeConUsuario) {
  return {
    id: mensaje.id,
    contenido: mensaje.contenido,
    enviadoEn: mensaje.enviadoEn.toISOString(),
    usuario: {
      id: mensaje.usuario.id,
      nombre: mensaje.usuario.nombre,
      rol: mensaje.usuario.rol,
    },
  };
}

export async function listarMensajesSala(salaId: string) {
  const mensajes = await prisma.mensajeChat.findMany({
    where: { salaId },
    orderBy: { enviadoEn: 'desc' },
    take: 100,
    include: {
      usuario: { select: { id: true, nombre: true, rol: true } },
    },
  });

  // La consulta trae los últimos 100; se devuelven en orden cronológico.
  return mensajes.reverse().map(serializarMensaje);
}

export async function crearMensajeSala(
  salaId: string,
  usuarioId: string,
  contenido: string
) {
  const mensaje = await prisma.mensajeChat.create({
    data: { salaId, usuarioId, contenido },
    include: {
      usuario: { select: { id: true, nombre: true, rol: true } },
    },
  });

  return serializarMensaje(mensaje);
}
