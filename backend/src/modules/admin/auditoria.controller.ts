import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';

const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 50;

// ---------------------------------------------------------
// GET /api/admin/auditoria?page=1&limit=10
// ---------------------------------------------------------
export const listarAuditoria = async (req: AuthRequest, res: Response) => {
  const pagina = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limiteSolicitado = Number.parseInt(String(req.query.limit ?? LIMITE_POR_DEFECTO), 10);
  const limite = Math.min(
    LIMITE_MAXIMO,
    Math.max(1, Number.isNaN(limiteSolicitado) ? LIMITE_POR_DEFECTO : limiteSolicitado)
  );

  try {
    const [registros, total] = await Promise.all([
      prisma.registroAuditoria.findMany({
        orderBy: { creadoEn: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
        include: { admin: { select: { id: true, nombre: true } } },
      }),
      prisma.registroAuditoria.count(),
    ]);

    return res.json({
      registros: registros.map((registro) => ({
        id: registro.id,
        accion: registro.accion,
        detalle: registro.detalle,
        creadoEn: registro.creadoEn.toISOString(),
        admin: registro.admin,
      })),
      paginacion: {
        pagina,
        limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / limite)),
      },
    });
  } catch (error) {
    console.error('[admin:auditoria]', error);
    return res.status(500).json({ error: 'No se pudo cargar la auditoría.' });
  }
};
