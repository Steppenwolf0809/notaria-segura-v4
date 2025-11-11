/**
 * AdminQRDashboard
 * Panel de administración para gestionar códigos QR de escrituras
 * Solo accesible para usuarios con rol ADMIN
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  LinearProgress,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  QrCode as QrCodeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  PictureAsPdf as PdfIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
  CalendarToday as CalendarIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import QRCode from 'react-qr-code';

// Servicios
import {
  getQRStatistics,
  getAllQRForAdmin,
  getEstadoInfo,
  generateVerificationURL,
  copyToClipboard,
  getVerificaciones
} from '../../services/escrituras-qr-service';

const AdminQRDashboard = () => {
  // Estados para estadísticas
  const [statistics, setStatistics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Estados para tabla de QR
  const [escrituras, setEscrituras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados de filtros y paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [origenFilter, setOrigenFilter] = useState('');
  const [pdfFilter, setPdfFilter] = useState('');

  // Estados para modal de detalles
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEscritura, setSelectedEscritura] = useState(null);

  // Estados para verificaciones
  const [verificaciones, setVerificaciones] = useState([]);
  const [verificacionesStats, setVerificacionesStats] = useState(null);
  const [loadingVerificaciones, setLoadingVerificaciones] = useState(false);

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    fetchStatistics();
  }, []);

  // Cargar escrituras cuando cambian los filtros o la página
  useEffect(() => {
    fetchEscrituras();
  }, [page, rowsPerPage, searchTerm, estadoFilter, origenFilter, pdfFilter]);

  /**
   * Obtiene las estadísticas de QR
   */
  const fetchStatistics = async () => {
    setLoadingStats(true);
    try {
      const response = await getQRStatistics();
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error(error.message || 'Error al cargar estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  /**
   * Obtiene la lista de escrituras con filtros
   */
  const fetchEscrituras = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page + 1, // Backend usa páginas desde 1
        limit: rowsPerPage,
        search: searchTerm || undefined,
        estado: estadoFilter || undefined,
        origenDatos: origenFilter || undefined,
        conPDF: pdfFilter === 'con' ? true : pdfFilter === 'sin' ? false : undefined
      };

      const response = await getAllQRForAdmin(params);
      setEscrituras(response.data.escrituras);
      setTotalCount(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching escrituras:', error);
      setError(error.message || 'Error al cargar los códigos QR');
      toast.error(error.message || 'Error al cargar los códigos QR');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el cambio de página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Maneja el cambio de filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Maneja el cambio en el campo de búsqueda
   */
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Resetear a la primera página
  };

  /**
   * Maneja el cambio de filtro de estado
   */
  const handleEstadoFilterChange = (event) => {
    setEstadoFilter(event.target.value);
    setPage(0);
  };

  /**
   * Maneja el cambio de filtro de origen
   */
  const handleOrigenFilterChange = (event) => {
    setOrigenFilter(event.target.value);
    setPage(0);
  };

  /**
   * Maneja el cambio de filtro de PDF
   */
  const handlePdfFilterChange = (event) => {
    setPdfFilter(event.target.value);
    setPage(0);
  };

  /**
   * Refresca datos
   */
  const handleRefresh = () => {
    fetchStatistics();
    fetchEscrituras();
    toast.success('Datos actualizados');
  };

  /**
   * Limpia todos los filtros
   */
  const handleClearFilters = () => {
    setSearchTerm('');
    setEstadoFilter('');
    setOrigenFilter('');
    setPdfFilter('');
    setPage(0);
  };

  /**
   * Obtiene el historial de verificaciones de una escritura
   */
  const fetchVerificaciones = async (escrituraId) => {
    setLoadingVerificaciones(true);
    try {
      const response = await getVerificaciones(escrituraId, { limit: 20 });
      setVerificaciones(response.data.verificaciones);
      setVerificacionesStats(response.data.estadisticas);
    } catch (error) {
      console.error('Error fetching verificaciones:', error);
      toast.error('Error al cargar el historial de verificaciones');
      setVerificaciones([]);
      setVerificacionesStats(null);
    } finally {
      setLoadingVerificaciones(false);
    }
  };

  /**
   * Formatea la fecha
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Calcula el color del indicador de uso mensual
   */
  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  /**
   * Abre el modal de detalles con la escritura seleccionada
   */
  const handleViewDetails = (escritura) => {
    setSelectedEscritura(escritura);
    setDetailsModalOpen(true);
    // Cargar historial de verificaciones
    fetchVerificaciones(escritura.id);
  };

  /**
   * Cierra el modal de detalles
   */
  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedEscritura(null);
  };

  /**
   * Copia el token al portapapeles
   */
  const handleCopyToken = async (token) => {
    const success = await copyToClipboard(token);
    if (success) {
      toast.success('Token copiado al portapapeles');
    } else {
      toast.error('Error al copiar el token');
    }
  };

  /**
   * Copia la URL de verificación al portapapeles
   */
  const handleCopyURL = async (token) => {
    const url = generateVerificationURL(token);
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('URL copiada al portapapeles');
    } else {
      toast.error('Error al copiar la URL');
    }
  };

  /**
   * Descarga el QR como imagen
   */
  const handleDownloadQR = (token) => {
    const container = document.getElementById(`qr-svg-${token}`);
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${token}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success('QR descargado exitosamente');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Panel de Administración de QR
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión y estadísticas de códigos QR de verificación de escrituras
          </Typography>
        </Box>
        <Tooltip title="Actualizar datos">
          <IconButton color="primary" onClick={handleRefresh} disabled={loadingStats || loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tarjetas de Estadísticas */}
      {loadingStats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : statistics ? (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* QR Este Mes */}
          <Grid item xs={12} md={6} lg={3}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <QrCodeIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      QR Este Mes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {statistics.esteMes}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Límite: {statistics.limiteDelMes}
                    </Typography>
                    <Typography variant="body2" color={getUsageColor(statistics.porcentajeUsado)}>
                      {statistics.porcentajeUsado.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(statistics.porcentajeUsado, 100)}
                    color={getUsageColor(statistics.porcentajeUsado)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, textAlign: 'center' }}
                  >
                    {statistics.qrRestantes} QR restantes
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total de QR */}
          <Grid item xs={12} md={6} lg={3}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total de QR
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {statistics.total}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.5} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      <CheckCircleIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      Activos
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {statistics.porEstado.activos}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      <WarningIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      En revisión
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {statistics.porEstado.revision}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      <CancelIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      Inactivos
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {statistics.porEstado.inactivos}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* PDFs y Verificaciones */}
          <Grid item xs={12} md={6} lg={3}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PdfIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      PDFs Completos
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {statistics.metricas.conPDFCompleto}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.5} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total verificaciones
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {statistics.metricas.totalVerificaciones}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Promedio por QR
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {statistics.metricas.promedioVerificacionesPorQR}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Usuarios */}
          <Grid item xs={12} md={6} lg={3}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Top Usuario
                    </Typography>
                    {statistics.topUsuarios.length > 0 ? (
                      <>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                          {statistics.topUsuarios[0].usuario.nombre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {statistics.topUsuarios[0].cantidad} QR creados
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2">Sin datos</Typography>
                    )}
                  </Box>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.5} sx={{ mt: 2 }}>
                  {statistics.topUsuarios.slice(1, 4).map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '70%'
                        }}
                      >
                        {item.usuario.nombre}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.cantidad}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Mes Actual */}
          <Grid item xs={12}>
            <Alert
              severity={
                statistics.porcentajeUsado >= 90
                  ? 'error'
                  : statistics.porcentajeUsado >= 70
                  ? 'warning'
                  : 'info'
              }
              icon={<CalendarIcon />}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Período actual: {statistics.periodoActual.mes}
                </Typography>
                <Typography variant="caption">
                  {statistics.esteMes} de {statistics.limiteDelMes} QR utilizados este mes
                  {statistics.qrRestantes > 0
                    ? ` • ${statistics.qrRestantes} disponibles`
                    : ' • Límite alcanzado'}
                </Typography>
              </Box>
            </Alert>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="error" sx={{ mb: 4 }}>
          No se pudieron cargar las estadísticas
        </Alert>
      )}

      {/* Filtros */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por número de escritura, token..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select value={estadoFilter} onChange={handleEstadoFilterChange} label="Estado">
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="revision_requerida">Revisión</MenuItem>
                <MenuItem value="inactivo">Inactivo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Origen</InputLabel>
              <Select value={origenFilter} onChange={handleOrigenFilterChange} label="Origen">
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PDF">PDF</MenuItem>
                <MenuItem value="MANUAL">Manual</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>PDF Completo</InputLabel>
              <Select value={pdfFilter} onChange={handlePdfFilterChange} label="PDF Completo">
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="con">Con PDF</MenuItem>
                <MenuItem value="sin">Sin PDF</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" onClick={handleClearFilters}>
              Limpiar Filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de Escrituras */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell>Número de Escritura</TableCell>
                <TableCell>Acto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Creador</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="center">PDF</TableCell>
                <TableCell align="center">Vistas</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Alert severity="error">{error}</Alert>
                  </TableCell>
                </TableRow>
              ) : escrituras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron códigos QR
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                escrituras.map((escritura) => {
                  const estadoInfo = getEstadoInfo(escritura.estado);
                  return (
                    <TableRow key={escritura.id} hover>
                      <TableCell>
                        <Tooltip title="Copiar token">
                          <Chip
                            label={escritura.token}
                            size="small"
                            color="primary"
                            variant="outlined"
                            onClick={() => {
                              navigator.clipboard.writeText(escritura.token);
                              toast.success('Token copiado');
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>{escritura.numeroEscritura || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {escritura.acto}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={estadoInfo.label}
                          size="small"
                          color={estadoInfo.color}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={escritura.origenDatos}
                          size="small"
                          variant="outlined"
                          color={escritura.origenDatos === 'PDF' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        {escritura.creador ? (
                          <Tooltip title={escritura.creador.email}>
                            <Typography variant="body2">{escritura.creador.nombre}</Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            N/A
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(escritura.createdAt)}</TableCell>
                      <TableCell align="center">
                        {escritura.tienePDF ? (
                          <Tooltip title="Tiene PDF completo">
                            <CheckCircleIcon color="success" fontSize="small" />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Sin PDF completo">
                            <CancelIcon color="disabled" fontSize="small" />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={escritura.pdfViewCount || 0}
                          size="small"
                          icon={<ViewIcon />}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalles completos">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewDetails(escritura)}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Modal de Detalles de QR */}
      <Dialog
        open={detailsModalOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <QrCodeIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Detalles del Código QR</Typography>
            </Box>
            <IconButton onClick={handleCloseDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedEscritura && (
            <Grid container spacing={3}>
              {/* Sección: Información Básica */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📋 Información Básica
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Token:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Chip
                          label={selectedEscritura.token}
                          color="primary"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Tooltip title="Copiar token">
                          <IconButton size="small" onClick={() => handleCopyToken(selectedEscritura.token)}>
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Estado:
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={getEstadoInfo(selectedEscritura.estado).label}
                          color={getEstadoInfo(selectedEscritura.estado).color}
                          size="small"
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Número de Escritura:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium', mt: 0.5 }}>
                        {selectedEscritura.numeroEscritura || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Origen de Datos:
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={selectedEscritura.origenDatos}
                          size="small"
                          variant="outlined"
                          color={selectedEscritura.origenDatos === 'PDF' ? 'primary' : 'secondary'}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Sección: Código QR Visual */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  🔲 Código QR
                </Typography>
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                  <div id={`qr-svg-${selectedEscritura.token}`}>
                    <QRCode
                      value={generateVerificationURL(selectedEscritura.token)}
                      size={200}
                      level="M"
                    />
                  </div>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadQR(selectedEscritura.token)}
                    >
                      Descargar
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CopyIcon />}
                      onClick={() => handleCopyURL(selectedEscritura.token)}
                    >
                      Copiar URL
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<OpenInNewIcon />}
                      onClick={() => window.open(generateVerificationURL(selectedEscritura.token), '_blank')}
                    >
                      Abrir
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              {/* Sección: Datos de la Escritura */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📄 Datos de la Escritura
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Acto:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {selectedEscritura.acto}
                      </Typography>
                    </Box>
                    {selectedEscritura.datosCompletos?.fecha_otorgamiento && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Fecha de Otorgamiento:
                        </Typography>
                        <Typography variant="body2">
                          {selectedEscritura.datosCompletos.fecha_otorgamiento}
                        </Typography>
                      </Box>
                    )}
                    {selectedEscritura.datosCompletos?.cuantia && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Cuantía:
                        </Typography>
                        <Typography variant="body2">
                          {selectedEscritura.datosCompletos.cuantia}
                        </Typography>
                      </Box>
                    )}
                    {selectedEscritura.datosCompletos?.notario && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Notario:
                        </Typography>
                        <Typography variant="body2">
                          {selectedEscritura.datosCompletos.notario}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              {/* Sección: Información del Creador */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  👤 Creador
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {selectedEscritura.creador ? (
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Nombre:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {selectedEscritura.creador.nombre}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Email:
                        </Typography>
                        <Typography variant="body2">
                          {selectedEscritura.creador.email}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Rol:
                        </Typography>
                        <Chip label={selectedEscritura.creador.role} size="small" />
                      </Box>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sin información del creador
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {/* Sección: Fechas */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📅 Fechas
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Creación:
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(selectedEscritura.createdAt)}
                      </Typography>
                    </Box>
                    {selectedEscritura.updatedAt && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Última Actualización:
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(selectedEscritura.updatedAt)}
                        </Typography>
                      </Box>
                    )}
                    {selectedEscritura.pdfUploadedAt && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          PDF Subido:
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(selectedEscritura.pdfUploadedAt)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              {/* Sección: PDF Completo */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📎 Archivo PDF Completo
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {selectedEscritura.tienePDF ? (
                          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                        ) : (
                          <CancelIcon color="disabled" sx={{ mr: 1 }} />
                        )}
                        <Typography variant="body2">
                          {selectedEscritura.tienePDF
                            ? 'PDF completo disponible'
                            : 'Sin PDF completo'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Verificaciones Públicas:
                      </Typography>
                      <Chip
                        label={`${selectedEscritura.pdfViewCount || 0} vistas`}
                        size="small"
                        icon={<ViewIcon />}
                        color="primary"
                        variant="outlined"
                      />
                    </Grid>
                    {selectedEscritura.tienePDF && selectedEscritura.pdfHiddenPages && selectedEscritura.pdfHiddenPages.length > 0 && (
                      <Grid item xs={12}>
                        <Alert severity="info" icon={<WarningIcon />}>
                          <Typography variant="body2">
                            Páginas ocultas: {selectedEscritura.pdfHiddenPages.join(', ')}
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              {/* Sección: Foto del Menor (si existe) */}
              {selectedEscritura.tieneFoto && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    🖼️ Fotografía
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Box
                      component="img"
                      src={selectedEscritura.fotoURL}
                      alt="Foto adjunta"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: 300,
                        borderRadius: 1,
                        objectFit: 'contain'
                      }}
                    />
                  </Paper>
                </Grid>
              )}

              {/* Sección: Historial de Verificaciones */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📊 Historial de Verificaciones
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {loadingVerificaciones ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : (
                    <>
                      {/* Estadísticas de verificaciones */}
                      {verificacionesStats && (
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                          <Grid item xs={12} sm={4}>
                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                              <Typography variant="h4" color="primary">
                                {verificacionesStats.total}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total Verificaciones
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                              <Typography variant="h4" color="info.main">
                                {verificacionesStats.porTipo.datos}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Solo Datos
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                              <Typography variant="h4" color="success.main">
                                {verificacionesStats.porTipo.pdf_completo}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                PDF Completo
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      )}

                      {/* Tabla de verificaciones recientes */}
                      {verificaciones.length > 0 ? (
                        <TableContainer sx={{ maxHeight: 400 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>Fecha y Hora</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>IP</TableCell>
                                <TableCell>Dispositivo</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {verificaciones.map((verificacion) => (
                                <TableRow key={verificacion.id} hover>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {formatDate(verificacion.timestamp)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={verificacion.tipoVerificacion === 'datos' ? 'Solo Datos' : 'PDF Completo'}
                                      size="small"
                                      color={verificacion.tipoVerificacion === 'datos' ? 'info' : 'success'}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                      {verificacion.ipAddress || 'N/A'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip title={verificacion.userAgent || 'N/A'}>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          maxWidth: 200,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {verificacion.userAgent ? (
                                          verificacion.userAgent.includes('Mobile') ? '📱 Móvil' :
                                          verificacion.userAgent.includes('Windows') ? '💻 Windows' :
                                          verificacion.userAgent.includes('Mac') ? '🍎 Mac' :
                                          verificacion.userAgent.includes('Linux') ? '🐧 Linux' :
                                          '🖥️ Desconocido'
                                        ) : 'N/A'}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Alert severity="info">
                          No hay verificaciones registradas para este código QR.
                        </Alert>
                      )}

                      {verificaciones.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                          Mostrando las últimas 20 verificaciones
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminQRDashboard;
