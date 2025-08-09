import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Divider,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import AlertaItem from './AlertaItem';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Modal detallado para gestión de alertas
 * @param {boolean} open - Si el modal está abierto
 * @param {Function} onClose - Callback para cerrar el modal
 * @param {string} userRole - Rol del usuario
 * @param {Function} onDocumentClick - Callback cuando se hace click en un documento
 */
function AlertasModal({ open, onClose, userRole, onDocumentClick }) {
  const [alertas, setAlertas] = useState([]);
  const [stats, setStats] = useState({ total: 0, criticas: 0, urgentes: 0, atencion: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Configuración de endpoints por rol
  const getEndpoint = () => {
    const endpoints = {
      RECEPCION: '/api/alertas/recepcion',
      MATRIZADOR: '/api/alertas/matrizador',
      ARCHIVO: '/api/alertas/archivo', 
      ADMIN: '/api/alertas/admin'
    };
    return endpoints[userRole];
  };

  const fetchAlertas = async () => {
    const endpoint = getEndpoint();
    if (!endpoint) {
      setError('Rol no soporta alertas');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setAlertas(response.data.data.alertas || []);
        setStats(response.data.data.stats || { total: 0, criticas: 0, urgentes: 0, atencion: 0 });
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
    if (open) {
      fetchAlertas();
    }
  }, [open, userRole]);

  // Filtrar alertas según búsqueda y tab
  const getFilteredAlertas = () => {
    let filtered = alertas;

    // Filtrar por tab
    switch (tabValue) {
      case 1: filtered = filtered.filter(a => a.nivel === 'CRITICA'); break;
      case 2: filtered = filtered.filter(a => a.nivel === 'URGENTE'); break;
      case 3: filtered = filtered.filter(a => a.nivel === 'ATENCION'); break;
      default: break; // Todas
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.protocolNumber.toLowerCase().includes(search) ||
        a.clientName.toLowerCase().includes(search) ||
        a.documentType.toLowerCase().includes(search)
      );
    }

    return filtered;
  };

  const exportarAlertas = () => {
    const csv = [
      ['Protocolo', 'Cliente', 'Tipo', 'Nivel', 'Días Pendientes', 'Fecha Actualización'],
      ...getFilteredAlertas().map(a => [
        a.protocolNumber,
        a.clientName,
        a.documentType,
        a.nivel,
        a.diasPendientes,
        new Date(a.updatedAt).toLocaleString('es-EC')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alertas_${userRole.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getRoleName = () => {
    const nombres = {
      RECEPCION: 'Recepción',
      MATRIZADOR: 'Matrizador',
      ARCHIVO: 'Archivo', 
      ADMIN: 'Administrador'
    };
    return nombres[userRole] || userRole;
  };

  const filteredAlertas = getFilteredAlertas();

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">
              Alertas de {getRoleName()}
            </Typography>
            {stats.total > 0 && (
              <Typography variant="body2" color="text.secondary">
                {stats.total} alertas total - 
                {stats.criticas > 0 && ` ${stats.criticas} críticas`}
                {stats.urgentes > 0 && ` ${stats.urgentes} urgentes`}
                {stats.atencion > 0 && ` ${stats.atencion} atención`}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Controles superiores */}
        <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
          <Box display="flex" gap={2} alignItems="center" mb={2}>
            <TextField
              placeholder="Buscar por protocolo, cliente o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Button
              startIcon={<DownloadIcon />}
              onClick={exportarAlertas}
              disabled={filteredAlertas.length === 0}
              size="small"
            >
              Exportar
            </Button>
          </Box>

          {/* Tabs de filtros */}
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="fullWidth"
          >
            <Tab label={`Todas (${stats.total})`} />
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>Críticas</span>
                  {stats.criticas > 0 && (
                    <Chip 
                      label={stats.criticas} 
                      size="small" 
                      color="error" 
                      sx={{ height: 18, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              } 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>Urgentes</span>
                  {stats.urgentes > 0 && (
                    <Chip 
                      label={stats.urgentes} 
                      size="small" 
                      color="warning"
                      sx={{ height: 18, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              } 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>Atención</span>
                  {stats.atencion > 0 && (
                    <Chip 
                      label={stats.atencion} 
                      size="small" 
                      color="info"
                      sx={{ height: 18, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              } 
            />
          </Tabs>
        </Box>

        <Divider />

        {/* Contenido principal */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Cargando alertas...</Typography>
            </Box>
          ) : error ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">
                {error}
                <Button onClick={fetchAlertas} size="small" sx={{ ml: 1 }}>
                  Reintentar
                </Button>
              </Alert>
            </Box>
          ) : filteredAlertas.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                {searchTerm ? 'No se encontraron alertas' : '¡Sin alertas!'}
              </Typography>
              <Typography color="text.secondary">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Excelente trabajo, no hay alertas pendientes'
                }
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 1 }}>
              {filteredAlertas.map((alerta) => (
                <AlertaItem
                  key={alerta.id}
                  alerta={alerta}
                  onDocumentClick={(alerta) => {
                    onDocumentClick?.(alerta);
                    onClose();
                  }}
                  showDetails={true}
                />
              ))}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, ml: 1 }}>
          Mostrando {filteredAlertas.length} de {alertas.length} alertas
        </Typography>
        <Button onClick={fetchAlertas} startIcon={<FilterListIcon />}>
          Actualizar
        </Button>
        <Button onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AlertasModal;