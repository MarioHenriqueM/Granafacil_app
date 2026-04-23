import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BACKEND = 'http://localhost:3000';

export default defineConfig({
  root: 'src/ui',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/consent': BACKEND,
      '/ingest': BACKEND,
      '/decision': BACKEND,
      '/pix': BACKEND,
      '/health': BACKEND,
    },
  },
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: true,
  },
});