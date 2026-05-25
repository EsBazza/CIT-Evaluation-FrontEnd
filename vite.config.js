import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Fixed the name here!

// https://vitejs.dev/config/
const BACKEND_ORIGIN = 'http://localhost:8080';
const DEV_SERVER_ORIGIN = 'http://localhost:5173';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('@tanstack/react-query') || id.includes('axios')) return 'vendor-query';
          if (id.includes('recharts') || id.includes('victory-vendor')) return 'vendor-charts';
          return undefined;
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api': {
        target: BACKEND_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/api/, '/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest');
          });
          proxy.on('proxyRes', (proxyRes) => {
            const redirect = proxyRes.headers.location;
            if (redirect && redirect.startsWith(BACKEND_ORIGIN)) {
              proxyRes.headers.location = redirect.replace(BACKEND_ORIGIN, DEV_SERVER_ORIGIN);
            }
          });
        },
      },
    },
  },
  define: {
    // This is the "Magic Fix" for using 'Buffer' in Vite/Browser
    global: 'window',
  },
})