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
  Clear as ClearIcon,
  GroupWork as GroupWorkIcon
} from '@mui/icons-material';
import ModalEntrega from './ModalEntrega';
import ModalEntregaGrupal from './ModalEntregaGrupal';
import QuickGroupingModal from '../grouping/QuickGroupingModal';
import GroupInfoModal from '../shared/GroupInfoModal';
import DocumentDetailModal from '../Documents/DocumentDetailModal';
import receptionService from '../../services/reception-service';
import documentService from '../../services/document-service';
import useDocumentStore from '../../store/document-store';

const StatusIndicator = ({ status }) => {
  const statusConfig = {
    EN_PROCESO: { label: '⚙️ En Proceso', color: '#1976d2' },
    LISTO: { label: '✅ Listo', color: '#2e7d32' },
    ENTREGADO: { label: '📦 Entregado', color: '#616161' },
    PENDIENTE: { label: '⏳ Pendiente', color: '#f57c00' },
  };
  const config = statusConfig[status] || { label: `📎 ${status}`, color: '#616161' };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: config.color, mr: 1 }} />
      <Typography 
        variant="body2" 
        sx={{ 
          fontWeight: 500,
          color: (theme) => theme.palette.mode === 'dark' ? '#e2e8f0' : '#374151'
        }}
      >
        {config.label}
      </Typography>
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
  const { createDocumentGroup, detectGroupableDocuments } = useDocumentStore();
  const [documentos, setDocumentos] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]); // Solo para visualización
  const [visualSelection, setVisualSelection] = useState(new Set()); // 🎯 NUEVA: Selección visual sin funcionalidad
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matrizadores, setMatrizadores] = useState([]);
  
  const [filters, setFilters] = useState({
    search: '',
    matrizador: '',
    estado: 'LISTO', // 🎯 CONSERVADOR: Filtro por defecto para Recepción
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

  // Estado para modal de detalles y fila clickeable
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailDocument, setDetailDocument] = useState(null);
  
  // Estados para funcionalidad de agrupación
  const [showQuickGroupingModal, setShowQuickGroupingModal] = useState(false);
  const [pendingGroupData, setPendingGroupData] = useState({ main: null, related: [] });
  const [groupingLoading, setGroupingLoading] = useState(false);
  const [groupingSuccess, setGroupingSuccess] = useState(null);
  
  // Estados para modal de información de grupo
  const [groupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [selectedGroupDocument, setSelectedGroupDocument] = useState(null);
  
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

  const abrirDetalles = (documento) => {
    setDetailDocument(documento);
    setDetailModalOpen(true);
  };

  const cerrarDetalles = () => {
    setDetailModalOpen(false);
    setDetailDocument(null);
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

  // 🔗 FUNCIONES DE AGRUPACIÓN PARA RECEPCIÓN
  
  /**
   * Manejar agrupación inteligente detectada automáticamente
   */
  const handleGroupDocuments = async (groupableDocuments, mainDocument) => {
    console.log('🔗 RECEPCION: Activando agrupación inteligente:', {
      main: mainDocument.protocolNumber || mainDocument.id,
      groupable: groupableDocuments.map(d => d.protocolNumber || d.id)
    });
    
    setPendingGroupData({
      main: mainDocument,
      related: groupableDocuments
    });
    setShowQuickGroupingModal(true);
  };

  /**
   * Crear grupo desde modal de confirmación
   */
  const handleCreateDocumentGroup = async (selectedDocumentIds) => {
    if (!pendingGroupData.main || selectedDocumentIds.length === 0) {
      setShowQuickGroupingModal(false);
      return;
    }

    setGroupingLoading(true);
    
    try {
      const documentIds = [pendingGroupData.main.id, ...selectedDocumentIds];
      console.log('🔗 RECEPCION: Creando grupo con documentos:', documentIds);
      
      const result = await createDocumentGroup(documentIds);
      
      if (result.success) {
        // Mostrar mensaje de éxito
        setGroupingSuccess({
          message: result.message || `Grupo creado exitosamente con ${documentIds.length} documentos`,
          verificationCode: result.verificationCode,
          documentCount: documentIds.length,
          whatsappSent: result.whatsapp?.sent || false,
          whatsappError: result.whatsapp?.error || null,
          clientPhone: result.whatsapp?.phone || null
        });

        // Refrescar documentos para mostrar los cambios
        await cargarDocumentos();

        // Mostrar notificación
        setSnackbar({
          open: true,
          message: `Grupo creado exitosamente con ${documentIds.length} documentos`,
          severity: 'success'
        });

        console.log('✅ RECEPCION: Agrupación exitosa:', result);
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
          setGroupingSuccess(null);
        }, 5000);
      } else {
        console.error('❌ RECEPCION: Error en agrupación:', result.error);
        setSnackbar({
          open: true,
          message: result.error || 'Error al crear el grupo',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('❌ RECEPCION: Error inesperado en agrupación:', error);
      setSnackbar({
        open: true,
        message: 'Error inesperado al crear el grupo',
        severity: 'error'
      });
    } finally {
      setGroupingLoading(false);
      setShowQuickGroupingModal(false);
    }
  };

  /**
   * Abrir modal de información de grupo
   */
  const handleOpenGroupInfo = (documento) => {
    setSelectedGroupDocument(documento);
    setGroupInfoModalOpen(true);
  };

  /**
   * Cerrar modal de información de grupo
   */
  const handleCloseGroupInfo = () => {
    setGroupInfoModalOpen(false);
    setSelectedGroupDocument(null);
  };

  // 🎯 NUEVAS FUNCIONES PARA SELECCIÓN VISUAL (SOLO INFORMATIVA)

  /**
   * Alternar selección visual de documento (sin funcionalidad)
   */
  const handleToggleVisualSelection = (documentId) => {
    setVisualSelection(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(documentId)) {
        newSelection.delete(documentId);
      } else {
        newSelection.add(documentId);
      }
      return newSelection;
    });
  };

  /**
   * Seleccionar/deseleccionar todos los documentos visibles
   */
  const handleToggleAllVisual = (selectAll) => {
    if (selectAll) {
      const visibleIds = documentos.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(doc => doc.id);
      setVisualSelection(new Set(visibleIds));
    } else {
      setVisualSelection(new Set());
    }
  };

  // Calcular documentos paginados
  const documentosPaginados = documentos.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  
  // Verificar estado de selección para checkbox master
  const allVisualSelected = documentosPaginados.length > 0 && documentosPaginados.every(doc => visualSelection.has(doc.id));
  const someVisualSelected = documentosPaginados.some(doc => visualSelection.has(doc.id));

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
                    indeterminate={someVisualSelected && !allVisualSelected}
                    checked={allVisualSelected}
                    onChange={(e) => handleToggleAllVisual(e.target.checked)}
                    disabled={documentosPaginados.length === 0}
                    color="primary"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Cliente / Documento</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Matrizador</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Fecha Creación</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 2 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography 
                      sx={{ 
                        fontWeight: 500,
                        color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#6b7280'
                      }}
                    >
                      No se encontraron documentos.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                documentos.map((documento) => (
                  <TableRow 
                    key={documento.id} 
                    selected={visualSelection.has(documento.id)} 
                    hover
                    onClick={() => abrirDetalles(documento)}
                    sx={{ 
                      cursor: 'pointer',
                      ...(visualSelection.has(documento.id) && {
                        bgcolor: 'action.selected'
                      })
                    }}
                  >
                    <TableCell 
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()} // Evitar que abra el modal
                    >
                      <Checkbox
                        checked={visualSelection.has(documento.id)}
                        onChange={() => handleToggleVisualSelection(documento.id)}
                        color="primary"
                        // 🎯 Solo visual para Recepción (sin funcionalidad de cambio masivo)
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{documento.clientName}</Typography>
                        <Typography 
                          variant="caption" 
                          component="div" 
                          sx={{ 
                            fontWeight: 500,
                            color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#4b5563'
                          }}
                        >
                          Doc: {documento.protocolNumber} | {documento.documentType}
                        </Typography>
                        {documento.clientPhone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                             <PhoneIcon sx={{ fontSize: '0.8rem', color: 'action.active', mr: 0.5 }} />
                             <Typography 
                               variant="caption" 
                               sx={{ 
                                 fontWeight: 500,
                                 color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#4b5563'
                               }}
                             >
                               {documento.clientPhone}
                             </Typography>
                          </Box>
                        )}
                        {/* Indicador de grupo */}
                        {documento.isGrouped && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label="⚡ Parte de un grupo"
                              size="small"
                              variant="outlined"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenGroupInfo(documento);
                              }}
                              sx={{ 
                                cursor: 'pointer',
                                fontSize: '0.65rem',
                                height: '20px',
                                '& .MuiChip-label': { px: 1 }
                              }}
                            />
                            {documento.groupVerificationCode && (
                              <Chip 
                                label={`Código: ${documento.groupVerificationCode}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: 'monospace', height: '20px' }}
                              />
                            )}
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
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 500,
                          color: (theme) => theme.palette.mode === 'dark' ? '#e2e8f0' : '#374151'
                        }}
                      >
                        {formatLocalDate(documento.fechaCreacion)}
                      </Typography>
                    </TableCell>
                    <TableCell><StatusIndicator status={documento.status} /></TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      {documento.status === 'LISTO' ? (
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="primary" 
                          startIcon={<SendIcon />}
                          onClick={(e) => { e.stopPropagation(); abrirModalEntrega(documento); }}
                          sx={{ mr: 1 }}
                        >
                          Entregar
                        </Button>
                      ) : (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mr: 1,
                            color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#9ca3af'
                          }}
                        >
                          -
                        </Typography>
                      )}
                      <IconButton aria-label="actions" onClick={(event) => { event.stopPropagation(); handleMenuOpen(event, documento); }}>
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
        {/* Opción de agrupar para documentos EN_PROCESO o LISTO */}
        {currentDocumento && ['EN_PROCESO', 'LISTO'].includes(currentDocumento.status) && !currentDocumento.isGrouped && (
          <MenuItem onClick={async () => {
            // Detectar documentos agrupables
            try {
              const result = await detectGroupableDocuments({
                clientName: currentDocumento.clientName,
                clientPhone: currentDocumento.clientPhone,
                status: currentDocumento.status
              });
              
              if (result.success && result.groupableDocuments.length > 0) {
                handleGroupDocuments(result.groupableDocuments, currentDocumento);
              } else {
                setSnackbar({
                  open: true,
                  message: 'No se encontraron documentos agrupables para este cliente',
                  severity: 'info'
                });
              }
            } catch (error) {
              console.error('Error detectando documentos agrupables:', error);
              setSnackbar({
                open: true,
                message: 'Error al detectar documentos agrupables',
                severity: 'error'
              });
            }
            handleMenuClose();
          }}>
            <ListItemIcon><GroupWorkIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>Agrupar Documentos</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={() => { if (currentDocumento) abrirDetalles(currentDocumento); handleMenuClose(); }}>
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
      
      {/* Modal de agrupación rápida */}
      <QuickGroupingModal
        open={showQuickGroupingModal}
        onClose={() => setShowQuickGroupingModal(false)}
        mainDocument={pendingGroupData.main}
        relatedDocuments={pendingGroupData.related}
        loading={groupingLoading}
        onConfirm={handleCreateDocumentGroup}
      />

      {/* Modal de información de grupo */}
      <GroupInfoModal
        open={groupInfoModalOpen}
        onClose={handleCloseGroupInfo}
        document={selectedGroupDocument}
      />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={cerrarSnackbar}>
        <Alert onClose={cerrarSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>

      {detailModalOpen && detailDocument && (
        <DocumentDetailModal
          open={detailModalOpen}
          onClose={cerrarDetalles}
          document={detailDocument}
          onDocumentUpdated={() => { cargarDocumentos(); }}
        />
      )}

      {/* 🎯 NOTA INFORMATIVA: Checkboxes solo visuales para Recepción */}
      {visualSelection.size > 0 && (
        <Alert 
          severity="info" 
          sx={{ 
            position: 'fixed', 
            bottom: 24, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1200,
            maxWidth: '90vw'
          }}
        >
          <Typography variant="body2">
            📋 Documentos seleccionados: {visualSelection.size} (solo visualización)
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#4b5563'
            }}
          >
            Los checkboxes permiten selección visual. Para cambios masivos, use las vistas de Matrizador o Archivo.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

export default DocumentosUnificados;