import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { UPLOADS_ROOT } from './middleware/upload.js';
import authRoutes from './routes/auth.routes.js';
import solicitudesRoutes from './routes/solicitudes.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import notificacionesRoutes from './routes/notificaciones.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import { generarRecordatorios } from './services/email.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
const BASE = env.basePath;

const app = express();

// En el servidor IIS reenvía las peticiones desde la misma máquina; así req.ip es la IP real del usuario.
app.set('trust proxy', 'loopback');

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        // El servidor interno es http://, forzar https rompería la página.
        upgradeInsecureRequests: null,
        // blob: para las vistas previas de fotos y PDF generadas en el navegador.
        imgSrc: ["'self'", 'data:', 'blob:'],
        frameSrc: ["'self'", 'blob:'],
      },
    },
  })
);
app.use(cors({ origin: env.frontendUrl }));
app.use(express.json());
app.use(`${BASE}/uploads/solicitudes`, express.static(UPLOADS_ROOT));

app.use(`${BASE}/api/auth`, authRoutes);
app.use(`${BASE}/api/solicitudes`, solicitudesRoutes);
app.use(`${BASE}/api/usuarios`, usuariosRoutes);
app.use(`${BASE}/api/notificaciones`, notificacionesRoutes);
app.use(`${BASE}/api/reportes`, reportesRoutes);

app.get(`${BASE}/api/health`, (req, res) => res.json({ ok: true }));

// En producción el mismo backend sirve el build de React (frontend/dist), como en la guía de IIS.
// Las rutas de la API van antes; si no, este comodín se las comería y devolvería HTML.
if (env.produccion && fs.existsSync(FRONTEND_DIST)) {
  app.use(`${BASE}/api`, (req, res) => res.status(404).json({ detail: 'Ruta no encontrada' }));
  // Express trata "/infraestructura" y "/infraestructura/" igual; solo se redirige la que no trae la barra.
  if (BASE) app.get(BASE, (req, res, next) => (req.path === BASE ? res.redirect(`${BASE}/`) : next()));
  app.use(`${BASE}/`, express.static(FRONTEND_DIST, { index: false }));
  app.get(`${BASE}/*`, (req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ detail: 'El archivo es demasiado grande (máximo 20 MB por PDF, 5 MB por imagen)' });
  }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ detail: 'Demasiados archivos a la vez' });
  }
  if (err.message && (err.message.includes('imágenes') || err.message.includes('PDF'))) {
    return res.status(400).json({ detail: err.message });
  }
  return res.status(500).json({ detail: 'Error interno del servidor' });
});
// eslint no funciona con express, por lo que no se desactiva la regla para esta línea
app.listen(env.port, () => {
  console.log(`Backend ISP Infraestructura escuchando en http://localhost:${env.port}${BASE}`);
  generarRecordatorios();
  setInterval(generarRecordatorios, 12 * 60 * 60 * 1000);
});
