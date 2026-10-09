import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks to the API through VITE_API_BASE_URL.
// - Local dev: http://localhost:5080 (the docker-compose api port).
// - Docker/nginx: empty string, so requests are relative and nginx proxies /api.
const apiTarget = process.env.VITE_API_BASE_URL || 'http://localhost:5080';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Optional dev proxy so a relative VITE_API_BASE_URL also works with `npm run dev`.
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
