import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  // ✅ CRITICAL: Set this to your repository name
  base: '/Irys-File-Uploader/', 

  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      os: 'os-browserify/browser',
      path: 'path-browserify',
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: { outDir: 'dist' },
  server: { open: true },
});
