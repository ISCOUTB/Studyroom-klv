import prisma from '../../config/prisma';

/**
 * Guarda una acción administrativa. La auditoría nunca debe romper la
 * operación principal: si falla, solo se registra en consola.
 */
export async function registrarAuditoria(
  adminId: string,
  accion: string,
  detalle: string
): Promise<void> {
  try {
    await prisma.registroAuditoria.create({
      data: {
        adminId,
        accion: accion.slice(0, 120),
        detalle: detalle.slice(0, 500),
      },
    });
  } catch (error) {
    console.error('[admin:auditoria]', error);
  }
}
