import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Docker publishes 5173. A host dev server must not take that port, or
// `docker compose up` fails with "ports are not available".
const port = Number(process.env.VITE_PORT) || 5174;

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    strictPort: true,
    host: true,
    proxy: {
      '/api': { target: process.env.API_URL || 'http://localhost:8000', changeOrigin: true },
    },
  },
});
