import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Agregar logs detallados para debugging
  logLevel: 'info',
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
    // Reportar progreso del build
    reportCompressedSize: true,
    // Forzar cache-busting agresivo
    rollupOptions: {
      output: {
        // Agregar hash a todos los archivos para forzar cache-busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
          utils: ['zustand', 'react-hotkeys-hook', 'react-loading-skeleton']
        }
      }
    },
    // Limpiar directorio de build para evitar archivos obsoletos
    emptyOutDir: true,
    // Forzar rebuild completo
    watch: null
  },
  define: {
    // Forzar variables de entorno para producción
    'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
    // Feature flag para nueva UI Activos/Entregados
    'import.meta.env.VITE_UI_ACTIVOS_ENTREGADOS': JSON.stringify(process.env.VITE_UI_ACTIVOS_ENTREGADOS || 'true'),
    // Variables adicionales para debugging
    __VITE_UI_ACTIVOS_ENTREGADOS__: JSON.stringify(process.env.VITE_UI_ACTIVOS_ENTREGADOS || 'false'),
    __VITE_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VITE_COMMIT_HASH__: JSON.stringify(process.env.VITE_COMMIT_HASH || 'unknown')
  }
})
