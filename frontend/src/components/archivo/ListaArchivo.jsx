import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Button,
  Divider,
  TableSortLabel,
  Checkbox,
  Toolbar,
  Alert,
  Badge,
  Tooltip
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  GroupWork as GroupIcon,
  LinkOff as UngroupIcon,
  LocalShipping as DeliveryIcon,
  ChangeCircle as StatusIcon,
  Link as LinkIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import archivoService from '../../services/archivo-service';
import { formatCurrency } from '../../utils/currencyUtils';
import DocumentDetailModal from '../Documents/DocumentDetailModal';
import EditDocumentModal from '../Documents/EditDocumentModal';
import ConfirmationModal from '../Documents/ConfirmationModal';
import ModalEntrega from '../recepcion/ModalEntrega';
import ModalEntregaGrupal from '../recepcion/ModalEntregaGrupal';
import QuickGroupingModal from '../grouping/QuickGroupingModal';
import useDocumentStore from '../../store/document-store';
// 🎯 NUEVOS IMPORTS PARA SELECCIÓN MÚLTIPLE
import useBulkActions from '../../hooks/useBulkActions';
import BulkActionToolbar from '../bulk/BulkActionToolbar';
import BulkStatusChangeModal from '../bulk/BulkStatusChangeModal';

/**
 * Vista Lista para documentos de archivo
 * Tabla completa con filtros y paginación
 */
