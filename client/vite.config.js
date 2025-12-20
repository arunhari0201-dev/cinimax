
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    sourcemap: true,},
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://cinimax.onrender.com',  // Production backend URL
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    // This makes process.env.NODE_ENV available in the client code
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});
