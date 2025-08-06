import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Assessment as StatsIcon,
  Assignment as DocumentIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import AdminLayout from './AdminLayout';
import UserManagement from './admin/UserManagement';
import DocumentOversight from './admin/DocumentOversight';
import NotificationHistory from './admin/NotificationHistory';
import NotificationSettings from './admin/NotificationSettings';
import NotificationTemplates from './admin/NotificationTemplates';

/**
 * Centro de administración - Panel principal para ADMIN
 * Ahora usando AdminLayout con sidebar como otros roles
 */
const AdminCenter = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  /**
   * Manejar cambios de vista
   */
  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  /**
   * Renderizar contenido según la vista actual
   */
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <AdminDashboard />;
      
      case 'users':
        return <UserManagement />;
      
      case 'documents':
        return <DocumentOversight />;
      
      case 'notifications':
        return <NotificationHistory />;
      
      case 'notification-settings':
        return <NotificationSettings />;
      
      case 'notification-templates':
        return <NotificationTemplates />;
      
      case 'settings':
        return <AdminSettings />;
      
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout currentView={currentView} onViewChange={handleViewChange}>
      {renderContent()}
    </AdminLayout>
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