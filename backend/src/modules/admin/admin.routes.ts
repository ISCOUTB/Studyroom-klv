import { Router } from 'express';
import {
  listarSolicitudesMonitor,
  responderSolicitudMonitor,
} from './monitores.controller';
import { authMiddleware, rbacMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, rbacMiddleware('ADMINISTRADOR'));

router.get('/monitores', listarSolicitudesMonitor);
router.patch('/monitores/:id', responderSolicitudMonitor);

export default router;
