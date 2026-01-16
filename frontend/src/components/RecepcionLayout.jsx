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
  Button,
  Container,
  Tooltip,
  Switch
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as DocumentsIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  WhatsApp as WhatsAppIcon,
  KeyboardDoubleArrowLeft as CollapseIcon,
  KeyboardDoubleArrowRight as ExpandIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import { useThemeCtx } from '../contexts/theme-ctx';
import ChangePassword from './ChangePassword';
import { navItemsByRole } from '../config/nav-items';

// Anchos del sidebar
const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 60;

/**
 * Layout principal del Recepción siguiendo exactamente el patrón de Matrizador
 * Incluye sidebar de navegación y área de contenido
 */
const RecepcionLayout = ({ children, currentView, onViewChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { user, logout, getUserRoleColor, getFullName, getUserInitials } = useAuth();
  const { resolvedIsDark: isDarkMode, cycleMode: toggleTheme } = useThemeCtx();

  // Trazas de verificación del layout
  useEffect(() => {
    // eslint-disable-next-line no-console
  }, [user?.role]);

  // Cargar estado del sidebar desde localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('reception-sidebar-collapsed');
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed));
    }
  }, []);

  // Guardar estado del sidebar en localStorage
  useEffect(() => {
    localStorage.setItem('reception-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  /**
   * Toggle del drawer móvil
   */
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  /**
   * Toggle del sidebar colapsable
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

  // Fuente única desde config + mapeo de iconos
  const role = user?.role || 'RECEPCION';
  const iconMap = {
    Dashboard: <DashboardIcon />,
    Assignment: <DocumentsIcon />,
    WhatsApp: <WhatsAppIcon />
  };
  const navigationItems = useMemo(() => {
    const source = (navItemsByRole[role] || []).filter(i =>
      ['dashboard', 'documentos', 'notificaciones'].includes(i.id)
    );
    return source.map(i => ({
      text: i.label,
      icon: iconMap[i.icon] || <DashboardIcon />,
      view: i.view,
      active: currentView === i.view
    }));
  }, [role, currentView]);

  /**
   * Contenido del drawer con funcionalidad de colapso
   */
  const drawer = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: !isDarkMode ? '#1e40af' : undefined,
      color: !isDarkMode ? '#ffffff' : undefined,
      transition: 'all 0.3s ease',
    }}>
      {/* Header del sidebar con botón de colapso */}
      <Box sx={{
        p: 2,
        bgcolor: !isDarkMode ? '#1e40af' : 'primary.main',
        color: 'white',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarCollapsed ? 'center' : 'space-between',
        flexShrink: 0,
        gap: 1,
      }}>
        {!sidebarCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Avatar sx={{ bgcolor: 'white', color: 'primary.main', mr: 1, fontSize: '1rem' }}>
              📨
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                ProNotary
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1 }}>
                Recepción
              </Typography>
            </Box>
          </Box>
        )}
        {sidebarCollapsed && (
          <Avatar sx={{ bgcolor: 'white', color: 'primary.main', fontSize: '1rem' }}>
            📨
          </Avatar>
        )}
        <Tooltip title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'} placement="right">
          <IconButton
            onClick={handleSidebarToggle}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
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
              <Tooltip
                title={sidebarCollapsed ? item.text : ''}
                placement="right"
                disableHoverListener={!sidebarCollapsed}
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.view)}
                  sx={{
                    borderRadius: 1,
                    py: 1.5,
                    px: sidebarCollapsed ? 1.5 : 2,
                    bgcolor: item.active
                      ? (!isDarkMode ? '#468BE6' : 'primary.main')
                      : 'transparent',
                    color: item.active
                      ? 'white'
                      : (!isDarkMode ? '#ffffff' : 'text.primary'),
                    '&:hover': {
                      bgcolor: item.active
                        ? (!isDarkMode ? '#1e40af' : 'primary.dark')
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
              </Tooltip>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: !isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined }} />

      {/* Toggle de modo oscuro */}
      <Box sx={{ px: 1, py: 1, flexShrink: 0 }}>
        <Tooltip
          title={sidebarCollapsed ? (isDarkMode ? 'Modo Claro' : 'Modo Oscuro') : ''}
          placement="right"
          disableHoverListener={!sidebarCollapsed}
        >
          <ListItemButton
            onClick={toggleTheme}
            sx={{
              borderRadius: 1,
              py: 1.5,
              px: sidebarCollapsed ? 1.5 : 2,
              color: !isDarkMode ? '#ffffff' : 'text.primary',
              '&:hover': {
                bgcolor: !isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'action.hover'
              },
              justifyContent: sidebarCollapsed ? 'center' : 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? 0 : 1.5 }}>
              <Box sx={{ color: !isDarkMode ? '#93BFEF' : 'primary.main' }}>
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </Box>
              {!sidebarCollapsed && (
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                </Typography>
              )}
            </Box>
            {!sidebarCollapsed && (
              <Switch
                checked={isDarkMode}
                onChange={toggleTheme}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'white',
                    '& + .MuiSwitch-track': {
                      backgroundColor: '#f39c12',
                    },
                  },
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: !isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined }} />

      {/* Usuario Info en el sidebar */}
      <Box sx={{ p: sidebarCollapsed ? 1 : 2, flexShrink: 0 }}>
        {!sidebarCollapsed ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  bgcolor: !isDarkMode ? '#ffffff' : getUserRoleColor(),
                  color: !isDarkMode ? '#1e40af' : 'inherit',
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

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => setShowChangePassword(true)}
                sx={{
                  fontSize: '0.75rem',
                  borderColor: !isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'inherit',
                  color: !isDarkMode ? '#ffffff' : 'inherit',
                  '&:hover': {
                    borderColor: !isDarkMode ? '#ffffff' : 'inherit',
                    backgroundColor: !isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'inherit'
                  },
                  minWidth: 'auto',
                  flex: 1
                }}
              >
                Config
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={logout}
                sx={{
                  fontSize: '0.75rem',
                  borderColor: !isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'inherit',
                  color: !isDarkMode ? '#ffffff' : 'inherit',
                  '&:hover': {
                    borderColor: !isDarkMode ? '#ffffff' : 'inherit',
                    backgroundColor: !isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'inherit'
                  },
                  minWidth: 'auto',
                  flex: 1
                }}
              >
                Salir
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Tooltip title={`${user?.firstName} - ${user?.role}`} placement="right">
              <Avatar
                sx={{
                  bgcolor: !isDarkMode ? '#ffffff' : getUserRoleColor(),
                  color: !isDarkMode ? '#1e40af' : 'inherit',
                  width: 32,
                  height: 32,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {getUserInitials()}
              </Avatar>
            </Tooltip>

            <Tooltip title="Configuración" placement="right">
              <IconButton
                onClick={() => setShowChangePassword(true)}
                size="small"
                sx={{
                  color: !isDarkMode ? '#ffffff' : 'inherit',
                  border: `1px solid ${!isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'currentColor'}`,
                  '&:hover': {
                    borderColor: !isDarkMode ? '#ffffff' : 'inherit',
                    backgroundColor: !isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'inherit'
                  }
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Cerrar Sesión" placement="right">
              <IconButton
                onClick={logout}
                size="small"
                sx={{
                  color: !isDarkMode ? '#ffffff' : 'inherit',
                  border: `1px solid ${!isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'currentColor'}`,
                  '&:hover': {
                    borderColor: !isDarkMode ? '#ffffff' : 'inherit',
                    backgroundColor: !isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'inherit'
                  }
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar superior */}
      <AppBar
        position="fixed"
        sx={{
          width: {
            sm: `calc(100% - ${sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH}px)`
          },
          ml: {
            sm: `${sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH}px`
          },
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: 'width 0.3s ease, margin-left 0.3s ease',
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
            Centro de Control - Recepción
          </Typography>

          {/* Usuario info en header */}
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

      {/* Sidebar Navigation */}
      <Box
        component="nav"
        sx={{
          width: { sm: sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH },
          flexShrink: { sm: 0 },
          transition: 'width 0.3s ease'
        }}
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
              backgroundColor: !isDarkMode ? '#1e40af' : undefined,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Drawer permanente desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
              backgroundColor: !isDarkMode ? '#1e40af' : undefined,
              height: '100vh',
              position: 'fixed',
              top: 0,
              transition: 'width 0.3s ease',
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
          width: {
            sm: `calc(100% - ${sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH}px)`
          },
          minHeight: '100vh',
          bgcolor: 'background.default',
          transition: 'width 0.3s ease'
        }}
      >
        <Toolbar />

        {/* Área de contenido */}
        <Container maxWidth="xl" sx={{ py: 3 }}>
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