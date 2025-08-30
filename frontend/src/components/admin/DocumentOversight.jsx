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
  Clear as ClearIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useDebounce } from '../../hooks/useDebounce';
import useAuthStore from '../../store/auth-store';
import DocumentStatusTimeline from './DocumentStatusTimeline';
import BulkOperationsDialog from './BulkOperationsDialog';

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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [matrizadorFilter, setMatrizadorFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Estados de UI
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedDocumentForTimeline, setSelectedDocumentForTimeline] = useState(null);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [matrizadores, setMatrizadores] = useState([]);

  // Debounce para búsqueda
  const debouncedSearch = useDebounce(search, 500);

  // Configuración de umbrales para documentos vencidos (en días)
  const OVERDUE_THRESHOLDS = {
    PENDIENTE: 2,    // Pendiente más de 2 días
    EN_PROCESO: 5,   // En proceso más de 5 días
    LISTO: 7         // Listo más de 7 días sin entregar
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
      console.error('Error cargando documentos:', error);
      setError(error.message || 'Error al cargar los documentos');
      toast.error('Error al cargar los documentos');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, statusFilter, typeFilter, matrizadorFilter, overdueOnly, sortBy, sortOrder, token]);

  /**
   * Cargar lista de matrizadores para filtro
   */
  const loadMatrizadores = useCallback(async () => {
    try {
      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/admin/users?role=MATRIZADOR&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMatrizadores(data.data.users);
        }
      }
    } catch (error) {
      console.error('Error cargando matrizadores:', error);
    }
  }, [token]);

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
    setTypeFilter('');
    setMatrizadorFilter('');
    setOverdueOnly(false);
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
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    const colors = {
      PENDIENTE: '#f59e0b',
      EN_PROCESO: '#3b82f6', 
      LISTO: '#22c55e',
      ENTREGADO: '#6b7280'
    };
    return colors[status] || '#6b7280';
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
      console.error('Error exportando:', error);
      toast.error('Error al exportar documentos');
    }
  };

  /**
   * Renderizar estadísticas
   */
  const renderStats = () => {
    if (!stats) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Documentos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" color="warning.main">
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pendientes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" color="info.main">
                {stats.inProgress}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                En Proceso
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" color="error.main">
                {stats.overdue}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vencidos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
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
                      {matrizador.firstName} {matrizador.lastName}
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
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
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

      {/* Operaciones en lote */}
      {selectedDocuments.length > 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              onClick={() => setShowBulkOperations(true)}
            >
              Acciones en Lote
            </Button>
          }
        >
          {selectedDocuments.length} documento(s) seleccionado(s)
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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
                <TableCell>Creado</TableCell>
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
                        bgcolor: isOverdue ? 'error.light' : 'inherit',
                        opacity: isOverdue ? 0.9 : 1
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
                        <Chip
                          label={document.documentType}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={document.status}
                            size="small"
                            icon={getStatusIcon(document.status)}
                            sx={{
                              bgcolor: getStatusColor(document.status),
                              color: 'white'
                            }}
                          />
                          {isOverdue && (
                            <Tooltip title="Documento vencido">
                              <WarningIcon color="error" fontSize="small" />
                            </Tooltip>
                          )}
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
                          <TimeIcon fontSize="small" color="action" />
                          <Typography 
                            variant="body2"
                            color={isOverdue ? 'error.main' : 'inherit'}
                            fontWeight={isOverdue ? 'bold' : 'normal'}
                          >
                            {timeInStatus}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(document.createdAt).toLocaleDateString('es-ES')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver timeline">
                          <IconButton
                            size="small"
                            onClick={() => showDocumentTimeline(document)}
                          >
                            <TimelineIcon fontSize="small" />
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
    </Box>
  );
};

export default DocumentOversight;