const ListaArchivo = ({ documentos, onEstadoChange, onRefresh }) => {
  const { requiresConfirmation, createDocumentGroup } = useDocumentStore();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filtros, setFiltros] = useState({
    search: '',
    estado: 'TODOS',
    tipo: 'TODOS'
  });
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Estados para modales
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false);

  // 🔗 NUEVOS ESTADOS PARA AGRUPACIÓN
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [showGroupingModal, setShowGroupingModal] = useState(false);
  const [showGroupDeliveryModal, setShowGroupDeliveryModal] = useState(false);
  const [groupingLoading, setGroupingLoading] = useState(false);
  const [groupingSuccess, setGroupingSuccess] = useState(null);
  const [showSingleDeliveryModal, setShowSingleDeliveryModal] = useState(false);

  // 🎯 NUEVOS ESTADOS PARA SELECCIÓN MÚLTIPLE
  const bulkActions = useBulkActions();
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState(null);

  /**
   * Filtrar y ordenar documentos (igual que ListView de Matrizador)
   */
  const documentosFiltrados = documentos.filter(doc => {
    // Filtro de búsqueda mejorado
    const searchTerm = filtros.search.toLowerCase();
    const matchesSearch = !searchTerm || searchTerm.length < 2 ||
      doc.clientName?.toLowerCase().includes(searchTerm) ||
      doc.protocolNumber?.toLowerCase().includes(searchTerm) ||
      doc.documentType?.toLowerCase().includes(searchTerm) ||
      doc.clientPhone?.includes(searchTerm);

    // Filtro de estado
    const matchesEstado = filtros.estado === 'TODOS' || doc.status === filtros.estado;

    // Filtro de tipo
    const matchesTipo = filtros.tipo === 'TODOS' || doc.documentType === filtros.tipo;

    return matchesSearch && matchesEstado && matchesTipo;
  }).sort((a, b) => {
    // Ordenamiento dinámico
    let aValue = a[orderBy];
    let bValue = b[orderBy];
    
    if (orderBy === 'createdAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (order === 'desc') {
      return bValue > aValue ? 1 : -1;
    }
    return aValue > bValue ? 1 : -1;
  });

  /**
   * Documentos de la página actual
   */
  const documentosPagina = documentosFiltrados.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  /**
   * Manejar cambio de página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Manejar cambio de filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Manejar cambio de filtros
   */
  const handleFilterChange = (field, value) => {
    setFiltros(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(0); // Resetear a primera página
  };

  /**
   * Abrir menú de acciones
   */
  const handleMenuOpen = (event, documento) => {
    setMenuAnchor(event.currentTarget);
    setSelectedDocument(documento);
  };

  /**
   * Cerrar menú
   */
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedDocument(null);
  };

  /**
   * Manejar ordenamiento (igual que ListView de Matrizador)
   */
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  /**
   * Formatear fecha
   */
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // 🎯 NUEVAS FUNCIONES PARA SELECCIÓN MÚLTIPLE

  /**
   * Manejar selección de todos los documentos visibles
   */
  const handleSelectAll = (event) => {
    const documentosPagina = documentosPaginados;
    bulkActions.toggleSelectAll(documentosPagina, event.target.checked);
  };

  /**
   * Verificar si todos los documentos visibles están seleccionados
   */
  const isAllSelected = React.useMemo(() => {
    if (documentosPaginados.length === 0) return false;
    return documentosPaginados.every(doc => bulkActions.selectedDocuments.has(doc.id));
  }, [documentosPaginados, bulkActions.selectedDocuments]);

  /**
   * Verificar si algunos documentos están seleccionados (para indeterminate)
   */
  const isIndeterminate = React.useMemo(() => {
    const selectedCount = documentosPaginados.filter(doc => 
      bulkActions.selectedDocuments.has(doc.id)
    ).length;
    return selectedCount > 0 && selectedCount < documentosPaginados.length;
  }, [documentosPaginados, bulkActions.selectedDocuments]);

  /**
   * Manejar clic en acción masiva desde toolbar
   */
  const handleBulkAction = (targetStatus, options) => {
    const selectedDocs = documentosOrdenados.filter(doc => 
      bulkActions.selectedDocuments.has(doc.id)
    );
    
    setPendingBulkAction({
      documents: selectedDocs,
      fromStatus: bulkActions.getCommonStatus(documentosOrdenados),
      toStatus: targetStatus,
      options
    });
    setBulkModalOpen(true);
  };

  /**
   * Ejecutar cambio masivo confirmado
   */
  const handleConfirmBulkAction = async (actionData) => {
    try {
      await bulkActions.executeBulkStatusChange(
        documentosOrdenados, 
        actionData.toStatus, 
        actionData.options
      );
      
      // Refrescar la vista
      if (onRefresh) {
        onRefresh();
      }
      console.log('✅ Cambio masivo completado en ListaArchivo');
    } catch (error) {
      console.error('❌ Error en cambio masivo:', error);
    } finally {
      setBulkModalOpen(false);
      setPendingBulkAction(null);
    }
  };

  /**
   * Obtener color del estado
   */
  const getEstadoColor = (estado) => {
    const colores = {
      'PENDIENTE': 'warning',
      'EN_PROCESO': 'info',
      'LISTO': 'success',
      'ENTREGADO': 'default'
    };
    return colores[estado] || 'default';
  };

  /**
   * Abrir modal de detalles
   */
  const handleVerDetalles = () => {
    setDetailModalOpen(true);
    handleMenuClose();
  };

  /**
   * Abrir modal de edición
   */
  const handleEditar = () => {
    setEditModalOpen(true);
    handleMenuClose();
  };

  /**
   * Cambiar estado del documento
   */
  const handleCambiarEstado = async (nuevoEstado) => {
    if (!selectedDocument) return;

    console.log(`🚀 handleCambiarEstado: ${selectedDocument.protocolNumber} → ${nuevoEstado}`);
    
    // Verificar si requiere confirmación
    const confirmationInfo = requiresConfirmation(selectedDocument.status, nuevoEstado);
    
    if (confirmationInfo.requiresConfirmation) {
      console.log('🎯 Cambio requiere confirmación, abriendo modal...');
      setConfirmationData({
        document: selectedDocument,
        currentStatus: selectedDocument.status,
        newStatus: nuevoEstado,
        confirmationInfo: confirmationInfo
      });
      setConfirmationModalOpen(true);
    } else {
      // Proceder directamente
      try {
        const response = await onEstadoChange(selectedDocument.id, nuevoEstado);
        if (response.success && onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error al cambiar estado:', error);
      }
    }
    
    handleMenuClose();
  };

  /**
   * Cerrar modal de confirmación
   */
  const handleCloseConfirmation = () => {
    setConfirmationModalOpen(false);
    setConfirmationData(null);
    setIsConfirmationLoading(false);
  };

  /**
   * Confirmar cambio de estado
   */
  const handleConfirmStatusChange = async (data) => {
    console.log('🎯 Confirmando cambio de estado:', data);
    setIsConfirmationLoading(true);
    
    try {
      const response = await onEstadoChange(data.document.id, data.newStatus, {
        reversionReason: data.reversionReason,
        changeType: data.changeType,
        deliveredTo: data.deliveredTo
      });
      
      if (response.success) {
        console.log('✅ Cambio de estado confirmado exitosamente');
        handleCloseConfirmation();
        
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('❌ Error al confirmar cambio:', response.message);
        setIsConfirmationLoading(false);
      }
    } catch (error) {
      console.error('❌ Error al confirmar cambio de estado:', error);
      setIsConfirmationLoading(false);
    }
  };

  /**
   * Cerrar modales
   */
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
  };

  /**
   * Guardar edición
   */
  const handleEditSave = async (formData) => {
    try {
      handleCloseEditModal();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error al guardar edición:', error);
      throw error;
    }
  };

  // 🔗 FUNCIONES DE AGRUPACIÓN
  
  /**
   * Seleccionar/deseleccionar documento individual
   */
  const handleToggleDocument = (documentId) => {
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
   * Seleccionar/deseleccionar todos los documentos de la página
   */
  const handleToggleAll = () => {
    const currentPageIds = documentosPagina.map(doc => doc.id);
    const allSelected = currentPageIds.every(id => selectedDocuments.has(id));
    
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deseleccionar todos de la página actual
        currentPageIds.forEach(id => newSet.delete(id));
      } else {
        // Seleccionar todos de la página actual
        currentPageIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  /**
   * Crear grupo de documentos seleccionados
   */
  const handleCreateGroup = async () => {
    if (selectedDocuments.size < 2) {
      alert('Seleccione al menos 2 documentos para agrupar');
      return;
    }

    setGroupingLoading(true);
    try {
      const documentIds = Array.from(selectedDocuments);
      console.log('🔗 Creando grupo desde lista archivo:', documentIds);
      
      const result = await createDocumentGroup(documentIds);
      console.log('🔗 Resultado de createDocumentGroup:', result);
      
      if (result && result.success) {
        setGroupingSuccess({
          message: `Grupo creado exitosamente con ${documentIds.length} documentos`,
          verificationCode: result.verificationCode,
          documentCount: documentIds.length,
          whatsappSent: result.whatsapp?.sent || false,
          whatsappError: result.whatsapp?.error || null,
          clientPhone: result.whatsapp?.phone || null
        });
        
        // Limpiar selección
        setSelectedDocuments(new Set());
        
        // Refrescar datos
        if (onRefresh) {
          onRefresh();
        }
        
        // Auto-ocultar mensaje después de 5 segundos
        setTimeout(() => {
          setGroupingSuccess(null);
        }, 5000);
      } else {
        console.error('❌ Error en resultado de agrupación:', result);
        alert(`Error al crear el grupo: ${result?.error || result?.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error creando grupo:', error);
      alert(`Error al crear el grupo: ${error.message}`);
    } finally {
      setGroupingLoading(false);
    }
  };

  /**
   * Abrir modal de entrega grupal
   */
  const handleGroupDelivery = () => {
    if (selectedDocuments.size === 0) {
      alert('Seleccione documentos para entrega grupal');
      return;
    }
    setShowGroupDeliveryModal(true);
  };

  /**
   * Cambiar estado de documentos seleccionados
   */
  const handleGroupStatusChange = async (newStatus) => {
    if (selectedDocuments.size === 0) {
      alert('Seleccione documentos para cambiar estado');
      return;
    }

    for (const docId of selectedDocuments) {
      try {
        await onEstadoChange(docId, newStatus);
      } catch (error) {
        console.error(`Error cambiando estado del documento ${docId}:`, error);
      }
    }
    
    // Limpiar selección y refrescar
    setSelectedDocuments(new Set());
    if (onRefresh) {
      onRefresh();
    }
  };

  /**
   * Desagrupar documentos seleccionados
   */
  const handleUngroup = async () => {
    if (selectedDocuments.size === 0) {
      alert('Seleccione documentos agrupados para desagrupar');
      return;
    }

    try {
      // TODO: Implementar desagrupación en el servicio
      console.log('🔓 Desagrupando documentos:', Array.from(selectedDocuments));
      
      // Por ahora solo refrescamos
      setSelectedDocuments(new Set());
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error desagrupando:', error);
    }
  };

  /**
   * Entregar documento individual
   */
  const handleSingleDelivery = () => {
    if (!selectedDocument) return;
    setShowSingleDeliveryModal(true);
    handleMenuClose();
  };

  /**
   * Obtener documentos seleccionados para entrega grupal
   */
  const getSelectedDocumentsForDelivery = () => {
    return documentos.filter(doc => selectedDocuments.has(doc.id));
  };

  return (
    <Box>
      {/* Mensaje de éxito de agrupación */}
      {groupingSuccess && (
        <Alert 
          severity="success" 
          onClose={() => setGroupingSuccess(null)}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {groupingSuccess.message}
          </Typography>
          {groupingSuccess.verificationCode && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Código de verificación: <strong>{groupingSuccess.verificationCode}</strong>
            </Typography>
          )}
          {groupingSuccess.whatsappSent && (
            <Typography variant="body2" color="success.main">
              ✓ Notificación WhatsApp enviada a {groupingSuccess.clientPhone}
            </Typography>
          )}
          {groupingSuccess.whatsappError && (
            <Typography variant="body2" color="warning.main">
              ⚠ WhatsApp: {groupingSuccess.whatsappError}
            </Typography>
          )}
        </Alert>
      )}

      {/* Barra de herramientas de agrupación */}
      {selectedDocuments.size > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {selectedDocuments.size} documento{selectedDocuments.size !== 1 ? 's' : ''} seleccionado{selectedDocuments.size !== 1 ? 's' : ''}
            </Typography>
            
            {selectedDocuments.size >= 2 && (
              <Button
                startIcon={<GroupIcon />}
                onClick={handleCreateGroup}
                disabled={groupingLoading}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  mr: 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
                variant="outlined"
              >
                {groupingLoading ? 'Agrupando...' : 'Agrupar'}
              </Button>
            )}
            
            <Button
              startIcon={<DeliveryIcon />}
              onClick={handleGroupDelivery}
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                mr: 1,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
              variant="outlined"
            >
              Entregar
            </Button>
            
            <Button
              startIcon={<StatusIcon />}
              onClick={() => handleGroupStatusChange('LISTO')}
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                mr: 1,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
              variant="outlined"
            >
              Marcar Listo
            </Button>
            
            <Button
              startIcon={<UngroupIcon />}
              onClick={handleUngroup}
              disabled={true}
              sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
              variant="outlined"
              title="Funcionalidad en desarrollo"
            >
              Desagrupar
            </Button>
          </Toolbar>
        </Paper>
      )}

      {/* Controles y Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Búsqueda */}
          <TextField
            placeholder="Buscar por cliente, protocolo o teléfono..."
            value={filtros.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300, flex: 1 }}
            size="small"
          />

          {/* Filtro de Estado */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={filtros.estado}
              label="Estado"
              onChange={(e) => handleFilterChange('estado', e.target.value)}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
              <MenuItem value="LISTO">Listo</MenuItem>
              <MenuItem value="ENTREGADO">Entregado</MenuItem>
            </Select>
          </FormControl>

          {/* Filtro de Tipo */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filtros.tipo}
              label="Tipo"
              onChange={(e) => handleFilterChange('tipo', e.target.value)}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              <MenuItem value="PROTOCOLO">Protocolo</MenuItem>
              <MenuItem value="DILIGENCIA">Diligencia</MenuItem>
              <MenuItem value="CERTIFICACION">Certificación</MenuItem>
              <MenuItem value="ARRENDAMIENTO">Arrendamiento</MenuItem>
              <MenuItem value="OTROS">Otros</MenuItem>
            </Select>
          </FormControl>

          {/* Botón Refrescar */}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            size="small"
          >
            Refrescar
          </Button>
        </Box>

        {/* Resumen de resultados */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {documentosPagina.length} de {documentosFiltrados.length} documentos
          </Typography>
          
          {filtros.search && (
            <Chip 
              label={`Búsqueda: "${filtros.search}"`} 
              size="small" 
              onDelete={() => handleFilterChange('search', '')}
            />
          )}
          
          {filtros.estado !== 'TODOS' && (
            <Chip 
              label={`Estado: ${archivoService.formatearEstado(filtros.estado).texto}`} 
              size="small" 
              onDelete={() => handleFilterChange('estado', 'TODOS')}
            />
          )}
          
          {filtros.tipo !== 'TODOS' && (
            <Chip 
              label={`Tipo: ${filtros.tipo}`} 
              size="small" 
              onDelete={() => handleFilterChange('tipo', 'TODOS')}
            />
          )}
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    disabled={documentosPaginados.length === 0}
                    color="primary"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'protocolNumber'}
                    direction={orderBy === 'protocolNumber' ? order : 'asc'}
                    onClick={() => handleSort('protocolNumber')}
                  >
                    Protocolo
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'clientName'}
                    direction={orderBy === 'clientName' ? order : 'asc'}
                    onClick={() => handleSort('clientName')}
                  >
                    Cliente
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'documentType'}
                    direction={orderBy === 'documentType' ? order : 'asc'}
                    onClick={() => handleSort('documentType')}
                  >
                    Tipo
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'totalFactura'}
                    direction={orderBy === 'totalFactura' ? order : 'asc'}
                    onClick={() => handleSort('totalFactura')}
                  >
                    Valor
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Estado
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'createdAt'}
                    direction={orderBy === 'createdAt' ? order : 'asc'}
                    onClick={() => handleSort('createdAt')}
                  >
                    Fecha
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentosPagina.map((documento) => (
                <TableRow 
                  key={documento.id}
                  hover
                  selected={bulkActions.selectedDocuments.has(documento.id)}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'action.hover',
                      cursor: 'pointer' 
                    },
                    // Resaltar documentos agrupados
                    ...(documento.isGrouped && {
                      borderLeft: '4px solid #1976d2',
                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                    }),
                    // Resaltar documentos seleccionados para bulk
                    ...(bulkActions.selectedDocuments.has(documento.id) && {
                      bgcolor: 'action.selected'
                    })
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={bulkActions.selectedDocuments.has(documento.id)}
                      onChange={() => bulkActions.toggleDocumentSelection(
                        documento.id, 
                        documento.status, 
                        documentosOrdenados
                      )}
                      disabled={!bulkActions.canSelectDocument(documento, documentosOrdenados)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        #{documento.protocolNumber}
                      </Typography>
                      {documento.isGrouped && (
                        <Tooltip title={`Grupo: ${documento.groupCode || 'N/A'}`}>
                          <LinkIcon color="primary" fontSize="small" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {documento.clientName}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {documento.clientPhone || '-'}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {documento.documentType}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                      {formatCurrency(documento.totalFactura || 0)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip 
                        label={archivoService.formatearEstado(documento.status).texto}
                        color={getEstadoColor(documento.status)}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                      {documento.isGrouped && documento.groupCode && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'primary.main', 
                            fontWeight: 500,
                            fontSize: '0.7rem' 
                          }}
                        >
                          Grupo: {documento.groupCode}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatearFecha(documento.createdAt)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, documento)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              
              {documentosPagina.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      {documentosFiltrados.length === 0 
                        ? 'No hay documentos que coincidan con los filtros'
                        : 'No hay documentos en esta página'
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          component="div"
          count={documentosFiltrados.length}
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
      </Paper>

      {/* Menú de acciones funcional */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleVerDetalles}>
          Ver Detalles
        </MenuItem>
        <MenuItem onClick={handleEditar}>
          Editar
        </MenuItem>
        <Divider />
        {selectedDocument?.status === 'EN_PROCESO' && (
          <MenuItem onClick={() => handleCambiarEstado('LISTO')}>
            Marcar como Listo
          </MenuItem>
        )}
        {selectedDocument?.status === 'LISTO' && (
          <MenuItem onClick={() => handleCambiarEstado('ENTREGADO')}>
            Marcar como Entregado
          </MenuItem>
        )}
        {selectedDocument?.status === 'LISTO' && (
          <MenuItem onClick={handleSingleDelivery}>
            Entregar Documento
          </MenuItem>
        )}
        {selectedDocument?.status === 'ENTREGADO' && (
          <MenuItem onClick={() => handleCambiarEstado('LISTO')}>
            Revertir a Listo
          </MenuItem>
        )}
      </Menu>

      {/* Modal de detalles del documento */}
      {detailModalOpen && selectedDocument && (
        <DocumentDetailModal
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          document={selectedDocument}
          userRole="archivo"
        />
      )}

      {/* Modal de edición del documento */}
      {editModalOpen && selectedDocument && (
        <EditDocumentModal
          open={editModalOpen}
          onClose={handleCloseEditModal}
          document={selectedDocument}
          onSave={handleEditSave}
        />
      )}

      {/* Modal de confirmación de cambio de estado */}
      {confirmationModalOpen && confirmationData && (
        <ConfirmationModal
          open={confirmationModalOpen}
          onClose={handleCloseConfirmation}
          onConfirm={handleConfirmStatusChange}
          document={confirmationData.document}
          currentStatus={confirmationData.currentStatus}
          newStatus={confirmationData.newStatus}
          confirmationInfo={confirmationData.confirmationInfo}
          isLoading={isConfirmationLoading}
        />
      )}

      {/* Modal de entrega individual */}
      {showSingleDeliveryModal && selectedDocument && (
        <ModalEntrega
          documento={selectedDocument}
          onClose={() => setShowSingleDeliveryModal(false)}
          onEntregaExitosa={() => {
            setShowSingleDeliveryModal(false);
            if (onRefresh) {
              onRefresh();
            }
          }}
          serviceType="arquivo"
        />
      )}

      {/* Modal de entrega grupal */}
      {showGroupDeliveryModal && (
        <ModalEntregaGrupal
          documentos={getSelectedDocumentsForDelivery()}
          onClose={() => setShowGroupDeliveryModal(false)}
          onEntregaExitosa={() => {
            setShowGroupDeliveryModal(false);
            setSelectedDocuments(new Set());
            if (onRefresh) {
              onRefresh();
            }
          }}
        />
      )}

      {/* 🎯 NUEVOS COMPONENTES: Selección múltiple */}
      
      {/* Toolbar flotante para acciones masivas */}
      <BulkActionToolbar
        selectionCount={bulkActions.selectionInfo.count}
        commonStatus={bulkActions.getCommonStatus(documentosOrdenados)}
        validTransitions={bulkActions.getValidTransitions(documentosOrdenados)}
        maxSelection={bulkActions.MAX_BULK_SELECTION}
        isExecuting={bulkActions.isExecuting}
        onClearSelection={bulkActions.clearSelection}
        onBulkAction={handleBulkAction}
      />

      {/* Modal de confirmación para cambios masivos */}
      <BulkStatusChangeModal
        open={bulkModalOpen}
        onClose={() => {
          setBulkModalOpen(false);
          setPendingBulkAction(null);
        }}
        documents={pendingBulkAction?.documents || []}
        fromStatus={pendingBulkAction?.fromStatus}
        toStatus={pendingBulkAction?.toStatus}
        onConfirm={handleConfirmBulkAction}
        loading={bulkActions.isExecuting}
      />

      {/* Alerta informativa cuando hay documentos con estados mixtos */}
      {bulkActions.selectionInfo.count > 0 && !bulkActions.getCommonStatus(documentosOrdenados) && (
        <Alert 
          severity="warning" 
          sx={{ 
            position: 'fixed', 
            bottom: 100, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1200,
            maxWidth: '90vw'
          }}
        >
          Solo se pueden realizar cambios masivos en documentos del mismo estado. 
          Documentos con estados diferentes han sido deseleccionados automáticamente.
        </Alert>
      )}
    </Box>
  );
};

export default ListaArchivo;