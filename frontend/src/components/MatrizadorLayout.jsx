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
  Switch,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as DocumentsIcon,
  History as HistoryIcon,
  Logout as LogoutIcon,
  KeyboardDoubleArrowLeft as CollapseIcon,
  KeyboardDoubleArrowRight as ExpandIcon,
  Settings as SettingsIcon,
  Article as ArticleIcon,
  MoreVert as MoreVertIcon,
  QrCode as QrCodeIcon,
  Description as DescriptionIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import useThemeStore from '../store/theme-store';
import ChangePassword from './ChangePassword';
import { navItemsByRole } from '../config/nav-items';
import ThemeToggle from './ThemeToggle';

// Anchos del sidebar
const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 60;

/**
 * Layout principal del Matrizador siguiendo exactamente el prototipo
 * Incluye sidebar de navegación y área de contenido
 * MODIFICADO: Barra lateral azul oscura solo en modo claro para contraste
 */
const MatrizadorLayout = ({ children, currentView, onViewChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const { user, logout, getUserRoleColor, getFullName, getUserInitials } = useAuth();
  const { isDarkMode } = useThemeStore();

  // Trazas de verificación del layout
  useEffect(() => {
    // eslint-disable-next-line no-console
  }, [user?.role]);

  // Cargar estado del sidebar desde localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed));
    }
  }, []);

  // Guardar estado del sidebar en localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed));
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
  const role = user?.role || 'MATRIZADOR';
  const iconMap = {
    Dashboard: <DashboardIcon />,
    Assignment: <DocumentsIcon />,
    History: <HistoryIcon />,
    Description: <DescriptionIcon />,
    Article: <ArticleIcon />,
    QrCode: <QrCodeIcon />,
    WhatsApp: <WhatsAppIcon />
  };
  const navigationItems = useMemo(() => {
    const allowed = ['dashboard', 'documents', 'notifications', 'history', 'formularios-uafe', 'generador-qr'];
    const source = (navItemsByRole[role] || []).filter(i => allowed.includes(i.id));
    return source.map(i => ({
      text: i.label,
      icon: iconMap[i.icon] || <DashboardIcon />,
      view: i.view,
      active: currentView === i.view,
      beta: i.beta
    }));
  }, [role, currentView]);

  // Handlers para el menú de usuario
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
    handleUserMenuClose();
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
  };

  /**
   * Contenido del drawer - ESTRUCTURA OPTIMIZADA CON COLAPSO
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
      {/* Header del Sidebar con botón de colapso */}
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
        {!sidebarCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Avatar sx={{ bgcolor: 'white', color: 'primary.main', mr: 1, fontSize: '1rem' }}>
              ⚖️
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
        )}
        {sidebarCollapsed && (
          <Avatar sx={{ bgcolor: 'white', color: 'primary.main', fontSize: '1rem' }}>
            ⚖️
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
                    item.beta ? (
                      <ListItemText
                        primary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{item.text}</span>
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '8px',
                              backgroundColor: item.active ? 'rgba(255,255,255,0.2)' : (!isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(25,118,210,0.15)'),
                              color: item.active ? '#fff' : (!isDarkMode ? '#fff' : '#1976d2')
                            }}>BETA</span>
                          </Box>
                        }
                        primaryTypographyProps={{
                          component: 'span',
                          variant: 'body2',
                          fontWeight: item.active ? 'bold' : 'medium',
                          color: item.active
                            ? 'white'
                            : (!isDarkMode ? '#ffffff' : 'inherit')
                        }}
                      />
                    ) : (
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
                    )
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: !isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined }} />

      {/* Información del usuario simplificada en sidebar */}
      <Box sx={{ p: sidebarCollapsed ? 1 : 2, flexShrink: 0 }}>
        {!sidebarCollapsed ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Tooltip title={`${user?.firstName} - ${user?.role}`} placement="right">
              <Avatar
                sx={{
                  bgcolor: !isDarkMode ? '#ffffff' : getUserRoleColor(),
                  color: !isDarkMode ? '#1A5799' : 'inherit',
                  width: 32,
                  height: 32,
                  fontSize: '0.875rem'
                }}
              >
                {getUserInitials()}
              </Avatar>
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
            Centro de Control - Matrizador
          </Typography>

          {/* Controles de usuario en header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Toggle de modo oscuro (usa ThemeCtx) */}
            <ThemeToggle />

            {/* Nombre del usuario */}
            <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', md: 'block' } }}>
              {getFullName()}
            </Typography>

            {/* Avatar con menú desplegable */}
            <Tooltip title="Opciones de usuario">
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{ p: 0 }}
              >
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
              </IconButton>
            </Tooltip>

            {/* Menú desplegable de usuario */}
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              onClick={handleUserMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleChangePassword}>
                <SettingsIcon sx={{ mr: 1 }} />
                Cambiar Contraseña
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Cerrar Sesión
              </MenuItem>
            </Menu>
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
              width: sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
              backgroundColor: !isDarkMode ? '#1A5799' : undefined,
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

export default MatrizadorLayout;
