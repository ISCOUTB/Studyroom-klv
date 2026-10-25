import { Router } from 'express';
import {
  listarSalas,
  crearSala,
  obtenerSala,
  unirseSala,
  abandonarSala,
  listarMensajes,
} from './salas.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

// Todas las rutas de salas requieren sesión iniciada.
router.use(authMiddleware);

router.get('/', listarSalas);
router.post('/', crearSala);
router.get('/:id', obtenerSala);
router.get('/:id/mensajes', listarMensajes);
router.post('/:id/unirse', unirseSala);
router.post('/:id/abandonar', abandonarSala);

export default router;
