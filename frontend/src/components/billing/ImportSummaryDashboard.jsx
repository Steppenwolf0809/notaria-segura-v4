import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Collapse,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  useTheme
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FileUpload as FileUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Receipt as ReceiptIcon,
  Payments as PaymentsIcon,
  Description as DescriptionIcon,
  CreditCard as CreditCardIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';

/**
 * Dashboard de resumen de importaciones XML
 * Muestra estadísticas detalladas de las últimas importaciones
 */
const ImportSummaryDashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await billingService.getXMLImportStats();
      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.error || 'Error al cargar estadísticas');
      }
    } catch (err) {
      setError('Error de conexión al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Helper para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper para formatear duración
  const formatDuration = (duration) => {
    if (!duration) return '';
    return duration.replace('s', ' seg');
  };

  // Helper para el color del estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'COMPLETED_WITH_ERRORS':
        return 'warning';
      case 'FAILED':
        return 'error';
      case 'PROCESSING':
        return 'info';
      default:
        return 'default';
    }
  };

  // Helper para el icono del estado
  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon color="success" />;
      case 'COMPLETED_WITH_ERRORS':
        return <WarningIcon color="warning" />;
      case 'FAILED':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  // Calcular totales del resumen
  const calculateTotals = () => {
    if (!stats?.recentImports?.length) return null;
    
    return stats.recentImports.reduce((acc, imp) => ({
      totalPayments: acc.totalPayments + (imp.paymentsCreated || 0),
      totalSkipped: acc.totalSkipped + (imp.paymentsSkipped || 0),
      totalInvoices: acc.totalInvoices + (imp.invoicesCreated || 0),
      totalErrors: acc.totalErrors + (imp.errors || 0)
    }), { totalPayments: 0, totalSkipped: 0, totalInvoices: 0, totalErrors: 0 });
  };

  const totals = calculateTotals();

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={loadStats}>
            Reintentar
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!stats?.recentImports?.length) {
    return (
      <Alert severity="info">
        No hay importaciones recientes. Sube un archivo XML para comenzar.
      </Alert>
    );
  }

  const latestImport = stats.recentImports[0];

  return (
    <Box>
      {/* Header con resumen rápido */}
      <Card 
        variant="outlined" 
        sx={{ 
          mb: 2,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          cursor: 'pointer',
          '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileUploadIcon color="primary" />
              <Typography variant="h6" component="div">
                Última Importación
              </Typography>
              <Chip 
                size="small" 
                label={latestImport.status} 
                color={getStatusColor(latestImport.status)}
                icon={getStatusIcon(latestImport.status)}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Actualizar">
                <IconButton 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); loadStats(); }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
              <IconButton size="small">
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          {/* Resumen rápido */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {latestImport.totalRows || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Transacciones
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {latestImport.paymentsCreated || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pagos Nuevos
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {latestImport.invoicesCreated || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Facturas Creadas
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color={latestImport.errors > 0 ? 'error' : 'text.secondary'}>
                  {latestImport.errors || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Errores
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Archivo: <strong>{latestImport.fileName}</strong> • {formatDate(latestImport.startedAt)}
          </Typography>
        </CardContent>
      </Card>

      {/* Detalle expandible */}
      <Collapse in={expanded}>
        <Grid container spacing={2}>
          {/* Estadísticas de la última importación */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon fontSize="small" />
                  Detalle de la Última Importación
                </Typography>
                <Divider sx={{ my: 1 }} />
                
                {latestImport.metadata && (
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    {latestImport.metadata.invoicesCreatedFromFC > 0 && (
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ReceiptIcon fontSize="small" color="success" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Facturas XML (FC)</Typography>
                            <Typography variant="h6">{latestImport.metadata.invoicesCreatedFromFC}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    {latestImport.metadata.invoicesSkipped > 0 && (
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ReceiptIcon fontSize="small" color="info" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Facturas Existentes</Typography>
                            <Typography variant="h6">{latestImport.metadata.invoicesSkipped}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    {latestImport.metadata.invoicesCreatedLegacy > 0 && (
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DescriptionIcon fontSize="small" color="warning" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Facturas Legacy</Typography>
                            <Typography variant="h6">{latestImport.metadata.invoicesCreatedLegacy}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    {latestImport.metadata.notasCreditoProcessed > 0 && (
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCardIcon fontSize="small" color="error" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Notas de Crédito</Typography>
                            <Typography variant="h6">{latestImport.metadata.notasCreditoProcessed}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PaymentsIcon fontSize="small" color="success" />
                        <Box>
                          <Typography variant="body2" color="text.secondary">Pagos Procesados</Typography>
                          <Typography variant="h6">{latestImport.paymentsCreated || 0}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PaymentsIcon fontSize="small" color="info" />
                        <Box>
                          <Typography variant="body2" color="text.secondary">Pagos Existentes</Typography>
                          <Typography variant="h6">{latestImport.paymentsSkipped || 0}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {!latestImport.metadata && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Facturas creadas: <strong>{latestImport.invoicesCreated || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Facturas actualizadas: <strong>{latestImport.invoicesUpdated || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pagos creados: <strong>{latestImport.paymentsCreated || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pagos omitidos (duplicados): <strong>{latestImport.paymentsSkipped || 0}</strong>
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Totales acumulados */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon fontSize="small" />
                  Totales Acumulados (Últimas {stats.recentImports.length} importaciones)
                </Typography>
                <Divider sx={{ my: 1 }} />
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="h5" color="success.contrastText">
                        {totals?.totalPayments || 0}
                      </Typography>
                      <Typography variant="caption" color="success.contrastText">
                        Pagos Creados
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="h5" color="info.contrastText">
                        {totals?.totalInvoices || 0}
                      </Typography>
                      <Typography variant="caption" color="info.contrastText">
                        Facturas Creadas
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="h5" color="warning.contrastText">
                        {totals?.totalSkipped || 0}
                      </Typography>
                      <Typography variant="caption" color="warning.contrastText">
                        Pagos Omitidos
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: totals?.totalErrors > 0 ? 'error.light' : 'grey.200', borderRadius: 1 }}>
                      <Typography variant="h5" color={totals?.totalErrors > 0 ? 'error.contrastText' : 'text.secondary'}>
                        {totals?.totalErrors || 0}
                      </Typography>
                      <Typography variant="caption" color={totals?.totalErrors > 0 ? 'error.contrastText' : 'text.secondary'}>
                        Errores
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Historial de importaciones */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Historial de Importaciones
                </Typography>
                <Divider sx={{ my: 1 }} />
                
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Archivo</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="right">Transacciones</TableCell>
                        <TableCell align="right">Pagos</TableCell>
                        <TableCell align="right">Facturas</TableCell>
                        <TableCell align="right">Errores</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.recentImports.map((imp) => (
                        <TableRow key={imp.id} hover>
                          <TableCell>{formatDate(imp.startedAt)}</TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {imp.fileName}
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              size="small" 
                              label={imp.status} 
                              color={getStatusColor(imp.status)}
                            />
                          </TableCell>
                          <TableCell align="right">{imp.totalRows}</TableCell>
                          <TableCell align="right">
                            <Tooltip title={`Creados: ${imp.paymentsCreated || 0}, Omitidos: ${imp.paymentsSkipped || 0}`}>
                              <span>{imp.paymentsCreated || 0} / {imp.paymentsSkipped || 0}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">{imp.invoicesCreated || 0}</TableCell>
                          <TableCell align="right">
                            {imp.errors > 0 ? (
                              <Chip size="small" color="error" label={imp.errors} />
                            ) : (
                              <CheckCircleIcon color="success" fontSize="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Collapse>
    </Box>
  );
};

export default ImportSummaryDashboard;
