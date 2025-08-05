import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  FolderSpecial as ArchiveIcon,
  Assignment as PendingIcon,
  Engineering as ProcessIcon,
  CheckCircle as ReadyIcon,
  LocalShipping as DeliveredIcon,
  TrendingUp as TrendIcon
} from '@mui/icons-material';

/**
 * Dashboard principal del Archivo
 * Muestra métricas y KPIs de documentos propios
 * Siguiendo el patrón de MatrizadorDashboard
 */
const ArchivoDashboard = ({ data, loading, onDataUpdate }) => {
  
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Alert severity="info">
        No hay datos disponibles
      </Alert>
    );
  }

  const { estadisticas } = data;

  /**
   * Configuración de tarjetas KPI
   */
  const kpiCards = [
    {
      title: 'Total Documentos',
      value: estadisticas.totalDocumentos || 0,
      icon: <ArchiveIcon />,
      color: '#1976d2',
      bgColor: '#e3f2fd'
    },
    {
      title: 'Pendientes',
      value: estadisticas.pendientes || 0,
      icon: <PendingIcon />,
      color: '#ed6c02',
      bgColor: '#fff3e0'
    },
    {
      title: 'En Proceso',
      value: estadisticas.enProceso || 0,
      icon: <ProcessIcon />,
      color: '#0288d1',
      bgColor: '#e1f5fe'
    },
    {
      title: 'Listos',
      value: estadisticas.listos || 0,
      icon: <ReadyIcon />,
      color: '#2e7d32',
      bgColor: '#e8f5e8'
    },
    {
      title: 'Entregados',
      value: estadisticas.entregados || 0,
      icon: <DeliveredIcon />,
      color: '#7b1fa2',
      bgColor: '#f3e5f5'
    }
  ];

  /**
   * Calcular porcentaje de eficiencia
   */
  const calcularEficiencia = () => {
    const total = estadisticas.totalDocumentos;
    const completados = estadisticas.entregados;
    
    if (total === 0) return 0;
    return Math.round((completados / total) * 100);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          📁 Dashboard de Archivo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestión de documentos de archivo y certificaciones
        </Typography>
      </Box>

      {/* KPIs Principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: kpi.bgColor,
                      color: kpi.color,
                      mr: 2
                    }}
                  >
                    {kpi.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color }}>
                      {kpi.value}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {kpi.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Métricas Adicionales */}
      <Grid container spacing={3}>
        {/* Resumen de Eficiencia */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TrendIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Eficiencia del Archivo
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                  {calcularEficiencia()}%
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Documentos Completados
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {estadisticas.totalDocumentos}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Procesados
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {estadisticas.entregados}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Completados
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Estado Actual */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Estado Actual de Documentos
              </Typography>

              <Box sx={{ space: 2 }}>
                {/* En Proceso */}
                {estadisticas.enProceso > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ProcessIcon sx={{ mr: 1, color: 'info.main', fontSize: 20 }} />
                      <Typography variant="body1">En Proceso</Typography>
                    </Box>
                    <Chip 
                      label={estadisticas.enProceso} 
                      color="info" 
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                )}

                {/* Pendientes */}
                {estadisticas.pendientes > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PendingIcon sx={{ mr: 1, color: 'warning.main', fontSize: 20 }} />
                      <Typography variant="body1">Pendientes</Typography>
                    </Box>
                    <Chip 
                      label={estadisticas.pendientes} 
                      color="warning" 
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                )}

                {/* Listos */}
                {estadisticas.listos > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ReadyIcon sx={{ mr: 1, color: 'success.main', fontSize: 20 }} />
                      <Typography variant="body1">Listos para Entrega</Typography>
                    </Box>
                    <Chip 
                      label={estadisticas.listos} 
                      color="success" 
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                )}

                {/* Sin documentos activos */}
                {(estadisticas.pendientes + estadisticas.enProceso + estadisticas.listos) === 0 && (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      ¡Excelente! No hay documentos pendientes
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ArchivoDashboard;