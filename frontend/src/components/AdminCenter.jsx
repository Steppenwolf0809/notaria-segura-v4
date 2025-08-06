import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Paper,
  Alert,
  Chip,
  Avatar
} from '@mui/material';
import {
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Assessment as StatsIcon,
  Assignment as DocumentIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import UserManagement from './admin/UserManagement';
import DocumentOversight from './admin/DocumentOversight';

/**
 * Centro de administración - Panel principal para ADMIN
 * Incluye gestión de usuarios y configuración del sistema
 */
const AdminCenter = () => {
  const { user, getUserRoleColor, getFullName, getUserInitials } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const tabs = [
    {
      label: 'Panel de Control',
      icon: <DashboardIcon />,
      component: <AdminDashboard />
    },
    {
      label: 'Gestión de Usuarios',
      icon: <PersonIcon />,
      component: <UserManagement />
    },
    {
      label: 'Supervisión Documentos',
      icon: <DocumentIcon />,
      component: <DocumentOversight />
    },
    {
      label: 'Configuración',
      icon: <SettingsIcon />,
      component: <AdminSettings />
    }
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header del Admin */}
      <Paper sx={{ borderRadius: 0, boxShadow: 1 }}>
        <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                width: 56,
                height: 56,
                mr: 2,
                fontSize: '1.5rem'
              }}
            >
              <SecurityIcon />
            </Avatar>
            <Box>
              <Typography variant="h4">
                Panel de Administración
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Gestión completa del sistema - {getFullName()}
              </Typography>
            </Box>
          </Box>
          
          <Alert 
            severity="info" 
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              color: 'white',
              '& .MuiAlert-icon': { color: 'white' }
            }}
          >
            Como administrador tienes acceso completo al sistema y puedes gestionar usuarios, 
            configuraciones y revisar auditorías.
          </Alert>
        </Box>
      </Paper>

      {/* Tabs de navegación */}
      <Paper sx={{ borderRadius: 0 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              sx={{ minHeight: 72, fontSize: '0.9rem' }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Contenido de las tabs */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: 'background.default' }}>
        {tabs[currentTab]?.component}
      </Box>
    </Box>
  );
};

/**
 * Dashboard principal del administrador
 */
const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <DashboardIcon sx={{ mr: 1 }} />
        Panel de Control
      </Typography>

      <Grid container spacing={3}>
        {/* Estadísticas rápidas */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StatsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Sistema Activo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Todos los servicios funcionando correctamente
              </Typography>
              <Chip label="✅ Operativo" color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Gestión de Usuarios
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Administra usuarios y roles del sistema
              </Typography>
              <Chip label="Acceso Completo" color="info" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Seguridad
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Auditoría y logs de seguridad
              </Typography>
              <Chip label="Monitoreo Activo" color="warning" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>

        {/* Información del administrador */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Información del Administrador
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Usuario:
                  </Typography>
                  <Typography variant="body1">
                    {user?.firstName} {user?.lastName}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Email:
                  </Typography>
                  <Typography variant="body1">
                    {user?.email}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Rol:
                  </Typography>
                  <Chip label={user?.role} color="error" sx={{ mb: 2 }} />
                  
                  <Typography variant="body2" color="text.secondary">
                    Permisos:
                  </Typography>
                  <Typography variant="body1">
                    Control total del sistema
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Acciones rápidas */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Funcionalidades Disponibles
              </Typography>
              <Grid container spacing={2}>
                {[
                  'Crear y gestionar usuarios de todos los roles',
                  'Activar/desactivar cuentas de usuario',
                  'Modificar información de usuarios existentes',
                  'Acceso a auditorías y logs del sistema',
                  'Configuración avanzada del sistema',
                  'Supervisión de todas las operaciones'
                ].map((feature, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'success.main',
                          mr: 2
                        }}
                      />
                      <Typography variant="body2">
                        {feature}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Panel de configuración del administrador
 */
const AdminSettings = () => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <SettingsIcon sx={{ mr: 1 }} />
        Configuración del Sistema
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚧 En Desarrollo
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Las configuraciones avanzadas del sistema estarán disponibles en futuras versiones.
              </Typography>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Funcionalidades planificadas:
                </Typography>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Configuración de notificaciones</li>
                  <li>Parámetros del sistema</li>
                  <li>Gestión de plantillas</li>
                  <li>Configuración de auditoría</li>
                  <li>Respaldos y restauración</li>
                </ul>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminCenter;