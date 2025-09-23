import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import ThemeToggle from './ThemeToggle';
import useAuth from '../hooks/use-auth';
import ChangePassword from './ChangePassword';

function Topbar({ title = 'Notaría Segura', onMenuClick }) {
  const { user, getFullName, getUserInitials, getUserRoleColor, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [openChangePwd, setOpenChangePwd] = React.useState(false);

  // Atajo accesibilidad: Shift+D para enfocar buscador si existe
  React.useEffect(() => {
    const handler = (e) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        const el =
          document.getElementById('global-search-input') ||
          document.getElementById('reception-search-input');
        if (el && typeof el.focus === 'function') {
          e.preventDefault();
          el.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const handleOpenChangePwd = () => {
    handleMenuClose();
    setOpenChangePwd(true);
  };

  return (<>
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        {/* Botón menú para móvil */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
          aria-label="Abrir menú"
        >
          <MenuIcon />
        </IconButton>

        {/* Título contextual */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>

        {/* Toggle de tema con tooltip */}
        <Box sx={{ mr: 1 }}>
          <Tooltip title="Cambiar tema" placement="bottom">
            <Box>
              <ThemeToggle noSystem={user?.role === 'CAJA'} />
            </Box>
          </Tooltip>
        </Box>

        {/* Menú de usuario */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="body2"
            sx={{ mr: 1, display: { xs: 'none', md: 'block' }, color: 'text.primary' }}
          >
            {getFullName()}
          </Typography>

          <IconButton
            aria-label="cuenta de usuario"
            aria-controls="menu-usuario"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            size="small"
            sx={{ p: 0.25 }}
          >
            {user ? (
              <Avatar
                sx={{
                  bgcolor: getUserRoleColor(),
                  width: 32,
                  height: 32,
                  fontSize: '0.875rem',
                }}
              >
                {getUserInitials()}
              </Avatar>
            ) : (
              <AccountCircle sx={{ color: 'text.primary' }} />
            )}
          </IconButton>

          <Menu
            id="menu-usuario"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleMenuClose}>Perfil (próximamente)</MenuItem>
            <MenuItem onClick={handleOpenChangePwd}>Cambiar contraseña</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>Cerrar sesión</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>

    {/* Modal Cambiar Contraseña - disponible para todos los roles */}
    <ChangePassword open={openChangePwd} onClose={() => setOpenChangePwd(false)} />
    </>
  );
}

export default Topbar;