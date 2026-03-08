import React from 'react';
import useAppAuth from './hooks/use-auth';
import DashboardPage from './pages/DashboardPage';
import VerificacionPublica from './pages/VerificacionPublica';
import FormularioUAFEPublico from './pages/FormularioUAFEPublico';
import PendingApproval from './components/PendingApproval';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useThemeCtx } from './contexts/theme-ctx';
import { getAppTheme } from './config/theme';

/**
 * Componente raiz de la aplicacion
 */
function App() {
  const { user: appUser, isAuthenticated, isLoading: isLoadingProfile, loadProfile } = useAppAuth();
  const { resolvedIsDark } = useThemeCtx();

  // Si hay token guardado, cargar perfil al montar
  React.useEffect(() => {
    if (isAuthenticated && !appUser) {
      loadProfile();
    }
  }, [isAuthenticated, appUser, loadProfile]);

  const theme = React.useMemo(() => getAppTheme(resolvedIsDark), [resolvedIsDark]);

  // Detectar ruta de verificacion publica
  const currentPath = window.location.pathname;
  const isVerificationRoute = currentPath.startsWith('/verify/');
  const isFormularioUAFERoute = currentPath.startsWith('/formulario-uafe');

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

      {isFormularioUAFERoute ? (
        <FormularioUAFEPublico />
      ) : isVerificationRoute ? (
        <VerificacionPublica />
      ) : !isAuthenticated ? (
        <LoginPage />
      ) : isLoadingProfile || !appUser ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">Cargando perfil...</Typography>
        </Box>
      ) : !appUser.isOnboarded || !appUser.role ? (
        <PendingApproval user={appUser} />
      ) : (
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      )}
    </ThemeProvider>
  );
}

export default App;
