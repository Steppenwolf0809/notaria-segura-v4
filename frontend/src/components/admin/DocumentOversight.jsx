import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Skeleton,
  Tooltip,
  Button,
  Checkbox,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Assignment as DocumentIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  MoreVert as MoreIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
  Warning as WarningIcon,
  CheckCircle as CompletedIcon,
  Pending as PendingIcon,
  PlayArrow as InProgressIcon,
  LocalShipping as DeliveredIcon,
  Edit as EditIcon,
  SwapHoriz as ReassignIcon,
  Timeline as TimelineIcon,
  Group as GroupIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Sort as SortIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useDebounce } from '../../hooks/useDebounce';
import useAuthStore from '../../store/auth-store';
import adminService from '../../services/admin-service';
import { getMatrizadores } from '../../services/admin-supervision-service';
import DocumentStatusTimeline from './DocumentStatusTimeline';
import BulkOperationsDialog from './BulkOperationsDialog';
import EnviarMensajeModal from './EnviarMensajeModal';
import EnviarMensajeMasivoModal from './EnviarMensajeMasivoModal';
import PaymentIndicator from '../shared/PaymentIndicator';

/**
 * Componente de supervisión integral de documentos para administradores
 * Permite ver TODOS los documentos del sistema con filtros avanzados
 */
