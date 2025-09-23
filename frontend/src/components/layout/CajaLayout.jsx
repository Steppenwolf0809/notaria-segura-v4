import React, { useEffect, useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Avatar, Container } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
    console.info('[LAYOUT]', { role: user?.role, sidebar: 'mounted' });
  }, [user?.role]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Notaría Segura - Caja
          </Typography>

          {/* Usuario */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', md: 'block' } }}>
              {getFullName()}
            </Typography>
            <Avatar
              sx={{
                bgcolor: getUserRoleColor(),
                width: 32,
                height: 32,
                fontSize: '0.875rem'
              }}
            >
              {getUserInitials()}
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

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