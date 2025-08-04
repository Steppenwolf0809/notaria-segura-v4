import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  LinearProgress,
  Button
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import useDocumentStore from '../store/document-store';
import useStats from '../hooks/useStats';

/**
 * Dashboard Principal del Matrizador
 * Layout horizontal con KPIs exactamente como el prototipo
 */
const MatrizadorDashboardNew = () => {
  const { getDocumentsByStatus } = useDocumentStore();
  const { basicStats, advancedMetrics, kpiMetrics } = useStats();

  /**
   * Componente KPI Card - EXACTO AL PROTOTIPO
   */
  const KPICard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
    <Card sx={{ 
      height: '100%', 
      background: `linear-gradient(135deg, ${color}15, ${color}05)`,
      border: `1px solid ${color}20`
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 'bold', 
                color, 
                mb: 0.5,
                fontSize: { xs: '1.75rem', md: '2.5rem' }
              }}
            >
              {value}
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 'medium', 
                color: 'text.primary',
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            <Icon sx={{ fontSize: 28 }} />
          </Avatar>
        </Box>
        {trend && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
            <Typography variant="caption" color="success.main">
              {trend}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  /**
   * Widget "Requieren Atención" - EXACTO AL PROTOTIPO
   */
  const RequierenAtencionWidget = () => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <WarningIcon sx={{ color: 'warning.main', mr: 1.5, fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
            Requieren Atención
          </Typography>
          <Chip 
            label={advancedMetrics.needAttention.length} 
            color="warning" 
            size="small"
            sx={{ ml: 'auto' }}
          />
        </Box>
        
        {advancedMetrics.needAttention.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.light', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              ¡Excelente! No hay documentos atrasados
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ py: 0 }}>
            {advancedMetrics.needAttention.slice(0, 4).map((doc) => (
              <ListItem key={doc.id} sx={{ px: 0, py: 1 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.light', width: 36, height: 36 }}>
                    <AccessTimeIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={doc.clientName}
                  secondary={`${doc.documentType} - ${Math.floor((new Date() - new Date(doc.createdAt)) / (1000 * 60 * 60 * 24))} días`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
            {advancedMetrics.needAttention.length > 4 && (
              <ListItem sx={{ px: 0, justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  +{advancedMetrics.needAttention.length - 4} documentos más
                </Typography>
              </ListItem>
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );

  /**
   * Widget "Actividad Reciente" - EXACTO AL PROTOTIPO
   */
  const ActividadRecienteWidget = () => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <NotificationsIcon sx={{ color: 'info.main', mr: 1.5, fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
            Actividad Reciente
          </Typography>
        </Box>
        
        <List dense sx={{ py: 0 }}>
          {advancedMetrics.todayDocs.slice(0, 5).map((doc) => (
            <ListItem key={doc.id} sx={{ px: 0, py: 1 }}>
              <ListItemAvatar>
                <Avatar sx={{ 
                  bgcolor: doc.status === 'LISTO' ? 'success.main' : 'info.main', 
                  width: 36, 
                  height: 36 
                }}>
                  {doc.status === 'LISTO' ? 
                    <CheckCircleIcon sx={{ fontSize: 18 }} /> : 
                    <AssignmentIcon sx={{ fontSize: 18 }} />
                  }
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={doc.clientName}
                secondary={`${doc.documentType} - Hoy`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <Chip
                label={doc.status === 'LISTO' ? 'Completado' : 'En Proceso'}
                size="small"
                color={doc.status === 'LISTO' ? 'success' : 'info'}
                variant="outlined"
              />
            </ListItem>
          ))}
          
          {advancedMetrics.todayDocs.length === 0 && (
            <ListItem sx={{ px: 0, justifyContent: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No hay actividad reciente hoy
              </Typography>
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* KPIs Principales - GRID HORIZONTAL 4 COLUMNAS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Documentos Activos"
            value={kpiMetrics.totalActive.value}
            icon={AssignmentIcon}
            color="#3b82f6"
            subtitle="Documentos en proceso"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="En Proceso"
            value={kpiMetrics.inProgress.value}
            icon={ScheduleIcon}
            color="#f59e0b"
            trend={kpiMetrics.inProgress.trend}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Listos para Entrega"
            value={kpiMetrics.readyForDelivery.value}
            icon={CheckCircleIcon}
            color="#10b981"
            trend={kpiMetrics.readyForDelivery.trend}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Tiempo Promedio (días)"
            value={kpiMetrics.avgTime.value}
            icon={SpeedIcon}
            color="#6366f1"
            subtitle="Tiempo de procesamiento"
          />
        </Grid>
      </Grid>

      {/* Widgets de Acción - 2 COLUMNAS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <RequierenAtencionWidget />
        </Grid>
        <Grid item xs={12} lg={6}>
          <ActividadRecienteWidget />
        </Grid>
      </Grid>

      {/* Progress Bar General - EXACTO AL PROTOTIPO */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Progreso General
            </Typography>
            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
              {kpiMetrics.productivity.value}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={kpiMetrics.productivity.numericValue || 75} 
            sx={{ 
              height: 10, 
              borderRadius: 5,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5
              }
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Documentos completados del total asignado
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MatrizadorDashboardNew;