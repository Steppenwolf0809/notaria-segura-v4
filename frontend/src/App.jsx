import React, { useEffect } from 'react';
import useAuth from './hooks/use-auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VerificacionPublica from './pages/VerificacionPublica';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useThemeCtx } from './contexts/theme-ctx';
import { getAppTheme } from './config/theme';

/**
 * Componente raíz de la aplicación
 * - Centraliza ThemeProvider (antes en main.jsx)
 * - Integra ThemeCtx (light|dark|system) y aplica tema enterprise
 */
function App() {
  const { isAuthenticated, checkAuth, clearAuth } = useAuth();
  const { resolvedIsDark } = useThemeCtx();

  useEffect(() => {
    // 🔧 FIX: Limpiar tokens corruptos/desincronizados al iniciar
    try {
      const zustandData = localStorage.getItem('notaria-auth-storage');
      const directToken = localStorage.getItem('token');

      if (zustandData) {
        const parsed = JSON.parse(zustandData);
        const zustandToken = parsed?.state?.token;

        // Si hay token en Zustand pero no coincide con localStorage directo, sincronizar
        if (zustandToken && zustandToken !== directToken) {
          console.warn('[AUTH-FIX] Sincronizando tokens desincronizados');
          localStorage.setItem('token', zustandToken);
        }
      } else if (directToken) {
        // Si hay token directo pero no en Zustand, está corrupto - limpiar
        console.warn('[AUTH-FIX] Token corrupto detectado, limpiando...');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        clearAuth();
      }
    } catch (error) {
      console.error('[AUTH-FIX] Error sincronizando tokens:', error);
      // En caso de error, limpiar todo para evitar estados inconsistentes
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('notaria-auth-storage');
        clearAuth();
      } catch { }
    }

    // Verificar autenticación al cargar la aplicación
    checkAuth();
  }, [checkAuth, clearAuth]);

  // Configuración de tema (centralizada)
  const theme = React.useMemo(() => getAppTheme(resolvedIsDark), [resolvedIsDark]);

  // Detectar si es una ruta de verificación pública
  const currentPath = window.location.pathname;
  const isVerificationRoute = currentPath.startsWith('/verify/');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{ zIndex: 20000 }}
      />

      {/* Ruta pública de verificación */}
      {isVerificationRoute ? (
        <VerificacionPublica />
      ) : (
        /* Rutas normales del sistema */
        isAuthenticated ? (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ) : (
          <LoginPage />
        )
      )}
    </ThemeProvider>
  );
}

export default App;
