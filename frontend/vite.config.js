import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/lineabar/',
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo el frontend no pasa por Nginx: la API se redirige al backend.
    proxy: {
      '/lineabar/api': {
        target: 'http://localhost:3001',
        rewrite: (ruta) => ruta.replace(/^\/lineabar\/api/, '/api')
      }
    }
  }
});
