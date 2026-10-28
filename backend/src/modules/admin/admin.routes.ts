import { Router } from 'express';
import {
  listarSolicitudesMonitor,
  responderSolicitudMonitor,
} from './monitores.controller';
import { obtenerResumen } from './resumen.controller';
import {
  actualizarAsignatura,
  crearAsignatura,
  listarCatalogo,
} from './asignaturas.controller';
import { listarReportes, resolverReporte } from './reportes.controller';
import { listarAuditoria } from './auditoria.controller';
import { authMiddleware, rbacMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, rbacMiddleware('ADMINISTRADOR'));

// Métricas
router.get('/resumen', obtenerResumen);

// Monitores
router.get('/monitores', listarSolicitudesMonitor);
router.patch('/monitores/:id', responderSolicitudMonitor);

// Catálogo de asignaturas (RF-18)
router.get('/asignaturas', listarCatalogo);
router.post('/asignaturas', crearAsignatura);
router.patch('/asignaturas/:id', actualizarAsignatura);

// Moderación
router.get('/reportes', listarReportes);
router.patch('/reportes/:id', resolverReporte);

// Auditoría
router.get('/auditoria', listarAuditoria);

export default router;
