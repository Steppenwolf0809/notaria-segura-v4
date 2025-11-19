import React, { useState, useMemo } from 'react';
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
  Divider,
  Alert,
  Button,
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  TodayOutlined as TodayIcon,
  DateRange as DateRangeIcon,
  Groups as GroupsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  ErrorOutline as ErrorOutlineIcon,
  Notifications as NotificationsIcon,
  LocalShipping as LocalShippingIcon,
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import AlertasPanel from './alertas/AlertasPanel';
import AlertasModal from './alertas/AlertasModal';

/**
 * Componente mejorado para mostrar estadísticas del dashboard de recepción
 * Incluye métricas avanzadas: documentos no retirados, atrasados, KPIs y alertas
 */
function RecepcionDashboardStats({ estadisticas, onEstadisticasChange, onDocumentClick }) {
  const [alertasModalOpen, setAlertasModalOpen] = useState(false);

  const stats = estadisticas || {
    documentosEnProceso: 0,
    documentosListos: 0,
    documentosEntregadosHoy: 0,
    documentosEntregadosSemana: 0,
    gruposListos: 0,
    // Métricas avanzadas del backend
    documentosNoRetirados7Dias: 0,
    documentosNoRetirados15Dias: 0,
    documentosAtrasados3Dias: 0,
    tiempoPromedioEntregaDias: 0,
    tasaRetiroPorcentaje: 0
  };

  /**
   * Calcular métricas avanzadas
   * Ahora usa datos reales del backend en lugar de estimaciones
   */
  const metricsAdvanced = useMemo(() => {
    // Usar datos reales del backend
    const documentosNoRetirados7Dias = stats.documentosNoRetirados7Dias || 0;
    const documentosNoRetirados15Dias = stats.documentosNoRetirados15Dias || 0;
    const documentosAtrasados = stats.documentosAtrasados3Dias || 0;
    const tasaRetiro = stats.tasaRetiroPorcentaje || 0;
    const tiempoPromedioEntrega = stats.tiempoPromedioEntregaDias || 0;

    return {
      documentosNoRetirados7Dias,
      documentosNoRetirados15Dias,
      documentosAtrasados,
      tasaRetiro,
      tiempoPromedioEntrega,
      totalDocumentosActivos: stats.documentosEnProceso + stats.documentosListos
    };
  }, [stats]);

  /**
   * Generar alertas basadas en métricas
   */
  const alerts = useMemo(() => {
    const alertList = [];

    // Alerta crítica: Documentos no retirados por más de 15 días
    if (metricsAdvanced.documentosNoRetirados15Dias > 0) {
      alertList.push({
        severity: 'error',
        title: 'Documentos no retirados - Crítico',
        message: `${metricsAdvanced.documentosNoRetirados15Dias} documentos listos hace más de 15 días sin retirar`,
        action: 'Contactar a clientes urgentemente',
        icon: <ErrorOutlineIcon />
      });
    }

    // Alerta advertencia: Documentos no retirados por más de 7 días
    if (metricsAdvanced.documentosNoRetirados7Dias > 0) {
      alertList.push({
        severity: 'warning',
        title: 'Documentos pendientes de retiro',
        message: `${metricsAdvanced.documentosNoRetirados7Dias} documentos listos hace más de 7 días`,
        action: 'Enviar recordatorios',
        icon: <WarningIcon />
      });
    }

    // Alerta: Documentos atrasados en procesamiento
    if (metricsAdvanced.documentosAtrasados > 0) {
      alertList.push({
        severity: 'warning',
        title: 'Documentos atrasados en proceso',
        message: `${metricsAdvanced.documentosAtrasados} documentos llevan más de 3 días en proceso`,
        action: 'Revisar con matrizadores',
        icon: <ScheduleIcon />
      });
    }

    // Alerta informativa: Documentos listos para entregar
    if (stats.documentosListos > 5) {
      alertList.push({
        severity: 'info',
        title: 'Documentos listos para entrega',
        message: `${stats.documentosListos} documentos esperando ser retirados`,
        action: 'Notificar a clientes',
        icon: <NotificationsIcon />
      });
    }

    return alertList;
  }, [stats, metricsAdvanced]);

  /**
   * Tarjetas KPI principales
   */
  const statsCards = [
    {
      title: 'En Proceso',
      value: stats.documentosEnProceso,
      icon: AssignmentIcon,
      color: 'warning',
      description: 'Recibidos de copiadora',
      badge: metricsAdvanced.documentosAtrasados > 0
        ? `${metricsAdvanced.documentosAtrasados} atrasados`
        : null,
      badgeColor: 'error'
    },
    {
      title: 'Documentos Listos',
      value: stats.documentosListos,
      icon: CheckCircleIcon,
      color: 'primary',
      description: 'Para entregar',
      badge: metricsAdvanced.documentosNoRetirados7Dias > 0
        ? `${metricsAdvanced.documentosNoRetirados7Dias} > 7 días`
        : null,
      badgeColor: 'warning'
    },
    {
      title: 'Entregados Hoy',
      value: stats.documentosEntregadosHoy,
      icon: LocalShippingIcon,
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

  /**
   * KPIs secundarios
   */
  const secondaryKPIs = [
    {
      label: 'Tasa de Retiro',
      value: `${metricsAdvanced.tasaRetiro}%`,
      description: 'Documentos retirados vs listos',
      status: metricsAdvanced.tasaRetiro >= 80 ? 'success' : metricsAdvanced.tasaRetiro >= 60 ? 'warning' : 'error',
      icon: TrendingUpIcon
    },
    {
      label: 'Tiempo Promedio',
      value: `${metricsAdvanced.tiempoPromedioEntrega} días`,
      description: 'Desde recepción hasta entrega',
      status: metricsAdvanced.tiempoPromedioEntrega <= 2 ? 'success' : metricsAdvanced.tiempoPromedioEntrega <= 3 ? 'warning' : 'error',
      icon: AccessTimeIcon
    },
    {
      label: 'Documentos Activos',
      value: metricsAdvanced.totalDocumentosActivos,
      description: 'En proceso + listos',
      status: 'info',
      icon: AssignmentIcon
    }
  ];

  /**
   * Obtener color para KPI secundario
   */
  const getKPIColor = (status) => {
    switch (status) {
      case 'success': return 'success.main';
      case 'warning': return 'warning.main';
      case 'error': return 'error.main';
      default: return 'info.main';
    }
  };

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

      {/* Alertas Críticas */}
      {alerts.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Alertas y Documentos que Requieren Atención
          </Typography>
          <Stack spacing={2}>
            {alerts.map((alert, index) => (
              <Alert
                key={index}
                severity={alert.severity}
                icon={alert.icon}
                action={
                  <Button color="inherit" size="small">
                    {alert.action}
                  </Button>
                }
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {alert.title}
                </Typography>
                <Typography variant="body2">
                  {alert.message}
                </Typography>
              </Alert>
            ))}
          </Stack>
        </Box>
      )}

      {/* Panel de Alertas del Sistema */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <AlertasPanel
            userRole="RECEPCION"
            onDocumentClick={onDocumentClick}
            compact={false}
            maxHeight={300}
          />
        </Grid>
      </Grid>

      {/* Tarjetas de estadísticas principales */}
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

                  {stat.badge && (
                    <Box sx={{ mt: 1.5 }}>
                      <Chip
                        label={stat.badge}
                        size="small"
                        color={stat.badgeColor}
                        icon={<WarningIcon sx={{ fontSize: 16 }} />}
                      />
                    </Box>
                  )}

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

      {/* KPIs Secundarios */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {secondaryKPIs.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <Grid item xs={12} md={4} key={index}>
              <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: getKPIColor(kpi.status), width: 56, height: 56 }}>
                  <IconComponent />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {kpi.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: getKPIColor(kpi.status) }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpi.description}
                  </Typography>
                </Box>
              </Paper>
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

                {/* Nueva barra para documentos no retirados */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      No Retirados (más de 7 días)
                    </Typography>
                    <Chip
                      label={metricsAdvanced.documentosNoRetirados7Dias}
                      color="warning"
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
                        bgcolor: 'warning.main',
                        width: `${stats.documentosListos > 0 ? Math.min((metricsAdvanced.documentosNoRetirados7Dias / stats.documentosListos) * 100, 100) : 0}%`,
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
                    {stats.gruposListos || 0}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Documentos atrasados
                    <Tooltip title="Documentos en proceso por más de 3 días">
                      <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                    </Tooltip>
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    {metricsAdvanced.documentosAtrasados}
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
          • Revisa los documentos listos para entrega en la pestaña "Documentos"<br/>
          • Verifica códigos de retiro y gestiona entregas<br/>
          • Consulta el historial de entregas realizadas<br/>
          • Gestiona entregas individuales y grupales<br/>
          • Envía recordatorios a clientes con documentos pendientes de retiro
        </Typography>
      </Paper>

      {/* Modal detallado de alertas */}
      <AlertasModal
        open={alertasModalOpen}
        onClose={() => setAlertasModalOpen(false)}
        userRole="RECEPCION"
        onDocumentClick={onDocumentClick}
      />
    </Box>
  );
}

export default RecepcionDashboardStats;
