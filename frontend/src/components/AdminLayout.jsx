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
  ChevronRight as ChevronRightIcon,
  Description as DescriptionIcon,
  Analytics as AnalyticsIcon,
  Poll as PollIcon,
  QrCode as QrCodeIcon,
  AccountBalance as AccountBalanceIcon,
  CloudUpload as CloudUploadIcon,
  Receipt as ReceiptIcon,
  Payments as PaymentsIcon,
  Assessment as AssessmentIcon,
  Send as SendIcon,
  FolderOpen as FolderOpenIcon,
  Message as MessageIcon,
  Shield as ShieldIcon,
  AdminPanelSettings as AdminPanelSettingsIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import { useThemeCtx } from '../contexts/theme-ctx';
import { ThemeProvider } from '@mui/material/styles';
import { getAppTheme } from '../config/theme';
import ChangePassword from './ChangePassword';

// Anchos del sidebar
const DRAWER_WIDTH = 260;
const COLLAPSED_DRAWER_WIDTH = 72;

/**
 * Layout principal del Administrador - Diseño refinado y elegante
 * Sidebar simplificado con jerarquía clara y estilo institucional
 */
const AdminLayout = ({ children, currentView, onViewChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [billingMenuOpen, setBillingMenuOpen] = useState(false);
  const [complianceMenuOpen, setComplianceMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const { user, logout, getUserRoleColor, getFullName, getUserInitials } = useAuth();
  const { resolvedIsDark: isDarkMode, setMode } = useThemeCtx();

  const toggleTheme = () => {
    setMode(isDarkMode ? 'light' : 'dark');
  };

  // Cargar estado del sidebar desde localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed));
    }
    const savedBillingOpen = localStorage.getItem('admin-billing-menu-open');
    if (savedBillingOpen !== null) {
      setBillingMenuOpen(JSON.parse(savedBillingOpen));
    }
    const savedComplianceOpen = localStorage.getItem('admin-compliance-menu-open');
    if (savedComplianceOpen !== null) {
      setComplianceMenuOpen(JSON.parse(savedComplianceOpen));
    }
    const savedAdminOpen = localStorage.getItem('admin-admin-menu-open');
    if (savedAdminOpen !== null) {
      setAdminMenuOpen(JSON.parse(savedAdminOpen));
    }
  }, []);

  // Mantener submenus abiertos si estamos en una vista correspondiente
  useEffect(() => {
    const billingViews = ['importar-datos', 'facturas', 'pagos', 'reportes'];
    if (billingViews.includes(currentView)) setBillingMenuOpen(true);
    const complianceViews = ['formularios-uafe', 'analisis-uafe'];
    if (complianceViews.includes(currentView)) setComplianceMenuOpen(true);
    const adminViews = ['users', 'notifications', 'encuestas-satisfaccion', 'qr-management', 'whatsapp-templates', 'settings'];
    if (adminViews.includes(currentView)) setAdminMenuOpen(true);
  }, [currentView]);

  // Guardar estado en localStorage
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('admin-billing-menu-open', JSON.stringify(billingMenuOpen));
  }, [billingMenuOpen]);

  useEffect(() => {
    localStorage.setItem('admin-compliance-menu-open', JSON.stringify(complianceMenuOpen));
  }, [complianceMenuOpen]);

  useEffect(() => {
    localStorage.setItem('admin-admin-menu-open', JSON.stringify(adminMenuOpen));
  }, [adminMenuOpen]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleNavigation = (view) => {
    onViewChange(view);
    setMobileOpen(false);
  };

  // === ESTRUCTURA DE NAVEGACIÓN REORGANIZADA ===
  // Top-level: lo que el notario usa cada día
  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
    { id: 'documents', label: 'Documentos', icon: <DocumentIcon />, view: 'documents' },
    { id: 'seguimiento-mensajes', label: 'Mensajes', icon: <MessageIcon />, view: 'seguimiento-mensajes' },
  ];

  // Cumplimiento regulatorio (UAFE)
  const complianceSubItems = [
    { view: 'formularios-uafe', label: 'Formularios UAFE', icon: <DescriptionIcon fontSize="small" /> },
    { view: 'analisis-uafe', label: 'Análisis UAFE', icon: <AnalyticsIcon fontSize="small" /> },
  ];

  // Facturación (ya existente)
  const billingSubItems = [
    { view: 'importar-datos', label: 'Importar Datos', icon: <CloudUploadIcon fontSize="small" /> },
    { view: 'facturas', label: 'Facturas', icon: <ReceiptIcon fontSize="small" /> },
    { view: 'pagos', label: 'Pagos', icon: <PaymentsIcon fontSize="small" /> },
    { view: 'reportes', label: 'Reportes', icon: <AssessmentIcon fontSize="small" /> },
  ];

  // Administración (uso infrecuente)
  const adminSubItems = [
    { view: 'users', label: 'Usuarios', icon: <PersonIcon fontSize="small" /> },
    { view: 'notifications', label: 'Notificaciones', icon: <NotificationsIcon fontSize="small" /> },
    { view: 'encuestas-satisfaccion', label: 'Encuestas', icon: <PollIcon fontSize="small" /> },
    { view: 'qr-management', label: 'Códigos QR', icon: <QrCodeIcon fontSize="small" /> },
    { view: 'whatsapp-templates', label: 'Templates WhatsApp', icon: <WhatsAppIcon fontSize="small" /> },
    { view: 'settings', label: 'Configuración', icon: <SettingsIcon fontSize="small" /> },
  ];

  const isItemActive = (view) => currentView === view;
  const isBillingActive = billingSubItems.some(item => currentView === item.view);
  const isComplianceActive = complianceSubItems.some(item => currentView === item.view);
  const isAdminActive = adminSubItems.some(item => currentView === item.view);

  const NavItem = ({ item, collapsed }) => {
    const active = isItemActive(item.view);
    return (
      <ListItem disablePadding sx={{ mb: 0.5 }}>
        <Tooltip title={collapsed ? item.label : ''} placement="right">
          <ListItemButton
            onClick={() => handleNavigation(item.view)}
            sx={{
              borderRadius: 3,
              minHeight: 48,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1.5 : 2.5,
              mx: collapsed ? 0.5 : 1.5,
              backgroundColor: active
                ? (isDarkMode ? 'rgba(30, 58, 95, 0.4)' : 'rgba(30, 58, 95, 0.08)')
                : 'transparent',
              color: active
                ? (isDarkMode ? '#93c5fd' : '#1e3a5f')
                : (isDarkMode ? '#94a3b8' : '#64748b'),
              borderLeft: active ? '3px solid' : '3px solid transparent',
              borderColor: active ? 'primary.main' : 'transparent',
              '&:hover': {
                backgroundColor: active
                  ? (isDarkMode ? 'rgba(30, 58, 95, 0.5)' : 'rgba(30, 58, 95, 0.12)')
                  : (isDarkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(30, 58, 95, 0.04)'),
              },
              transition: 'all 0.2s ease',
            }}
          >
            <ListItemIcon
              sx={{
                color: active ? 'primary.main' : 'inherit',
                minWidth: collapsed ? 'auto' : 36,
                justifyContent: 'center',
                mr: collapsed ? 0 : 1.5,
              }}
            >
              {item.id === 'notifications' && !collapsed ? (
                <Badge badgeContent={0} color="error" variant="dot" invisible>
                  {item.icon}
                </Badge>
              ) : item.icon}
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: active ? 600 : 500,
                  color: 'inherit'
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const drawer = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isDarkMode ? '#1a1d23' : '#fafaf9',
      color: isDarkMode ? '#e2e8f0' : '#475569',
    }}>
      {/* Header del sidebar */}
      <Box sx={{
        p: sidebarCollapsed ? 2 : 2.5,
        minHeight: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarCollapsed ? 'center' : 'space-between',
        borderBottom: '1px solid',
        borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
      }}>
        {!sidebarCollapsed ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{
              bgcolor: 'primary.main',
              color: 'white',
              width: 36,
              height: 36,
              fontSize: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <SecurityIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{
                fontWeight: 700,
                color: isDarkMode ? '#f1f5f9' : '#0f172a',
                letterSpacing: '-0.01em'
              }}>
                Notaría Segura
              </Typography>
              <Typography variant="caption" sx={{
                color: isDarkMode ? '#64748b' : '#94a3b8',
                fontWeight: 500
              }}>
                Sistema Administrativo
              </Typography>
            </Box>
          </Box>
        ) : (
          <Avatar sx={{
            bgcolor: 'primary.main',
            color: 'white',
            width: 40,
            height: 40,
            fontSize: '1.1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <SecurityIcon />
          </Avatar>
        )}

        {!sidebarCollapsed && (
          <Tooltip title="Colapsar menú" placement="right">
            <IconButton
              onClick={handleSidebarToggle}
              size="small"
              sx={{
                color: isDarkMode ? '#64748b' : '#94a3b8',
                '&:hover': { color: isDarkMode ? '#94a3b8' : '#64748b' }
              }}
            >
              <CollapseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Navegación principal */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 2 }}>
        {/* === TOP-LEVEL: Uso diario === */}
        <List sx={{ px: sidebarCollapsed ? 1 : 1.5, py: 0.5 }}>
          {mainNavItems.map((item) => (
            <NavItem key={item.id} item={item} collapsed={sidebarCollapsed} />
          ))}
        </List>

        <Divider sx={{ my: 1.5, mx: 2, borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.12)' }} />

        {/* === SUBMENU: Cumplimiento === */}
        <List sx={{ px: sidebarCollapsed ? 1 : 1.5, py: 0.5 }}>
          <ListItem disablePadding sx={{ mb: 0.5, flexDirection: 'column' }}>
            <Tooltip title={sidebarCollapsed ? 'Cumplimiento' : ''} placement="right">
              <ListItemButton
                onClick={() => setComplianceMenuOpen(!complianceMenuOpen)}
                sx={{
                  borderRadius: 3,
                  minHeight: 48,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  px: sidebarCollapsed ? 1.5 : 2.5,
                  mx: sidebarCollapsed ? 0.5 : 1.5,
                  width: '100%',
                  backgroundColor: isComplianceActive
                    ? (isDarkMode ? 'rgba(30, 58, 95, 0.4)' : 'rgba(30, 58, 95, 0.08)')
                    : 'transparent',
                  color: isComplianceActive
                    ? (isDarkMode ? '#93c5fd' : '#1e3a5f')
                    : (isDarkMode ? '#94a3b8' : '#64748b'),
                  borderLeft: isComplianceActive ? '3px solid' : '3px solid transparent',
                  borderColor: isComplianceActive ? 'primary.main' : 'transparent',
                  '&:hover': {
                    backgroundColor: isComplianceActive
                      ? (isDarkMode ? 'rgba(30, 58, 95, 0.5)' : 'rgba(30, 58, 95, 0.12)')
                      : (isDarkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(30, 58, 95, 0.04)'),
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ color: isComplianceActive ? 'primary.main' : 'inherit', minWidth: sidebarCollapsed ? 'auto' : 36, justifyContent: 'center', mr: sidebarCollapsed ? 0 : 1.5 }}>
                  <ShieldIcon />
                </ListItemIcon>
                {!sidebarCollapsed && (
                  <>
                    <ListItemText primary="Cumplimiento" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isComplianceActive ? 600 : 500, color: 'inherit' }} />
                    <IconButton size="small" sx={{ color: 'inherit', transform: complianceMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                      <ExpandMoreIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </ListItemButton>
            </Tooltip>
            <Collapse in={complianceMenuOpen && !sidebarCollapsed} timeout="auto" unmountOnExit>
              <List sx={{ pl: 2, width: '100%', mt: 0.5 }}>
                {complianceSubItems.map((subItem) => {
                  const isSubActive = currentView === subItem.view;
                  return (
                    <ListItem key={subItem.view} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton onClick={() => handleNavigation(subItem.view)} sx={{ borderRadius: 3, minHeight: 36, px: 2, mx: 1, backgroundColor: isSubActive ? (isDarkMode ? 'rgba(30, 58, 95, 0.3)' : 'rgba(30, 58, 95, 0.06)') : 'transparent', color: isSubActive ? (isDarkMode ? '#93c5fd' : '#1e3a5f') : (isDarkMode ? '#94a3b8' : '#64748b'), '&:hover': { backgroundColor: isSubActive ? (isDarkMode ? 'rgba(30, 58, 95, 0.4)' : 'rgba(30, 58, 95, 0.1)') : (isDarkMode ? 'rgba(148, 163, 184, 0.06)' : 'rgba(30, 58, 95, 0.03)') } }}>
                        <ListItemIcon sx={{ color: isSubActive ? 'primary.main' : 'inherit', minWidth: 28 }}>{subItem.icon}</ListItemIcon>
                        <ListItemText primary={subItem.label} primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: isSubActive ? 500 : 400, color: 'inherit' }} />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </ListItem>
        </List>

        {/* === SUBMENU: Facturación === */}
        <List sx={{ px: sidebarCollapsed ? 1 : 1.5, py: 0.5 }}>
          <ListItem disablePadding sx={{ mb: 0.5, flexDirection: 'column' }}>
            <Tooltip title={sidebarCollapsed ? 'Facturación' : ''} placement="right">
              <ListItemButton
                onClick={() => setBillingMenuOpen(!billingMenuOpen)}
                sx={{
                  borderRadius: 3,
                  minHeight: 48,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  px: sidebarCollapsed ? 1.5 : 2.5,
                  mx: sidebarCollapsed ? 0.5 : 1.5,
                  width: '100%',
                  backgroundColor: isBillingActive
                    ? (isDarkMode ? 'rgba(30, 58, 95, 0.4)' : 'rgba(30, 58, 95, 0.08)')
                    : 'transparent',
                  color: isBillingActive
                    ? (isDarkMode ? '#93c5fd' : '#1e3a5f')
                    : (isDarkMode ? '#94a3b8' : '#64748b'),
                  borderLeft: isBillingActive ? '3px solid' : '3px solid transparent',
                  borderColor: isBillingActive ? 'primary.main' : 'transparent',
                  '&:hover': {
                    backgroundColor: isBillingActive
                      ? (isDarkMode ? 'rgba(30, 58, 95, 0.5)' : 'rgba(30, 58, 95, 0.12)')
                      : (isDarkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(30, 58, 95, 0.04)'),
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ color: isBillingActive ? 'primary.main' : 'inherit', minWidth: sidebarCollapsed ? 'auto' : 36, justifyContent: 'center', mr: sidebarCollapsed ? 0 : 1.5 }}>
                  <AccountBalanceIcon />
                </ListItemIcon>
                {!sidebarCollapsed && (
                  <>
                    <ListItemText primary="Facturación" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isBillingActive ? 600 : 500, color: 'inherit' }} />
                    <IconButton size="small" sx={{ color: 'inherit', transform: billingMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                      <ExpandMoreIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </ListItemButton>
            </Tooltip>
            <Collapse in={billingMenuOpen && !sidebarCollapsed} timeout="auto" unmountOnExit>
              <List sx={{ pl: 2, width: '100%', mt: 0.5 }}>
                {billingSubItems.map((subItem) => {
                  const isSubActive = currentView === subItem.view;
                  return (
                    <ListItem key={subItem.view} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton onClick={() => handleNavigation(subItem.view)} sx={{ borderRadius: 3, minHeight: 36, px: 2, mx: 1, backgroundColor: isSubActive ? (isDarkMode ? 'rgba(30, 58, 95, 0.3)' : 'rgba(30, 58, 95, 0.06)') : 'transparent', color: isSubActive ? (isDarkMode ? '#93c5fd' : '#1e3a5f') : (isDarkMode ? '#94a3b8' : '#64748b'), '&:hover': { backgroundColor: isSubActive ? (isDarkMode ? 'rgba(30, 58, 95, 0.4)' : 'rgba(30, 58, 95, 0.1)') : (isDarkMode ? 'rgba(148, 163, 184, 0.06)' : 'rgba(30, 58, 95, 0.03)') } }}>
                        <ListItemIcon sx={{ color: isSubActive ? 'primary.main' : 'inherit', minWidth: 28 }}>{subItem.icon}</ListItemIcon>
                        <ListItemText primary={subItem.label} primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: isSubActive ? 500 : 400, color: 'inherit' }} />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </ListItem>
        </List>

        {/* === SUBMENU: Administración === */}
        <List sx={{ px: sidebarCollapsed ? 1 : 1.5, py: 0.5 }}>
          <ListItem disablePadding sx={{ mb: 0.5, flexDirection: 'column' }}>
            <Tooltip title={sidebarCollapsed ? 'Administración' : ''} placement="right">
              <ListItemButton
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                sx={{
                  borderRadius: 3,
                  minHeight: 48,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  px: sidebarCollapsed ? 1.5 : 2.5,
                  mx: sidebarCollapsed ? 0.5 : 1.5,
                  width: '100%',
                  backgroundColor: isAdminActive
                    ? (isDarkMode ? 'rgba(30, 58, 95, 0.4)' : 'rgba(30, 58, 95, 0.08)')
                    : 'transparent',
                  color: isAdminActive
                    ? (isDarkMode ? '#93c5fd' : '#1e3a5f')
                    : (isDarkMode ? '#94a3b8' : '#64748b'),
                  borderLeft: isAdminActive ? '3px solid' : '3px solid transparent',
                  borderColor: isAdminActive ? 'primary.main' : 'transparent',
                  '&:hover': {
                    backgroundColor: isAdminActive
                      ? (isDarkMode ? 'rgba(30, 58, 95, 0.5)' : 'rgba(30, 58, 95, 0.12)')
                      : (isDarkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(30, 58, 95, 0.04)'),
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ color: isAdminActive ? 'primary.main' : 'inherit', minWidth: sidebarCollapsed ? 'auto' : 36, justifyContent: 'center', mr: sidebarCollapsed ? 0 : 1.5 }}>
                  <AdminPanelSettingsIcon />
                </ListItemIcon>
                {!sidebarCollapsed && (
                  <>
                    <ListItemText primary="Administración" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isAdminActive ? 600 : 500, color: 'inherit' }} />
                    <IconButton size="small" sx={{ color: 'inherit', transform: adminMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                      <ExpandMoreIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </ListItemButton>
            </Tooltip>
            <Collapse in={adminMenuOpen && !sidebarCollapsed} timeout="auto" unmountOnExit>
              <List sx={{ pl: 2, width: '100%', mt: 0.5 }}>
                {adminSubItems.map((subItem) => {
                  const isSubActive = currentView === subItem.view;
                  return (
                    <ListItem key={subItem.view} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton onClick={() => handleNavigation(subItem.view)} sx={{ borderRadius: 3, minHeight: 36, px: 2, mx: 1, backgroundColor: isSubActive ? (isDarkMode ? 'rgba(30, 58, 95, 0.3)' : 'rgba(30, 58, 95, 0.06)') : 'transparent', color: isSubActive ? (isDarkMode ? '#93c5fd' : '#1e3a5f') : (isDarkMode ? '#94a3b8' : '#64748b'), '&:hover': { backgroundColor: isSubActive ? (isDarkMode ? 'rgba(30, 58, 95, 0.4)' : 'rgba(30, 58, 95, 0.1)') : (isDarkMode ? 'rgba(148, 163, 184, 0.06)' : 'rgba(30, 58, 95, 0.03)') } }}>
                        <ListItemIcon sx={{ color: isSubActive ? 'primary.main' : 'inherit', minWidth: 28 }}>{subItem.icon}</ListItemIcon>
                        <ListItemText primary={subItem.label} primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: isSubActive ? 500 : 400, color: 'inherit' }} />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </ListItem>
        </List>
      </Box>

      <Divider sx={{ borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)' }} />

      {/* Sección inferior - Usuario y controles */}
      <Box sx={{ p: sidebarCollapsed ? 1.5 : 2 }}>
        {/* Usuario actual */}
        {!sidebarCollapsed && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)',
          }}>
            <Avatar
              sx={{
                bgcolor: getUserRoleColor(),
                width: 36,
                height: 36,
                mr: 1.5,
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{
                fontWeight: 600,
                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {getFullName()}
              </Typography>
              <Typography variant="caption" sx={{
                color: isDarkMode ? '#64748b' : '#94a3b8',
                textTransform: 'uppercase',
                fontWeight: 600,
                fontSize: '0.6875rem',
                letterSpacing: '0.05em'
              }}>
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
          mb: 1.5,
          px: sidebarCollapsed ? 0 : 1
        }}>
          {!sidebarCollapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isDarkMode ? (
                <DarkModeIcon sx={{ mr: 1, fontSize: 18, color: '#64748b' }} />
              ) : (
                <LightModeIcon sx={{ mr: 1, fontSize: 18, color: '#94a3b8' }} />
              )}
              <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                {isDarkMode ? 'Oscuro' : 'Claro'}
              </Typography>
            </Box>
          )}
          <Switch
            checked={!!isDarkMode}
            onChange={toggleTheme}
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: 'primary.main',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: 'primary.main',
              },
            }}
          />
        </Box>

        {/* Botón cambiar contraseña */}
        {!sidebarCollapsed && (
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={() => setShowChangePassword(true)}
            startIcon={<SettingsIcon fontSize="small" />}
            sx={{
              mb: 1.5,
              borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              '&:hover': {
                borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.4)' : 'rgba(30, 58, 95, 0.4)',
                backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.05)' : 'rgba(30, 58, 95, 0.03)',
              }
            }}
          >
            Cambiar Contraseña
          </Button>
        )}

        {/* Botón de Cerrar Sesión */}
        <Button
          variant="contained"
          size="small"
          fullWidth
          onClick={logout}
          startIcon={sidebarCollapsed ? null : <LogoutIcon fontSize="small" />}
          sx={{
            minWidth: sidebarCollapsed ? 44 : 'auto',
            height: sidebarCollapsed ? 44 : 36,
            px: sidebarCollapsed ? 0 : 2,
            background: isDarkMode
              ? 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)'
              : 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
            '&:hover': {
              background: isDarkMode
                ? 'linear-gradient(135deg, #7f1d1d 0%, #641e1e 100%)'
                : 'linear-gradient(135deg, #9f1239 0%, #881337 100%)',
            }
          }}
        >
          {sidebarCollapsed ? <LogoutIcon fontSize="small" /> : 'Cerrar Sesión'}
        </Button>
      </Box>

      {/* Botón expandir cuando está colapsado */}
      {sidebarCollapsed && (
        <Box sx={{
          p: 1.5,
          display: 'flex',
          justifyContent: 'center',
          borderTop: '1px solid',
          borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
        }}>
          <Tooltip title="Expandir menú" placement="right">
            <IconButton
              onClick={handleSidebarToggle}
              size="small"
              sx={{
                color: isDarkMode ? '#64748b' : '#94a3b8',
                '&:hover': { color: isDarkMode ? '#94a3b8' : '#64748b' }
              }}
            >
              <ExpandIcon fontSize="small" />
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
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
            ml: { sm: `${currentDrawerWidth}px` },
            transition: 'all 0.3s ease',
          }}
        >
          <Toolbar sx={{ minHeight: 64 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{
              fontWeight: 600,
              color: 'text.primary'
            }}>
              Panel de Administración
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Drawer */}
        <Box
          component="nav"
          sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 } }}
        >
          {/* Drawer móvil */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
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
                transition: 'width 0.3s ease',
                border: 'none',
                boxShadow: isDarkMode
                  ? '4px 0 24px rgba(0, 0, 0, 0.2)'
                  : '4px 0 24px rgba(0, 0, 0, 0.04)',
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
            minHeight: '100vh',
            overflow: 'auto',
            transition: 'all 0.3s ease'
          }}
        >
          <Toolbar sx={{ minHeight: 64 }} />
          <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
            {children}
          </Container>
        </Box>

        {/* Modal de cambio de contraseña */}
        <ChangePassword
          open={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      </Box>
    </ThemeProvider>
  );
};

export default AdminLayout;
