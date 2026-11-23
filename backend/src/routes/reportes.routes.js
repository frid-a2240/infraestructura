import { Router } from 'express';
import * as controller from '../controllers/reportes.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadPdfs } from '../middleware/upload.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/ordenes', controller.listarOrdenes);
router.post('/ordenes', uploadPdfs.array('archivos', 10), controller.subirOrdenes);
router.get('/ordenes/:id/archivo', controller.verOrden);
router.delete('/ordenes/:id', controller.eliminarOrden);

export default router;
