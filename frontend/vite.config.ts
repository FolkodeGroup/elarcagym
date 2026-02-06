import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        sourcemap: false,
        proxy: {
          // Redirige todas las rutas de API al backend
          '/waitlist': 'http://localhost:4000',
          '/members': 'http://localhost:4000',
          '/notifications': 'http://localhost:4000',
          '/users': 'http://localhost:4000',
          '/reservations': 'http://localhost:4000',
          // Agrega aquí otras rutas de API si es necesario
        },
      },
      build: {
        sourcemap: false,
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
