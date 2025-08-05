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
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import ThemeToggle from './ThemeToggle';
import useThemeStore from '../store/theme-store';
import ChangePassword from './ChangePassword';

// Ancho del sidebar
const DRAWER_WIDTH = 240;

/**
 * Layout principal del Recepción siguiendo exactamente el patrón de Matrizador
 * Incluye sidebar de navegación y área de contenido
 */
const RecepcionLayout = ({ children, currentView, onViewChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
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
   * Items de navegación específicos para RECEPCION
   */
  const navigationItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      view: 'dashboard',
      active: currentView === 'dashboard'
    },
    {
      text: 'Gestión de Documentos',
      icon: <DocumentsIcon />,
      view: 'documentos',
      active: currentView === 'documentos'
    },
    {
      text: 'Historial',
      icon: <HistoryIcon />,
      view: 'historial',
      active: currentView === 'historial'
    }
  ];

  /**
   * Contenido del drawer
   */
  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header del sidebar con usuario */}
      <Box
        sx={{
          p: 2,
          bgcolor: isDarkMode ? 'grey.900' : '#1e40af', // Azul más claro en modo claro
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'white',
            color: '#1e40af',
            width: 40,
            height: 40,
            fontWeight: 'bold'
          }}
        >
          RN
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 'bold',
              color: 'inherit',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            ProNotary
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem'
            }}
          >
            Recepción
          </Typography>
        </Box>
      </Box>

      {/* Navegación principal */}
      <List sx={{ flex: 1, py: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.view} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.view)}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 1,
                bgcolor: item.active ? 'primary.main' : 'transparent',
                color: item.active ? 'primary.contrastText' : 'text.primary',
                '&:hover': {
                  bgcolor: item.active ? 'primary.main' : 'action.hover',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <ListItemIcon 
                sx={{ 
                  color: item.active ? 'primary.contrastText' : 'primary.main',
                  minWidth: 36 
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: item.active ? 600 : 400
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Footer del sidebar */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {/* Información del usuario */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: getUserRoleColor(),
                width: 32,
                height: 32,
                fontSize: '0.75rem'
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {getFullName()}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  fontSize: '0.7rem' 
                }}
              >
                RECEPCION
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Botón de logout */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setShowChangePassword(true)}
            size="small"
            sx={{
              textTransform: 'none',
              fontSize: '0.8rem',
              py: 0.75,
              flex: 1
            }}
          >
            Config
          </Button>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={logout}
            size="small"
            sx={{
              textTransform: 'none',
              fontSize: '0.8rem',
              py: 0.75,
              flex: 1
            }}
          >
            Salir
          </Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: isDarkMode ? 'grey.900' : 'primary.main'
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
          
          <Typography 
            variant="h6" 
            noWrap 
            component="div"
            sx={{ flexGrow: 1 }}
          >
            Centro de Control - Recepción
          </Typography>
          
          {/* Theme Toggle */}
          <ThemeToggle />
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper'
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          height: '100vh',
          overflow: 'auto'
        }}
      >
        <Toolbar /> {/* Espaciador para el AppBar */}
        <Container 
          maxWidth={false} 
          sx={{ 
            py: 3,
            px: { xs: 2, sm: 3 },
            height: 'calc(100vh - 64px)',
            overflow: 'auto'
          }}
        >
          {children}
        </Container>
      </Box>

      {/* Modal de cambio de contraseña */}
      <ChangePassword 
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </Box>
  );
};

export default RecepcionLayout;