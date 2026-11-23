import { Router } from 'express';
import * as controller from '../controllers/usuarios.controller.js';
import { requireAuth, requireGestionUsuarios } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireGestionUsuarios);

router.get('/', controller.listar);
router.patch('/:id/rol', controller.cambiarRol);
router.patch('/:id/activo', controller.desactivar);
router.post('/:id/regenerar-password', controller.regenerarPassword);

export default router;
