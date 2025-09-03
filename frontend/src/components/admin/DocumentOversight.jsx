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
  Cancel as CancelIcon,
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
import DocumentDetailModal from '../Documents/DocumentDetailModal';
import documentService from '../../services/document-service';
import { History as HistoryIcon } from '@mui/icons-material';

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
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedDocumentForTimeline, setSelectedDocumentForTimeline] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDocumentForDetail, setSelectedDocumentForDetail] = useState(null);
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
   * Cargar lista de responsables (MATRIZADOR y ARCHIVO) para el filtro
   */
  const loadMatrizadores = useCallback(async () => {
    try {
      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

      // Solicitudes en paralelo para ambos roles
      const [respMatrizadores, respArchivo] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users?role=MATRIZADOR&status=true&limit=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/admin/users?role=ARCHIVO&status=true&limit=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const users = [];

      // Helper para extraer arreglo de usuarios soportando ambas formas de respuesta:
      // 1) { success, data: [ ...usuarios ] }
      // 2) { success, data: { users: [ ...usuarios ] } }
      const extractUsers = (payload) => {
        if (!payload?.success) return [];
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.data?.users)) return payload.data.users;
        return [];
      };

      if (respMatrizadores.ok) {
        const data = await respMatrizadores.json();
        users.push(...extractUsers(data));
      }

      if (respArchivo.ok) {
        const data = await respArchivo.json();
        users.push(...extractUsers(data));
      }

      // De-duplicar por id y ordenar por nombre
      const uniqueById = Object.values(
        users.reduce((acc, u) => {
          acc[u.id] = u; return acc;
        }, {})
      ).sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es')); 

      setMatrizadores(uniqueById);
    } catch (error) {
      console.error('Error cargando responsables (Matrizadores/Archivo):', error);
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

  // Sin selección múltiple: checkboxes y acciones en lote eliminados

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    const colors = {
      PENDIENTE: '#f59e0b',
      EN_PROCESO: '#3b82f6', 
      LISTO: '#22c55e',
      ENTREGADO: '#6b7280',
      ANULADO_NOTA_CREDITO: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  /**
   * Obtener rol del usuario asignado (desde API o lista local)
   */
  const getAssignedRole = (doc) => {
    const roleFromDoc = doc?.assignedTo?.role;
    if (roleFromDoc) return roleFromDoc;
    if (!doc?.assignedTo?.id) return null;
    const match = matrizadores.find(u => u.id === doc.assignedTo.id);
    return match?.role || null;
  };

  /**
   * Color del chip por rol
   */
  const getRoleChipColor = (role) => {
    switch (role) {
      case 'MATRIZADOR':
        return 'info';
      case 'ARCHIVO':
        return 'secondary';
      default:
        return 'default';
    }
  };

  /**
   * Obtener icono del estado
   */
  const getStatusIcon = (status) => {
    const icons = {
      PENDIENTE: <PendingIcon />,
      EN_PROCESO: <InProgressIcon />,
      LISTO: <CompletedIcon />,
      ENTREGADO: <DeliveredIcon />,
      ANULADO_NOTA_CREDITO: <CancelIcon />
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
   * Mostrar detalle del documento
   */
  const showDocumentDetail = (document) => {
    setSelectedDocumentForDetail(document);
    setShowDetailModal(true);
  };

  const handleApplyCreditNote = async (doc) => {
    const reason = prompt('Motivo de la Nota de Crédito (obligatorio):');
    if (!reason || !reason.trim()) return;
    const res = await documentService.applyCreditNote(doc.id, reason.trim());
    if (res.success) {
      toast.success(res.message || 'Nota de Crédito aplicada');
      loadDocuments();
    } else {
      toast.error(res.message || 'No se pudo aplicar Nota de Crédito');
    }
  };

  const handleRevertCreditNote = async (doc) => {
    const reason = prompt('Motivo de la reversión (obligatorio):');
    if (!reason || !reason.trim()) return;
    const res = await documentService.revertCreditNote(doc.id, reason.trim());
    if (res.success) {
      toast.success(res.message || 'Nota de Crédito revertida');
      loadDocuments();
    } else {
      toast.error(res.message || 'No se pudo revertir la Nota de Crédito');
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
                  <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                  <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
                  <MenuItem value="LISTO">Listo</MenuItem>
                  <MenuItem value="ENTREGADO">Entregado</MenuItem>
                  <MenuItem value="ANULADO_NOTA_CREDITO">Anulado (Nota de Crédito)</MenuItem>
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
                    <em>Todos (Matrizadores y Archivo)</em>
                  </MenuItem>
                  <MenuItem value="unassigned">
                    <em>Sin asignar</em>
                  </MenuItem>
                  {matrizadores?.map((matrizador) => (
                    <MenuItem key={matrizador.id} value={matrizador.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {matrizador.firstName} {matrizador.lastName}
                        </Typography>
                        {matrizador.role && (
                          <Chip 
                            label={matrizador.role}
                            size="small"
                            color={getRoleChipColor(matrizador.role)}
                            variant="outlined"
                          />
                        )}
                      </Box>
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
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
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
                      <TableCell onClick={() => showDocumentDetail(document)} sx={{ cursor: 'pointer' }}>
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
                          <Typography 
                            variant="body2"
                            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => { setSearch(document.clientName || ''); setPage(0); }}
                          >
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          {document.assignedTo ? (
                            <>
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {document.assignedTo.firstName} {document.assignedTo.lastName}
                              </Typography>
                              {(() => {
                                const role = getAssignedRole(document);
                                return role ? (
                                  <Chip 
                                    label={role}
                                    size="small"
                                    color={getRoleChipColor(role)}
                                    variant="outlined"
                                  />
                                ) : null;
                              })()}
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
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => showDocumentDetail(document)}
                          sx={{ ml: 1 }}
                        >
                          Ver Detalle
                        </Button>
                        {['ADMIN','CAJA'].includes(currentUser?.role) && (
                          document.status !== 'ANULADO_NOTA_CREDITO' ? (
                            <Tooltip title="Aplicar Nota de Crédito">
                              <IconButton size="small" onClick={() => handleApplyCreditNote(document)}>
                                <CancelIcon fontSize="small" color="error" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Revertir Nota de Crédito">
                              <IconButton size="small" onClick={() => handleRevertCreditNote(document)}>
                                <HistoryIcon fontSize="small" color="error" />
                              </IconButton>
                            </Tooltip>
                          )
                        )}
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

      {/* Modal de detalle de documento */}
      <DocumentDetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        document={selectedDocumentForDetail}
        onDocumentUpdated={() => {
          loadDocuments();
        }}
      />
    </Box>
  );
};

export default DocumentOversight;
