import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { HourglassEmpty, Logout } from '@mui/icons-material';
import useAuthStore from '../store/auth-store';

/**
 * Pantalla para usuarios autenticados pero sin rol asignado.
 * El admin de la notaria debe aprobarlos y asignarles rol + notaria.
 */
function PendingApproval({ user }) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = () => {
    clearAuth();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 480,
          textAlign: 'center',
          borderRadius: 3
        }}
      >
        <HourglassEmpty sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />

        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          Cuenta pendiente de aprobacion
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          Hola {user?.firstName || 'usuario'}, tu cuenta ha sido creada exitosamente.
          Un administrador debe asignarte una notaria y un rol para que puedas acceder al sistema.
        </Typography>

        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', fontStyle: 'italic' }}>
          Contacta al administrador de tu notaria para que active tu acceso.
        </Typography>

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<Logout />}
          onClick={handleLogout}
        >
          Cerrar sesion
        </Button>
      </Paper>
    </Box>
  );
}

export default PendingApproval;
