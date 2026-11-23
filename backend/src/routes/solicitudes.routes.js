import { Router } from 'express';
import * as controller from '../controllers/solicitudes.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadImagenes } from '../middleware/upload.js';

const router = Router();

router.use(requireAuth);

router.get('/', controller.listar);
router.post('/', uploadImagenes.array('imagenes', 5), controller.crear);
router.post('/actividad', requireRole('admin'), uploadImagenes.array('imagenes', 5), controller.crearActividad);
router.get('/responsables', requireRole('admin'), controller.responsables);
router.get('/prioridad', controller.listadoPrioridad);
router.put('/prioridad/orden', requireRole('admin'), controller.reordenarPrioridad);
router.get('/calendario', controller.calendario);
router.get('/alertas', requireRole('admin'), controller.alertas);
router.get('/estadisticas', requireRole('admin'), controller.estadisticas);

router.patch('/:id/avance', requireRole('admin'), controller.actualizarAvance);
router.patch('/:id/prioridad', requireRole('admin'), controller.cambiarPrioridad);
router.patch('/:id/fechas', requireRole('admin'), controller.editarFechas);
router.patch('/:id/responsable', requireRole('admin'), controller.asignarResponsable);
router.patch('/:id/motivo-pausa', requireRole('admin'), controller.editarMotivoPausa);
router.patch('/:id/aprobar', requireRole('admin'), controller.aprobar);
router.patch('/:id/rechazar', requireRole('admin'), controller.rechazar);
router.post('/:id/reabrir', requireRole('admin'), controller.reabrir);
router.post('/:id/pausar', requireRole('admin'), controller.pausar);
router.post('/:id/reanudar', requireRole('admin'), controller.reanudar);
router.post('/:id/completar', requireRole('admin'), uploadImagenes.array('imagenes', 6), controller.completar);
router.delete('/:id', requireRole('admin'), controller.eliminar);

export default router;
