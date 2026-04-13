import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Dev only: forwards /api requests to Express so you don't get CORS errors.
    // In production, Nginx handles this proxying instead.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
