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
import ModalEntregaGrupal from './ModalEntregaGrupal';
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  // Orden
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Estados para modales
  const [showModalEntrega, setShowModalEntrega] = useState(false);
  const [showEntregaGrupal, setShowEntregaGrupal] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);

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
      console.error('Error:', error);
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
      console.error('Error cargando matrizadores:', error);
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
    setShowEntregaGrupal(false);
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
  }, [documentos, sortBy, sortOrder]);

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
                  <Button
                    variant="outlined"
                    onClick={toggleSortOrder}
                    title="Ordenar por fecha"
                    sx={{ textTransform: 'none' }}
                  >
                    {sortOrder === 'asc' ? 'Fecha ↑' : 'Fecha ↓'}
                  </Button>
                  {/* Solo mostrar botón de entrega grupal en pestaña "Listos" */}
                  {currentTab === 0 && (
                    <Button
                      variant={showEntregaGrupal ? "contained" : "outlined"}
                      color={showEntregaGrupal ? "success" : "primary"}
                      onClick={() => setShowEntregaGrupal(!showEntregaGrupal)}
                      startIcon={<GroupsIcon />}
                      disabled={selectedDocuments.length === 0}
                    >
                      Entrega Grupal ({selectedDocuments.length})
                    </Button>
                  )}
                  
                  {/* Información de consulta en pestaña "Todos" */}
                  {currentTab === 1 && (
                    <Chip 
                      icon={<InfoIcon />}
                      label="Solo consulta - Sin entregas"
                      color="info"
                      variant="outlined"
                    />
                  )}
                  
                  <Tooltip title="Refrescar">
                    <IconButton onClick={cargarDocumentos} color="primary">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Tabla de documentos */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {/* Checkbox solo en pestaña "Listos" */}
                {currentTab === 0 && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedDocuments.length > 0 && selectedDocuments.length < documentos.length}
                      checked={documentos.length > 0 && selectedDocuments.length === documentos.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortBy === 'clientName'}
                    direction={sortBy === 'clientName' ? sortOrder : 'asc'}
                    onClick={() => setSortField('clientName')}
                  >
                    Cliente
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortBy === 'protocolNumber'}
                    direction={sortBy === 'protocolNumber' ? sortOrder : 'asc'}
                    onClick={() => setSortField('protocolNumber')}
                  >
                    Documento
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Matrizador</TableCell>
                {/* Fecha en ambas pestañas */}
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={['createdAt','fechaCreacion','created_at'].includes(sortBy)}
                    direction={['createdAt','fechaCreacion','created_at'].includes(sortBy) ? sortOrder : 'asc'}
                    onClick={() => {
                      const candidate = documentos[0]?.createdAt ? 'createdAt' : (documentos[0]?.fechaCreacion ? 'fechaCreacion' : 'createdAt');
                      setSortBy(candidate);
                      toggleSortOrder();
                    }}
                  >
                    Fecha
                  </TableSortLabel>
                </TableCell>
                {/* Estado solo en pestaña "Todos" */}
                {currentTab === 1 && (
                  <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                )}
                {/* Código solo en pestaña "Listos" */}
                {currentTab === 0 && (
                  <>
                    <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Grupo</TableCell>
                  </>
                )}
                {/* Acciones solo en pestaña "Listos" */}
                {currentTab === 0 && (
                  <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {documentosOrdenados.map((documento) => (
                <TableRow 
                  key={documento.id}
                  selected={currentTab === 0 && selectedDocuments.includes(documento.id)}
                  hover
                >
                  {/* Checkbox solo en pestaña "Listos" */}
                  {currentTab === 0 && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedDocuments.includes(documento.id)}
                        onChange={() => handleSelectDocument(documento.id)}
                        disabled={!isDocumentoListo(documento)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {documento.clientName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="primary">
                      {documento.protocolNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={documento.documentType} 
                      size="small" 
                      color="info"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {documento.clientPhone}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {documento.matrizador}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(documento.createdAt || documento.fechaCreacion).toLocaleDateString('es-EC', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                      })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(documento.createdAt || documento.fechaCreacion).toLocaleTimeString('es-EC', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </Typography>
                  </TableCell>
                  
                  {/* Estado solo en pestaña "Todos" */}
                  {currentTab === 1 && (
                    <TableCell>
                      <Chip 
                        label={documento.status || 'PENDIENTE'} 
                        size="small" 
                        color={getEstadoColor(documento.status)}
                      />
                    </TableCell>
                  )}
                  
                  {/* Código y grupo solo en pestaña "Listos" */}
                  {currentTab === 0 && (
                    <>
                      <TableCell>
                        <Chip 
                          label={documento.codigoRetiro || 'N/A'} 
                          size="small" 
                          color="success"
                          sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={documento.isGrouped ? 'Grupo' : 'Individual'} 
                          size="small" 
                          color={documento.isGrouped ? 'secondary' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                    </>
                  )}
                  
                  {/* Acciones solo en pestaña "Listos" */}
                  {currentTab === 0 && (
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<SendIcon />}
                        onClick={() => abrirModalEntrega(documento)}
                        sx={{ minWidth: 100 }}
                        disabled={!isDocumentoListo(documento)}
                      >
                        Entregar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Paginación */}
        <TablePagination
          component="div"
          count={totalPages * rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Card>

      {/* Modales */}
      {showModalEntrega && documentoSeleccionado && (
        <ModalEntrega
          documento={documentoSeleccionado}
          onClose={cerrarModales}
          onEntregaExitosa={onEntregaCompletada}
        />
      )}

      {showEntregaGrupal && selectedDocuments.length > 0 && (
        <ModalEntregaGrupal
          documentos={documentos.filter(doc => selectedDocuments.includes(doc.id))}
          onClose={cerrarModales}
          onEntregaExitosa={onEntregaCompletada}
        />
      )}
    </Box>
  );
}

export default DocumentosListos;