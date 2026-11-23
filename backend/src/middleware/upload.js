import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads', 'solicitudes');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
    cb(null, UPLOADS_ROOT);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
  }
  return cb(null, true);
}

export const uploadImagenes = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
});

export const ORDENES_ROOT = path.join(__dirname, '..', '..', 'uploads', 'ordenes_trabajo');

const storagePdf = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(ORDENES_ROOT, { recursive: true });
    cb(null, ORDENES_ROOT);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`);
  },
});

function pdfFilter(req, file, cb) {
  const esPdf = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
  if (!esPdf) {
    return cb(new Error('Solo se permiten archivos PDF'));
  }
  return cb(null, true);
}

export const uploadPdfs = multer({
  storage: storagePdf,
  fileFilter: pdfFilter,
  defParamCharset: 'utf8',
  limits: { fileSize: 20 * 1024 * 1024, files: 10 },
});
