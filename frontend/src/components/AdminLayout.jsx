import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip,
  Switch,
  Collapse,
  Badge
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
  Description as DescriptionIcon,
  Analytics as AnalyticsIcon,
  Poll as PollIcon,
  QrCode as QrCodeIcon,
  AccountBalance as AccountBalanceIcon,
  CloudUpload as CloudUploadIcon,
  Receipt as ReceiptIcon,
  Payments as PaymentsIcon,
  Assessment as AssessmentIcon,
  Lock as LockIcon,
  Message as MessageIcon,
  Style as StyleIcon,
  Gavel as GavelIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import { useThemeCtx } from '../contexts/theme-ctx';
import { ThemeProvider } from '@mui/material/styles';
import { getAppTheme } from '../config/theme';
import ChangePassword from './ChangePassword';

// Sidebar widths
const DRAWER_WIDTH = 260;
const COLLAPSED_DRAWER_WIDTH = 72;

/**
 * AdminLayout — Stitch design sidebar
 * Clean section labels, compact user card, no large buttons
 */
const AdminLayout = ({ children, currentView, onViewChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [billingMenuOpen, setBillingMenuOpen] = useState(false);
  const { user, logout, getUserRoleColor, getFullName, getUserInitials } = useAuth();
  const { resolvedIsDark: isDarkMode, setMode } = useThemeCtx();

  const toggleTheme = () => {
    setMode(isDarkMode ? 'light' : 'dark');
  };

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
    if (savedCollapsed !== null) setSidebarCollapsed(JSON.parse(savedCollapsed));
    const savedBilling = localStorage.getItem('admin-billing-menu-open');
    if (savedBilling !== null) setBillingMenuOpen(JSON.parse(savedBilling));
  }, []);

  // Keep billing submenu open when on a billing view
  useEffect(() => {
    const billingViews = ['importar-datos', 'facturas', 'pagos', 'reportes'];
    if (billingViews.includes(currentView)) setBillingMenuOpen(true);
  }, [currentView]);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    localStorage.setItem('admin-billing-menu-open', JSON.stringify(billingMenuOpen));
  }, [billingMenuOpen]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleSidebarToggle = () => setSidebarCollapsed(!sidebarCollapsed);
  const handleNavigation = (view) => {
    onViewChange(view);
    setMobileOpen(false);
  };

  // === NAVIGATION STRUCTURE (Stitch sections) ===
  const sections = [
    {
      label: 'Principal',
      items: [
        { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
        { view: 'documents', label: 'Documentos', icon: <DocumentIcon /> },
        { view: 'seguimiento-mensajes', label: 'Mensajes', icon: <MessageIcon /> },
      ],
    },
    {
      label: 'Gestión',
      items: [
        { view: 'formularios-uafe', label: 'Formularios UAFE', icon: <DescriptionIcon /> },
        { view: 'analisis-uafe', label: 'Análisis', icon: <AnalyticsIcon /> },
        { view: 'notifications', label: 'Notificaciones', icon: <NotificationsIcon /> },
        { view: 'encuestas-satisfaccion', label: 'Encuestas', icon: <PollIcon /> },
        { view: 'qr-management', label: 'QR', icon: <QrCodeIcon /> },
      ],
    },
    {
      label: 'Financiero',
      items: [
        { view: 'participacion-estado', label: 'Participación Estado', icon: <GavelIcon /> },
        {
          view: '_billing', label: 'Facturación', icon: <AccountBalanceIcon />,
          submenu: [
            { view: 'importar-datos', label: 'Importar Datos', icon: <CloudUploadIcon /> },
            { view: 'facturas', label: 'Facturas', icon: <ReceiptIcon /> },
            { view: 'pagos', label: 'Pagos', icon: <PaymentsIcon /> },
            { view: 'reportes', label: 'Reportes', icon: <AssessmentIcon /> },
          ],
        },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { view: 'users', label: 'Usuarios', icon: <PersonIcon /> },
        { view: 'settings', label: 'Configuraci�n', icon: <SettingsIcon /> },
        { view: 'whatsapp-templates', label: 'Templates', icon: <StyleIcon /> },
      ],
    },
  ];

  const isItemActive = (view) => currentView === view;
  const isBillingActive = ['importar-datos', 'facturas', 'pagos', 'reportes'].includes(currentView);

  // ── Reusable NavItem ──
  const NavItem = ({ item, collapsed }) => {
    const active = isItemActive(item.view);
    return (
      <ListItem disablePadding sx={{ mb: 0.25 }}>
        <Tooltip title={collapsed ? item.label : ''} placement="right">
          <ListItemButton
            onClick={() => handleNavigation(item.view)}
            sx={{
              borderRadius: 2,
              minHeight: 40,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1.5 : 2,
              mx: collapsed ? 0.5 : 0,
              backgroundColor: active
                ? (isDarkMode ? 'rgba(19, 109, 236, 0.12)' : 'rgba(19, 109, 236, 0.06)')
                : 'transparent',
              color: active
                ? '#136dec'
                : (isDarkMode ? '#94a3b8' : '#64748b'),
              '&:hover': {
                backgroundColor: active
                  ? (isDarkMode ? 'rgba(19, 109, 236, 0.18)' : 'rgba(19, 109, 236, 0.1)')
                  : (isDarkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0, 0, 0, 0.03)'),
              },
              transition: 'all 0.15s ease',
            }}
          >
            <ListItemIcon
              sx={{
                color: active ? '#136dec' : 'inherit',
                minWidth: collapsed ? 'auto' : 32,
                justifyContent: 'center',
                mr: collapsed ? 0 : 1.5,
                '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: active ? 600 : 500,
                  color: 'inherit',
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  // ── Submenu NavItem (Facturación) ──
  const SubmenuNavItem = ({ item, collapsed }) => {
    const active = isBillingActive;
    return (
      <ListItem disablePadding sx={{ mb: 0.25, flexDirection: 'column', alignItems: 'stretch' }}>
        <Tooltip title={collapsed ? item.label : ''} placement="right">
          <ListItemButton
            onClick={() => setBillingMenuOpen(!billingMenuOpen)}
            sx={{
              borderRadius: 2,
              minHeight: 40,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1.5 : 2,
              mx: collapsed ? 0.5 : 0,
              backgroundColor: active
                ? (isDarkMode ? 'rgba(19, 109, 236, 0.12)' : 'rgba(19, 109, 236, 0.06)')
                : 'transparent',
              color: active ? '#136dec' : (isDarkMode ? '#94a3b8' : '#64748b'),
              '&:hover': {
                backgroundColor: active
                  ? (isDarkMode ? 'rgba(19, 109, 236, 0.18)' : 'rgba(19, 109, 236, 0.1)')
                  : (isDarkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0, 0, 0, 0.03)'),
              },
              transition: 'all 0.15s ease',
            }}
          >
            <ListItemIcon
              sx={{
                color: active ? '#136dec' : 'inherit',
                minWidth: collapsed ? 'auto' : 32,
                justifyContent: 'center',
                mr: collapsed ? 0 : 1.5,
                '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.8125rem',
                    fontWeight: active ? 600 : 500,
                    color: 'inherit',
                  }}
                />
                <ExpandMoreIcon
                  sx={{
                    fontSize: 16,
                    color: 'inherit',
                    transform: billingMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </>
            )}
          </ListItemButton>
        </Tooltip>
        <Collapse in={billingMenuOpen && !collapsed} timeout="auto" unmountOnExit>
          <List sx={{ pl: 2, mt: 0.25 }}>
            {item.submenu.map((sub) => {
              const subActive = isItemActive(sub.view);
              return (
                <ListItem key={sub.view} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton
                    onClick={() => handleNavigation(sub.view)}
                    sx={{
                      borderRadius: 2,
                      minHeight: 34,
                      px: 2,
                      backgroundColor: subActive
                        ? (isDarkMode ? 'rgba(19, 109, 236, 0.1)' : 'rgba(19, 109, 236, 0.05)')
                        : 'transparent',
                      color: subActive ? '#136dec' : (isDarkMode ? '#94a3b8' : '#64748b'),
                      '&:hover': {
                        backgroundColor: subActive
                          ? (isDarkMode ? 'rgba(19, 109, 236, 0.15)' : 'rgba(19, 109, 236, 0.08)')
                          : (isDarkMode ? 'rgba(148, 163, 184, 0.06)' : 'rgba(0, 0, 0, 0.025)'),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: subActive ? '#136dec' : 'inherit', minWidth: 28, '& .MuiSvgIcon-root': { fontSize: '1rem' } }}>
                      {sub.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={sub.label}
                      primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: subActive ? 500 : 400, color: 'inherit' }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Collapse>
      </ListItem>
    );
  };

  // ── Section Label ──
  const SectionLabel = ({ label, collapsed }) => {
    if (collapsed) return <Divider sx={{ my: 1, mx: 1, borderColor: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.12)' }} />;
    return (
      <Typography
        sx={{
          px: 2,
          pt: 2.5,
          pb: 1,
          fontSize: '0.625rem',
          fontWeight: 700,
          color: isDarkMode ? '#475569' : '#94a3b8',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
    );
  };

  const drawer = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isDarkMode ? '#0f1419' : '#ffffff',
      borderRight: '1px solid',
      borderColor: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(226,232,240,1)',
    }}>
      {/* ── Sidebar Header ── */}
      <Box sx={{
        px: sidebarCollapsed ? 2 : 3,
        py: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarCollapsed ? 'center' : 'space-between',
      }}>
        {!sidebarCollapsed ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{
              bgcolor: '#136dec',
              color: 'white',
              width: 32,
              height: 32,
              fontSize: '0.875rem',
              borderRadius: 1.5,
            }}>
              <SecurityIcon sx={{ fontSize: '1rem' }} />
            </Avatar>
            <Typography variant="subtitle2" sx={{
              fontWeight: 600,
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              letterSpacing: '-0.01em',
              fontSize: '0.875rem',
            }}>
              Notaría Segura
            </Typography>
          </Box>
        ) : (
          <Avatar sx={{
            bgcolor: '#136dec',
            color: 'white',
            width: 36,
            height: 36,
            borderRadius: 1.5,
          }}>
            <SecurityIcon sx={{ fontSize: '1.1rem' }} />
          </Avatar>
        )}
        {!sidebarCollapsed && (
          <Tooltip title="Colapsar menú" placement="right">
            <IconButton
              onClick={handleSidebarToggle}
              size="small"
              sx={{
                color: isDarkMode ? '#475569' : '#cbd5e1',
                '&:hover': { color: isDarkMode ? '#94a3b8' : '#64748b' },
                width: 28,
                height: 28,
              }}
            >
              <CollapseIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* ── Navigation ── */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        '&::-webkit-scrollbar': { display: 'none' },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        px: sidebarCollapsed ? 0.5 : 1.5,
      }}>
        {sections.map((section) => (
          <Box key={section.label}>
            <SectionLabel label={section.label} collapsed={sidebarCollapsed} />
            <List disablePadding>
              {section.items.map((item) =>
                item.submenu ? (
                  <SubmenuNavItem key={item.view} item={item} collapsed={sidebarCollapsed} />
                ) : (
                  <NavItem key={item.view} item={item} collapsed={sidebarCollapsed} />
                )
              )}
            </List>
          </Box>
        ))}
      </Box>

      {/* ── Bottom Section: User + Controls ── */}
      <Box sx={{
        borderTop: '1px solid',
        borderColor: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(226,232,240,1)',
        p: sidebarCollapsed ? 1.5 : 2,
      }}>
        {/* User Card */}
        {!sidebarCollapsed ? (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            mb: 1.5,
            borderRadius: 2.5,
            backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)',
          }}>
            <Avatar
              sx={{
                bgcolor: getUserRoleColor(),
                width: 36,
                height: 36,
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontWeight: 600,
                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                fontSize: '0.8125rem',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {getFullName()}
              </Typography>
              <Typography sx={{
                color: isDarkMode ? '#64748b' : '#94a3b8',
                textTransform: 'uppercase',
                fontWeight: 600,
                fontSize: '0.625rem',
                letterSpacing: '0.06em',
                lineHeight: 1.2,
              }}>
                {user?.role}
              </Typography>
            </Box>
            <Tooltip title="Cerrar Sesión">
              <IconButton
                onClick={logout}
                size="small"
                sx={{
                  color: isDarkMode ? '#64748b' : '#94a3b8',
                  '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' },
                  width: 32,
                  height: 32,
                }}
              >
                <LogoutIcon sx={{ fontSize: '1.1rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Tooltip title="Cerrar Sesión" placement="right">
            <IconButton
              onClick={logout}
              size="small"
              sx={{
                display: 'flex',
                mx: 'auto',
                mb: 1,
                color: isDarkMode ? '#64748b' : '#94a3b8',
                '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' },
              }}
            >
              <LogoutIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Theme Toggle */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          px: sidebarCollapsed ? 0 : 0.5,
          mb: sidebarCollapsed ? 0 : 1,
        }}>
          {!sidebarCollapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {isDarkMode ? (
                <DarkModeIcon sx={{ fontSize: 16, color: '#64748b' }} />
              ) : (
                <LightModeIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
              )}
              <Typography sx={{ fontSize: '0.75rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                {isDarkMode ? 'Oscuro' : 'Claro'}
              </Typography>
            </Box>
          )}
          <Switch
            checked={!!isDarkMode}
            onChange={toggleTheme}
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: '#136dec' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#136dec' },
            }}
          />
        </Box>

        {/* Change Password — text link style */}
        {!sidebarCollapsed && (
          <Box
            onClick={() => setShowChangePassword(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1,
              py: 0.75,
              borderRadius: 1.5,
              cursor: 'pointer',
              color: isDarkMode ? '#64748b' : '#94a3b8',
              '&:hover': {
                color: isDarkMode ? '#94a3b8' : '#64748b',
                backgroundColor: isDarkMode ? 'rgba(148,163,184,0.05)' : 'rgba(0,0,0,0.025)',
              },
              transition: 'all 0.15s ease',
            }}
          >
            <LockIcon sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 500 }}>
              Cambiar Contraseña
            </Typography>
          </Box>
        )}
      </Box>

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <Box sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'center',
          borderTop: '1px solid',
          borderColor: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(226,232,240,1)',
        }}>
          <Tooltip title="Expandir menú" placement="right">
            <IconButton
              onClick={handleSidebarToggle}
              size="small"
              sx={{
                color: isDarkMode ? '#475569' : '#cbd5e1',
                '&:hover': { color: isDarkMode ? '#94a3b8' : '#64748b' },
              }}
            >
              <ExpandIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  const currentDrawerWidth = sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;
  const theme = React.useMemo(() => getAppTheme(isDarkMode), [isDarkMode]);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: isDarkMode ? '#101822' : '#f6f7f8' }}>
        {/* Drawer */}
        <Box
          component="nav"
          sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 } }}
        >
          {/* Mobile Drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                border: 'none',
              },
            }}
          >
            {drawer}
          </Drawer>

          {/* Permanent Drawer */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: currentDrawerWidth,
                transition: 'width 0.3s ease',
                border: 'none',
                overflow: 'hidden',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main Content — no AppBar, full height */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
            minHeight: '100vh',
            overflow: 'auto',
            transition: 'all 0.3s ease',
            p: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {/* Mobile hamburger */}
          <Box sx={{ display: { sm: 'none' }, mb: 2 }}>
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {children}
        </Box>

        {/* Change Password Modal */}
        <ChangePassword
          open={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      </Box>
    </ThemeProvider>
  );
};

export default AdminLayout;
