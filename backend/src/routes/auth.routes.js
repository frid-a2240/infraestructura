import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { limitarLogin, limitarRegistro, limitarRecuperacion } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', limitarLogin, authController.login);
router.post('/completar-registro', limitarLogin, authController.completarRegistro);
router.post('/visitante/solicitar-codigo', limitarRecuperacion, authController.visitanteSolicitarCodigo);
router.post('/visitante/registro', limitarRegistro, authController.visitanteRegistro);
router.post('/visitante/verificar', limitarRecuperacion, authController.visitanteVerificar);
router.post('/recuperar/solicitar', limitarRecuperacion, authController.solicitarCodigoRecuperacion);
router.post('/recuperar/confirmar', limitarRecuperacion, authController.confirmarRecuperacion);
router.get('/yo', requireAuth, authController.yo);

export default router;
