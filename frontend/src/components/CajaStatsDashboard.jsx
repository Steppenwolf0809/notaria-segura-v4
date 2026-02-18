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
  Divider,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Description as DocumentIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  CloudUpload as CloudUploadIcon,
  Gavel as GavelIcon,
  ArrowForward as ArrowForwardIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import documentService from '../services/document-service';
import useDocumentStore from '../store/document-store';
import billingService from '../services/billing-service';
import {
  getMonthRange,
  extractSubtotal,
  calculateStateParticipation,
  getSemaphoreState,
  calculateBracketProgress,
} from '../utils/stateParticipationCalculator';

// ── WIDGET PARTICIPACIÓN (DASHBOARD) ──
const ParticipationWidget = ({ subtotal, loading }) => {
  const now = new Date();
  const paymentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const paymentMonthName = paymentMonth.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
  const billingMonthName = now.toLocaleDateString('es-EC', { month: 'long' });

  const formatMoney = (value) =>
    '$' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatMoneyShort = (value) => {
    const n = Number(value || 0);
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
    return '$' + n.toFixed(0);
  };

  const calc = calculateStateParticipation(subtotal || 0);
  const progress = calculateBracketProgress(subtotal || 0, calc.bracketInfo);
  const semaphore = getSemaphoreState(progress.remaining, progress.isTopBracket);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(148, 163, 184, 0.12)',
        background: 'rgba(255, 255, 255, 0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: '#6366f120',
            color: '#6366f1',
            display: 'flex'
          }}>
            <GavelIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Participación Estado
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Facturado en {billingMonthName}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={() => window.location.hash = '#/participacion-estado'}
          sx={{ color: 'primary.main', bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
        >
          <ArrowForwardIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
            <CircularProgress size={18} />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                A pagar por lo facturado hasta hoy
              </Typography>
              <Box sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: semaphore.color,
                boxShadow: `0 0 4px ${semaphore.color}60`,
                flexShrink: 0,
              }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
              {formatMoney(calc.totalToPay)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Base Imponible (sin IVA): {formatMoney(subtotal)}
            </Typography>
          </>
        )}
      </Box>

      {/* ── Bracket Progress Bar ── */}
      {!loading && (
        <Box sx={{ mt: 1.5, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Esquema {calc.bracketLevel}
            </Typography>
            {progress.isTopBracket ? (
              <Chip
                size="small"
                label="Tramo máximo"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  bgcolor: 'rgba(100, 116, 139, 0.12)',
                  color: '#64748b',
                  fontWeight: 700,
                }}
              />
            ) : (
              <Typography variant="caption" sx={{ color: semaphore.color, fontWeight: 700 }}>
                {formatMoney(progress.remaining)} para Esquema {calc.bracketLevel + 1}
              </Typography>
            )}
          </Box>

          {/* Progress bar */}
          <Box sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'rgba(148, 163, 184, 0.12)',
            overflow: 'hidden',
          }}>
            <Box sx={{
              height: '100%',
              borderRadius: 4,
              width: `${Math.min(progress.percent, 100)}%`,
              bgcolor: semaphore.color,
              transition: 'width 0.6s ease-in-out',
              boxShadow: `0 0 6px ${semaphore.color}40`,
            }} />
          </Box>

          {/* Range labels */}
          {!progress.isTopBracket && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.3 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
                {formatMoneyShort(calc.bracketInfo.lowerLimit)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem', fontWeight: 600 }}>
                {Math.round(progress.percent)}%
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
                {formatMoneyShort(calc.bracketInfo.nextBracketAt)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
        <ScheduleIcon sx={{ fontSize: 14 }} />
        Pagar hasta el 10 de {paymentMonthName}
      </Typography>
    </Paper>
  );
};

/**
 * Dashboard de estadísticas de negocio para CAJA
 * Muestra métricas reales: montos facturados, trámites por tipo, tendencias
 */
const CajaStatsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonthBilled, setCurrentMonthBilled] = useState(0);
  const [participationLoading, setParticipationLoading] = useState(true);

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
      setError('Error de conexión al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentMonthParticipation = async () => {
    try {
      setParticipationLoading(true);
      const { fromISO, toISO } = getMonthRange(new Date(), { currentMonthUntilToday: true });
      const summary = await billingService.getSummary({
        dateFrom: fromISO,
        dateTo: toISO
      });
      const subtotalFromDB = Number(summary?.totals?.subtotalInvoiced || 0);
      const totalWithIVA = Number(summary?.totals?.invoiced || 0);
      setCurrentMonthBilled(subtotalFromDB > 0 ? subtotalFromDB : Number(extractSubtotal(totalWithIVA)));
    } catch (e) {
      console.error('Error cargando participacion', e);
      setCurrentMonthBilled(0);
    } finally {
      setParticipationLoading(false);
    }
  };

  /**
   * Cargar datos al montar
   */
  useEffect(() => {
    loadStats();
    loadCurrentMonthParticipation();
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

      {/* Botón destacado para subir XML */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }
        }}
        onClick={() => window.location.hash = '#/subir-xml'}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold', mb: 0.5 }}>
                  Subir Archivos XML
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  Sube documentos individuales o en lote (hasta 20 archivos)
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)'
                }
              }}
              startIcon={<CloudUploadIcon />}
            >
              Ir a Subir XML
            </Button>
          </Box>
        </CardContent>
      </Card>

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

      {/* Widget Participación Estado */}
      <Box sx={{ mb: 4 }}>
        <ParticipationWidget
          subtotal={currentMonthBilled}
          loading={participationLoading}
        />
      </Box>

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
