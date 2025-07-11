import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // 👈 Required to support React 18 JSX dev helpers
    }),
  ],
  root: '.',
  build: {
    outDir: 'dist',
    ourcemap: true, // 👈 This enables source maps for production builds
    rollupOptions: {
      input: 'index.html',
    },
  },
  server: {
    allowedHosts: ['0e35e17a0d17.ngrok-free.app'], // 👈 Add your ngrok host here
    proxy: {
    '/api': 'http://localhost:8081', // 👈 redirect API calls to Express
  },
  },
});
