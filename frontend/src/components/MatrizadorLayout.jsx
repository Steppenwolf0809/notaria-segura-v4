import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Button,
  Container
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as DocumentsIcon,
  History as HistoryIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import ThemeToggle from './ThemeToggle';
import useThemeStore from '../store/theme-store';

// Ancho del sidebar
const DRAWER_WIDTH = 240;

/**
 * Layout principal del Matrizador siguiendo exactamente el prototipo
 * Incluye sidebar de navegación y área de contenido
 * MODIFICADO: Barra lateral azul oscura solo en modo claro para contraste
 */
const MatrizadorLayout = ({ children, currentView, onViewChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, getUserRoleColor, getFullName, getUserInitials } = useAuth();
  const { isDarkMode } = useThemeStore();

  /**
   * Toggle del drawer móvil
   */
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  /**
   * Navegación entre vistas
   */
  const handleNavigation = (view) => {
    onViewChange(view);
    setMobileOpen(false); // Cerrar drawer en móvil
  };

  /**
   * Items de navegación - EXACTO al prototipo
   */
  const navigationItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      view: 'dashboard',
      active: currentView === 'dashboard'
    },
    {
      text: 'Documentos',
      icon: <DocumentsIcon />,
      view: 'documents',
      active: currentView === 'documents'
    },
    {
      text: 'Historial',
      icon: <HistoryIcon />,
      view: 'history',
      active: currentView === 'history'
    }
  ];

  /**
   * Contenido del drawer - ESTRUCTURA DEL PROTOTIPO
   * MODIFICADO: Fondo azul oscuro solo en modo claro
   */
  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: !isDarkMode ? '#1A5799' : undefined,
      color: !isDarkMode ? '#ffffff' : undefined,
    }}>
      {/* Header del Sidebar */}
      <Box sx={{ 
        p: 2, 
        bgcolor: !isDarkMode ? '#1A5799' : 'primary.main',
        color: 'white',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Avatar sx={{ bgcolor: 'white', color: 'primary.main', mr: 1, fontSize: '1rem' }}>
            PN
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              ProNotary
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1 }}>
              Matrizador
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Divider sx={{ borderColor: !isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined }} />
      
      {/* Navegación Principal */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: 1, py: 2 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.view} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.view)}
                sx={{
                  borderRadius: 1,
                  py: 1.5, // Botones más altos
                  bgcolor: item.active 
                    ? (!isDarkMode ? '#468BE6' : 'primary.main')
                    : 'transparent',
                  color: item.active 
                    ? 'white' 
                    : (!isDarkMode ? '#ffffff' : 'text.primary'),
                  '&:hover': {
                    bgcolor: item.active 
                      ? (!isDarkMode ? '#1A5799' : 'primary.dark')
                      : (!isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'action.hover')
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: item.active 
                    ? 'white' 
                    : (!isDarkMode ? '#93BFEF' : 'primary.main'),
                  minWidth: 40 
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: item.active ? 'bold' : 'medium',
                    color: item.active 
                      ? 'white' 
                      : (!isDarkMode ? '#ffffff' : 'inherit')
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: !isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined }} />

      {/* Usuario Info en el sidebar */}
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: !isDarkMode ? '#ffffff' : getUserRoleColor(),
              color: !isDarkMode ? '#1A5799' : 'inherit',
              width: 32,
              height: 32,
              mr: 1.5,
              fontSize: '0.875rem'
            }}
          >
            {getUserInitials()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'medium',
                color: !isDarkMode ? '#ffffff' : 'inherit'
              }} 
              noWrap
            >
              {user?.firstName}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{
                color: !isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
              }}
              noWrap
            >
              {user?.role}
            </Typography>
          </Box>
        </Box>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<LogoutIcon />}
          onClick={logout}
          fullWidth
          sx={{ 
            fontSize: '0.75rem',
            borderColor: !isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'inherit',
            color: !isDarkMode ? '#ffffff' : 'inherit',
            '&:hover': {
              borderColor: !isDarkMode ? '#ffffff' : 'inherit',
              backgroundColor: !isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'inherit'
            }
          }}
        >
          Cerrar Sesión
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar superior */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Centro de Control - Matrizador
          </Typography>
          
          {/* Usuario info en header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
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

          <ThemeToggle />
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        {/* Drawer móvil */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              backgroundColor: !isDarkMode ? '#1A5799' : undefined,
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Drawer permanente desktop - EXTENDIDO A TODA LA ALTURA */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              backgroundColor: !isDarkMode ? '#1A5799' : undefined,
              height: '100vh',
              position: 'fixed',
              top: 0,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <Toolbar />
        
        {/* Área de contenido */}
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default MatrizadorLayout;