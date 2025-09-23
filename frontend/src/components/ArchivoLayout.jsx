import React, { useState, useEffect, useMemo } from 'react';
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
  Container,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  FolderSpecial as ArchiveIcon,
  Visibility as SupervisionIcon,
  WhatsApp as WhatsAppIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  KeyboardDoubleArrowLeft as CollapseIcon,
  KeyboardDoubleArrowRight as ExpandIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import ThemeToggle from './ThemeToggle';
import useThemeStore from '../store/theme-store';
import ChangePassword from './ChangePassword';
import { navItemsByRole } from '../config/nav-items';

// Ancho del sidebar
const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 60;

/**
 * Layout principal del Archivo siguiendo patrón de MatrizadorLayout
 * Incluye sidebar de navegación con funcionalidad dual:
 * - Documentos propios (como matrizador)
 * - Supervisión global (solo lectura)
 */
const ArchivoLayout = ({ children, currentView, onViewChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Cargar y guardar estado del sidebar como en otros roles
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('archivo-sidebar-collapsed');
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('archivo-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const { user, logout, getUserRoleColor, getFullName, getUserInitials } = useAuth();
  const { isDarkMode } = useThemeStore();

  // Trazas de verificación del layout
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info('[LAYOUT]', { role: user?.role, sidebar: 'mounted' });
  }, [user?.role]);

  /**
   * Toggle del drawer móvil
   */
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  /**
   * Toggle del sidebar colapsable (desktop)
   */
  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  /**
   * Navegación entre vistas
   */
  const handleNavigation = (view) => {
    onViewChange(view);
    setMobileOpen(false); // Cerrar drawer en móvil
  };

  /**
   * Items de navegación - Fuente única (config/nav-items.js)
   */
  const role = user?.role || 'ARCHIVO';
  const iconMap = {
    Dashboard: <DashboardIcon />,
    FolderSpecial: <ArchiveIcon />,
    WhatsApp: <WhatsAppIcon />,
    Visibility: <SupervisionIcon />
  };
  const navigationItems = useMemo(() => {
    const allowed = ['dashboard', 'documentos', 'notificaciones', 'supervision'];
    const source = (navItemsByRole[role] || []).filter(i => allowed.includes(i.id));
    return source.map(i => ({
      text: i.label,
      icon: iconMap[i.icon] || <DashboardIcon />,
      view: i.view,
      active: currentView === i.view
    }));
  }, [role, currentView]);

  /**
   * Manejar logout
   */
  const handleLogout = () => {
    logout();
  };

  /**
   * Contenido del drawer - ESTRUCTURA ADAPTADA PARA ARCHIVO
   * MODO OSCURO: Adaptación automática como MatrizadorLayout
   */
  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: !isDarkMode ? '#1A5799' : undefined,
      color: !isDarkMode ? '#ffffff' : undefined,
      transition: 'all 0.3s ease',
    }}>
      {/* Header del Sidebar */}
      <Box sx={{ 
        p: 2, 
        bgcolor: !isDarkMode ? '#1A5799' : 'primary.main',
        color: 'white',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarCollapsed ? 'center' : 'space-between',
        flexShrink: 0,
        gap: 1,
      }}>
        {!sidebarCollapsed ? (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Avatar sx={{ 
              bgcolor: 'white', 
              color: 'primary.main', 
              mr: 1, 
              fontSize: '1rem',
              width: 36,
              height: 36
            }}>
              📁
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                Notaría Segura
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1 }}>
                Archivo
              </Typography>
            </Box>
          </Box>
        ) : (
          <Avatar sx={{ bgcolor: 'white', color: 'primary.main', fontSize: '1rem' }}>
            📁
          </Avatar>
        )}
        <Tooltip title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'} placement="right">
          <IconButton
            onClick={handleSidebarToggle}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
              transition: 'all 0.2s ease',
            }}
            size="small"
          >
            {sidebarCollapsed ? <ExpandIcon /> : <CollapseIcon />}
          </IconButton>
        </Tooltip>
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
                  px: sidebarCollapsed ? 1.5 : 2,
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
                  },
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ 
                  color: item.active 
                    ? 'white' 
                    : (!isDarkMode ? '#93BFEF' : 'primary.main'),
                  minWidth: sidebarCollapsed ? 'unset' : 40,
                  justifyContent: 'center'
                }}>
                  {item.icon}
                </ListItemIcon>
                {!sidebarCollapsed && (
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
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: !isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined }} />
      
      {/* Usuario y Logout */}
      <Box sx={{ p: 2 }}>
        {/* Usuario Info en el sidebar */}
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
                fontWeight: 600,
                color: !isDarkMode ? '#ffffff' : 'text.primary',
                lineHeight: 1.2
              }}
            >
              {getFullName()}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: !isDarkMode ? '#B8D4F0' : 'text.secondary',
                lineHeight: 1
              }}
            >
              Archivo
            </Typography>
          </Box>
        </Box>

        {/* Theme Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <ThemeToggle />
        </Box>

        {/* Settings and Logout Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <ListItemButton
            onClick={() => setShowChangePassword(true)}
            sx={{
              borderRadius: 1,
              py: 1,
              color: !isDarkMode ? '#ffffff' : 'text.primary',
              '&:hover': {
                bgcolor: !isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'action.hover'
              }
            }}
          >
            <ListItemIcon sx={{ 
              color: !isDarkMode ? '#93BFEF' : 'text.secondary',
              minWidth: 36 
            }}>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Configuración"
              primaryTypographyProps={{
                variant: 'body2',
                color: !isDarkMode ? '#ffffff' : 'inherit'
              }}
            />
          </ListItemButton>

          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              py: 1,
              color: !isDarkMode ? '#ffffff' : 'text.primary',
              '&:hover': {
                bgcolor: !isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'action.hover'
              }
            }}
          >
            <ListItemIcon sx={{ 
              color: !isDarkMode ? '#93BFEF' : 'text.secondary',
              minWidth: 36 
            }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Salir"
              primaryTypographyProps={{
                variant: 'body2',
                color: !isDarkMode ? '#ffffff' : 'inherit'
              }}
            />
          </ListItemButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar - Solo visible en móvil */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          display: { md: 'none' }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="abrir menú"
            edge="start"
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Archivo - Notaría Segura
          </Typography>

          <ThemeToggle />
        </Toolbar>
      </AppBar>

      {/* Sidebar - Desktop */}
      <Box
        component="nav"
        sx={{ 
          width: { md: sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH }, 
          flexShrink: { md: 0 },
          transition: 'width 0.3s ease'
        }}
      >
        {/* Drawer móvil */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              border: 'none'
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Drawer desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
              border: 'none',
              borderRight: '1px solid',
              borderColor: 'divider'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Contenido Principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH}px)` },
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Espaciado para App Bar móvil */}
        <Toolbar 
          sx={{ 
            display: { md: 'none' }
          }} 
        />
        
        {/* Área de contenido con scroll */}
        <Container 
          maxWidth={false}
          sx={{ 
            flex: 1,
            py: 3,
            px: 3,
            overflow: 'auto',
            height: 'calc(100vh - 64px)' // Ajustar altura
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

export default ArchivoLayout;