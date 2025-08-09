import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Paper,
  Stack,
  Divider
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  TodayOutlined as TodayIcon,
  DateRange as DateRangeIcon,
  Groups as GroupsIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import AlertasPanel from './alertas/AlertasPanel';
import AlertasModal from './alertas/AlertasModal';

/**
 * Componente para mostrar estadísticas del dashboard de recepción
 */
function RecepcionDashboardStats({ estadisticas, onEstadisticasChange }) {
  const [alertasModalOpen, setAlertasModalOpen] = useState(false);
  const stats = estadisticas || {
    documentosEnProceso: 0,
    documentosListos: 0,
    documentosEntregadosHoy: 0,
    documentosEntregadosSemana: 0,
    gruposListos: 0
  };

  const statsCards = [
    {
      title: 'En Proceso',
      value: stats.documentosEnProceso,
      icon: AssignmentIcon,
      color: 'warning',
      description: 'Recibidos de copiadora',
      trend: null
    },
    {
      title: 'Documentos Listos',
      value: stats.documentosListos,
      icon: CheckCircleIcon,
      color: 'primary',
      description: 'Para entregar',
      trend: null
    },
    {
      title: 'Entregados Hoy',
      value: stats.documentosEntregadosHoy,
      icon: TodayIcon,
      color: 'success',
      description: 'Documentos entregados',
      trend: null
    },
    {
      title: 'Entregados Esta Semana',
      value: stats.documentosEntregadosSemana,
      icon: DateRangeIcon,
      color: 'info',
      description: 'Últimos 7 días',
      trend: null
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header del Dashboard */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Dashboard de Recepción
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestión completa: Marcar documentos como listos y gestionar entregas
        </Typography>
      </Box>

      {/* Panel de Alertas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <AlertasPanel
            userRole="RECEPCION"
            onDocumentClick={(alerta) => {
              console.log('Documento seleccionado:', alerta);
              // Aquí puedes agregar lógica para navegar al documento
              // Por ejemplo: onDocumentClick?.(alerta);
            }}
            compact={false}
            maxHeight={300}
          />
        </Grid>
      </Grid>

      {/* Tarjetas de estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: `${stat.color}.light`,
                        color: `${stat.color}.contrastText`,
                        mr: 2,
                        width: 48,
                        height: 48
                      }}
                    >
                      <IconComponent />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: `${stat.color}.main` }}>
                        {stat.value}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                    {stat.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    {stat.description}
                  </Typography>
                  
                  {stat.trend && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                      <Typography variant="caption" color="success.main">
                        {stat.trend}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Resumen de Estado */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                Estado de Entregas
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Documentos Pendientes de Entrega
                    </Typography>
                    <Chip 
                      label={stats.documentosListos} 
                      color="primary" 
                      size="small"
                    />
                  </Box>
                  <Box 
                    sx={{ 
                      height: 8, 
                      bgcolor: 'grey.200', 
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        bgcolor: 'primary.main',
                        width: `${Math.min((stats.documentosListos / (stats.documentosListos + stats.documentosEntregadosSemana)) * 100, 100)}%`,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Documentos Entregados Esta Semana
                    </Typography>
                    <Chip 
                      label={stats.documentosEntregadosSemana} 
                      color="success" 
                      size="small"
                    />
                  </Box>
                  <Box 
                    sx={{ 
                      height: 8, 
                      bgcolor: 'grey.200', 
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        bgcolor: 'success.main',
                        width: `${Math.min((stats.documentosEntregadosSemana / (stats.documentosListos + stats.documentosEntregadosSemana)) * 100, 100)}%`,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    />
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Resumen Rápido
              </Typography>
              
              <Stack spacing={2} divider={<Divider />}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total de documentos listos
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {stats.documentosListos}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Entregas realizadas hoy
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {stats.documentosEntregadosHoy}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Grupos pendientes
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                    {stats.gruposListos}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Acciones Rápidas */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Acciones Rápidas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Revisa los documentos listos para entrega en la pestaña "Documentos Listos"<br/>
          • Verifica códigos de retiro en la pestaña "Verificar Código"<br/>
          • Consulta el historial de entregas realizadas<br/>
          • Gestiona entregas individuales y grupales
        </Typography>
      </Paper>

      {/* Modal detallado de alertas */}
      <AlertasModal
        open={alertasModalOpen}
        onClose={() => setAlertasModalOpen(false)}
        userRole="RECEPCION"
        onDocumentClick={(alerta) => {
          console.log('Documento seleccionado desde modal:', alerta);
          // Aquí puedes agregar lógica para navegar al documento
        }}
      />
    </Box>
  );
}

export default RecepcionDashboardStats;