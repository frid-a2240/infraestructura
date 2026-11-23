import { Router } from 'express';
import * as controller from '../controllers/notificaciones.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/pendientes', controller.pendientes);
router.get('/conteo-urgentes', controller.conteoUrgentes);

export default router;
