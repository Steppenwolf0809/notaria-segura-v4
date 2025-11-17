import React, { useState, useEffect } from 'react';
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
  GroupWork as GroupIcon,
  LinkOff as UngroupIcon,
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
import ModalEntregaGrupal from '../recepcion/ModalEntregaGrupal';
import QuickGroupingModal from '../grouping/QuickGroupingModal';
import GroupInfoModal from '../shared/GroupInfoModal';
import useDocumentStore from '../../store/document-store';
import GroupingDetector from '../grouping/GroupingDetector';
// 🎯 NUEVOS IMPORTS PARA SELECCIÓN MÚLTIPLE
import useBulkActions from '../../hooks/useBulkActions';
import BulkActionToolbar from '../bulk/BulkActionToolbar';
import BulkStatusChangeModal from '../bulk/BulkStatusChangeModal';
import { toast } from 'react-toastify';

/**
 * Vista Lista para documentos de archivo
 * Tabla completa con filtros y paginación
 */
const ListaArchivo = ({ documentos, onEstadoChange, onRefresh }) => {
  const { requiresConfirmation, createDocumentGroup, detectGroupableDocuments } = useDocumentStore();
  // Cache de conteos por cliente (igual a Recepción)
  const [groupableCountCache, setGroupableCountCache] = useState(new Map());
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filtros, setFiltros] = useState(() => {
    try {
      const saved = sessionStorage.getItem('archivo_lista_filtros');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          search: parsed.search ?? '',
          estado: parsed.estado ?? 'TODOS',
          tipo: parsed.tipo ?? 'TODOS',
          mostrarEntregados: parsed.mostrarEntregados ?? false // 🆕 Por defecto NO mostrar entregados
        };
      }
    } catch (_) {}
    return { search: '', estado: 'TODOS', tipo: 'TODOS', mostrarEntregados: false };
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
  const [reversionModalOpen, setReversionModalOpen] = useState(false);
  const [reversionLoading, setReversionLoading] = useState(false);

  // 🔗 ESTADOS PARA AGRUPACIÓN (como en Recepción)
  const [showQuickGroupingModal, setShowQuickGroupingModal] = useState(false);
  const [pendingGroupData, setPendingGroupData] = useState({ main: null, related: [] });
  const [groupingLoading, setGroupingLoading] = useState(false);
  const [groupingSuccess, setGroupingSuccess] = useState(null);
  
  // Estados para modal de información de grupo
  const [groupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [selectedGroupDocument, setSelectedGroupDocument] = useState(null);
  
  // Estados para entrega
  const [showSingleDeliveryModal, setShowSingleDeliveryModal] = useState(false);
  const [showGroupDeliveryModal, setShowGroupDeliveryModal] = useState(false);

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

    // 🆕 Filtro para ocultar ENTREGADOS si el toggle está desactivado
    // PERO: Si el usuario selecciona explícitamente ENTREGADO en el filtro, mostrarlos
    const matchesEntregados = filtros.mostrarEntregados || filtros.estado === 'ENTREGADO' || doc.status !== 'ENTREGADO';

    return matchesSearch && matchesEstado && matchesTipo && matchesEntregados;
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

  /**
   * Documentos de la página actual
   */
  const documentosPagina = documentosFiltrados.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Prefetch de conteos de agrupación por cliente (global, no solo página)
  useEffect(() => {
    const fetchCounts = async () => {
      const candidates = documentosPagina.filter(d => ['EN_PROCESO','LISTO'].includes(d.status) && !d.isGrouped);
      for (const doc of candidates) {
        const key = `${doc.clientName}|${doc.clientId || ''}`;
        if (groupableCountCache.has(key)) continue;
        try {
          const result = await detectGroupableDocuments({ clientName: doc.clientName, clientId: doc.clientId || '' });
          const uniqueCount = (result.groupableDocuments || []).reduce((acc, d) => {
            const k = d.protocolNumber || d.id;
            if (!acc.has(k)) acc.add(k);
            return acc;
          }, new Set()).size; // backend ya incluye principal
          setGroupableCountCache(prev => {
            const next = new Map(prev);
            next.set(key, uniqueCount);
            return next;
          });
        } catch {}
      }
    };
    fetchCounts();
  }, [documentosPagina, page, rowsPerPage]);

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

  // Persistir filtros de la lista de archivo durante la sesión
  useEffect(() => {
    try {
      sessionStorage.setItem('archivo_lista_filtros', JSON.stringify(filtros));
    } catch (_) {}
  }, [filtros]);

  /**
   * Verificar si hay más de un documento del mismo cliente disponible para agrupar
   * Solo mostrar botón Agrupar si realmente hay documentos agrupables
   */
  const hasMoreThanOneForClient = (doc) => {
    if (!doc) return false;
    const sameClientDocs = documentos.filter(d => {
      if (d.id === doc.id) return false; // Excluir el documento actual
      if (!['EN_PROCESO', 'LISTO'].includes(d.status)) return false; // Solo documentos en proceso o listos
      if (d.isGrouped) return false; // Excluir documentos ya agrupados
      
      const sameName = d.clientName === doc.clientName;
      const sameId = doc.clientId ? d.clientId === doc.clientId : true;
      return sameName && sameId;
    });
    
    // Deduplicar por protocolo para evitar contar duplicados
    const seen = new Set();
    const uniqueDocs = sameClientDocs.filter(d => {
      const protocol = d.protocolNumber || d.id;
      if (seen.has(protocol)) return false;
      seen.add(protocol);
      return true;
    });
    
    return uniqueDocs.length > 0; // Hay al menos un documento más del mismo cliente
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
    // No limpiar selectedDocument aquí para evitar perder el target de acciones (ej. abrir modales)
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

    console.log(`🚀 handleCambiarEstado: ${targetDoc.protocolNumber} → ${nuevoEstado}`);

    // Verificar si requiere confirmación sobre el documento objetivo (evitar estado desfasado)
    const confirmationInfo = requiresConfirmation(targetDoc.status, nuevoEstado);

    if (confirmationInfo.requiresConfirmation) {
      console.log('🎯 Cambio requiere confirmación, abriendo modal...');
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
          const w = response.data?.whatsapp || {};
          const sentLike = !!(w.sent || ['sent','queued','delivered'].includes(w.status) || w.sid || w.messageId);
          if (sentLike) {
            toast.success('Documento marcado como LISTO. WhatsApp enviado.');
          } else if (w.skipped) {
            toast.info('Documento marcado como LISTO. No se envió WhatsApp (preferencia no notificar).');
          } else if (w.error) {
            toast.error(`Documento LISTO, pero WhatsApp falló: ${w.error}`);
          } else {
            toast.success(response.message || 'Documento marcado como LISTO');
          }
          if (onRefresh) onRefresh();
        }
      } catch (error) {
        console.error('Error al cambiar estado:', error);
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
        console.error('Error en reversión (archivo):', result.error);
        toast.error(result.error || 'Error al revertir el documento');
      }
    } catch (error) {
      console.error('Error en reversión (archivo):', error);
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
        // Toast según WhatsApp
        const w = response.data?.whatsapp || {};
        if (data.newStatus === 'LISTO') {
          if (w.sent) {
            toast.success('Documento marcado como LISTO. WhatsApp enviado.');
          } else if (w.skipped) {
            toast.info('Documento marcado como LISTO. No se envió WhatsApp (preferencia no notificar).');
          } else if (w.error) {
            toast.error(`Documento LISTO, pero WhatsApp falló: ${w.error}`);
          } else if (w.phone === null || w.phone === undefined) {
            toast.warning('Documento marcado como LISTO. No se envió WhatsApp: sin número de teléfono.');
          } else {
            toast.success(response.message || 'Documento marcado como LISTO');
          }
        } else if (data.newStatus === 'ENTREGADO') {
          if (w.sent) {
            toast.success('Documento entregado. Confirmación WhatsApp enviada.');
          } else if (w.error) {
            toast.error(`Documento entregado, pero WhatsApp falló: ${w.error}`);
          } else {
            toast.success(response.message || 'Documento marcado como ENTREGADO');
          }
        }
      } else {
        console.error('❌ Error al confirmar cambio:', response.message);
        setIsConfirmationLoading(false);
        toast.error(response.message || 'Error al confirmar cambio de estado');
      }
    } catch (error) {
      console.error('❌ Error al confirmar cambio de estado:', error);
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
      console.error('Error al guardar edición:', error);
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
   * Crear grupo de documentos seleccionados
   */
  const handleCreateGroup = async () => {
    if (bulkActions.selectedDocuments.size < 2) {
      toast.info('Seleccione al menos 2 documentos para agrupar');
      return;
    }

    setGroupingLoading(true);
    try {
      const documentIds = Array.from(bulkActions.selectedDocuments);
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
        toast.success(`Grupo creado (${documentIds.length}).`);
        
        // Limpiar selección
        bulkActions.clearSelection();
        
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
        toast.error(`Error al crear el grupo: ${result?.error || result?.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error creando grupo:', error);
      toast.error(`Error al crear el grupo: ${error.message}`);
    } finally {
      setGroupingLoading(false);
    }
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
      try { const { toast } = await import('react-toastify'); toast.info('Seleccione documentos para cambiar estado'); } catch {}
      return;
    }

    for (const docId of bulkActions.selectedDocuments) {
      try {
        await onEstadoChange(docId, newStatus);
      } catch (error) {
        console.error(`Error cambiando estado del documento ${docId}:`, error);
      }
    }
    
    // Limpiar selección y refrescar
    bulkActions.clearSelection();
    if (onRefresh) {
      onRefresh();
    }
  };

  /**
   * Desagrupar documentos seleccionados
   */
  const handleUngroup = async () => {
    if (bulkActions.selectedDocuments.size === 0) {
      toast.info('Seleccione documentos agrupados para desagrupar');
      return;
    }

    try {
      // TODO: Implementar desagrupación en el servicio
      console.log('🔓 Desagrupando documentos:', Array.from(bulkActions.selectedDocuments));
      
      // Por ahora solo refrescamos
      bulkActions.clearSelection();
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

  // 🔗 FUNCIONES DE AGRUPACIÓN PARA ARCHIVO (como en Recepción)
  
  /**
   * Manejar agrupación inteligente detectada automáticamente
   */
  const handleGroupDocuments = async (groupableDocuments, mainDocument) => {
    console.log('🔗 ARCHIVO: Activando agrupación inteligente:', {
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
      console.log('🔗 ARCHIVO: Creando grupo con documentos:', documentIds);
      
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
        if (onRefresh) {
          onRefresh();
        }

        console.log('✅ ARCHIVO: Agrupación exitosa:', result);
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
          setGroupingSuccess(null);
        }, 5000);
      } else {
        console.error('❌ ARCHIVO: Error en agrupación:', result.error);
      }
    } catch (error) {
      console.error('❌ ARCHIVO: Error inesperado en agrupación:', error);
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
      {bulkActions.selectedDocuments.size > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {bulkActions.selectedDocuments.size} documento{bulkActions.selectedDocuments.size !== 1 ? 's' : ''} seleccionado{bulkActions.selectedDocuments.size !== 1 ? 's' : ''}
            </Typography>
            
            {bulkActions.selectedDocuments.size >= 2 && (
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

          {/* 🆕 Toggle para mostrar/ocultar ENTREGADOS */}
          <FormControlLabel
            control={
              <Switch
                checked={filtros.mostrarEntregados}
                onChange={(e) => handleFilterChange('mostrarEntregados', e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {filtros.mostrarEntregados ? <ViewIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                <Typography variant="body2">
                  Mostrar entregados
                </Typography>
              </Box>
            }
            sx={{ ml: 'auto' }}
          />
        </Box>

        {/* Resumen de resultados */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {documentosPagina.length} de {documentosFiltrados.length} documentos
          </Typography>

          {/* 🆕 Contador de entregados ocultos */}
          {!filtros.mostrarEntregados && (
            <Chip
              label={`${documentos.filter(d => d.status === 'ENTREGADO').length} entregados ocultos`}
              size="small"
              variant="outlined"
              color="default"
              icon={<VisibilityOffIcon />}
            />
          )}
          
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
                      {documento.isGrouped && (
                        <Tooltip title={`Grupo: ${documento.groupCode || 'N/A'}`}>
                          <LinkIcon color="primary" fontSize="small" />
                        </Tooltip>
                      )}
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
                      
                      {/* Indicador y botón de agrupación debajo del estado */}
                      {documento.isGrouped ? (
                        <Tooltip title="Ver información del grupo">
                          <Chip
                            label="🔗 Agrupado"
                            size="small"
                            variant="filled"
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
                        </Tooltip>
                      ) : (
                        // 🚫 AGRUPACIÓN TEMPORALMENTE DESHABILITADA (sin notificaciones WhatsApp)
                        false && ['EN_PROCESO', 'LISTO'].includes(documento.status) && hasMoreThanOneForClient(documento) && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="info"
                            startIcon={<GroupIcon />}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const result = await detectGroupableDocuments({
                                  clientName: documento.clientName,
                                  clientId: documento.clientId || ''
                                });
                                
                                // Excluir el principal y deduplicar por protocolo
                                const related = (result.groupableDocuments || [])
                                  .filter(d => d.id !== documento.id)
                                  .reduce((acc, d) => {
                                    const key = d.protocolNumber || d.id;
                                    if (!acc.seen.has(key)) {
                                      acc.seen.add(key);
                                      acc.items.push(d);
                                    }
                                    return acc;
                                  }, { seen: new Set(), items: [] }).items;

                                if (result.success && related.length > 0) {
                                  handleGroupDocuments(related, documento);
                                } else {
                                  // Silencioso para no ensuciar la vista
                                  console.log('No hay documentos agrupables para:', documento.clientName);
                                }
                              } catch (error) {
                                console.error('Error detectando documentos agrupables:', error);
                              }
                            }}
                            sx={{
                              fontSize: '0.65rem',
                              height: '22px',
                              borderColor: 'info.main',
                              color: 'info.main',
                              backgroundColor: 'rgba(33, 150, 243, 0.04)',
                              '&:hover': {
                                backgroundColor: 'rgba(33, 150, 243, 0.08)',
                                borderColor: 'info.dark'
                              },
                              textTransform: 'none',
                              px: 1
                            }}
                          >
                            {(() => {
                              const key = `${documento.clientName}|${documento.clientId || ''}`;
                              const count = groupableCountCache.get(key);
                              if (count && count > 1) return `Agrupar (${count})`;
                              
                              try {
                                // Usar la misma lógica que hasMoreThanOneForClient pero contar
                                const sameClientDocs = documentos.filter(d => {
                                  if (d.id === documento.id) return false;
                                  if (!['EN_PROCESO', 'LISTO'].includes(d.status)) return false;
                                  if (d.isGrouped) return false;
                                  
                                  const sameName = d.clientName === documento.clientName;
                                  const sameId = documento.clientId ? d.clientId === documento.clientId : true;
                                  return sameName && sameId;
                                });
                                
                                // Deduplicar por protocolo
                                const seen = new Set();
                                const uniqueDocs = sameClientDocs.filter(d => {
                                  const protocol = d.protocolNumber || d.id;
                                  if (seen.has(protocol)) return false;
                                  seen.add(protocol);
                                  return true;
                                });
                                
                                const totalCount = uniqueDocs.length + 1; // +1 para incluir el documento actual
                                return totalCount > 1 ? `Agrupar (${totalCount})` : 'Agrupar';
                              } catch {
                                return 'Agrupar';
                              }
                            })()}
                          </Button>
                        )
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatearFecha(documento.createdAt)}
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
                        <Tooltip title={
                          documento.isGrouped 
                            ? "Revertir estado (afectará todo el grupo)" 
                            : "Revertir al estado anterior"
                        }>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirReversionModal(documento);
                            }}
                            sx={{ 
                              mr: 0.5,
                              // Indicador visual para documentos agrupados
                              ...(documento.isGrouped && {
                                border: '2px solid',
                                borderColor: 'warning.main',
                                borderRadius: '50%'
                              })
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

      {/* Modal de entrega grupal */}
      {showGroupDeliveryModal && (
        <ModalEntregaGrupal
          documentos={getSelectedDocumentsForDelivery()}
          onClose={() => setShowGroupDeliveryModal(false)}
          onEntregaExitosa={() => {
            setShowGroupDeliveryModal(false);
            bulkActions.clearSelection();
            if (onRefresh) {
              onRefresh();
            }
          }}
        />
      )}

      {/* 🔗 MODALES DE AGRUPACIÓN */}
      
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
        onUngrouped={() => {
          // Refrescar de inmediato la lista al desagrupar
          if (onRefresh) onRefresh();
        }}
      />

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
