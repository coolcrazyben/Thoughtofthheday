import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // When running `vite` directly (not via `vercel dev`),
  // proxy API calls to the Vercel dev server on port 3000.
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
