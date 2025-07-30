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
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import ThemeToggle from './ThemeToggle';

/**
 * Componente Dashboard principal
 * Muestra información del usuario y acciones según su rol
 */
const Dashboard = () => {
  const { 
    user, 
    logout, 
    getUserRoleColor, 
    getFullName, 
    getUserInitials 
  } = useAuth();

  /**
   * Obtiene el mensaje de bienvenida según el rol
   */
  const getWelcomeMessage = () => {
    const roleMessages = {
      ADMIN: 'Panel de Administración',
      CAJA: 'Gestión Financiera y Documentos', 
      MATRIZADOR: 'Creación y Gestión de Documentos',
      RECEPCION: 'Entrega de Documentos'
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

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        sx={{ 
          bgcolor: 'primary.main',
          boxShadow: 2
        }}
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

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Logout Button */}
          <IconButton
            color="inherit"
            onClick={handleLogout}
            title="Cerrar Sesión"
            sx={{ ml: 1 }}
          >
            <LogoutIcon />
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
                sx={{
                  bgcolor: getUserRoleColor(),
                  color: 'white',
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
                    sx={{
                      bgcolor: getUserRoleColor(),
                      color: 'white'
                    }}
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
    </Box>
  );
};

export default Dashboard; 