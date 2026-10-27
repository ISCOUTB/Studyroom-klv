import prisma from '../../config/prisma';

/**
 * Activa las salas que fueron programadas y ya alcanzaron su fecha y hora.
 * Se ejecuta desde el ciclo periódico del scheduler.
 */
export async function activarSalasProgramadas(): Promise<number> {
  const resultado = await prisma.salaEstudio.updateMany({
    where: {
      estado: 'PROGRAMADA',
      programadaEn: { not: null, lte: new Date() },
    },
    data: { estado: 'ACTIVA' },
  });

  return resultado.count;
}
