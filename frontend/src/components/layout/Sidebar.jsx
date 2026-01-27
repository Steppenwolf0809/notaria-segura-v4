import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  IconButton,
  Collapse,
  Badge
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  CloudUpload as CloudUploadIcon,
  WhatsApp as WhatsAppIcon,
  History as HistoryIcon,
  Article as ArticleIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  FolderSpecial as FolderSpecialIcon,
  Visibility as VisibilityIcon,
  KeyboardDoubleArrowLeft as CollapseIcon,
  KeyboardDoubleArrowRight as ExpandIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Payments as PaymentsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Message as MessageIcon,
  Send as SendIcon
} from '@mui/icons-material';
import useAuth from '../../hooks/use-auth';
import { navItemsByRole } from '../../config/nav-items';
import mensajesInternosService from '../../services/mensajes-internos-service';

// Resolución de iconos por nombre declarativo (configurable desde nav-items)
const iconMap = {
  Dashboard: <DashboardIcon />,
  Assignment: <AssignmentIcon />,
  CloudUpload: <CloudUploadIcon />,
  WhatsApp: <WhatsAppIcon />,
  History: <HistoryIcon />,
  Article: <ArticleIcon />,
  Person: <PersonIcon />,
  Description: <DescriptionIcon />,
  Notifications: <NotificationsIcon />,
  Settings: <SettingsIcon />,
  FolderSpecial: <FolderSpecialIcon />,
  Visibility: <VisibilityIcon />,
  AccountBalance: <AccountBalanceIcon />,
  Receipt: <ReceiptIcon />,
  Payments: <PaymentsIcon />,
  Message: <MessageIcon />,
  Send: <SendIcon />
};

const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 60;

const Sidebar = ({
  mobileOpen,
  onClose,
  collapsed,
  setCollapsed,
  onNavigate,
  activeId
}) => {
  const { user } = useAuth();
  const role = user?.role || 'GUEST';

  const items = useMemo(() => {
    const list = navItemsByRole[role] || [];
    return list;
  }, [role]);

  // Trazas de verificación
  useEffect(() => {
    // eslint-disable-next-line no-console
  }, [role, items]);

  // Marcar activo por hash si no hay activeId
  const [hashId, setHashId] = useState(() => {
    const raw = (window.location.hash || '').replace(/^#\//, '');
    return raw || null;
  });

  useEffect(() => {
    const onHashChange = () => {
      const raw = (window.location.hash || '').replace(/^#\//, '');
      setHashId(raw || null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const currentActive = activeId || hashId;

  // Estado para submenús expandidos
  const [expandedMenus, setExpandedMenus] = useState({});

  // Función para toggle de submenu
  const handleSubmenuToggle = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  // Verificar si algún subitem está activo
  const isSubmenuItemActive = (submenu) => {
    if (!submenu || !currentActive) return false;
    return submenu.some(item => item.id === currentActive || item.view === currentActive);
  };

  // Estado para contador de mensajes
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await mensajesInternosService.contarNoLeidos();
        if (res.success) setUnreadCount(res.data.count);
      } catch (e) {
        // Silencioso
      }
    };

    if (role === 'MATRIZADOR' || role === 'RECEPCION' || role === 'ARCHIVO') {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [role]);

  const DrawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}
    >
      {/* Header compacto con control de colapso */}
      <Box
        sx={{
          p: 1,
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end'
        }}
      >
        <Tooltip title={collapsed ? 'Expandir' : 'Colapsar'}>
          <IconButton
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'expand' : 'collapse'}
          >
            {collapsed ? <ExpandIcon /> : <CollapseIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />

      {/* Navegación principal */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: 1, py: 1 }}>
          {items.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus[item.id];
            const submenuActive = hasSubmenu && isSubmenuItemActive(item.submenu);
            const isActive = !hasSubmenu && (
              !!currentActive
                ? currentActive === item.id || currentActive === item.view
                : false
            );

            return (
              <React.Fragment key={item.id}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <Tooltip
                    title={collapsed ? item.label : ''}
                    placement="right"
                    disableHoverListener={!collapsed}
                  >
                    <ListItemButton
                      onClick={() => {
                        if (hasSubmenu) {
                          handleSubmenuToggle(item.id);
                        } else {
                          // Marcar hash para tener una "ruta" mínima sin router
                          try {
                            window.location.hash = `#/${item.view || item.id}`;
                          } catch { }
                          onNavigate?.(item);
                        }
                      }}
                      sx={{
                        borderRadius: 1,
                        py: 1.2,
                        px: collapsed ? 1.5 : 2,
                        bgcolor: (isActive || submenuActive) ? 'primary.main' : 'transparent',
                        color: (isActive || submenuActive) ? 'primary.contrastText' : 'text.primary',
                        '&:hover': {
                          bgcolor: (isActive || submenuActive) ? 'primary.dark' : 'action.hover'
                        },
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: (isActive || submenuActive) ? 'primary.contrastText' : 'primary.main',
                          minWidth: collapsed ? 'unset' : 40,
                          justifyContent: 'center'
                        }}
                      >
                        <Badge
                          badgeContent={item.id === 'notificaciones' ? unreadCount : 0}
                          color="error"
                          invisible={item.id !== 'notificaciones' || unreadCount === 0}
                          sx={{ '& .MuiBadge-badge': { right: -3, top: 3 } }}
                        >
                          {iconMap[item.icon] || <DashboardIcon />}
                        </Badge>
                      </ListItemIcon>
                      {!collapsed && (
                        <>
                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: (isActive || submenuActive) ? 600 : 500
                            }}
                          />
                          {hasSubmenu && (
                            isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
                          )}
                        </>
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>

                {/* Submenu */}
                {hasSubmenu && !collapsed && (
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ pl: 2 }}>
                      {item.submenu.map((subItem) => {
                        const isSubActive = !!currentActive && (
                          currentActive === subItem.id || currentActive === subItem.view
                        );

                        return (
                          <ListItem key={subItem.id} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                              onClick={() => {
                                try {
                                  window.location.hash = `#/${subItem.view || subItem.id}`;
                                } catch { }
                                onNavigate?.(subItem);
                              }}
                              sx={{
                                borderRadius: 1,
                                py: 0.8,
                                px: 2,
                                bgcolor: isSubActive ? 'primary.light' : 'transparent',
                                color: isSubActive ? 'primary.contrastText' : 'text.secondary',
                                '&:hover': {
                                  bgcolor: isSubActive ? 'primary.main' : 'action.hover'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  color: isSubActive ? 'primary.contrastText' : 'text.secondary',
                                  minWidth: 32,
                                  justifyContent: 'center'
                                }}
                              >
                                {iconMap[subItem.icon] || <DashboardIcon />}
                              </ListItemIcon>
                              <ListItemText
                                primary={subItem.label}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  fontSize: '0.85rem',
                                  fontWeight: isSubActive ? 600 : 400
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      <Divider />
      {/* Footer opcional */}
      <Box sx={{ p: collapsed ? 1 : 1.5 }} />
    </Box>
  );

  // Responsive Drawers
  return (
    <>
      {/* Drawer móvil */}
      <Drawer
        variant="temporary"
        open={!!mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            zIndex: (theme) => theme.zIndex.drawer
          }
        }}
      >
        {DrawerContent}
      </Drawer>

      {/* Drawer permanente (desktop) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
            zIndex: (theme) => theme.zIndex.drawer
          }
        }}
        open
      >
        {DrawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;