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
  IconButton
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
  KeyboardDoubleArrowRight as ExpandIcon
} from '@mui/icons-material';
import useAuth from '../../hooks/use-auth';
import { navItemsByRole } from '../../config/nav-items';

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
  Visibility: <VisibilityIcon />
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
    console.info('[SIDEBAR]', { role, items: items.length });
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
            const isActive = !!currentActive
              ? currentActive === item.id || currentActive === item.view
              : false;

            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip
                  title={collapsed ? item.label : ''}
                  placement="right"
                  disableHoverListener={!collapsed}
                >
                  <ListItemButton
                    onClick={() => {
                      // Marcar hash para tener una “ruta” mínima sin router
                      try {
                        window.location.hash = `#/${item.id}`;
                      } catch {}
                      onNavigate?.(item);
                    }}
                    sx={{
                      borderRadius: 1,
                      py: 1.2,
                      px: collapsed ? 1.5 : 2,
                      bgcolor: isActive ? 'primary.main' : 'transparent',
                      color: isActive ? 'primary.contrastText' : 'text.primary',
                      '&:hover': {
                        bgcolor: isActive ? 'primary.dark' : 'action.hover'
                      },
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive ? 'primary.contrastText' : 'primary.main',
                        minWidth: collapsed ? 'unset' : 40,
                        justifyContent: 'center'
                      }}
                    >
                      {iconMap[item.icon] || <DashboardIcon />}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: isActive ? 600 : 500
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
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