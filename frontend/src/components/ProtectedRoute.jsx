import React from 'react';
import { Box, Typography } from '@mui/material';
import useAuth from '../hooks/use-auth';

/**
 * Componente para proteger rutas que requieren autenticación y rol.
 * La verificación de Clerk y onboarding se hace en App.jsx.
 * Aquí solo verificamos roles específicos si se requieren.
 */
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, hasAnyRole } = useAuth();

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
        <Typography variant="h5" sx={{ color: 'primary.main', mb: 2 }}>
          Acceso Denegado
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.primary', textAlign: 'center' }}>
          No tienes permisos para acceder a esta pagina.
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.primary', opacity: 0.7, mt: 1 }}>
          Tu rol actual: {user?.role}
        </Typography>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;
