import { Router } from 'express';
import {
  listarSalas,
  crearSala,
  obtenerSala,
  unirseSala,
  abandonarSala,
} from './salas.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

// Todas las rutas de salas requieren sesión iniciada.
router.use(authMiddleware);

router.get('/', listarSalas);
router.post('/', crearSala);
router.get('/:id', obtenerSala);
router.post('/:id/unirse', unirseSala);
router.post('/:id/abandonar', abandonarSala);

export default router;
