import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io', '.ngrok.app'],
    proxy: { '/api': { target: process.env.VITE_API_PROXY || 'http://localhost:3001', changeOrigin: true } },
    headers: {
      // Block Google Analytics and other tracking
      'Content-Security-Policy': "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://id.trimble.com https://trimblecloud.com https://stage.id.trimblecloud.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:3001 http://127.0.0.1:3001 https://id.trimble.com https://trimblecloud.com https://stage.id.trimblecloud.com; frame-src 'self' https://id.trimble.com;",
      // Prevent Google from seeing referrer
      'Referrer-Policy': 'no-referrer',
    }
  },
});
