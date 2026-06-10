import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import path from 'node:path';

function resolveDevHttps() {
  if (process.env.VITE_DEV_HTTPS !== 'true') {
    return undefined;
  }

  const certPath = process.env.VITE_DEV_HTTPS_CERT;
  const keyPath = process.env.VITE_DEV_HTTPS_KEY;

  if (!certPath || !keyPath || !fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.warn('VITE_DEV_HTTPS=true, but certificate files are missing. Falling back to HTTP.');
    return undefined;
  }

  return {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.VITE_DEV_PORT ?? 5173),
    host: process.env.VITE_DEV_HOST ?? '0.0.0.0',
    https: resolveDevHttps(),
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
