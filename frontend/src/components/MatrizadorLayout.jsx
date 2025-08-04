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

// Ancho del sidebar
const DRAWER_WIDTH = 240;

/**
 * Layout principal del Matrizador siguiendo exactamente el prototipo
 * Incluye sidebar de navegación y área de contenido
 */
const MatrizadorLayout = ({ children, currentView, onViewChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, getUserRoleColor, getFullName, getUserInitials } = useAuth();

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
   */
  const drawer = (
    <Box>
      {/* Header del Sidebar */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Avatar sx={{ bgcolor: 'white', color: 'primary.main', mr: 1, fontSize: '1rem' }}>
            PT
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              ProTraz
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1 }}>
              Matrizador
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Divider />
      
      {/* Navegación Principal */}
      <List sx={{ px: 1, py: 2 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.view} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.view)}
              sx={{
                borderRadius: 1,
                bgcolor: item.active ? 'primary.main' : 'transparent',
                color: item.active ? 'white' : 'text.primary',
                '&:hover': {
                  bgcolor: item.active ? 'primary.dark' : 'action.hover'
                }
              }}
            >
              <ListItemIcon sx={{ 
                color: item.active ? 'white' : 'primary.main',
                minWidth: 40 
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: item.active ? 'bold' : 'medium'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Usuario Info en el sidebar */}
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: getUserRoleColor(),
              width: 32,
              height: 32,
              mr: 1.5,
              fontSize: '0.875rem'
            }}
          >
            {getUserInitials()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }} noWrap>
              {user?.firstName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
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
          sx={{ fontSize: '0.75rem' }}
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
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Drawer permanente desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
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
        <Toolbar /> {/* Spacer para el AppBar */}
        
        {/* Área de contenido */}
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default MatrizadorLayout;