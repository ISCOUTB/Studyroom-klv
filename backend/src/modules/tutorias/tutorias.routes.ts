import { Router } from 'express';
import {
  obtenerContexto,
  solicitarMonitor,
  obtenerPerfilMonitor,
  actualizarPerfilMonitor,
  listarDisponibilidad,
  crearDisponibilidad,
  eliminarDisponibilidad,
  listarMonitores,
  listarTutorias,
  solicitarTutoria,
  responderTutoria,
  cancelarTutoria,
  finalizarTutoria,
  calificarTutoria,
} from './tutorias.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Rutas específicas primero para no confundirlas con /:id.
router.get('/contexto', obtenerContexto);
router.post('/solicitud-monitor', solicitarMonitor);
router.get('/perfil-monitor', obtenerPerfilMonitor);
router.put('/perfil-monitor', actualizarPerfilMonitor);
router.get('/disponibilidad', listarDisponibilidad);
router.post('/disponibilidad', crearDisponibilidad);
router.delete('/disponibilidad/:id', eliminarDisponibilidad);
router.get('/monitores', listarMonitores);

router.get('/', listarTutorias);
router.post('/', solicitarTutoria);
router.patch('/:id/responder', responderTutoria);
router.patch('/:id/cancelar', cancelarTutoria);
router.patch('/:id/finalizar', finalizarTutoria);
router.patch('/:id/calificar', calificarTutoria);

export default router;
