import React, { useState, useEffect } from 'react';
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
  Person as PersonIcon,
  Assignment as DocumentIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  KeyboardDoubleArrowLeft as CollapseIcon,
  KeyboardDoubleArrowRight as ExpandIcon,
  Notifications as NotificationsIcon,
  WhatsApp as WhatsAppIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import useThemeStore from '../store/theme-store';
import ChangePassword from './ChangePassword';
import { navItemsByRole } from '../config/nav-items';

// Anchos del sidebar
const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 60;

/**
 * Layout principal del Administrador siguiendo el patrón de otros layouts
 * Incluye sidebar de navegación y área de contenido
 */
const AdminLayout = ({ children, currentView, onViewChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [configMenuOpen, setConfigMenuOpen] = useState(false);
  const { user, logout, getUserRoleColor, getFullName, getUserInitials } = useAuth();
  const { isDarkMode, toggleTheme } = useThemeStore();

  // Trazas de verificación del layout
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info('[LAYOUT]', { role: user?.role, sidebar: 'mounted' });
  }, [user?.role]);

  // Cargar estado del sidebar desde localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed));
    }

    const savedConfigOpen = localStorage.getItem('admin-config-menu-open');
    if (savedConfigOpen !== null) {
      setConfigMenuOpen(JSON.parse(savedConfigOpen));
    }
  }, []);

  // Mantener submenu de configuración abierto si estamos en una vista de configuración
  useEffect(() => {
    if (currentView === 'settings' || currentView === 'whatsapp-templates') {
      setConfigMenuOpen(true);
    }
  }, [currentView]);

  // Guardar estado del sidebar en localStorage
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Guardar estado del submenu de configuración
  useEffect(() => {
    localStorage.setItem('admin-config-menu-open', JSON.stringify(configMenuOpen));
  }, [configMenuOpen]);

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
  const role = user?.role || 'ADMIN';
  const iconMap = {
    Dashboard: <DashboardIcon />,
    Person: <PersonIcon />,
    Description: <DescriptionIcon />,
    Notifications: <NotificationsIcon />,
    Settings: <SettingsIcon />,
    WhatsApp: <WhatsAppIcon />
  };
  const allItems = (navItemsByRole[role] || []);
  const navigationItems = React.useMemo(() => {
    // Excluir ítems que van en submenu de configuración
    const exclude = new Set(['settings', 'whatsapp-templates']);
    return allItems
      .filter(i => !exclude.has(i.id))
      .map(i => ({
        text: i.label,
        icon: iconMap[i.icon] || <DashboardIcon />,
        view: i.view,
        active: currentView === i.view
      }));
  }, [allItems, currentView]);

  /**
   * Items del submenu de Configuración
   */
  const configSubmenuItems = React.useMemo(() => {
    const include = new Set(['settings', 'whatsapp-templates']);
    return allItems
      .filter(i => include.has(i.id))
      .map(i => ({
        text: i.label,
        view: i.view,
        active: currentView === i.view
      }));
  }, [allItems, currentView]);

  /**
   * Contenido del drawer
   */
  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: isDarkMode ? 'background.paper' : '#1e40af', // Fondo azul en modo claro
      color: isDarkMode ? 'text.primary' : 'white', // Texto blanco en modo claro
      transition: 'all 0.3s ease'
    }}>
      {/* Header del sidebar con botón de colapso */}
      <Box sx={{ 
        p: 2, 
        bgcolor: isDarkMode ? 'grey.900' : 'rgba(0, 0, 0, 0.1)', // Ligeramente más oscuro en modo claro
        color: 'inherit',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarCollapsed ? 'center' : 'space-between',
        flexShrink: 0,
        gap: 1,
      }}>
        {!sidebarCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Avatar sx={{ 
              bgcolor: 'white', 
              color: '#1e40af', 
              mr: 1, 
              fontSize: '1rem',
              width: 32,
              height: 32 
            }}>
              <SecurityIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                Notaría Segura
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1 }}>
                Administrador
              </Typography>
            </Box>
          </Box>
        )}
        {sidebarCollapsed && (
          <Avatar sx={{ 
            bgcolor: 'white', 
            color: '#1e40af', 
            fontSize: '1rem',
            width: 32,
            height: 32 
          }}>
            <SecurityIcon />
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

      {/* Navegación principal */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: 1, py: 2 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.view} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={sidebarCollapsed ? item.text : ''} placement="right">
                <ListItemButton
                  onClick={() => handleNavigation(item.view)}
                  sx={{
                    borderRadius: 1,
                    minHeight: 48,
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    px: sidebarCollapsed ? 1 : 2,
                    backgroundColor: item.active 
                      ? (isDarkMode ? 'primary.dark' : 'rgba(255, 255, 255, 0.25)') 
                      : 'transparent',
                    color: 'inherit', // Heredar el color del contenedor padre
                    '&:hover': {
                      backgroundColor: item.active 
                        ? (isDarkMode ? 'primary.main' : 'rgba(255, 255, 255, 0.35)') 
                        : (isDarkMode ? 'action.hover' : 'rgba(255, 255, 255, 0.15)'),
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'inherit',
                      minWidth: sidebarCollapsed ? 'auto' : 40,
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!sidebarCollapsed && (
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: item.active ? 600 : 400,
                        color: 'inherit'
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}

          {/* Configuración con submenu */}
          <ListItem disablePadding sx={{ mb: 0.5, flexDirection: 'column' }}>
            {/* Botón principal de Configuración */}
            <Tooltip title={sidebarCollapsed ? 'Configuración' : ''} placement="right">
              <ListItemButton
                onClick={() => setConfigMenuOpen(!configMenuOpen)}
                sx={{
                  borderRadius: 1,
                  minHeight: 48,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  px: sidebarCollapsed ? 1 : 2,
                  backgroundColor: (currentView === 'settings' || currentView === 'whatsapp-templates')
                    ? (isDarkMode ? 'primary.dark' : 'rgba(255, 255, 255, 0.25)') 
                    : 'transparent',
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: (currentView === 'settings' || currentView === 'whatsapp-templates')
                      ? (isDarkMode ? 'primary.main' : 'rgba(255, 255, 255, 0.35)') 
                      : (isDarkMode ? 'action.hover' : 'rgba(255, 255, 255, 0.15)'),
                  },
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
              >
                <ListItemIcon
                  sx={{
                    color: 'inherit',
                    minWidth: sidebarCollapsed ? 'auto' : 40,
                    justifyContent: 'center',
                  }}
                >
                  <SettingsIcon />
                </ListItemIcon>
                {!sidebarCollapsed && (
                  <>
                    <ListItemText 
                      primary="Configuración"
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: (currentView === 'settings' || currentView === 'whatsapp-templates') ? 600 : 400,
                        color: 'inherit'
                      }}
                    />
                    <IconButton size="small" sx={{ color: 'inherit' }}>
                      {configMenuOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                    </IconButton>
                  </>
                )}
              </ListItemButton>
            </Tooltip>

            {/* Submenu de Configuración */}
            {!sidebarCollapsed && configMenuOpen && (
              <List sx={{ pl: 2, width: '100%' }}>
                {configSubmenuItems.map((subItem) => (
                  <ListItem key={subItem.view} disablePadding>
                    <ListItemButton
                      onClick={() => handleNavigation(subItem.view)}
                      sx={{
                        borderRadius: 1,
                        minHeight: 40,
                        px: 2,
                        backgroundColor: subItem.active 
                          ? (isDarkMode ? 'primary.main' : 'rgba(255, 255, 255, 0.35)') 
                          : 'transparent',
                        color: 'inherit',
                        '&:hover': {
                          backgroundColor: subItem.active 
                            ? (isDarkMode ? 'primary.light' : 'rgba(255, 255, 255, 0.45)') 
                            : (isDarkMode ? 'action.hover' : 'rgba(255, 255, 255, 0.25)'),
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <ListItemText 
                        primary={subItem.text}
                        primaryTypographyProps={{
                          fontSize: '0.8rem',
                          fontWeight: subItem.active ? 600 : 400,
                          color: 'inherit'
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </ListItem>
        </List>
      </Box>

      <Divider />

      {/* Sección de controles */}
      <Box sx={{ p: sidebarCollapsed ? 1 : 2 }}>
        {/* Usuario actual */}
        {!sidebarCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: getUserRoleColor(),
                width: 32,
                height: 32,
                mr: 1,
                fontSize: '0.875rem'
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {getFullName()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.role}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Control de tema */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: sidebarCollapsed ? 'center' : 'space-between', 
          mb: 1 
        }}>
          {!sidebarCollapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isDarkMode ? <DarkModeIcon sx={{ mr: 1, fontSize: 20 }} /> : <LightModeIcon sx={{ mr: 1, fontSize: 20 }} />}
              <Typography variant="body2">
                Modo {isDarkMode ? 'Oscuro' : 'Claro'}
              </Typography>
            </Box>
          )}
          <Tooltip title={sidebarCollapsed ? `Cambiar a modo ${isDarkMode ? 'claro' : 'oscuro'}` : ''} placement="right">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {sidebarCollapsed && (isDarkMode ? <DarkModeIcon sx={{ mr: 0.5, fontSize: 20 }} /> : <LightModeIcon sx={{ mr: 0.5, fontSize: 20 }} />)}
              <Switch
                checked={isDarkMode}
                onChange={toggleTheme}
                size="small"
              />
            </Box>
          </Tooltip>
        </Box>

        {/* Botones de acción */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Tooltip title={sidebarCollapsed ? 'Cambiar Contraseña' : ''} placement="right">
            <Button
              variant="outlined"
              startIcon={!sidebarCollapsed ? <SettingsIcon /> : null}
              onClick={() => setShowChangePassword(true)}
              size="small"
              fullWidth={!sidebarCollapsed}
              sx={{ 
                minWidth: sidebarCollapsed ? 36 : 'auto',
                px: sidebarCollapsed ? 0 : undefined 
              }}
            >
              {sidebarCollapsed ? <SettingsIcon /> : 'Cambiar Contraseña'}
            </Button>
          </Tooltip>
          <Tooltip title={sidebarCollapsed ? 'Cerrar Sesión' : ''} placement="right">
            <Button
              variant="contained"
              startIcon={!sidebarCollapsed ? <LogoutIcon /> : null}
              onClick={logout}
              size="small"
              fullWidth={!sidebarCollapsed}
              color="error"
              sx={{ 
                minWidth: sidebarCollapsed ? 36 : 'auto',
                px: sidebarCollapsed ? 0 : undefined 
              }}
            >
              {sidebarCollapsed ? <LogoutIcon /> : 'Cerrar Sesión'}
            </Button>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  const currentDrawerWidth = sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { sm: `${currentDrawerWidth}px` },
          transition: 'all 0.3s ease',
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
          <Typography variant="h6" noWrap component="div">
            Panel de Administración
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation folders"
      >
        {/* Drawer móvil */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Mejor performance en móvil
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH 
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Drawer permanente */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: currentDrawerWidth,
              transition: 'width 0.3s ease'
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
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          height: '100vh',
          overflow: 'auto',
          transition: 'all 0.3s ease'
        }}
      >
        <Toolbar /> {/* Espaciado para el AppBar */}
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

export default AdminLayout;