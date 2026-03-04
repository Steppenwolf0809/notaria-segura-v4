import React from 'react';
import { useAuth, SignIn, SignUp } from '@clerk/clerk-react';
import useAppAuth from './hooks/use-auth';
import DashboardPage from './pages/DashboardPage';
import VerificacionPublica from './pages/VerificacionPublica';
import PendingApproval from './components/PendingApproval';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography, Tab, Tabs, Paper } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useThemeCtx } from './contexts/theme-ctx';
import { getAppTheme } from './config/theme';

/**
 * Pantalla de autenticación con Clerk (SignIn + SignUp)
 */
function AuthScreen() {
  const [tab, setTab] = React.useState(0);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3
      }}
    >
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>
        Notaria Segura
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        Sistema de Gestion Documental Notarial
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
          <Tab label="Iniciar Sesion" />
          <Tab label="Registrarse" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <SignIn
          routing="hash"
          appearance={{
            elements: {
              rootBox: { width: '100%', maxWidth: 400 },
              card: { boxShadow: 'none' }
            }
          }}
        />
      ) : (
        <SignUp
          routing="hash"
          appearance={{
            elements: {
              rootBox: { width: '100%', maxWidth: 400 },
              card: { boxShadow: 'none' }
            }
          }}
        />
      )}
    </Box>
  );
}

/**
 * Componente raiz de la aplicacion
 */
function App() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user: appUser, isLoading: isLoadingProfile, loadProfile } = useAppAuth();
  const { resolvedIsDark } = useThemeCtx();

  // Cargar perfil del backend cuando Clerk confirma autenticacion
  React.useEffect(() => {
    if (isSignedIn && isLoaded) {
      loadProfile();
    }
  }, [isSignedIn, isLoaded, loadProfile]);

  const theme = React.useMemo(() => getAppTheme(resolvedIsDark), [resolvedIsDark]);

  // Detectar ruta de verificacion publica
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

      {isVerificationRoute ? (
        <VerificacionPublica />
      ) : !isLoaded ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      ) : !isSignedIn ? (
        <AuthScreen />
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
