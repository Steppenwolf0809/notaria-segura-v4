import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
          utils: ['zustand', 'react-hotkeys-hook']
        }
      }
    }
  },
  define: {
    // Forzar variables de entorno para producción
    'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
    // Feature flag para nueva UI Activos/Entregados
    'import.meta.env.VITE_UI_ACTIVOS_ENTREGADOS': JSON.stringify(process.env.VITE_UI_ACTIVOS_ENTREGADOS || 'true')
  }
})