const DocumentOversight = () => {
  const { token, user: currentUser } = useAuthStore();

  // Estado de datos
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Estado de paginación y filtros
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('EN_PROCESO');
  const [typeFilter, setTypeFilter] = useState('');
  const [matrizadorFilter, setMatrizadorFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Estados de UI
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedDocumentForTimeline, setSelectedDocumentForTimeline] = useState(null);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [matrizadores, setMatrizadores] = useState([]);

  // Estados para eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Estados para mensajes internos
  const [mensajeModalOpen, setMensajeModalOpen] = useState(false);
  const [mensajeMasivoModalOpen, setMensajeMasivoModalOpen] = useState(false);
  const [documentoParaMensaje, setDocumentoParaMensaje] = useState(null);

  // Debounce para búsqueda
  const debouncedSearch = useDebounce(search, 500);

  // Configuración de umbrales para documentos vencidos (en días)
  const OVERDUE_THRESHOLDS = {
    PENDIENTE: 2,    // Pendiente más de 2 días
    EN_PROCESO: 5,   // En proceso más de 5 días
    LISTO: 7         // Listo más de 7 días sin entregar
  };

  // Mapeo de tipos de acto a badges - Paleta refinada institucional
  const actoBadges = {
    'PROTOCOLO': { label: 'P', color: '#1e3a5f', bgColor: 'rgba(30, 58, 95, 0.1)' },      // Azul marino
    'CERTIFICACION': { label: 'C', color: '#2f5233', bgColor: 'rgba(47, 82, 51, 0.1)' },  // Verde bosque
    'ARRENDAMIENTO': { label: 'A', color: '#5b4a6c', bgColor: 'rgba(91, 74, 108, 0.1)' }, // Púrpura grisáceo
    'DECLARACION': { label: 'D', color: '#8b5a2b', bgColor: 'rgba(139, 90, 43, 0.1)' },   // Marrón arcilla
    'RECONOCIMIENTO': { label: 'R', color: '#5a6572', bgColor: 'rgba(90, 101, 114, 0.1)' }, // Gris pizarra
    'DILIGENCIA': { label: 'Di', color: '#2c5f6f', bgColor: 'rgba(44, 95, 111, 0.1)' },    // Azul petróleo
    'OTROS': { label: 'O', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' }        // Gris neutro
  };

  /**
   * Cargar documentos con filtros avanzados
   */
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        sortBy,
        sortOrder,
      });

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (matrizadorFilter) params.append('matrizador', matrizadorFilter);
      if (overdueOnly) params.append('overdueOnly', 'true');
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/admin/documents/oversight?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar documentos');
      }

      const data = await response.json();

      if (data.success) {
        setDocuments(data.data.documents);
        setTotalCount(data.data.pagination.totalCount);
        setStats(data.data.stats);
      }
    } catch (error) {
      setError(error.message || 'Error al cargar los documentos');
      toast.error('Error al cargar los documentos');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, statusFilter, typeFilter, matrizadorFilter, overdueOnly, sortBy, sortOrder, startDate, endDate, token]);

  /**
   * Cargar lista de matrizadores para filtro
   * Usa el servicio centralizado que obtiene tanto MATRIZADOR como ARCHIVO
   */
  const loadMatrizadores = useCallback(async () => {
    try {
      const users = await getMatrizadores();
      setMatrizadores(users);
    } catch (error) {
      console.error('Error cargando matrizadores:', error);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    loadMatrizadores();
  }, [loadMatrizadores]);

  /**
   * Maneja cambio de página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Maneja cambio de filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Limpiar todos los filtros
   */
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setMatrizadorFilter('');
    setOverdueOnly(false);
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(0);
  };

  /**
   * Seleccionar/deseleccionar documento
   */
  const toggleDocumentSelection = (documentId) => {
    setSelectedDocuments(prev =>
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  /**
   * Seleccionar/deseleccionar todos los documentos
   */
  const toggleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(doc => doc.id));
    }
  };

  /**
   * Obtener color del estado - Paleta refinada
   */
  const getStatusColor = (status) => {
    const colors = {
      PENDIENTE: '#d97706',      // Ámbar
      EN_PROCESO: '#0284c7',     // Azul petróleo
      LISTO: '#047857',          // Verde bosque
      ENTREGADO: '#64748b'       // Gris pizarra
    };
    return colors[status] || '#64748b';
  };

  /**
   * Obtener estilos refinados del estado para Chips
   */
  const getStatusChipStyles = (status) => {
    const styles = {
      PENDIENTE: {
        bgcolor: 'rgba(217, 119, 6, 0.1)',
        color: '#d97706',
        borderColor: 'rgba(217, 119, 6, 0.2)'
      },
      EN_PROCESO: {
        bgcolor: 'rgba(2, 132, 199, 0.1)',
        color: '#0284c7',
        borderColor: 'rgba(2, 132, 199, 0.2)'
      },
      LISTO: {
        bgcolor: 'rgba(4, 120, 87, 0.1)',
        color: '#047857',
        borderColor: 'rgba(4, 120, 87, 0.2)'
      },
      ENTREGADO: {
        bgcolor: 'rgba(100, 116, 139, 0.1)',
        color: '#64748b',
        borderColor: 'rgba(100, 116, 139, 0.2)'
      }
    };
    return styles[status] || styles.ENTREGADO;
  };

  /**
   * Obtener icono del estado
   */
  const getStatusIcon = (status) => {
    const icons = {
      PENDIENTE: <PendingIcon />,
      EN_PROCESO: <InProgressIcon />,
      LISTO: <CompletedIcon />,
      ENTREGADO: <DeliveredIcon />
    };
    return icons[status] || <PendingIcon />;
  };

  /**
   * Verificar si un documento está vencido
   */
  const isDocumentOverdue = (document) => {
    const threshold = OVERDUE_THRESHOLDS[document.status];
    if (!threshold) return false;

    const now = new Date();
    const statusDate = new Date(document.statusChangedAt || document.createdAt);
    const daysDiff = Math.floor((now - statusDate) / (1000 * 60 * 60 * 24));

    return daysDiff > threshold;
  };

  /**
   * Calcular tiempo en estado actual
   */
  const getTimeInStatus = (document) => {
    const now = new Date();
    const statusDate = new Date(document.statusChangedAt || document.createdAt);
    const daysDiff = Math.floor((now - statusDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'Hoy';
    if (daysDiff === 1) return '1 día';
    return `${daysDiff} días`;
  };

  /**
   * Mostrar timeline del documento
   */
  const showDocumentTimeline = (document) => {
    setSelectedDocumentForTimeline(document);
    setShowTimeline(true);
  };

  /**
   * Abrir modal de mensaje individual
   */
  const openMensajeModal = (document) => {
    setDocumentoParaMensaje(document);
    setMensajeModalOpen(true);
  };

  /**
   * Abrir modal de mensaje masivo
   */
  const openMensajeMasivoModal = () => {
    setMensajeMasivoModalOpen(true);
  };

  /**
   * Obtener documentos seleccionados (objetos completos)
   */
  const getSelectedDocumentos = () => {
    return documents.filter(doc => selectedDocuments.includes(doc.id));
  };

  /**
   * Abrir diálogo de confirmación para eliminar documento individual
   */
  const openDeleteDialog = (document) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  /**
   * Eliminar documento individual
   */
  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      setDeleting(true);
      await adminService.deleteDocument(documentToDelete.id, token);

      toast.success(`Documento ${documentToDelete.protocolNumber} eliminado exitosamente`);

      // Recargar documentos
      loadDocuments();

      // Cerrar diálogo
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      toast.error(error.message || 'Error al eliminar el documento');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Abrir diálogo de confirmación para eliminar múltiples documentos
   */
  const openBulkDeleteDialog = () => {
    if (selectedDocuments.length === 0) {
      toast.warning('Seleccione al menos un documento para eliminar');
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  /**
   * Eliminar múltiples documentos
   */
  const handleBulkDelete = async () => {
    if (selectedDocuments.length === 0) return;

    try {
      setDeleting(true);
      const result = await adminService.bulkDeleteDocuments(selectedDocuments, token);

      if (result.success) {
        const { successCount, errorCount } = result.data.results;

        if (errorCount === 0) {
          toast.success(`${successCount} documento(s) eliminado(s) exitosamente`);
        } else {
          toast.warning(`${successCount} documento(s) eliminado(s), ${errorCount} con errores`);
        }

        // Limpiar selección y recargar
        setSelectedDocuments([]);
        loadDocuments();
      }

      // Cerrar diálogo
      setBulkDeleteDialogOpen(false);
    } catch (error) {
      toast.error(error.message || 'Error al eliminar los documentos');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Exportar documentos
   */
  const exportDocuments = async (format = 'excel') => {
    try {
      const params = new URLSearchParams({
        format,
        search: debouncedSearch || '',
        status: statusFilter || '',
        type: typeFilter || '',
        matrizador: matrizadorFilter || '',
        overdueOnly: overdueOnly ? 'true' : 'false'
      });

      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/admin/documents/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `documentos_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Documentos exportados exitosamente');
      } else {
        throw new Error('Error al exportar documentos');
      }
    } catch (error) {
      toast.error('Error al exportar documentos');
    }
  };

  // Colores refinados para KPIs
  const kpiColors = {
    primary: { main: '#1e3a5f', light: 'rgba(30, 58, 95, 0.08)' },
    warning: { main: '#d97706', light: 'rgba(217, 119, 6, 0.08)' },
    info: { main: '#0284c7', light: 'rgba(2, 132, 199, 0.08)' },
    error: { main: '#be123c', light: 'rgba(190, 18, 60, 0.08)' },
  };

  /**
   * Renderizar estadísticas con estilo refinado
   */
  const renderStats = () => {
    if (!stats) return null;

    const kpiData = [
      { value: stats.total, label: 'Total Documentos', color: kpiColors.primary, icon: <DescriptionIcon /> },
      { value: stats.pending, label: 'Pendientes', color: kpiColors.warning, icon: <PendingIcon /> },
      { value: stats.inProgress, label: 'En Proceso', color: kpiColors.info, icon: <InProgressIcon /> },
      { value: stats.overdue, label: 'Vencidos', color: kpiColors.error, icon: <WarningIcon /> },
    ];

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiData.map((kpi, index) => (
          <Grid item xs={6} md={3} key={index}>
            <Card sx={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.12)',
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        fontSize: '0.625rem', 
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        color: 'text.secondary'
                      }}
                    >
                      {kpi.label}
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 700, 
                        color: kpi.color.main,
                        mt: 0.5,
                        fontSize: '1.625rem'
                      }}
                    >
                      {kpi.value}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 2,
                    backgroundColor: kpi.color.light,
                    color: kpi.color.main,
                    display: 'flex'
                  }}>
                    {React.cloneElement(kpi.icon, { fontSize: 'small' })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DocumentIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Supervisión de Documentos
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ExportIcon />}
          onClick={() => exportDocuments('excel')}
          sx={{ ml: 2 }}
        >
          Exportar
        </Button>
      </Box>

      {/* Estadísticas */}
      {renderStats()}

      {/* Filtros avanzados */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Búsqueda */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Buscar por número, cliente, tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
                size="small"
              />
            </Grid>

            {/* Filtro por estado */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Todos los estados</em>
                  </MenuItem>
                  <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
                  <MenuItem value="LISTO">Listo</MenuItem>
                  <MenuItem value="ENTREGADO">Entregado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Filtro por tipo */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Todos los tipos</em>
                  </MenuItem>
                  <MenuItem value="PROTOCOLO">Protocolo</MenuItem>
                  <MenuItem value="DILIGENCIA">Diligencia</MenuItem>
                  <MenuItem value="CERTIFICACION">Certificación</MenuItem>
                  <MenuItem value="ARRENDAMIENTO">Arrendamiento</MenuItem>
                  <MenuItem value="OTROS">Otros</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Filtro por matrizador */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <Select
                  value={matrizadorFilter}
                  onChange={(e) => setMatrizadorFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Todos los matrizadores</em>
                  </MenuItem>
                  <MenuItem value="unassigned">
                    <em>Sin asignar</em>
                  </MenuItem>
                  {matrizadores?.map((matrizador) => (
                    <MenuItem key={matrizador.id} value={matrizador.id}>
                      {matrizador.firstName} {matrizador.lastName} ({matrizador.role})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Controles */}
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Tooltip title="Solo documentos vencidos">
                  <Checkbox
                    checked={overdueOnly}
                    onChange={(e) => setOverdueOnly(e.target.checked)}
                    icon={<WarningIcon />}
                    checkedIcon={<WarningIcon color="error" />}
                    size="small"
                  />
                </Tooltip>

                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={loadDocuments}
                  disabled={loading}
                >
                  Actualizar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Grid secundaria: Fechas + Orden */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">

            {/* Filtro por Fechas */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Fecha Desde"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  fullWidth={false}
                  sx={{ minWidth: 150 }}
                />
                <TextField
                  label="Fecha Hasta"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  fullWidth={false}
                  sx={{ minWidth: 150 }}
                />
              </Box>
            </Grid>

            {/* Ordenar Por + Toggle Orden */}
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Ordenar por</InputLabel>
                  <Select
                    value={sortBy}
                    label="Ordenar por"
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <MenuItem value="createdAt">Fecha Creación</MenuItem>
                    <MenuItem value="updatedAt">Última Actualización</MenuItem>
                    <MenuItem value="statusChangedAt">Cambio Estado</MenuItem>
                  </Select>
                </FormControl>

                <Tooltip title={`Orden: ${sortOrder === 'asc' ? 'Más antiguos primero' : 'Más recientes primero'}`}>
                  <IconButton
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    color="primary"
                    sx={{ border: '1px solid', borderColor: 'divider' }}
                  >
                    {sortOrder === 'asc' ? <SortIcon sx={{ transform: 'scaleY(-1)' }} /> : <SortIcon />}
                  </IconButton>
                </Tooltip>
                <Typography variant="caption" color="text.secondary">
                  {sortOrder === 'asc' ? 'Antiguos → Nuevos' : 'Nuevos → Antiguos'}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3} sx={{ textAlign: 'right' }}>
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
              >
                Limpiar todos
              </Button>
            </Grid>

          </Grid>
        </CardContent>
      </Card>

      {/* Operaciones en lote */}
      {
        selectedDocuments.length > 0 && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  onClick={openMensajeMasivoModal}
                >
                  Mensaje Masivo
                </Button>
                <Button
                  size="small"
                  onClick={() => setShowBulkOperations(true)}
                >
                  Otras Acciones
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={openBulkDeleteDialog}
                >
                  Eliminar
                </Button>
              </Box>
            }
          >
            {selectedDocuments.length} documento(s) seleccionado(s)
          </Alert>
        )
      }

      {/* Error */}
      {
        error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )
      }

      {/* Tabla de documentos */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedDocuments.length > 0 && selectedDocuments.length < documents.length}
                    checked={documents.length > 0 && selectedDocuments.length === documents.length}
                    onChange={toggleSelectAll}
                  />
                </TableCell>
                <TableCell>Documento</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Matrizador</TableCell>
                <TableCell>Tiempo en Estado</TableCell>
                <TableCell>Fecha Factura</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Skeleton loading
                Array.from(new Array(rowsPerPage)).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton variant="rectangular" width={24} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={150} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell><Skeleton variant="circular" width={32} height={32} /></TableCell>
                  </TableRow>
                ))
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron documentos
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((document) => {
                  const isOverdue = isDocumentOverdue(document);
                  const timeInStatus = getTimeInStatus(document);

                  return (
                    <TableRow
                      key={document.id}
                      hover
                      sx={{
                        bgcolor: isOverdue ? 'rgba(190, 18, 60, 0.04)' : 'inherit',
                        '&:hover': {
                          bgcolor: isOverdue ? 'rgba(190, 18, 60, 0.08)' : undefined
                        }
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedDocuments.includes(document.id)}
                          onChange={() => toggleDocumentSelection(document.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {document.protocolNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {document.id.slice(0, 8)}...
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {document.clientName}
                          </Typography>
                          {document.clientPhone && (
                            <Typography variant="caption" color="text.secondary">
                              {document.clientPhone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={document.documentType}>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: '6px',
                              backgroundColor: actoBadges[document.documentType]?.bgColor || 'rgba(107, 114, 128, 0.1)',
                              color: actoBadges[document.documentType]?.color || '#6b7280',
                              fontWeight: 700,
                              fontSize: '0.6875rem',
                              cursor: 'default',
                              border: '1px solid',
                              borderColor: actoBadges[document.documentType]?.color 
                                ? `${actoBadges[document.documentType].color}30`
                                : 'rgba(107, 114, 128, 0.2)'
                            }}
                          >
                            {actoBadges[document.documentType]?.label || '?'}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={document.status}
                              size="small"
                              icon={getStatusIcon(document.status)}
                              sx={{
                                bgcolor: getStatusChipStyles(document.status).bgcolor,
                                color: getStatusChipStyles(document.status).color,
                                border: '1px solid',
                                borderColor: getStatusChipStyles(document.status).borderColor,
                                fontWeight: 500,
                                '& .MuiChip-icon': {
                                  color: 'inherit'
                                }
                              }}
                            />
                            {isOverdue && (
                              <Tooltip title="Documento vencido">
                                <WarningIcon sx={{ color: '#be123c' }} fontSize="small" />
                              </Tooltip>
                            )}
                          </Box>
                          {/* 💰 Indicador de estado de pago */}
                          <PaymentIndicator 
                            paymentStatus={document.paymentStatus} 
                            paymentInfo={document.paymentInfo} 
                            documentStatus={document.status}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {document.assignedTo ? (
                            <>
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {document.assignedTo.firstName} {document.assignedTo.lastName}
                              </Typography>
                            </>
                          ) : (
                            <Chip
                              label="Sin asignar"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimeIcon fontSize="small" sx={{ color: isOverdue ? '#be123c' : '#94a3b8' }} />
                          <Typography
                            variant="body2"
                            sx={{
                              color: isOverdue ? '#be123c' : 'text.secondary',
                              fontWeight: isOverdue ? 600 : 400,
                            }}
                          >
                            {timeInStatus}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(document.fechaFactura || document.createdAt).toLocaleDateString('es-ES')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Enviar mensaje al matrizador">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openMensajeModal(document)}
                                disabled={!document.assignedTo}
                              >
                                <ChatIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Ver timeline">
                            <IconButton
                              size="small"
                              onClick={() => showDocumentTimeline(document)}
                            >
                              <TimelineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar documento">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openDeleteDialog(document)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
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
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Card>

      {/* Modal de timeline */}
      <DocumentStatusTimeline
        open={showTimeline}
        onClose={() => setShowTimeline(false)}
        document={selectedDocumentForTimeline}
      />

      {/* Modal de operaciones en lote */}
      <BulkOperationsDialog
        open={showBulkOperations}
        onClose={() => setShowBulkOperations(false)}
        selectedDocuments={selectedDocuments}
        onOperationComplete={() => {
          setSelectedDocuments([]);
          loadDocuments();
        }}
      />

      {/* Diálogo de confirmación - Eliminar documento individual */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            <Typography variant="h6">Confirmar Eliminación</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            ¿Está seguro que desea eliminar el siguiente documento?
          </Typography>
          {documentToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Número de Protocolo:</strong> {documentToDelete.protocolNumber}
              </Typography>
              <Typography variant="body2">
                <strong>Cliente:</strong> {documentToDelete.clientName}
              </Typography>
              <Typography variant="body2">
                <strong>Tipo:</strong> {documentToDelete.documentType}
              </Typography>
              <Typography variant="body2">
                <strong>Estado:</strong> {documentToDelete.status}
              </Typography>
            </Box>
          )}
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>ADVERTENCIA:</strong> Esta acción es irreversible. El documento y todos sus eventos asociados serán eliminados permanentemente.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteDocument}
            disabled={deleting}
            startIcon={deleting ? <LinearProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación - Eliminar múltiples documentos */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => !deleting && setBulkDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            <Typography variant="h6">Confirmar Eliminación Masiva</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            ¿Está seguro que desea eliminar <strong>{selectedDocuments.length}</strong> documento(s) seleccionado(s)?
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>ADVERTENCIA:</strong> Esta acción es irreversible. Los documentos y todos sus eventos asociados serán eliminados permanentemente.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Se eliminarán {selectedDocuments.length} documento(s) del sistema.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBulkDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDelete}
            disabled={deleting}
            startIcon={deleting ? <LinearProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Eliminando...' : `Eliminar ${selectedDocuments.length} Documento(s)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de mensaje individual */}
      <EnviarMensajeModal
        open={mensajeModalOpen}
        onClose={() => {
          setMensajeModalOpen(false);
          setDocumentoParaMensaje(null);
        }}
        documento={documentoParaMensaje}
        onSuccess={() => {
          // Opcional: recargar documentos o mostrar feedback adicional
        }}
      />

      {/* Modal de mensaje masivo */}
      <EnviarMensajeMasivoModal
        open={mensajeMasivoModalOpen}
        onClose={() => setMensajeMasivoModalOpen(false)}
        documentos={getSelectedDocumentos()}
        onSuccess={() => {
          setSelectedDocuments([]);
        }}
      />
    </Box >
  );
};

export default DocumentOversight;