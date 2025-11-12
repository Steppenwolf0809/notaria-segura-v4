import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  Button,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Description as DocumentIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import documentService from '../services/document-service';
import useDocumentStore from '../store/document-store';

/**
 * Dashboard de estadísticas de negocio para CAJA
 * Muestra métricas reales: montos facturados, trámites por tipo, tendencias
 */
const CajaStatsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtener documentos recientes del store
  const { documents, fetchAllDocuments } = useDocumentStore();

  /**
   * Cargar estadísticas del backend
   */
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await documentService.getCajaStats();

      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.error || 'Error al cargar estadísticas');
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      setError('Error de conexión al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cargar datos al montar
   */
  useEffect(() => {
    loadStats();
    fetchAllDocuments(1, 10); // Cargar últimos 10 documentos
  }, []);

  /**
   * Formatear moneda
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  /**
   * Obtener color del tipo de documento
   */
  const getDocumentTypeColor = (type) => {
    const colors = {
      PROTOCOLO: 'primary',
      DILIGENCIA: 'secondary',
      CERTIFICACION: 'info',
      ARRENDAMIENTO: 'warning',
      OTROS: 'default'
    };
    return colors[type] || 'default';
  };

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    const colors = {
      PENDIENTE: 'warning',
      EN_PROCESO: 'info',
      LISTO: 'success',
      ENTREGADO: 'default',
      ANULADO_NOTA_CREDITO: 'error'
    };
    return colors[status] || 'default';
  };

  /**
   * Refrescar datos
   */
  const handleRefresh = () => {
    loadStats();
    fetchAllDocuments(1, 10);
  };

  // Loading state
  if (loading && !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
          Dashboard de Estadísticas - CAJA
        </Typography>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Cargando estadísticas...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
          Dashboard de Estadísticas - CAJA
        </Typography>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Reintentar
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            Dashboard de Estadísticas
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          startIcon={<RefreshIcon />}
          sx={{ color: 'primary.main', borderColor: 'primary.main' }}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>

      {/* Estadísticas Generales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Trámites */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <DocumentIcon sx={{ fontSize: 48 }} />
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {stats?.general?.totalTramites || 0}
                  </Typography>
                  <Typography variant="h6">
                    Total de Trámites
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Facturado */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <MoneyIcon sx={{ fontSize: 48 }} />
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(stats?.general?.totalFacturado)}
                  </Typography>
                  <Typography variant="h6">
                    Total Facturado
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tendencias */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon /> Tendencias
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Últimos 7 días */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'info.50' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Últimos 7 Días
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                      {stats?.tendencias?.ultimos7Dias?.cantidad || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Trámites
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatCurrency(stats?.tendencias?.ultimos7Dias?.monto)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Facturado
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Últimos 30 días */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'success.50' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Últimos 30 Días
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                      {stats?.tendencias?.ultimos30Dias?.cantidad || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Trámites
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatCurrency(stats?.tendencias?.ultimos30Dias?.monto)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Facturado
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Trámites por Tipo */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Por Tipo de Documento */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                Trámites por Tipo
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats?.porTipo && Object.entries(stats.porTipo).map(([tipo, data]) => (
                      <TableRow key={tipo}>
                        <TableCell>
                          <Chip
                            label={tipo}
                            color={getDocumentTypeColor(tipo)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {data.cantidad}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            {formatCurrency(data.monto)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!stats?.porTipo || Object.keys(stats.porTipo).length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No hay datos disponibles
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Por Estado */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                Trámites por Estado
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats?.porEstado && Object.entries(stats.porEstado).map(([estado, cantidad]) => (
                      <TableRow key={estado}>
                        <TableCell>
                          <Chip
                            label={estado}
                            color={getStatusColor(estado)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {cantidad}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!stats?.porEstado || Object.keys(stats.porEstado).length === 0) && (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No hay datos disponibles
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Documentos Recientes */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main' }}>
              Documentos Recientes
            </Typography>
            <Button
              size="small"
              onClick={() => window.location.hash = '#/dashboard'}
              sx={{ color: 'primary.main' }}
            >
              Ver Todos
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Protocolo</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.slice(0, 10).map((doc) => (
                  <TableRow key={doc.id} hover>
                    <TableCell>{doc.clientName}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{doc.protocolNumber}</TableCell>
                    <TableCell>
                      <Chip
                        label={doc.documentType}
                        color={getDocumentTypeColor(doc.documentType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={doc.status}
                        color={getStatusColor(doc.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatCurrency(doc.totalFactura)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No hay documentos recientes
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CajaStatsDashboard;
