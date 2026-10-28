import { Router } from 'express';
import { crearReporte } from './reportes.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// POST /api/reportes — cualquier usuario autenticado puede reportar contenido.
router.post('/', crearReporte);

export default router;
