import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../shared/middleware/auth.middleware';
import { COLORES_ASIGNATURA, catalogoVacio, listarAsignaturas } from './catalogo.service';

const router = Router();

// ---------------------------------------------------------
// GET /api/asignaturas (cualquier usuario autenticado)
// Catálogo activo para filtros, formularios y etiquetas.
// ---------------------------------------------------------
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const [asignaturas, respaldo] = await Promise.all([
      listarAsignaturas(true),
      catalogoVacio(),
    ]);
    return res.json({ asignaturas, colores: COLORES_ASIGNATURA, respaldo });
  } catch (error) {
    console.error('[asignaturas:listar]', error);
    return res.status(500).json({ error: 'No se pudo cargar el catálogo de asignaturas.' });
  }
});

export default router;
