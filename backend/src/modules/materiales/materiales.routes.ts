import { Router } from 'express';
import {
  listarMateriales,
  subirMaterial,
  recibirArchivo,
  descargarMaterial,
  eliminarMaterial,
} from './materiales.controller';

// mergeParams permite leer :id desde el router de salas.
const router = Router({ mergeParams: true });

router.get('/', listarMateriales);
router.post('/', recibirArchivo, subirMaterial);
router.get('/:materialId/descargar', descargarMaterial);
router.delete('/:materialId', eliminarMaterial);

export default router;
