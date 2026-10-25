import { Router } from 'express';
import {
  listarNotificaciones,
  marcarTodasLeidas,
  marcarLeida,
} from './notificaciones.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', listarNotificaciones);
router.patch('/leer-todas', marcarTodasLeidas);
router.patch('/:id/leer', marcarLeida);

export default router;
