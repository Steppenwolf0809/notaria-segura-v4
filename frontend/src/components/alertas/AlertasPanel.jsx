import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  List,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import AlertaItem from './AlertaItem';
import axios from 'axios';

// Configuración base de la API - Auto-detectar producción
const getApiBaseUrl = () => {
  // Si estamos en producción (mismo dominio), usar rutas relativas
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  // En desarrollo, usar la variable de entorno o fallback
  return import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
};

/**
 * Panel principal de alertas para dashboards por rol
 * @param {string} userRole - Rol del usuario (RECEPCION, MATRIZADOR, ARCHIVO, ADMIN)
 * @param {Function} onDocumentClick - Callback cuando se hace click en un documento
 * @param {boolean} compact - Si mostrar en modo compacto (default: false)
 * @param {number} maxHeight - Altura máxima del panel (default: 400)
 */
function AlertasPanel({ userRole, onDocumentClick, compact = false, maxHeight = 400 }) {
  const [alertas, setAlertas] = useState([]);
  const [stats, setStats] = useState({ total: 0, criticas: 0, urgentes: 0, atencion: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [expanded, setExpanded] = useState(!compact);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // Configuración de endpoints por rol
  const getEndpoint = () => {
    const endpoints = {
      RECEPCION: '/alertas/recepcion',
      MATRIZADOR: '/alertas/matrizador',
      ARCHIVO: '/alertas/archivo',
      ADMIN: '/alertas/admin'
    };
    return endpoints[userRole];
  };

  const fetchAlertas = async () => {
    const endpoint = getEndpoint();
    if (!endpoint) {
      setError('Rol no soporta alertas');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setAlertas(response.data.data.alertas || []);
        setStats(response.data.data.stats || { total: 0, criticas: 0, urgentes: 0, atencion: 0 });
        setUltimaActualizacion(response.data.data.ultimaActualizacion);
      } else {
        setError(response.data.error || 'Error obteniendo alertas');
      }
    } catch (error) {
      console.error('Error obteniendo alertas:', error);
      setError(error.response?.data?.error || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertas();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(fetchAlertas, 300000);
    return () => clearInterval(interval);
  }, [userRole]);

  // Filtrar alertas según tab seleccionado
  const getFilteredAlertas = () => {
    switch (tabValue) {
      case 0: return alertas; // Todas
      case 1: return alertas.filter(a => a.nivel === 'CRITICA'); // Críticas
      case 2: return alertas.filter(a => a.nivel === 'URGENTE'); // Urgentes
      case 3: return alertas.filter(a => a.nivel === 'ATENCION'); // Atención
      default: return alertas;
    }
  };

  // Configuración de colores para tabs
  const getTabColor = (nivel, count) => {
    if (count === 0) return 'default';
    switch (nivel) {
      case 'CRITICA': return 'error';
      case 'URGENTE': return 'warning';
      case 'ATENCION': return 'info';
      default: return 'primary';
    }
  };

  const filteredAlertas = getFilteredAlertas();

  if (loading && alertas.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={24} />
          <Typography>Cargando alertas...</Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">
          Error: {error}
          <Button onClick={fetchAlertas} size="small" sx={{ ml: 1 }}>
            Reintentar
          </Button>
        </Alert>
      </Paper>
    );
  }

  const getRoleName = () => {
    const nombres = {
      RECEPCION: 'Recepción',
      MATRIZADOR: 'Matrizador', 
      ARCHIVO: 'Archivo',
      ADMIN: 'Administrador'
    };
    return nombres[userRole] || userRole;
  };

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'white' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon />
            <Typography variant="h6">
              Alertas {getRoleName()}
            </Typography>
            {compact && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ color: 'white' }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {stats.total > 0 && (
              <Chip 
                label={`${stats.total} total`}
                variant="outlined" 
                size="small"
                sx={{ color: 'white', borderColor: 'white' }}
              />
            )}
            <Tooltip title="Actualizar alertas">
              <IconButton 
                size="small" 
                onClick={fetchAlertas}
                disabled={loading}
                sx={{ color: 'white' }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Collapse in={expanded}>
        {/* Stats Cards */}
        {!compact && stats.total > 0 && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {stats.criticas > 0 && (
                <Grid item xs={6} md={3}>
                  <Card sx={{ backgroundColor: '#ffebee' }}>
                    <CardContent sx={{ p: 1 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <ErrorIcon color="error" fontSize="small" />
                        <Box>
                          <Typography variant="h6" color="error">
                            {stats.criticas}
                          </Typography>
                          <Typography variant="caption">
                            Críticas
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {stats.urgentes > 0 && (
                <Grid item xs={6} md={3}>
                  <Card sx={{ backgroundColor: '#fff3e0' }}>
                    <CardContent sx={{ p: 1 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <WarningIcon color="warning" fontSize="small" />
                        <Box>
                          <Typography variant="h6" color="warning.main">
                            {stats.urgentes}
                          </Typography>
                          <Typography variant="caption">
                            Urgentes
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {stats.atencion > 0 && (
                <Grid item xs={6} md={3}>
                  <Card sx={{ backgroundColor: '#e3f2fd' }}>
                    <CardContent sx={{ p: 1 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <InfoIcon color="info" fontSize="small" />
                        <Box>
                          <Typography variant="h6" color="info.main">
                            {stats.atencion}
                          </Typography>
                          <Typography variant="caption">
                            Atención
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {stats.total === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              ¡Excelente trabajo!
            </Typography>
            <Typography color="text.secondary">
              No hay alertas pendientes
            </Typography>
          </Box>
        ) : (
          <>
            {/* Tabs para filtros */}
            {!compact && (
              <>
                <Divider />
                <Tabs
                  value={tabValue}
                  onChange={(e, newValue) => setTabValue(newValue)}
                  variant="fullWidth"
                >
                  <Tab 
                    label={`Todas (${stats.total})`}
                    sx={{ minWidth: 0 }}
                  />
                  <Tab 
                    label={`Críticas (${stats.criticas})`}
                    sx={{ 
                      color: stats.criticas > 0 ? 'error.main' : 'text.secondary',
                      minWidth: 0 
                    }}
                  />
                  <Tab 
                    label={`Urgentes (${stats.urgentes})`}
                    sx={{ 
                      color: stats.urgentes > 0 ? 'warning.main' : 'text.secondary',
                      minWidth: 0 
                    }}
                  />
                  <Tab 
                    label={`Atención (${stats.atencion})`}
                    sx={{ 
                      color: stats.atencion > 0 ? 'info.main' : 'text.secondary',
                      minWidth: 0 
                    }}
                  />
                </Tabs>
                <Divider />
              </>
            )}

            {/* Lista de alertas */}
            <Box sx={{ maxHeight: maxHeight, overflow: 'auto' }}>
              <List sx={{ p: 1 }}>
                {filteredAlertas.length === 0 ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No hay alertas en esta categoría
                    </Typography>
                  </Box>
                ) : (
                  filteredAlertas.map((alerta) => (
                    <AlertaItem
                      key={alerta.id}
                      alerta={alerta}
                      onDocumentClick={onDocumentClick}
                      showDetails={!compact}
                    />
                  ))
                )}
              </List>
            </Box>
          </>
        )}

        {/* Footer con última actualización */}
        {ultimaActualizacion && (
          <>
            <Divider />
            <Box sx={{ p: 1, backgroundColor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                Última actualización: {new Date(ultimaActualizacion).toLocaleTimeString('es-EC')}
              </Typography>
            </Box>
          </>
        )}
      </Collapse>
    </Paper>
  );
}

export default AlertasPanel;