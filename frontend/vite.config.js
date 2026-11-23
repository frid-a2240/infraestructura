import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Prefijo de la sub-aplicación en IIS (http://gacenssv03/infraestructura/). Debe coincidir con
// el alias en IIS, con BASE_PATH del web.config y con VITE_API_URL de .env.production.
const PREFIJO_IIS = '/infraestructura/';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? PREFIJO_IIS : '/',
  server: {
    port: 5173,
  },
}));
