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
    allowedHosts: ['55251a7595ab.ngrok-free.app'], // 👈 Add your ngrok host here
    proxy: {
      '/api': 'http://localhost:8080', // 👈 redirect API calls to Express
    },
  },
});
