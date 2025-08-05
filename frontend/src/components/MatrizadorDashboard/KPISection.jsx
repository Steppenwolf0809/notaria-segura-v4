import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

/**
 * Componente KPI Card - EXACTO AL PROTOTIPO
 * Extraído de MatrizadorDashboardNew.jsx
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
 * Sección de KPIs principales con diseño superior
 * Reemplaza la sección de KPIs obsoleta del dashboard original
 */
const KPISection = ({ kpiMetrics, loading = false }) => {
  // Si está cargando, mostramos skeleton básico
  if (loading) {
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item}>
            <Card sx={{ height: 140 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Box sx={{ width: 60, height: 32, bgcolor: 'grey.300', borderRadius: 1, mb: 1 }} />
                    <Box sx={{ width: 120, height: 20, bgcolor: 'grey.200', borderRadius: 1 }} />
                  </Box>
                  <Box sx={{ width: 56, height: 56, bgcolor: 'grey.200', borderRadius: '50%' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <KPICard
          title="Total Documentos Activos"
          value={kpiMetrics.totalActive.value}
          icon={kpiMetrics.totalActive.icon}
          color="#3b82f6"
          subtitle="Documentos en proceso"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <KPICard
          title="En Proceso"
          value={kpiMetrics.inProgress.value}
          icon={kpiMetrics.inProgress.icon}
          color="#f59e0b"
          trend={kpiMetrics.inProgress.trend}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <KPICard
          title="Listos para Entrega"
          value={kpiMetrics.readyForDelivery.value}
          icon={kpiMetrics.readyForDelivery.icon}
          color="#10b981"
          trend={kpiMetrics.readyForDelivery.trend}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <KPICard
          title="Tiempo Promedio (días)"
          value={kpiMetrics.avgTime.value}
          icon={kpiMetrics.avgTime.icon}
          color="#6366f1"
          subtitle="Tiempo de procesamiento"
        />
      </Grid>
    </Grid>
  );
};

export default KPISection;