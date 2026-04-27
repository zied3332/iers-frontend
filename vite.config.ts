import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild',
    sourcemap: false,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('pdfjs-dist') || id.includes('pdf-parse')) return 'vendor-pdf';
          if (id.includes('socket.io-client')) return 'vendor-socket';
          if (id.includes('react-router-dom') || id.includes('@remix-run/router')) return 'vendor-router';
          if (id.includes('react-icons')) return 'vendor-icons';
          if (id.includes('axios')) return 'vendor-axios';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';

          return 'vendor-misc';
        },
      },
    },
  },
})
