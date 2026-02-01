import React, { useState, useEffect, useRef } from 'react';
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
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  FilterListOff as FilterListOffIcon,
  LocalShipping as DeliveryIcon,
  ChangeCircle as StatusIcon,
  Link as LinkIcon,
  Info as InfoIcon,
  Undo as UndoIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import archivoService from '../../services/archivo-service';
import documentService from '../../services/document-service';
import { formatCurrency } from '../../utils/currencyUtils';
import DocumentDetailModal from '../Documents/DocumentDetailModal';
import EditDocumentModal from '../Documents/EditDocumentModal';
import ConfirmationModal from '../Documents/ConfirmationModal';
import ReversionModal from '../recepcion/ReversionModal';
import ModalEntrega from '../recepcion/ModalEntrega';



import useDocumentStore from '../../store/document-store';

// Extraer la función requiresConfirmation del store
const { requiresConfirmation } = useDocumentStore.getState();

// 🎯 NUEVOS IMPORTS PARA SELECCIÓN MÚLTIPLE
import useBulkActions from '../../hooks/useBulkActions';
import BulkActionToolbar from '../bulk/BulkActionToolbar';
import BulkStatusChangeModal from '../bulk/BulkStatusChangeModal';
import DateRangeFilter from '../shared/DateRangeFilter';
import PaymentIndicator from '../shared/PaymentIndicator';
import { toast } from 'react-toastify';

/**
 * Vista Lista para documentos de archivo
 * Tabla completa con filtros y paginación
 */
