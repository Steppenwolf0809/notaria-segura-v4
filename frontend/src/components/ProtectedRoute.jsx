import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import useAuth from '../hooks/use-auth';

/**
 * Componente para proteger rutas que requieren autenticación
 * Verifica si el usuario está autenticado antes de mostrar el contenido
 */
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    checkAuth,
    hasAnyRole 
  } = useAuth();

  useEffect(() => {
    // Verificar autenticación al montar el componente
    if (isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, checkAuth]);

  // Skeleton de layout mientras se verifica autenticación/rol para evitar parpadeo sin barra
  if (isLoading || !user) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Sidebar fantasma en desktop */}
        <Box
          sx={{
            width: { xs: 0, md: 240 },
            bgcolor: 'action.hover',
            display: { xs: 'none', md: 'block' }
          }}
        />
        {/* Área principal con barra superior fantasma */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ height: 64, bgcolor: 'action.selected' }} />
          <Box sx={{ flex: 1, p: 3, bgcolor: 'background.default' }}>
            <Typography variant="body2" color="text.secondary">
              Cargando interfaz...
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // Si no está autenticado, no mostrar nada (App.jsx se encargará de redirigir)
  if (!isAuthenticated) {
    return null;
  }

  // Verificar roles requeridos si se especificaron
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
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
        <Typography 
          variant="h5" 
          sx={{ color: 'primary.main', mb: 2 }}
        >
          Acceso Denegado
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ color: 'text.primary', textAlign: 'center' }}
        >
          No tienes permisos para acceder a esta página.
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ color: 'text.primary', opacity: 0.7, mt: 1 }}
        >
          Tu rol actual: {user?.role}
        </Typography>
      </Box>
    );
  }

  // Si todo está bien, mostrar el contenido protegido
  return children;
};

export default ProtectedRoute; 