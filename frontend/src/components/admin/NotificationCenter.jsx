import React, { useState, useEffect } from 'react';
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
  Avatar,
  IconButton,
  Button,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Edit as TemplatesIcon,
  Settings as SettingsIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Block as BlockedIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/auth-store';
import NotificationHistory from './NotificationHistory';
import NotificationTemplates from './NotificationTemplates';
import NotificationSettings from './NotificationSettings';

/**
 * Centro de notificaciones - Panel principal para gestión de WhatsApp
 * Incluye dashboard, historial, plantillas y configuración
 */
const NotificationCenter = () => {
  const { token } = useAuthStore();
  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  /**
   * Cargar estadísticas del centro de notificaciones
   */
  const loadNotificationStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/admin/notifications/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data.stats);
        }
      } else {
        throw new Error('Error al cargar estadísticas');
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setError(error.message || 'Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotificationStats();
  }, [token]);

  /**
   * Renderizar dashboard de estadísticas
   */
  const renderDashboard = () => {
    if (loading) {
      return (
        <Box>
          <LinearProgress sx={{ mb: 3 }} />
          <Typography>Cargando estadísticas...</Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button size="small" onClick={loadNotificationStats}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      );
    }

    if (!stats) {
      return (
        <Alert severity="info">
          No hay datos de notificaciones disponibles
        </Alert>
      );
    }

    return (
      <Box>
        {/* Estadísticas principales */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 48, 
                  height: 48, 
                  mx: 'auto', 
                  mb: 1 
                }}>
                  <SendIcon />
                </Avatar>
                <Typography variant="h4" color="primary">
                  {stats.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Enviadas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar sx={{ 
                  bgcolor: 'success.main', 
                  width: 48, 
                  height: 48, 
                  mx: 'auto', 
                  mb: 1 
                }}>
                  <SuccessIcon />
                </Avatar>
                <Typography variant="h4" color="success.main">
                  {stats.successful || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Exitosas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar sx={{ 
                  bgcolor: 'error.main', 
                  width: 48, 
                  height: 48, 
                  mx: 'auto', 
                  mb: 1 
                }}>
                  <ErrorIcon />
                </Avatar>
                <Typography variant="h4" color="error.main">
                  {stats.failed || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fallidas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar sx={{ 
                  bgcolor: 'warning.main', 
                  width: 48, 
                  height: 48, 
                  mx: 'auto', 
                  mb: 1 
                }}>
                  <PendingIcon />
                </Avatar>
                <Typography variant="h4" color="warning.main">
                  {stats.pending || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pendientes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tasa de éxito */}
        {stats.total > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tasa de Éxito
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={(stats.successful / stats.total) * 100}
                  sx={{ 
                    flexGrow: 1, 
                    height: 8, 
                    borderRadius: 4,
                    mr: 2 
                  }}
                />
                <Typography variant="h6" color="success.main">
                  {Math.round((stats.successful / stats.total) * 100)}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {stats.successful} de {stats.total} notificaciones enviadas exitosamente
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Distribución por tipo */}
        {stats.byType && Object.keys(stats.byType).length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribución por Tipo de Notificación
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(stats.byType).map(([type, count]) => (
                  <Grid item xs={12} sm={6} md={3} key={type}>
                    <Paper sx={{ p: 2, textAlign: 'center', border: 1, borderColor: 'divider' }}>
                      <Typography variant="h5" color="primary">
                        {count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getNotificationTypeLabel(type)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Estado del servicio WhatsApp */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WhatsAppIcon sx={{ fontSize: 32, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    Servicio WhatsApp
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estado del servicio de notificaciones
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Chip
                  label={stats.serviceStatus === 'active' ? 'Activo' : 'Inactivo'}
                  color={stats.serviceStatus === 'active' ? 'success' : 'error'}
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  Última verificación: {new Date().toLocaleTimeString('es-ES')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Notificaciones recientes fallidas */}
        {stats.recentFailed && stats.recentFailed.length > 0 && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Notificaciones Recientes Fallidas
                </Typography>
                <Button
                  size="small"
                  onClick={() => setCurrentTab(1)}
                  endIcon={<HistoryIcon />}
                >
                  Ver Historial
                </Button>
              </Box>
              
              {stats.recentFailed.map((notification) => (
                <Alert 
                  key={notification.id}
                  severity="error" 
                  sx={{ mb: 1 }}
                  action={
                    <Button 
                      size="small"
                      onClick={() => handleRetryNotification(notification.id)}
                    >
                      Reintentar
                    </Button>
                  }
                >
                  <Typography variant="body2">
                    <strong>{notification.clientName}</strong> - {notification.clientPhone}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {notification.messageType} - {notification.errorMessage}
                  </Typography>
                </Alert>
              ))}
            </Card>
          </CardContent>
        )}
      </Box>
    );
  };

  /**
   * Obtener etiqueta legible para tipo de notificación
   */
  const getNotificationTypeLabel = (type) => {
    const labels = {
      DOCUMENT_READY: 'Documento Listo',
      GROUP_READY: 'Grupo Listo',
      DOCUMENT_DELIVERED: 'Documento Entregado',
      REMINDER: 'Recordatorio'
    };
    return labels[type] || type;
  };

  /**
   * Manejar reintento de notificación
   */
  const handleRetryNotification = async (notificationId) => {
    try {
      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/admin/notifications/${notificationId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Notificación reenviada exitosamente');
        loadNotificationStats();
      } else {
        throw new Error('Error al reenviar notificación');
      }
    } catch (error) {
      console.error('Error reenviando notificación:', error);
      toast.error('Error al reenviar la notificación');
    }
  };

  const tabs = [
    {
      label: 'Dashboard',
      icon: <DashboardIcon />,
      component: renderDashboard()
    },
    {
      label: 'Historial',
      icon: <HistoryIcon />,
      component: <NotificationHistory />
    },
    {
      label: 'Plantillas',
      icon: <TemplatesIcon />,
      component: <NotificationTemplates />
    },
    {
      label: 'Configuración',
      icon: <SettingsIcon />,
      component: <NotificationSettings />
    }
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ borderRadius: 0, boxShadow: 1 }}>
        <Box sx={{ p: 3, bgcolor: 'success.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'white',
                color: 'success.main',
                width: 56,
                height: 56,
                mr: 2,
                fontSize: '1.5rem'
              }}
            >
              <NotificationsIcon />
            </Avatar>
            <Box>
              <Typography variant="h4">
                Centro de Notificaciones
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Gestión integral de notificaciones WhatsApp
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Actualizar estadísticas">
              <IconButton 
                onClick={loadNotificationStats}
                sx={{ color: 'white' }}
                disabled={loading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Alert 
            severity="info" 
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              color: 'white',
              '& .MuiAlert-icon': { color: 'white' }
            }}
          >
            Monitoreo completo del sistema de notificaciones WhatsApp con capacidades de gestión y reenvío.
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

export default NotificationCenter;