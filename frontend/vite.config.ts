import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Check if certificates exist
const keyPath = path.resolve(__dirname, '../certs/server.key');
const certPath = path.resolve(__dirname, '../certs/server.crt');
const hasHttps = fs.existsSync(keyPath) && fs.existsSync(certPath);

if (!hasHttps) {
  console.warn('⚠️  HTTPS certificates not found. Run: npm run generate-certs-ps');
  console.warn('⚠️  Starting in HTTP mode for now...');
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    hmr: false, // Disable HMR to prevent infinite reload loops
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
    https: hasHttps ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    } : undefined,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || (hasHttps ? 'https://localhost:3001' : 'http://localhost:3001'),
        changeOrigin: true,
        secure: false,
      },
      '/metrics': {
        target: process.env.VITE_BACKEND_URL || (hasHttps ? 'https://localhost:3001' : 'http://localhost:3001'),
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
