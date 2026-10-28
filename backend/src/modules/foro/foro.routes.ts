import { Router } from 'express';
import {
  aceptarRespuesta,
  crearPregunta,
  crearRespuesta,
  eliminarPregunta,
  eliminarRespuesta,
  listarPreguntas,
  obtenerPregunta,
} from './foro.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', listarPreguntas);
router.post('/', crearPregunta);
router.get('/:id', obtenerPregunta);
router.delete('/:id', eliminarPregunta);
router.post('/:id/respuestas', crearRespuesta);
router.patch('/:id/respuestas/:respuestaId/aceptar', aceptarRespuesta);
router.delete('/:id/respuestas/:respuestaId', eliminarRespuesta);

export default router;
