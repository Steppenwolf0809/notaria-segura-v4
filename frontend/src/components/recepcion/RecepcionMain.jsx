import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Chip,
  FormControl,
  Select,
  MenuItem,
  TablePagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  Avatar,
  InputAdornment,
  Paper,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  Visibility as VisibilityIcon,
  Clear as ClearIcon,
  Notifications as NotificationsIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Done as DoneIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import receptionService from '../../services/reception-service';
import ModalEntrega from './ModalEntrega';

/**
 * Componente principal de recepción rediseñado
 * Incluye panel de estadísticas, filtros avanzados, tabla optimizada y acciones batch
 */
function RecepcionMain() {
  // Estados principales
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matrizadores, setMatrizadores] = useState([]);

  // Estado de pestañas (0: Activos, 1: Entregados)
  const [tabValue, setTabValue] = useState(0);

  // Estados de filtros
  const [filters, setFilters] = useState({
    search: '',
    matrizadorId: '',
    estado: '',
    tipoDocumento: ''
  });

  // Debounce para búsqueda
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Estados de selección
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());

  // Estados de modales
  const [showModalEntrega, setShowModalEntrega] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);

  /**
   * Cargar documentos con filtros
   */
  const cargarDocumentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.matrizadorId && { matrizador: filters.matrizadorId }),
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.tipoDocumento && { tipoDocumento: filters.tipoDocumento })
      };

      const result = await receptionService.getTodosDocumentos(params);

      if (result.success) {
        const docs = result.data.documents || [];
        setDocumentos(docs);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setError(null);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError('Error cargando documentos');
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

  /**
   * Cargar matrizadores para filtro
   */
  const cargarMatrizadores = useCallback(async () => {
    try {
      const result = await receptionService.getMatrizadores();
      if (result.success) {
        setMatrizadores(result.data.matrizadores || []);
      }
    } catch (error) {
      console.error('Error cargando matrizadores:', error);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDocumentos();
    cargarMatrizadores();
  }, [cargarDocumentos, cargarMatrizadores]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchQuery }));
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Calcular estadísticas en tiempo real
   */
  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return {
      enProceso: documentos.filter(d => d.status === 'EN_PROCESO').length,
      listos: documentos.filter(d => d.status === 'LISTO').length,
      entregadosHoy: documentos.filter(d => {
        if (d.status !== 'ENTREGADO') return false;
        const fechaEntrega = new Date(d.fechaEntrega || d.updatedAt);
        fechaEntrega.setHours(0, 0, 0, 0);
        return fechaEntrega.getTime() === now.getTime();
      }).length,
      total: documentos.length
    };
  }, [documentos]);

  /**
   * Filtrar documentos en tiempo real
   */
  const documentosFiltrados = useMemo(() => {
    return documentos.filter(doc => {
      // Filtro por pestaña activa
      if (tabValue === 0) {
        // Pestaña Activos: solo EN_PROCESO, LISTO, PAGADO
        if (doc.status === 'ENTREGADO') return false;
      } else {
        // Pestaña Entregados: solo ENTREGADO
        if (doc.status !== 'ENTREGADO') return false;
      }

      // Búsqueda general
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchCliente = doc.clientName?.toLowerCase().includes(search);
        const matchCodigo = doc.protocolNumber?.toLowerCase().includes(search);
        const matchMatriz = doc.numeroMatriz?.toLowerCase().includes(search);
        if (!matchCliente && !matchCodigo && !matchMatriz) return false;
      }

      // Filtro por matrizador
      if (filters.matrizadorId && doc.matrizadorId !== filters.matrizadorId) {
        return false;
      }

      // Filtro por estado
      if (filters.estado && doc.status !== filters.estado) {
        return false;
      }

      // Filtro por tipo de documento
      if (filters.tipoDocumento && doc.documentType !== filters.tipoDocumento) {
        return false;
      }

      return true;
    });
  }, [documentos, filters, tabValue]);

  /**
   * Obtener tipos de documento únicos para filtro
   */
  const tiposDocumento = useMemo(() => {
    const tipos = new Set();
    documentos.forEach(doc => {
      if (doc.documentType) tipos.add(doc.documentType);
    });
    return Array.from(tipos).sort();
  }, [documentos]);

  /**
   * Obtener iniciales del nombre
   */
  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.trim().split(' ').filter(n => n.length > 0);
    if (names.length === 0) return '?';
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  };

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'EN_PROCESO':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'LISTO':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'PAGADO':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'ENTREGADO':
        return { bg: '#e0e7ff', text: '#3730a3' };
      default:
        return { bg: '#f3f4f6', text: '#1f2937' };
    }
  };

  /**
   * Obtener icono del estado
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'EN_PROCESO':
        return '🟡';
      case 'LISTO':
        return '🟢';
      case 'PAGADO':
        return '🔵';
      case 'ENTREGADO':
        return '✅';
      default:
        return '⚪';
    }
  };

  /**
   * Obtener abreviación del tipo de documento
   */
  const getDocTypeAbbr = (type) => {
    if (!type) return '?';
    const abbr = {
      'ESCRITURA': 'E',
      'ESCRITURA PUBLICA': 'E',
      'PODER': 'P',
      'DILIGENCIA': 'D',
      'DECLARACION': 'DC',
      'ACTA': 'A',
      'OTRO': 'O',
      'MINUTA': 'M',
      'RECONOCIMIENTO': 'R',
      'AUTENTICACION': 'AU'
    };

    // Buscar coincidencia parcial
    const upperType = type.toUpperCase();
    for (const [key, value] of Object.entries(abbr)) {
      if (upperType.includes(key)) return value;
    }

    // Si no hay coincidencia, usar primera letra
    return type.substring(0, 1).toUpperCase();
  };

  /**
   * Formatear fecha
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  /**
   * Manejar selección de documento
   */
  const handleSelectDocument = (documentId) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  /**
   * Seleccionar todos
   */
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const selectableIds = documentosFiltrados
        .filter(doc => doc.status !== 'ENTREGADO')
        .map(doc => doc.id);
      setSelectedDocuments(new Set(selectableIds));
    } else {
      setSelectedDocuments(new Set());
    }
  };

  /**
   * Limpiar filtros
   */
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({
      search: '',
      matrizadorId: '',
      estado: '',
      tipoDocumento: ''
    });
    setPage(0);
  };

  /**
   * Marcar documento como listo
   */
  const handleMarcarListo = async (documentId) => {
    try {
      const result = await receptionService.marcarComoListo(documentId);
      if (result.success) {
        toast.success('Documento marcado como listo');
        await cargarDocumentos();
      } else {
        toast.error(result.error || 'Error al marcar documento');
      }
    } catch (error) {
      toast.error('Error al marcar documento como listo');
    }
  };

  /**
   * Marcar múltiples como listos
   */
  const handleMarkMultipleReady = async () => {
    if (selectedDocuments.size === 0) {
      toast.warning('Seleccione al menos un documento');
      return;
    }

    const documentosEnProceso = Array.from(selectedDocuments).filter(id => {
      const doc = documentos.find(d => d.id === id);
      return doc && doc.status === 'EN_PROCESO';
    });

    if (documentosEnProceso.length === 0) {
      toast.warning('No hay documentos en proceso seleccionados');
      return;
    }

    try {
      const result = await receptionService.marcarGrupoListo(documentosEnProceso);
      if (result.success) {
        toast.success(`${documentosEnProceso.length} documento(s) marcado(s) como listo(s)`);
        setSelectedDocuments(new Set());
        await cargarDocumentos();
      } else {
        toast.error(result.error || 'Error al marcar documentos');
      }
    } catch (error) {
      toast.error('Error al marcar documentos como listos');
    }
  };

  /**
   * Abrir modal de entrega
   */
  const handleEntregar = (documento) => {
    setDocumentoSeleccionado(documento);
    setShowModalEntrega(true);
  };

  /**
   * Cerrar modal de entrega
   */
  const handleCloseModalEntrega = () => {
    setShowModalEntrega(false);
    setDocumentoSeleccionado(null);
  };

  /**
   * Callback de entrega exitosa
   */
  const handleEntregaExitosa = async () => {
    toast.success('Documento entregado exitosamente');
    await cargarDocumentos();
    handleCloseModalEntrega();
  };

  /**
   * Exportar lista
   */
  const handleExport = () => {
    toast.info('Funcionalidad de exportación en desarrollo');
  };

  /**
   * Cambiar página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Cambiar filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Estados de loading
  if (loading && documentos.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando documentos...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          📋 Gestión de Recepción de Documentos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Vista unificada para marcar documentos listos y gestionar entregas
        </Typography>
      </Box>

      {/* Pestañas: Activos vs Entregados */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab
            label={
              <Badge badgeContent={stats.enProceso + stats.listos} color="primary" max={999}>
                Documentos Activos
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={stats.entregadosHoy} color="success" max={999}>
                Entregados
              </Badge>
            }
          />
        </Tabs>
      </Box>

      {/* Panel de Estadísticas - Compacto */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* En Proceso */}
        <Grid item xs={6} sm={3}>
          <Card sx={{
            bgcolor: '#fef3c7',
            borderLeft: 3,
            borderColor: '#f59e0b',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 }
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                    EN PROCESO
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#92400e' }}>
                    {stats.enProceso}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f59e0b', width: 40, height: 40 }}>
                  <HourglassEmptyIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Listos */}
        <Grid item xs={6} sm={3}>
          <Card sx={{
            bgcolor: '#d1fae5',
            borderLeft: 3,
            borderColor: '#10b981',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 }
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                    LISTOS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#065f46' }}>
                    {stats.listos}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#10b981', width: 40, height: 40 }}>
                  <DoneIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Entregados Hoy */}
        <Grid item xs={6} sm={3}>
          <Card sx={{
            bgcolor: '#dbeafe',
            borderLeft: 3,
            borderColor: '#3b82f6',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 }
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                    ENTREGADOS HOY
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e40af' }}>
                    {stats.entregadosHoy}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#3b82f6', width: 40, height: 40 }}>
                  <LocalShippingIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total */}
        <Grid item xs={6} sm={3}>
          <Card sx={{
            bgcolor: '#e0e7ff',
            borderLeft: 3,
            borderColor: '#6366f1',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 }
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                    TOTAL VISIBLES
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#3730a3' }}>
                    {stats.total}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#6366f1', width: 40, height: 40 }}>
                  <AssignmentIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Búsqueda */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por cliente, código o matriz..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Filtro Matrizador */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.matrizadorId}
                  onChange={(e) => setFilters(prev => ({ ...prev, matrizadorId: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">Todos los matrizadores</MenuItem>
                  {matrizadores.map(mat => (
                    <MenuItem key={mat.id} value={mat.id}>
                      {mat.nombre || `${mat.firstName} ${mat.lastName}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Filtro Estado */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.estado}
                  onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">Todos los estados</MenuItem>
                  <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
                  <MenuItem value="LISTO">Listo</MenuItem>
                  <MenuItem value="ENTREGADO">Entregado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Filtro Tipo Documento */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.tipoDocumento}
                  onChange={(e) => setFilters(prev => ({ ...prev, tipoDocumento: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">Todos los tipos</MenuItem>
                  {tiposDocumento.map(tipo => (
                    <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Botones de acción */}
            <Grid item xs={12} sm={6} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleClearFilters}
                  fullWidth
                >
                  Limpiar
                </Button>
                <Tooltip title="Refrescar">
                  <IconButton onClick={cargarDocumentos} color="primary" size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabla de Documentos */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedDocuments.size > 0 &&
                      selectedDocuments.size < documentosFiltrados.filter(d => d.status !== 'ENTREGADO').length
                    }
                    checked={
                      documentosFiltrados.filter(d => d.status !== 'ENTREGADO').length > 0 &&
                      selectedDocuments.size === documentosFiltrados.filter(d => d.status !== 'ENTREGADO').length
                    }
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Matrizador</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2, textAlign: 'center' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No se encontraron documentos
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                documentosFiltrados.map((documento) => (
                  <TableRow
                    key={documento.id}
                    hover
                    selected={selectedDocuments.has(documento.id)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2,
                        borderLeft: '4px solid',
                        borderLeftColor: 'primary.main'
                      }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedDocuments.has(documento.id)}
                        onChange={() => handleSelectDocument(documento.id)}
                        disabled={documento.status === 'ENTREGADO'}
                      />
                    </TableCell>

                    {/* Cliente */}
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {documento.clientName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {documento.numeroIdentificacion || documento.clientId}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Tipo - Abreviado */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title={documento.documentType} arrow>
                        <Chip
                          label={getDocTypeAbbr(documento.documentType)}
                          size="small"
                          color="info"
                          sx={{
                            minWidth: 32,
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        />
                      </Tooltip>
                    </TableCell>

                    {/* Código - Más prominente */}
                    <TableCell>
                      <Typography
                        variant="body1"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: 'primary.main'
                        }}
                      >
                        {documento.protocolNumber}
                      </Typography>
                    </TableCell>

                    {/* Matrizador */}
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'primary.main',
                            fontSize: '0.875rem',
                            fontWeight: 700
                          }}
                        >
                          {getInitials(documento.matrizador)}
                        </Avatar>
                        <Typography variant="body2">
                          {documento.matrizador}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Estado - Compacto */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title={documento.status} arrow>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: getStatusColor(documento.status).bg,
                            fontSize: '0.7rem'
                          }}
                        >
                          <span>{getStatusIcon(documento.status)}</span>
                          <Typography
                            variant="caption"
                            sx={{
                              color: getStatusColor(documento.status).text,
                              fontWeight: 700,
                              fontSize: '0.65rem'
                            }}
                          >
                            {documento.status === 'EN_PROCESO' ? 'PROC' :
                             documento.status === 'LISTO' ? 'LSTO' :
                             documento.status === 'PAGADO' ? 'PAGD' :
                             documento.status === 'ENTREGADO' ? 'ENTR' :
                             documento.status}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>

                    {/* Fecha */}
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(documento.createdAt || documento.fechaCreacion)}
                      </Typography>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      {documento.status === 'EN_PROCESO' ? (
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleMarcarListo(documento.id)}
                        >
                          Marcar Listo
                        </Button>
                      ) : (documento.status === 'LISTO' || documento.status === 'PAGADO') ? (
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          startIcon={<LocalShippingIcon />}
                          onClick={() => handleEntregar(documento)}
                        >
                          Entregar
                        </Button>
                      ) : documento.status === 'ENTREGADO' ? (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          disabled
                        >
                          Ver
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Sin acción
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalPages * rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Filas por página:"
        />
      </Card>

      {/* Acciones Rápidas */}
      {selectedDocuments.size > 0 && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            p: 2,
            bgcolor: 'background.paper',
            boxShadow: 4,
            borderRadius: 2,
            zIndex: 1200,
            minWidth: 400
          }}
        >
          <Box display="flex" gap={2} alignItems="center">
            <Typography variant="body2" fontWeight={600}>
              {selectedDocuments.size} documento(s) seleccionado(s)
            </Typography>

            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handleMarkMultipleReady}
            >
              Marcar como Listos
            </Button>

            <Button
              variant="outlined"
              startIcon={<NotificationsIcon />}
              onClick={() => toast.info('Funcionalidad en desarrollo')}
            >
              Notificar
            </Button>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Exportar
            </Button>
          </Box>
        </Paper>
      )}

      {/* Modal de Entrega */}
      {showModalEntrega && documentoSeleccionado && (
        <ModalEntrega
          documento={documentoSeleccionado}
          onClose={handleCloseModalEntrega}
          onEntregaExitosa={handleEntregaExitosa}
        />
      )}
    </Box>
  );
}

export default RecepcionMain;
