import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Ruta absoluta: bajo IIS el directorio de trabajo no es backend/, así que dotenv.config() solo no encontraría el .env.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno ${name} (revisa backend/.env)`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  produccion: process.env.NODE_ENV === 'production',
  // Prefijo de la sub-aplicación de IIS (ej. "/infraestructura"); vacío en desarrollo.
  basePath: (process.env.BASE_PATH || '').replace(/\/+$/, ''),
  db: {
    host: required('DB_HOST'),
    port: Number(required('DB_PORT')),
    name: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
  },
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  smtp: {
    host: required('SMTP_HOST'),
    port: Number(required('SMTP_PORT')),
    user: required('SMTP_USER'),
    password: required('SMTP_PASSWORD'),
  },
  adminNotifyEmails: (process.env.ADMIN_NOTIFY_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
