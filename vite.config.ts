import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      // Allow any host so the app loads behind sandbox/preview proxies and tunnel URLs,
      // not just localhost. Without this Vite answers those requests with HTTP 403.
      allowedHosts: true as const,
      // Proxy the Paystack backend so the browser only ever talks to this dev
      // server with relative /api URLs. Never call localhost from client code.
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${process.env.PAYSTACK_PORT || 3001}`,
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
