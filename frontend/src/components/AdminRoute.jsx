import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Alert, Button, Typography, Paper } from '@mui/material';
import { Security as SecurityIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import useAuthStore from '../store/auth-store';

/**
 * Componente de protección de rutas para administradores
 * Verifica que el usuario autenticado tenga rol ADMIN
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, user } = useAuthStore();

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado pero no es admin, mostrar acceso denegado
  if (!isAdmin()) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <SecurityIcon 
            sx={{ 
              fontSize: 80, 
              color: 'error.main', 
              mb: 2 
            }} 
          />
          
          <Typography variant="h4" color="error.main" gutterBottom>
            Acceso Denegado
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Solo administradores
          </Typography>
          
          <Alert severity="error" sx={{ mt: 3, mb: 3 }}>
            <Typography variant="body1">
              <strong>Permisos insuficientes</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Tu rol actual ({user?.role}) no tiene permisos para acceder 
              al panel de administración. Solo usuarios con rol ADMIN pueden acceder.
            </Typography>
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Si crees que esto es un error, contacta al administrador del sistema.
          </Typography>

          <Button
            variant="contained"
            startIcon={<BackIcon />}
            onClick={() => window.history.back()}
            sx={{ mr: 2 }}
          >
            Regresar
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => window.location.href = '/dashboard'}
          >
            Ir al Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  // Si es admin, renderizar el componente protegido
  return children;
};

/**
 * Hook para verificar permisos de admin en componentes
 */
export const useAdminCheck = () => {
  const { isAuthenticated, isAdmin, user } = useAuthStore();
  
  return {
    isAuthenticated,
    isAdmin: isAdmin(),
    hasAdminAccess: isAuthenticated && isAdmin(),
    userRole: user?.role,
    canAccessAdmin: () => isAuthenticated && isAdmin()
  };
};

/**
 * Componente HOC para proteger funcionalidades específicas de admin
 */
export const AdminOnly = ({ children, fallback = null }) => {
  const { hasAdminAccess } = useAdminCheck();
  
  return hasAdminAccess ? children : fallback;
};

export default AdminRoute;