const ListaArchivo = ({
  documentos,
  onEstadoChange,
  onRefresh,
  // Props para server-side pagination
  serverSide = false,
  totalDocuments = 0,
  loading = false,
  onPageChange,
  onRowsPerPageChange,
  onFilterChange,
  onSortChange,
  // Props controladas (opcionales, si no se usan usa estado local)
  pageProp,
  rowsPerPageProp,
  filtrosProp,
  orderByProp,
  orderProp
}) => {


  // Estado local (usado si no se pasan props controladas)
  const [internalPage, setInternalPage] = useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(25);
  const [internalFiltros, setInternalFiltros] = useState(() => {
    try {
      const saved = sessionStorage.getItem('archivo_lista_filtros');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          search: parsed.search ?? '',
          estado: parsed.estado ?? 'TODOS',
          tipo: parsed.tipo ?? 'TODOS'
        };
      }
    } catch (_) { }
    return { search: '', estado: 'TODOS', tipo: 'TODOS' };
  });
  const [internalOrderBy, setInternalOrderBy] = useState('updatedAt'); // Default backend sort
  const [internalOrder, setInternalOrder] = useState('desc');

  // Determinar valores efectivos (prop o local)
  const page = pageProp !== undefined ? pageProp : internalPage;
  const rowsPerPage = rowsPerPageProp !== undefined ? rowsPerPageProp : internalRowsPerPage;
  const filtros = filtrosProp || internalFiltros;
  const orderBy = orderByProp || internalOrderBy;
  const order = orderProp || internalOrder;

  // Estado local para el input de búsqueda con debounce
  const [localSearchValue, setLocalSearchValue] = useState(filtros.search || '');
  const searchDebounceRef = useRef(null);

  // Sincronizar localSearchValue cuando filtros.search cambia externamente
  useEffect(() => {
    setLocalSearchValue(filtros.search || '');
  }, [filtros.search]);

  // Debounce del campo de búsqueda (500ms)
  useEffect(() => {
    // No hacer debounce si el valor ya está sincronizado
    if (localSearchValue === filtros.search) return;

    // Limpiar timeout anterior
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Crear nuevo timeout para llamar al callback después de 500ms
    searchDebounceRef.current = setTimeout(() => {
      const newFiltros = {
        ...filtros,
        search: localSearchValue
      };

      if (serverSide && onFilterChange) {
        onFilterChange(newFiltros);
      } else {
        setInternalFiltros(newFiltros);
        setInternalPage(0);
      }
    }, 500);

    // Cleanup al desmontar o cambiar dependencias
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [localSearchValue, filtros, serverSide, onFilterChange]);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Estados para modales
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false);
  const [reversionModalOpen, setReversionModalOpen] = useState(false);
  const [reversionLoading, setReversionLoading] = useState(false);





  // Estados para entrega
  const [showSingleDeliveryModal, setShowSingleDeliveryModal] = useState(false);
  const [showGroupDeliveryModal, setShowGroupDeliveryModal] = useState(false);


  // 🎯 NUEVOS ESTADOS PARA SELECCIÓN MÚLTIPLE
  const bulkActions = useBulkActions();
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState(null);

  /**
   * Filtrar y ordenar documentos (igual que ListView de Matrizador)
   * Si es serverSide, simplemente retorna los documentos ya que el filtrado/ordenamiento
   * ya fue aplicado en el servidor.
   */
  const documentosFiltrados = React.useMemo(() => {
    if (serverSide) return documentos;

    return documentos.filter(doc => {
      // Filtro de búsqueda mejorado
      const searchTerm = filtros.search.toLowerCase();
      const matchesSearch = !searchTerm || searchTerm.length < 2 ||
        doc.clientName?.toLowerCase().includes(searchTerm) ||
        doc.protocolNumber?.toLowerCase().includes(searchTerm) ||
        doc.documentType?.toLowerCase().includes(searchTerm) ||
        doc.actoPrincipalDescripcion?.toLowerCase().includes(searchTerm) ||
        doc.clientPhone?.includes(searchTerm);

      // Filtro de estado
      const matchesEstado = filtros.estado === 'TODOS' || doc.status === filtros.estado;

      // Filtro de tipo
      const matchesTipo = filtros.tipo === 'TODOS' || doc.documentType === filtros.tipo;

      // 🆕 Filtro para ocultar ENTREGADOS por defecto
      // Solo mostrar ENTREGADOS si el usuario selecciona explícitamente ese estado
      const matchesEntregados = filtros.estado === 'ENTREGADO' || doc.status !== 'ENTREGADO';

      // 🆕 Filtro por rango de fechas (fechaFactura o createdAt)
      let matchesFecha = true;
      const docDate = doc.fechaFactura || doc.createdAt;
      if (docDate && (filtros.fechaDesde || filtros.fechaHasta)) {
        const docDateObj = new Date(docDate);
        // Normalizar a inicio del día para comparación
        const docDateNorm = new Date(docDateObj.getFullYear(), docDateObj.getMonth(), docDateObj.getDate());

        if (filtros.fechaDesde) {
          const [year, month, day] = filtros.fechaDesde.split('-').map(Number);
          const desde = new Date(year, month - 1, day);
          if (docDateNorm < desde) matchesFecha = false;
        }
        if (filtros.fechaHasta && matchesFecha) {
          const [year, month, day] = filtros.fechaHasta.split('-').map(Number);
          const hasta = new Date(year, month - 1, day);
          if (docDateNorm > hasta) matchesFecha = false;
        }
      }

      return matchesSearch && matchesEstado && matchesTipo && matchesEntregados && matchesFecha;
    }).sort((a, b) => {
      // 🆕 PRIORIDAD POR ESTADO: EN_PROCESO > LISTO > OTROS > ENTREGADO
      const prioridad = {
        'EN_PROCESO': 1,
        'LISTO': 2,
        'PENDIENTE': 3,
        'CANCELADO': 4,
        'ENTREGADO': 5
      };

      const prioA = prioridad[a.status] || 99;
      const prioB = prioridad[b.status] || 99;

      // Si tienen diferente prioridad, ordenar por prioridad (menor número = mayor prioridad)
      if (prioA !== prioB) {
        return prioA - prioB;
      }

      // Si tienen misma prioridad, aplicar ordenamiento dinámico
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
  }, [documentos, filtros, orderBy, order, serverSide]);

  /**
   * Documentos de la página actual
   */
  const documentosPagina = React.useMemo(() => {
    if (serverSide) return documentosFiltrados;

    return documentosFiltrados.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [documentosFiltrados, page, rowsPerPage, serverSide]);



  /**
   * Manejar cambio de página
   */
  const handleChangePage = (event, newPage) => {
    if (serverSide && onPageChange) {
      onPageChange(event, newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  /**
   * Manejar cambio de filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    const newRows = parseInt(event.target.value, 10);
    if (serverSide && onRowsPerPageChange) {
      onRowsPerPageChange(event);
    } else {
      setInternalRowsPerPage(newRows);
      setInternalPage(0);
    }
  };

  /**
   * Manejar cambio de filtros
   */
  const handleFilterChange = (field, value) => {
    const newFiltros = {
      ...filtros,
      [field]: value
    };

    if (serverSide && onFilterChange) {
      onFilterChange(newFiltros);
    } else {
      setInternalFiltros(newFiltros);
      setInternalPage(0); // Resetear a primera página
    }
  };

  // Persistir filtros de la lista de archivo durante la sesión (solo si local)
  useEffect(() => {
    try {
      if (!serverSide) {
        sessionStorage.setItem('archivo_lista_filtros', JSON.stringify(filtros));
      }
    } catch (_) { }
  }, [filtros, serverSide]);



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
    // No limpiar selectedDocument aquí para evitar perder el target de acciones (ej. abrir modales)
  };

  /**
   * Manejar ordenamiento (igual que ListView de Matrizador)
   */
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';

    if (serverSide && onSortChange) {
      onSortChange(property, newOrder);
    } else {
      setInternalOrder(newOrder);
      setInternalOrderBy(property);
    }
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
    bulkActions.toggleSelectAll(documentosPagina, event.target.checked);
  };

  /**
   * Verificar si todos los documentos visibles están seleccionados
   */
  const isAllSelected = React.useMemo(() => {
    if (documentosPagina.length === 0) return false;
    return documentosPagina.every(doc => bulkActions.selectedDocuments.has(doc.id));
  }, [documentosPagina, bulkActions.selectedDocuments]);

  /**
   * Verificar si algunos documentos están seleccionados (para indeterminate)
   */
  const isIndeterminate = React.useMemo(() => {
    const selectedCount = documentosPagina.filter(doc =>
      bulkActions.selectedDocuments.has(doc.id)
    ).length;
    return selectedCount > 0 && selectedCount < documentosPagina.length;
  }, [documentosPagina, bulkActions.selectedDocuments]);

  /**
   * Manejar clic en acción masiva desde toolbar
   */
  const handleBulkAction = (targetStatus, options) => {
    const selectedDocs = documentosFiltrados.filter(doc =>
      bulkActions.selectedDocuments.has(doc.id)
    );

    // Para ENTREGADO, abrir modal de entrega grupal en lugar de cambio de estado
    if (targetStatus === 'ENTREGADO') {
      setShowGroupDeliveryModal(true);
      return;
    }

    setPendingBulkAction({
      documents: selectedDocs,
      fromStatus: bulkActions.getCommonStatus(documentosFiltrados),
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
      // Filtrar opciones para evitar duplicados de fromStatus/toStatus
      const { fromStatus, toStatus, ...cleanOptions } = actionData.options || {};

      await bulkActions.executeBulkStatusChange(
        documentosFiltrados,
        actionData.toStatus,
        cleanOptions
      );

      // Refrescar la vista
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
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
  const handleCambiarEstado = async (docOrNuevoEstado, maybeEstado) => {
    // Soporta firma antigua handleCambiarEstado('LISTO') y nueva handleCambiarEstado(documento, 'LISTO')
    let targetDoc;
    let nuevoEstado;
    if (typeof docOrNuevoEstado === 'string') {
      targetDoc = selectedDocument;
      nuevoEstado = docOrNuevoEstado;
    } else {
      targetDoc = docOrNuevoEstado;
      nuevoEstado = maybeEstado;
      setSelectedDocument(targetDoc);
    }

    if (!targetDoc) return;


    // Verificar si requiere confirmación sobre el documento objetivo (evitar estado desfasado)
    const confirmationInfo = requiresConfirmation(targetDoc.status, nuevoEstado);

    if (confirmationInfo.requiresConfirmation) {
      setConfirmationData({
        document: targetDoc,
        currentStatus: targetDoc.status,
        newStatus: nuevoEstado,
        confirmationInfo: confirmationInfo
      });
      setConfirmationModalOpen(true);
    } else {
      // Proceder directamente
      try {
        const response = await onEstadoChange(targetDoc.id, nuevoEstado);
        if (response?.success) {
          toast.success(response.message || 'Estado actualizado correctamente');
          if (onRefresh) onRefresh();
        }
      } catch (error) {
        toast.error(error.message || 'Error al cambiar estado');
      }
    }

    handleMenuClose();
  };

  // Reversión de estados (similar a Recepción)
  const abrirReversionModal = (documento) => {
    setSelectedDocument(documento);
    setReversionModalOpen(true);
    handleMenuClose();
  };

  const cerrarReversionModal = () => {
    if (!reversionLoading) {
      setReversionModalOpen(false);
      setSelectedDocument(null);
    }
  };

  const ejecutarReversion = async ({ documentId, newStatus, reversionReason }) => {
    try {
      setReversionLoading(true);
      const result = await archivoService.revertirEstadoDocumento(documentId, newStatus, reversionReason);
      if (result.success) {
        if (onRefresh) onRefresh();
        cerrarReversionModal();
        toast.success(result.message || 'Documento revertido exitosamente');
      } else {
        toast.error(result.error || 'Error al revertir el documento');
      }
    } catch (error) {
      toast.error('Error inesperado al revertir el documento');
    } finally {
      setReversionLoading(false);
    }
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
    setIsConfirmationLoading(true);

    try {
      const response = await onEstadoChange(data.document.id, data.newStatus, {
        reversionReason: data.reversionReason,
        changeType: data.changeType,
        deliveredTo: data.deliveredTo
      });

      if (response.success) {
        handleCloseConfirmation();

        if (onRefresh) {
          onRefresh();
        }
        toast.success(response.message || 'Estado actualizado correctamente');
      } else {
        setIsConfirmationLoading(false);
        toast.error(response.message || 'Error al confirmar cambio de estado');
      }
    } catch (error) {
      setIsConfirmationLoading(false);
      toast.error(error.message || 'Error al confirmar cambio de estado');
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
      throw error;
    }
  };

  // 🔗 FUNCIONES DE AGRUPACIÓN

  /**
   * Seleccionar/deseleccionar documento individual
   */
  const handleToggleDocument = (documentId) => {
    const document = documentos.find(doc => doc.id === documentId);
    if (document) {
      bulkActions.toggleDocumentSelection(documentId, document.status, documentos);
    }
  };

  /**
   * Seleccionar/deseleccionar todos los documentos de la página
   */
  const handleToggleAll = () => {
    const currentPageIds = documentosPagina.map(doc => doc.id);
    const allSelected = currentPageIds.every(id => bulkActions.selectedDocuments.has(id));

    bulkActions.toggleSelectAll(documentosPagina, !allSelected);
  };



  /**
   * Abrir modal de entrega grupal
   */
  const handleGroupDelivery = () => {
    if (bulkActions.selectedDocuments.size === 0) {
      toast.info('Seleccione documentos para entrega grupal');
      return;
    }
    setShowGroupDeliveryModal(true);
  };

  /**
   * Cambiar estado de documentos seleccionados
   */
  const handleGroupStatusChange = async (newStatus) => {
    if (bulkActions.selectedDocuments.size === 0) {
      // Notificación global: selección vacía
      try { const { toast } = await import('react-toastify'); toast.info('Seleccione documentos para cambiar estado'); } catch { }
      return;
    }

    for (const docId of bulkActions.selectedDocuments) {
      try {
        await onEstadoChange(docId, newStatus);
      } catch (error) {
      }
    }

    // Limpiar selección y refrescar
    bulkActions.clearSelection();
    if (onRefresh) {
      onRefresh();
    }
  };



  /**
   * Entregar documento individual
   */
  const handleSingleDelivery = (doc) => {
    const targetDoc = doc || selectedDocument;
    if (!targetDoc) return;
    setSelectedDocument(targetDoc);
    setShowSingleDeliveryModal(true);
    handleMenuClose();
  };

  /**
   * Obtener documentos seleccionados para entrega grupal
   */
  const getSelectedDocumentsForDelivery = () => {
    return documentos.filter(doc => bulkActions.selectedDocuments.has(doc.id));
  };





  return (
    <Box>


      {/* Barra de herramientas de agrupación */}
      {bulkActions.selectedDocuments.size > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {bulkActions.selectedDocuments.size} documento{bulkActions.selectedDocuments.size !== 1 ? 's' : ''} seleccionado{bulkActions.selectedDocuments.size !== 1 ? 's' : ''}
            </Typography>



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


          </Toolbar>
        </Paper>
      )}

      {/* Controles y Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Búsqueda con debounce */}
          <TextField
            placeholder="Buscar por cliente, protocolo, acto o teléfono..."
            value={localSearchValue}
            onChange={(e) => setLocalSearchValue(e.target.value)}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
              Estado
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filtros.estado === 'TODOS' ? '' : filtros.estado}
              onChange={(e, value) => handleFilterChange('estado', value || 'TODOS')}
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

          {/* Botón Borrar Filtros */}
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<FilterListOffIcon />}
            onClick={() => {
              const defaultFiltros = { search: '', estado: 'TODOS', tipo: 'TODOS', fechaDesde: '', fechaHasta: '' };
              if (serverSide && onFilterChange) {
                onFilterChange(defaultFiltros);
              } else {
                setInternalFiltros(defaultFiltros);
                setInternalPage(0);
              }
            }}
            size="small"
          >
            Borrar Filtros
          </Button>

          {/* Filtro por rango de fechas */}
          <DateRangeFilter
            fechaDesde={filtros.fechaDesde || ''}
            fechaHasta={filtros.fechaHasta || ''}
            onApply={(desde, hasta) => {
              const newFiltros = {
                ...filtros,
                fechaDesde: desde,
                fechaHasta: hasta
              };
              if (serverSide && onFilterChange) {
                onFilterChange(newFiltros);
              } else {
                setInternalFiltros(newFiltros);
                setInternalPage(0);
              }
            }}
            onClear={() => {
              const newFiltros = {
                ...filtros,
                fechaDesde: '',
                fechaHasta: ''
              };
              if (serverSide && onFilterChange) {
                onFilterChange(newFiltros);
              } else {
                setInternalFiltros(newFiltros);
                setInternalPage(0);
              }
            }}
            label=""
          />

        </Box>

        {/* Resumen de resultados */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
                    disabled={documentosPagina.length === 0}
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
                <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Estado / Agrupación
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

                    // Resaltar documentos seleccionados para bulk
                    ...(bulkActions.selectedDocuments.has(documento.id) && {
                      bgcolor: 'action.selected'
                    })
                  }}
                  onClick={() => {
                    setSelectedDocument(documento);
                    setDetailModalOpen(true);
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      onClick={(e) => e.stopPropagation()}
                      checked={bulkActions.selectedDocuments.has(documento.id)}
                      onChange={() => bulkActions.toggleDocumentSelection(
                        documento.id,
                        documento.status,
                        documentosFiltrados
                      )}
                      disabled={!bulkActions.canSelectDocument(documento, documentosFiltrados)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        #{documento.protocolNumber}
                      </Typography>

                    </Box>
                  </TableCell>

                  <TableCell>
                    <Tooltip title="Click para buscar todos los documentos de este cliente" arrow>
                      <Typography
                        variant="body2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFilterChange('search', documento.clientName);
                          // Scroll suave al inicio para ver los resultados
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: 500,
                          '&:hover': {
                            color: 'primary.main',
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {documento.clientName}
                      </Typography>
                    </Tooltip>
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
                      {/* 💰 Indicador de estado de pago */}
                      <PaymentIndicator 
                        paymentStatus={documento.paymentStatus} 
                        paymentInfo={documento.paymentInfo}
                        documentStatus={documento.status}
                      />
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatearFecha(documento.fechaFactura || documento.createdAt)}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                      {/* Botón principal según estado */}
                      {documento.status === 'EN_PROCESO' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<StatusIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCambiarEstado(documento, 'LISTO');
                          }}
                        >
                          Marcar Listo
                        </Button>
                      )}

                      {documento.status === 'LISTO' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<DeliveryIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSingleDelivery(documento);
                          }}
                        >
                          Entregar
                        </Button>
                      )}

                      {documento.status === 'ENTREGADO' && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#9ca3af',
                            fontStyle: 'italic'
                          }}
                        >
                          Completado
                        </Typography>
                      )}

                      {/* Botón de revertir estado (directo) */}
                      {['LISTO', 'ENTREGADO'].includes(documento.status) && (
                        <Tooltip title="Revertir al estado anterior">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirReversionModal(documento);
                            }}
                            sx={{
                              mr: 0.5,
                            }}
                          >
                            <UndoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Botón de ver detalles */}
                      <Tooltip title="Ver detalles del documento">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocument(documento);
                            setDetailModalOpen(true);
                          }}
                          sx={{ mr: 0.5 }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Menú contextual eliminado: acciones ya están disponibles como botones en la lista */}
                    </Box>
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
          count={serverSide ? totalDocuments : documentosFiltrados.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100, 200]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>

      {/* Menú contextual eliminado completamente */}

      {/* Modal de detalles del documento */}
      {detailModalOpen && selectedDocument && (
        <DocumentDetailModal
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          document={selectedDocument}
          userRole="archivo"
          /* Documentos en esta vista son propios del usuario ARCHIVO → edición permitida */
          onDocumentUpdated={(updated) => {
            // Sincronizar fila seleccionada en la tabla
            if (updated?.document) {
              setSelectedDocument(prev => ({ ...prev, ...updated.document }));
            }
            // Refrescar la lista para reflejar el nuevo estado
            if (onRefresh) {
              onRefresh();
            }
          }}
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
          // ⚡ FIX: Opción de entrega directa para ARCHIVO
          alternativeAction={
            confirmationData.currentStatus === 'EN_PROCESO' ? {
              label: 'Entregar Ahora',
              icon: <DeliveryIcon />,
              onClick: () => {
                handleCloseConfirmation();
                handleSingleDelivery(confirmationData.document);
              }
            } : null
          }
        />
      )}

      {reversionModalOpen && selectedDocument && (
        <ReversionModal
          open={reversionModalOpen}
          onClose={cerrarReversionModal}
          documento={selectedDocument}
          onConfirm={ejecutarReversion}
          loading={reversionLoading}
        />
      )}

      {/* Modal de entrega individual */}
      {showSingleDeliveryModal && selectedDocument && (
        <ModalEntrega
          documento={selectedDocument}
          onClose={() => {
            setShowSingleDeliveryModal(false);
            setSelectedDocument(null);
          }}
          onEntregaExitosa={() => {
            setShowSingleDeliveryModal(false);
            setSelectedDocument(null);
            if (onRefresh) {
              onRefresh();
            }
          }}
          serviceType="archivo"
        />
      )}





      {/* 🎯 NUEVOS COMPONENTES: Selección múltiple */}

      {/* Toolbar flotante para acciones masivas */}
      <BulkActionToolbar
        selectionCount={bulkActions.selectionInfo.count}
        commonStatus={bulkActions.getCommonStatus(documentosFiltrados)}
        validTransitions={bulkActions.getValidTransitions(documentosFiltrados)}
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
      {bulkActions.selectionInfo.count > 0 && !bulkActions.getCommonStatus(documentosFiltrados) && (
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
