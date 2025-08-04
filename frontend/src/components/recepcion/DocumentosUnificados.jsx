import React, { useState, useEffect, useCallback } from 'react';
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
  TablePagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  Phone as PhoneIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import ModalEntrega from './ModalEntrega';
import ModalEntregaGrupal from './ModalEntregaGrupal';
import receptionService from '../../services/reception-service';

const StatusIndicator = ({ status }) => {
  const statusConfig = {
    EN_PROCESO: { label: 'En Proceso', color: 'info.main' },
    LISTO: { label: 'Listo', color: 'success.main' },
    ENTREGADO: { label: 'Entregado', color: 'grey.500' },
    PENDIENTE: { label: 'Pendiente', color: 'warning.main' },
  };
  const config = statusConfig[status] || { label: status, color: 'grey.500' };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: config.color, mr: 1 }} />
      <Typography variant="body2" color="text.secondary">{config.label}</Typography>
    </Box>
  );
};

const getInitials = (name) => {
    if (!name) return '?';
    const names = name.trim().split(' ').filter(n => n.length > 0);
    if (names.length === 0) return '?';
    const firstInitial = names[0][0];
    let secondInitial;
    if (names.length >= 3) {
        secondInitial = names[2][0];
    } else if (names.length === 2) {
        secondInitial = names[1][0];
    }
    if (secondInitial) {
        return `${firstInitial}${secondInitial}`.toUpperCase();
    }
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    } else if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return '?';
};

function formatLocalDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function DocumentosUnificados({ onEstadisticasChange }) {
  const [documentos, setDocumentos] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matrizadores, setMatrizadores] = useState([]);
  
  const [filters, setFilters] = useState({
    search: '',
    matrizador: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [showModalEntrega, setShowModalEntrega] = useState(false);
  const [showEntregaGrupal, setShowEntregaGrupal] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentDocumento, setCurrentDocumento] = useState(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState('');
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const cargarDocumentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.matrizador && { matrizador: filters.matrizador }),
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.fechaDesde && { fechaDesde: filters.fechaDesde }),
        ...(filters.fechaHasta && { fechaHasta: filters.fechaHasta }),
      };
      const result = await receptionService.getTodosDocumentos(params);
      if (result.success) {
        setDocumentos(result.data.documents || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setError(null);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error cargando documentos');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  useEffect(() => {
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
    cargarMatrizadores();
  }, []);
  
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    handleFilterChange('search', '');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFilterChange('search', searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectDocument = (documentId) => {
    setSelectedDocuments(prev => prev.includes(documentId) ? prev.filter(id => id !== documentId) : [...prev, documentId]);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const selectableDocuments = documentos.filter(doc => doc.status !== 'ENTREGADO').map(doc => doc.id);
      setSelectedDocuments(selectableDocuments);
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleMenuOpen = (event, documento) => {
    setMenuAnchorEl(event.currentTarget);
    setCurrentDocumento(documento);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setCurrentDocumento(null);
  };

  const abrirConfirmacionIndividual = (documento) => {
    setCurrentDocumento(documento);
    setActionType('individual');
    setShowConfirmDialog(true);
    handleMenuClose();
  };

  const abrirConfirmacionGrupal = () => {
    setActionType('grupal');
    setShowConfirmDialog(true);
  };

  const cerrarConfirmacion = () => {
    setShowConfirmDialog(false);
    setCurrentDocumento(null);
    setActionType('');
  };

  const ejecutarMarcarListo = async () => {
    try {
      let result;
      if (actionType === 'individual' && currentDocumento) {
        result = await receptionService.marcarComoListo(currentDocumento.id);
      } else if (actionType === 'grupal' && selectedDocuments.length > 0) {
        result = await receptionService.marcarGrupoListo(selectedDocuments);
      }

      if (result?.success) {
        setSnackbar({ open: true, message: result.message, severity: 'success' });
        await cargarDocumentos();
        onEstadisticasChange?.();
        setSelectedDocuments([]);
      } else {
        throw new Error(result?.error || 'Error inesperado');
      }
    } catch (error) {
      console.error('Error marcando como listo:', error);
      setSnackbar({ open: true, message: error.message || 'Error al marcar documento(s) como listo(s)', severity: 'error' });
    } finally {
      cerrarConfirmacion();
    }
  };

  const abrirModalEntrega = (documento) => {
    setDocumentoSeleccionado(documento);
    setShowModalEntrega(true);
    handleMenuClose();
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

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const cerrarSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const documentosSeleccionadosMismoCliente = () => {
    if (selectedDocuments.length <= 1) return true;
    const docs = documentos.filter(doc => selectedDocuments.includes(doc.id));
    return new Set(docs.map(doc => doc.clientName)).size === 1;
  };

  const getSelectedDocumentsAction = () => {
    const docs = documentos.filter(doc => selectedDocuments.includes(doc.id));
    const enProceso = docs.filter(doc => doc.status === 'EN_PROCESO');
    const listos = docs.filter(doc => doc.status === 'LISTO');
    const disabled = !documentosSeleccionadosMismoCliente();

    if (enProceso.length > 0 && listos.length === 0) {
      return { action: 'marcar-listo', text: `Marcar ${enProceso.length} como Listo`, color: 'success', disabled };
    }
    if (listos.length > 0 && enProceso.length === 0) {
      return { action: 'entregar', text: `Entregar ${listos.length} docs`, color: 'primary', disabled };
    }
    return { action: 'mixto', text: 'Estados mixtos', color: 'warning', disabled: true };
  };

  if (loading && !documentos.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress /> <Typography sx={{ ml: 2 }}>Cargando documentos...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" action={<Button color="inherit" size="small" onClick={cargarDocumentos}>Reintentar</Button>}>{error}</Alert>;
  }

  const selectedAction = getSelectedDocumentsAction();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>📋 Gestión de Documentos</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Vista unificada para marcar, entregar y consultar documentos.</Typography>
        
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              {/* Fila 1 */}
              <Grid item xs={12} sm={6} md={8}>
                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder="Buscar por cliente, teléfono, protocolo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'action.active' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <Tooltip title="Limpiar búsqueda">
                          <IconButton
                            aria-label="limpiar búsqueda"
                            onClick={handleClearSearch}
                            edge="end"
                            size="small"
                          >
                            <ClearIcon />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                 <FormControl fullWidth size="small">
                   <Select
                     value={filters.matrizador}
                     onChange={(e) => handleFilterChange('matrizador', e.target.value)}
                     displayEmpty
                     renderValue={(selected) => {
                       if (!selected) {
                         return <em style={{ color: '#999' }}>Todos los matrizadores</em>;
                       }
                       const matrizador = matrizadores.find(mat => mat.id === selected);
                       return matrizador ? (matrizador.nombre || `${matrizador.firstName} ${matrizador.lastName}`) : selected;
                     }}
                   >
                     <MenuItem value="">Todos los matrizadores</MenuItem>
                     {matrizadores.map(mat => <MenuItem key={mat.id} value={mat.id}>{mat.nombre || `${mat.firstName} ${mat.lastName}`}</MenuItem>)}
                   </Select>
                 </FormControl>
              </Grid>

              {/* Fila 2 */}
              <Grid item xs={12} sm={6} md={3}>
                 <FormControl fullWidth size="small">
                   <Select
                     value={filters.estado}
                     onChange={(e) => handleFilterChange('estado', e.target.value)}
                     displayEmpty
                     renderValue={(selected) => {
                       if (!selected) {
                         return <em style={{ color: '#999' }}>Todos los estados</em>;
                       }
                       const estadoLabels = {
                         'EN_PROCESO': 'En Proceso',
                         'LISTO': 'Listo',
                         'ENTREGADO': 'Entregado'
                       };
                       return estadoLabels[selected] || selected;
                     }}
                   >
                     <MenuItem value="">Todos los estados</MenuItem>
                     <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
                     <MenuItem value="LISTO">Listo</MenuItem>
                     <MenuItem value="ENTREGADO">Entregado</MenuItem>
                   </Select>
                 </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" type="date" label="Desde"
                      value={filters.fechaDesde}
                      onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                  />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" type="date" label="Hasta"
                      value={filters.fechaHasta}
                      onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                  />
              </Grid>
              <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Tooltip title="Refrescar">
                  <IconButton onClick={() => cargarDocumentos()} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>

            {selectedDocuments.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained" color={selectedAction.color} disabled={selectedAction.disabled}
                        startIcon={selectedAction.action === 'marcar-listo' ? <CheckCircleIcon /> : <SendIcon />}
                        onClick={() => {
                            if (selectedAction.action === 'marcar-listo') abrirConfirmacionGrupal();
                            else if (selectedAction.action === 'entregar') setShowEntregaGrupal(true);
                        }}
                    >{selectedAction.text} ({selectedDocuments.length})</Button>
                </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedDocuments.length > 0 && selectedDocuments.length < documentos.filter(d => d.status !== 'ENTREGADO').length}
                    checked={documentos.length > 0 && selectedDocuments.length === documentos.filter(d => d.status !== 'ENTREGADO').length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Cliente / Documento</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Matrizador</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Fecha Creación</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Código Retiro</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 2 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No se encontraron documentos.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                documentos.map((documento) => (
                  <TableRow key={documento.id} selected={selectedDocuments.includes(documento.id)} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedDocuments.includes(documento.id)}
                        onChange={() => handleSelectDocument(documento.id)}
                        disabled={documento.status === 'ENTREGADO'}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{documento.clientName}</Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                          Doc: {documento.protocolNumber} | {documento.documentType}
                        </Typography>
                        {documento.clientPhone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                             <PhoneIcon sx={{ fontSize: '0.8rem', color: 'text.secondary', mr: 0.5 }} />
                             <Typography variant="caption" color="text.secondary">{documento.clientPhone}</Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={documento.matrizador}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'primary.light' }}>
                            {getInitials(documento.matrizador)}
                        </Avatar>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatLocalDate(documento.fechaCreacion)}
                      </Typography>
                    </TableCell>
                    <TableCell><StatusIndicator status={documento.status} /></TableCell>
                    <TableCell>
                      {documento.codigoRetiro ? (
                        <Chip label={documento.codigoRetiro} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton aria-label="actions" onClick={(event) => handleMenuOpen(event, documento)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={totalPages * rowsPerPage} page={page} onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Filas:"
        />
      </Card>
      
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        {currentDocumento?.status === 'EN_PROCESO' && (
          <MenuItem onClick={() => abrirConfirmacionIndividual(currentDocumento)}>
            <ListItemIcon><CheckCircleIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Marcar Listo</ListItemText>
          </MenuItem>
        )}
        {currentDocumento?.status === 'LISTO' && (
          <MenuItem onClick={() => abrirModalEntrega(currentDocumento)}>
            <ListItemIcon><SendIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>Entregar</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ver Detalles</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={showConfirmDialog} onClose={cerrarConfirmacion} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType === 'individual' ? '🎯 Marcar Documento como Listo' : '👥 Marcar Grupo como Listo'}</DialogTitle>
        <DialogContent>
          {actionType === 'individual' && currentDocumento && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>¿Está seguro que desea marcar este documento como LISTO?</Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Cliente:</strong> {currentDocumento.clientName}</Typography>
                <Typography variant="body2"><strong>Documento:</strong> {currentDocumento.protocolNumber}</Typography>
                <Typography variant="body2"><strong>Tipo:</strong> {currentDocumento.documentType}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Se generará un código de 4 dígitos para el retiro.</Typography>
            </Box>
          )}
          {actionType === 'grupal' && selectedDocuments.length > 0 && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>¿Está seguro de marcar estos {selectedDocuments.length} documentos como LISTOS?</Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Documentos:</strong> {selectedDocuments.length}</Typography>
                <Typography variant="body2"><strong>Cliente:</strong> {documentos.find(d => selectedDocuments.includes(d.id))?.clientName}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Se generará un código único para el grupo.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarConfirmacion}>Cancelar</Button>
          <Button onClick={ejecutarMarcarListo} variant="contained" color="success" startIcon={<CheckCircleIcon />}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {showModalEntrega && documentoSeleccionado && <ModalEntrega documento={documentoSeleccionado} onClose={cerrarModales} onEntregaExitosa={onEntregaCompletada} />}
      {showEntregaGrupal && selectedDocuments.length > 0 && <ModalEntregaGrupal documentos={documentos.filter(doc => selectedDocuments.includes(doc.id))} onClose={cerrarModales} onEntregaExitosa={onEntregaCompletada} />}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={cerrarSnackbar}>
        <Alert onClose={cerrarSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default DocumentosUnificados;