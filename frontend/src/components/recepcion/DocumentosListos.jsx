import React, { useState, useEffect, useMemo } from 'react';
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
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Paper,
  TablePagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Grid,
  Tabs,
  Tab,
  TableSortLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  List as ListIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import ModalEntrega from './ModalEntrega';

import receptionService from '../../services/reception-service';

/**
 * Componente para mostrar y gestionar documentos listos para entrega
 */
function DocumentosListos({ onEstadisticasChange }) {
  const [documentos, setDocumentos] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matrizadores, setMatrizadores] = useState([]);
  const [currentTab, setCurrentTab] = useState(0); // 0: Listos, 1: Todos
  const [filters, setFilters] = useState({
    search: '',
    matrizador: '',
    estado: '' // Para filtrar por estado en la pestaña "Todos"
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  // Orden
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Estados para modales
  const [showModalEntrega, setShowModalEntrega] = useState(false);

  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);

  // Estado para modal de resultados de notificación
  const [notificationResult, setNotificationResult] = useState(null);
  const [showNotificationResult, setShowNotificationResult] = useState(false);

  const handleBulkNotify = async () => {
    if (selectedDocuments.length === 0) return;

    try {
      setLoading(true);
      const result = await receptionService.bulkNotify(selectedDocuments);

      if (result.success) {
        setNotificationResult(result.data);
        setShowNotificationResult(true);
        // Recargar documentos para actualizar estados/códigos
        cargarDocumentos();
        setSelectedDocuments([]);
        // Si solo hay un cliente notificado, intentar abrir WhatsApp automáticamente
        if (result.data.notificados.length === 1 && result.data.notificados[0].waUrl) {
          window.open(result.data.notificados[0].waUrl, '_blank');
        }
      } else {
        setError(result.error || 'Error al enviar notificaciones');
      }
    } catch (error) {
      setError('Error de conexión al notificar');
    } finally {
      setLoading(false);
    }
  };

  // Cargar documentos al montar el componente
  useEffect(() => {
    cargarDocumentos();
  }, [page, filters, currentTab]);

  // Cargar matrizadores para filtros
  useEffect(() => {
    cargarMatrizadores();
  }, []);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);

      const params = {
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.matrizador && { matrizador: filters.matrizador }),
        ...(filters.estado && { estado: filters.estado }),
        // Si el backend soporta orden, lo enviamos; si no, ordenaremos en memoria
        sortBy: sortBy,
        sortOrder: sortOrder
      };

      // Usar diferentes endpoints según la pestaña
      const result = currentTab === 0
        ? await receptionService.getDocumentosListos(params)
        : await receptionService.getTodosDocumentos(params);

      if (result.success) {
        const docs = result.data.documents || [];
        setDocumentos(docs);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setError(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError(currentTab === 0 ? 'Error cargando documentos listos' : 'Error cargando documentos');
    } finally {
      setLoading(false);
    }
  };

  const cargarMatrizadores = async () => {
    try {
      const result = await receptionService.getMatrizadores();

      if (result.success) {
        setMatrizadores(result.data.matrizadores || []);
      }
    } catch (error) {
    }
  };

  const handleBusqueda = (valor) => {
    setFilters(prev => ({ ...prev, search: valor }));
    setPage(0);
  };

  const handleSelectDocument = (documentId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedDocuments(documentos.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const abrirModalEntrega = (documento) => {
    setDocumentoSeleccionado(documento);
    setShowModalEntrega(true);
  };

  const cerrarModales = () => {
    setShowModalEntrega(false);

    setDocumentoSeleccionado(null);
  };

  const onEntregaCompletada = () => {
    cargarDocumentos();
    onEstadisticasChange?.();
    setSelectedDocuments([]);
    cerrarModales();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Alternar orden por fecha
  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // Cambiar campo de orden
  const setSortField = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Documentos ordenados en memoria por createdAt/fechaCreacion
  const documentosOrdenados = useMemo(() => {
    const keyCandidates = ['createdAt', 'fechaCreacion', 'created_at'];
    const defaultKey = documentos[0]?.createdAt ? 'createdAt' : (documentos[0]?.fechaCreacion ? 'fechaCreacion' : 'createdAt');
    const field = sortBy || defaultKey;
    const sorted = [...documentos].sort((a, b) => {
      // En la pestaña "Todos", primero ordenar por estado (ENTREGADO al final)
      if (currentTab === 1) {
        const aIsEntregado = a.status === 'ENTREGADO';
        const bIsEntregado = b.status === 'ENTREGADO';

        // Si uno es ENTREGADO y el otro no, el ENTREGADO va al final
        if (aIsEntregado && !bIsEntregado) return 1;
        if (!aIsEntregado && bIsEntregado) return -1;
      }

      // Ordenar por el campo seleccionado
      let aVal = a[field] ?? a[defaultKey] ?? a.createdAt ?? a.fechaCreacion;
      let bVal = b[field] ?? b[defaultKey] ?? b.createdAt ?? b.fechaCreacion;
      if (keyCandidates.includes(field)) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return sorted;
  }, [documentos, sortBy, sortOrder, currentTab]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setPage(0);
    setSelectedDocuments([]);
    // Limpiar filtro de estado al cambiar a "Listos"
    if (newValue === 0) {
      setFilters(prev => ({ ...prev, estado: '' }));
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'warning';
      case 'EN_PROCESO':
        return 'info';
      case 'LISTO':
        return 'success';
      case 'ENTREGADO':
        return 'default';
      default:
        return 'default';
    }
  };

  const isDocumentoListo = (documento) => {
    return documento.status === 'LISTO';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando documentos...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={cargarDocumentos}>
            Reintentar
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>
          Gestión de Documentos
        </Typography>

        {/* Pestañas */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab
              icon={<CheckCircleIcon />}
              label="Documentos Listos"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 'medium' }}
            />
            <Tab
              icon={<ListIcon />}
              label="Todos los Documentos"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 'medium' }}
            />
          </Tabs>
        </Box>

        {/* Filtros y búsqueda */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              {/* Búsqueda */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Buscar por cliente, teléfono o protocolo..."
                  value={filters.search}
                  onChange={(e) => handleBusqueda(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                  }}
                />
              </Grid>

              {/* Filtro por matrizador */}
              <Grid item xs={12} md={currentTab === 1 ? 2.5 : 3}>
                <FormControl fullWidth>
                  <InputLabel>Matrizador</InputLabel>
                  <Select
                    value={filters.matrizador}
                    onChange={(e) => setFilters(prev => ({ ...prev, matrizador: e.target.value }))}
                    label="Matrizador"
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

              {/* Filtro por estado - Solo en pestaña "Todos" */}
              {currentTab === 1 && (
                <Grid item xs={12} md={2.5}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                      Estado
                    </Typography>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={filters.estado || ''}
                      onChange={(e, value) => setFilters(prev => ({ ...prev, estado: value || '' }))}
                      fullWidth
                      sx={{
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderRadius: 1,
                        p: 0.25,
                        '& .MuiToggleButton-root': {
                          border: 0,
                          textTransform: 'none',
                          px: 1.5,
                          height: 32,
                        }
                      }}
                    >
                      <ToggleButton value="">Todos</ToggleButton>
                      <ToggleButton value="EN_PROCESO" sx={{ '&.Mui-selected': { bgcolor: 'info.main', color: 'common.white' }, '&.Mui-selected:hover': { bgcolor: 'info.dark' } }}>En Proceso</ToggleButton>
                      <ToggleButton value="LISTO" sx={{ '&.Mui-selected': { bgcolor: 'success.main', color: 'common.white' }, '&.Mui-selected:hover': { bgcolor: 'success.dark' } }}>Listo</ToggleButton>
                      <ToggleButton value="ENTREGADO" sx={{ '&.Mui-selected': { bgcolor: (t) => t.palette.mode === 'dark' ? t.palette.grey[700] : t.palette.grey[300], color: 'text.primary' }, '&.Mui-selected:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? t.palette.grey[600] : t.palette.grey[400] } }}>Entregado</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Grid>
              )}

              {/* Botones de acción */}
              <Grid item xs={12} md={currentTab === 1 ? 2 : 5}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  {/* Botón de Notificación WhatsApp - Solo en Tab 0 */}
                  {currentTab === 0 && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleBulkNotify}
                      startIcon={<Box component="span">📱</Box>}
                      disabled={selectedDocuments.length === 0}
                      title="Generar códigos y notificar por WhatsApp"
                    >
                      Notificar ({selectedDocuments.length})
                    </Button>
                  )}

                  <Button
                    variant="outlined"
                    onClick={toggleSortOrder}
                    title="Ordenar por fecha"
                    sx={{ textTransform: 'none' }}
                  >
                    {sortOrder === 'asc' ? 'Fecha ↑' : 'Fecha ↓'}
                  </Button>


                  {/* ... (rest of buttons) */}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* ... (Table) */}

      {/* Modales */}
      {showModalEntrega && documentoSeleccionado && (
        <ModalEntrega
          documento={documentoSeleccionado}
          onClose={cerrarModales}
          onEntregaExitosa={onEntregaCompletada}
        />
      )}



      {/* Modal de Resultados de Notificación */}
      {showNotificationResult && notificationResult && (
        <Dialog
          open={showNotificationResult}
          onClose={() => setShowNotificationResult(false)}
          maxWidth="sm"
          fullWidth
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              📱 Resultado de Notificación
            </Typography>

            {notificationResult.notificados.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  ✅ Notificados con Código ({notificationResult.notificados.length})
                </Typography>
                {notificationResult.notificados.map((item, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 1, p: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{item.clientName}</Typography>
                        <Typography variant="caption">Código: <strong>{item.codigoRetiro}</strong></Typography>
                        <Typography variant="caption" display="block">{item.documentCount} documento(s)</Typography>
                      </Box>
                      {item.waUrl && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          href={item.waUrl}
                          target="_blank"
                          startIcon={<SendIcon />}
                        >
                          Abrir WhatsApp
                        </Button>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Box>
            )}

            {notificationResult.sinTelefono.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  ⚠️ Sin Teléfono - Código Interno ({notificationResult.sinTelefono.length})
                </Typography>
                {notificationResult.sinTelefono.map((item, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 1, p: 1, bgcolor: 'warning.light' }}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{item.clientName}</Typography>
                      <Typography variant="caption">Código Interno: <strong>{item.codigoRetiro}</strong></Typography>
                      <Typography variant="caption" display="block">Debe entregar código manualmente</Typography>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}

            <Button fullWidth onClick={() => setShowNotificationResult(false)} variant="outlined">
              Cerrar
            </Button>
          </Box>
        </Dialog>
      )}

    </Box>
  );
}

export default DocumentosListos;