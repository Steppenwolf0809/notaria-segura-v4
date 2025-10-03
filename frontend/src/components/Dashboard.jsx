import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  Grid,
  Paper,
  IconButton
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import ThemeToggle from './ThemeToggle';
import CajaDashboard from './CajaDashboard';
import CajaCenter from './CajaCenter';
import DocumentCenter from './DocumentCenter';
import MatrizadorCenter from './MatrizadorCenter';
import RecepcionCenter from './RecepcionCenter';
import ReceptionCenter from './ReceptionCenter';
import ArchivoCenter from './ArchivoCenter';
import AdminCenter from './AdminCenter';
import ChangePassword from './ChangePassword';
import CajaLayout from './layout/CajaLayout';
import RecepcionLayout from './RecepcionLayout';

/**
 * Componente Dashboard principal
 * Muestra información del usuario y acciones según su rol
 */
const readFlag = (key, defaultVal = false) => {
  try {
    const env = import.meta.env || {};
    const raw = env[key];
    if (typeof raw === 'string') return raw === 'true' || raw === '1';
    if (typeof raw === 'boolean') return raw;
    return defaultVal;
  } catch {
    return defaultVal;
  }
};

const Dashboard = () => {
  const {
    user,
    logout,
    getUserRoleColor,
    getFullName,
    getUserInitials
  } = useAuth();

  const [showChangePassword, setShowChangePassword] = React.useState(false);

  /**
   * Obtiene el mensaje de bienvenida según el rol
   */
  const getWelcomeMessage = () => {
    const roleMessages = {
      ADMIN: 'Panel de Administración',
      CAJA: 'Gestión Financiera y Documentos', 
      MATRIZADOR: 'Creación y Gestión de Documentos',
      RECEPCION: 'Entrega de Documentos',
      ARCHIVO: 'Gestión de Archivo y Supervisión'
    };
    return roleMessages[user?.role] || 'Dashboard';
  };

  /**
   * Obtiene las características del rol
   */
  const getRoleFeatures = () => {
    const features = {
      ADMIN: [
        'Gestión completa del sistema',
        'Crear y gestionar usuarios',
        'Acceso a todos los módulos',
        'Configuración del sistema'
      ],
      CAJA: [
        'Gestión de documentos',
        'Control financiero',
        'Reportes de pagos',
        'Estado de documentos'
      ],
      MATRIZADOR: [
        'Crear documentos',
        'Editar documentos',
        'Gestionar firmas',
        'Seguimiento de procesos'
      ],
      RECEPCION: [
        'Entrega de documentos',
        'Verificar identidad',
        'Control de recibos',
        'Actualizar estados'
      ]
    };
    return features[user?.role] || [];
  };

  /**
   * Maneja el cierre de sesión
   */
  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return null;
  }

  // Mostrar dashboard específico según rol
  if (user.role === 'CAJA') {
    return (
      <CajaLayout>
        <CajaCenter />
        <ChangePassword
          open={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      </CajaLayout>
    );
  }

  if (user.role === 'MATRIZADOR') {
    return <MatrizadorCenter />;
  }

  if (user.role === 'RECEPCION') {
    const uiV2 = readFlag('VITE_UI_ACTIVOS_ENTREGADOS', true);
    console.info('[UI-GATE]', { role: user?.role, uiV2 });
    if (uiV2) {
      return (
        <RecepcionLayout currentView="documentos" onViewChange={() => {}}>
          <ReceptionCenter />
        </RecepcionLayout>
      );
    } else {
      return <RecepcionCenter />;
    }
  }

  if (user.role === 'ARCHIVO') {
    return <ArchivoCenter />;
  }

  if (user.role === 'ADMIN') {
    return <AdminCenter />;
  }

  // Dashboard por defecto para otros roles
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        color="default"
      >
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ flexGrow: 1 }}
          >
            Notaría Segura
          </Typography>
          
          {/* User Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
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
            <Typography variant="body2">
              {getFullName()}
            </Typography>
          </Box>

          {/* Settings Button */}
          <IconButton
            onClick={() => setShowChangePassword(true)}
            title="Cambiar Contraseña"
            sx={{ 
              ml: 1,
              color: 'text.primary',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <SettingsIcon sx={{ color: 'text.primary' }} />
          </IconButton>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Logout Button */}
          <IconButton
            onClick={handleLogout}
            title="Cerrar Sesión"
            sx={{ 
              ml: 1,
              color: 'text.primary',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <LogoutIcon sx={{ color: 'text.primary' }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: 'calc(100vh - 64px)' }}>
        <Grid container spacing={3}>
          {/* Welcome Section */}
          <Grid item xs={12}>
                          <Paper 
                sx={{ 
                  p: 3, 
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 1
                }}
              >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: getUserRoleColor(),
                    width: 56,
                    height: 56,
                    mr: 2,
                    fontSize: '1.5rem'
                  }}
                >
                  {getUserInitials()}
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ color: 'text.primary' }}>
                    ¡Bienvenido, {user.firstName}!
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'primary.main' }}>
                    {getWelcomeMessage()}
                  </Typography>
                </Box>
              </Box>
              
              <Chip
                label={user.role}
                color="primary"
                sx={{
                  fontWeight: 'bold'
                }}
              />
            </Paper>
          </Grid>

          {/* User Profile Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Información Personal
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Nombre Completo
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {getFullName()}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    Email
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {user.email}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    Rol del Sistema
                  </Typography>
                  <Chip
                    label={user.role}
                    size="small"
                    color="primary"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Role Features Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  Funcionalidades Disponibles
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  {getRoleFeatures().map((feature, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: getUserRoleColor(),
                          mr: 2
                        }}
                      />
                      <Typography variant="body2">
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Coming Soon Card */}
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  🚀 Próximamente
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Las funcionalidades específicas de cada rol se implementarán en los siguientes sprints.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Sprint 1 - Autenticación: ✅ Completado
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  🌓 Modo Oscuro: ✅ Completado - Usa el botón en el header
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Modal de cambio de contraseña */}
      <ChangePassword 
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </Box>
  );
};

export default Dashboard;