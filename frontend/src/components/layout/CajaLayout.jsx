import React, { useEffect, useState } from 'react';
import { Box, Toolbar, Container } from '@mui/material';
import Topbar from '../Topbar';
import useAuth from '../../hooks/use-auth';
import Sidebar from './Sidebar';

// Layout base con Sidebar fijo (desktop) y temporal (móvil) para CAJA
// - zIndex del AppBar > Drawer (Sidebar maneja z-index del drawer)
// - Estructura 2 columnas: sidebar + main
// - Altura 100vh y overflow controlado
const CajaLayout = ({ children }) => {
  const { user, getUserRoleColor, getFullName, getUserInitials } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Trazas solicitadas
    // eslint-disable-next-line no-console
  }, [user?.role]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Topbar title="Notaría Segura - Caja" onMenuClick={() => setMobileOpen(true)} />

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onNavigate={(item) => {
          // Mantener mínima coherencia de navegación sin router
          // (el componente Sidebar ya establece window.location.hash)
        }}
      />

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          ml: { md: collapsed ? '60px' : '240px' }, // Mantener espacio del sidebar en desktop
          transition: 'margin-left 0.2s ease'
        }}
      >
        {/* Spacer de AppBar */}
        <Toolbar />

        {/* Área scrollable */}
        <Container
          maxWidth="xl"
          sx={{
            flex: 1,
            overflow: 'auto',
            py: 3
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default CajaLayout;