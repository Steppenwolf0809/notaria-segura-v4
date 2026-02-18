import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  InputAdornment,
  TableSortLabel
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
  Undo as UndoIcon,
  Close as CloseIcon,
  LocalShipping as LocalShippingIcon
} from '@mui/icons-material';
import ModalEntrega from './ModalEntrega';

import ReversionModal from './ReversionModal';


import DocumentDetailModal from '../Documents/DocumentDetailModal';

import BulkDeliveryDialog from './BulkDeliveryDialog';
import receptionService from '../../services/reception-service';
import documentService from '../../services/document-service';
import useDocumentStore from '../../store/document-store';
// import DateRangeFilter from '../shared/DateRangeFilter'; // 🗑️ Eliminado para usar implementación custom
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';

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

// 💰 Indicador de estado de pago
const PaymentIndicator = ({ paymentStatus, paymentInfo }) => {
  const config = {
    PAGADO: { 
      label: '💵 Pagado', 
      color: '#16a34a', 
      bgColor: '#dcfce7',
      darkBgColor: '#166534'
    },
    PARCIAL: { 
      label: '⚠️ Pago parcial', 
      color: '#d97706', 
      bgColor: '#fef3c7',
      darkBgColor: '#92400e'
    },
    PENDIENTE: { 
      label: '❌ Pago pendiente', 
      color: '#dc2626', 
      bgColor: '#fee2e2',
      darkBgColor: '#991b1b'
    },
    SIN_FACTURA: { 
      label: '📄 Sin factura', 
      color: '#6b7280', 
      bgColor: '#f3f4f6',
      darkBgColor: '#374151'
    }
  };
  
  const statusConfig = config[paymentStatus] || config.SIN_FACTURA;
  
  const tooltipContent = paymentInfo 
    ? `Total: $${paymentInfo.totalFacturado?.toFixed(2) || '0.00'} | Pagado: $${paymentInfo.totalPagado?.toFixed(2) || '0.00'} | Pendiente: $${paymentInfo.saldoPendiente?.toFixed(2) || '0.00'}`
    : 'Sin información de factura';
  
  return (
    <Tooltip title={tooltipContent} arrow>
      <Chip
        label={statusConfig.label}
        size="small"
        sx={{
          fontSize: '0.7rem',
          fontWeight: 600,
          height: 22,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? statusConfig.darkBgColor : statusConfig.bgColor,
          color: (theme) => theme.palette.mode === 'dark' ? '#fff' : statusConfig.color,
          border: '1px solid',
          borderColor: statusConfig.color,
          '& .MuiChip-label': { px: 1 }
        }}
      />
    </Tooltip>
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

const SegmentedControl = ({ value, onChange, options, label }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {label && <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>}
    <Box sx={{
      display: 'flex',
      bgcolor: 'action.hover', // gray-100 equivalent adapting to dark mode
      p: 0.5,
      borderRadius: 2,
      gap: 0.5
    }}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <Button
            key={option.value}
            onClick={() => onChange({ target: { value: option.value } })}
            disableRipple
            sx={{
              flex: 1,
              py: 0.5,
              textTransform: 'none',
              borderRadius: 1.5,
              bgcolor: isSelected ? 'background.paper' : 'transparent',
              color: isSelected ? 'text.primary' : 'text.secondary',
              boxShadow: isSelected ? '0px 1px 2px rgba(0,0,0,0.1)' : 'none',
              fontWeight: isSelected ? 600 : 400,
              minWidth: 'auto',
              border: '1px solid',
              borderColor: isSelected ? 'divider' : 'transparent',
              '&:hover': {
                bgcolor: isSelected ? 'background.paper' : 'action.hover'
              }
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </Box>
  </Box>
);

function formatLocalDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Helpers par DatePicker (Manejo local sin UTC)
const parseLocalISO = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatLocalISO = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function DocumentosUnificados({ onEstadisticasChange, documentoEspecifico, onDocumentoFound }) {
  const { documents } = useDocumentStore();
  const [documentos, setDocumentos] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matrizadores, setMatrizadores] = useState([]);

  // Estado para diálogo de entrega en bloque
  const [showBulkDeliveryDialog, setShowBulkDeliveryDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    matrizador: '',
    estado: '', // 🎯 ACTUALIZADO: Mostrar todos los estados por defecto (Recepción ahora se enfoca en marcar como listo)
    fechaDesde: '',
    fechaHasta: '',
  });


  const [searchQuery, setSearchQuery] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  // Orden
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [showModalEntrega, setShowModalEntrega] = useState(false);

  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentDocumento, setCurrentDocumento] = useState(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState('');

  // Estado para modal de detalles y fila clickeable
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailDocument, setDetailDocument] = useState(null);





  // Estados para modal de reversión
  const [reversionModalOpen, setReversionModalOpen] = useState(false);
  const [reversionLoading, setReversionLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });


  // Estados para navegación específica desde alertas
  const [highlightedDocument, setHighlightedDocument] = useState(null);
  const [scrollToDocument, setScrollToDocument] = useState(null);

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
        sortBy: sortBy,
        sortOrder: sortOrder
      };
      const result = await receptionService.getTodosDocumentos(params);
      if (result.success) {
        const docs = result.data.documents || [];
        setDocumentos(docs);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setError(null);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError('Error cargando documentos');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters, sortBy, sortOrder]);

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
      }
    };
    cargarMatrizadores();
  }, []);

  // Efecto para manejar navegación específica desde alertas
  useEffect(() => {
    if (documentoEspecifico && documentoEspecifico.autoSearch) {

      // Aplicar filtro automático por código de protocolo
      setFilters(prev => ({
        ...prev,
        search: documentoEspecifico.protocolNumber
      }));
      setSearchQuery(documentoEspecifico.protocolNumber);

      // Setear para highlight y scroll
      setHighlightedDocument(documentoEspecifico.id);
      setScrollToDocument(documentoEspecifico.id);

      // Resetear página a 0 para asegurar que encuentre el documento
      setPage(0);
    }
  }, [documentoEspecifico]);

  // Efecto para manejar scroll y highlight después de cargar documentos
  useEffect(() => {
    if (scrollToDocument && documentos.length > 0) {
      // Buscar el documento en la lista actual
      const foundDocument = documentos.find(doc => doc.id === scrollToDocument);

      if (foundDocument) {

        // Hacer scroll al documento (con un pequeño delay para asegurar que el DOM esté actualizado)
        setTimeout(() => {
          const documentRow = document.querySelector(`[data-document-id="${scrollToDocument}"]`);
          if (documentRow) {
            documentRow.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });

            // Limpiar estados después del scroll
            setTimeout(() => {
              setHighlightedDocument(null);
              setScrollToDocument(null);
              if (onDocumentoFound) {
                onDocumentoFound();
              }
            }, 2000); // Mantener highlight por 2 segundos
          }
        }, 100);
      }
    }
  }, [documentos, scrollToDocument, onDocumentoFound]);

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
      } else {
        // Fallback conservador por si el estado actionType se perdió
        if (currentDocumento?.id) {
          result = await receptionService.marcarComoListo(currentDocumento.id);
        } else if (selectedDocuments.length > 0) {
          result = await receptionService.marcarGrupoListo(selectedDocuments);
        }
      }

      // Verificar que result existe y es un objeto válido
      if (!result) {
        throw new Error('El servicio no retornó una respuesta válida');
      }

      if (result.success === true) {
        // Notificación global según WhatsApp
        const w = result.data?.whatsapp || {};
        const sentLike = !!(w.sent || ['sent', 'queued', 'delivered'].includes(w.status) || w.sid || w.messageId);
        if (sentLike) {
          toast.success('Documento(s) marcados como LISTO. WhatsApp enviado.');
        } else if (w.skipped) {
          toast.info('Documento(s) marcados como LISTO. No se envió WhatsApp (preferencia no notificar).');
        } else if (w.error) {
          toast.error(`Marcado como LISTO, pero WhatsApp falló: ${w.error}`);
        } else {
          toast.success(result.message || 'Documento(s) marcado(s) como listo(s) exitosamente');
        }
        // Mantener snackbar local para compatibilidad visual existente
        setSnackbar({ open: true, message: result.message || 'Documento(s) marcado(s) como listo(s) exitosamente', severity: 'success' });
        await cargarDocumentos();

        // Forzar re-render para asegurar actualización visual
        setTimeout(async () => {
          await cargarDocumentos();
        }, 100);

        onEstadisticasChange?.();
        setSelectedDocuments([]);
      } else {
        // Crear mensaje de error más específico
        let errorMessage = 'Error inesperado al marcar como listo';
        if (result?.error) {
          errorMessage = result.error;
        } else if (result?.message) {
          errorMessage = result.message;
        } else if (result.success === false && !result.error && !result.message) {
          errorMessage = 'El servicio retornó un error sin mensaje específico';
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      const msg = error.message || 'Error al marcar documento(s) como listo(s)';
      setSnackbar({ open: true, message: msg, severity: 'error' });
      toast.error(msg);
    } finally {
      cerrarConfirmacion();
    }
  };

  // Funciones de reversión de estado
  const abrirReversionModal = (documento) => {
    setCurrentDocumento(documento);
    setReversionModalOpen(true);
    handleMenuClose();
  };

  const cerrarReversionModal = () => {
    if (!reversionLoading) {
      setReversionModalOpen(false);
      setCurrentDocumento(null);
    }
  };

  const ejecutarReversion = async ({ documentId, newStatus, reversionReason }) => {
    try {
      setReversionLoading(true);

      const result = await receptionService.revertirEstadoDocumento(documentId, newStatus, reversionReason);


      if (result.success) {
        setSnackbar({
          open: true,
          message: result.message || 'Documento revertido exitosamente',
          severity: 'success'
        });

        // Recargar documentos y estadísticas
        await cargarDocumentos();
        onEstadisticasChange?.();
        cerrarReversionModal();
      } else {
        throw new Error(result.error || 'Error en la reversión del documento');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error al revertir el documento',
        severity: 'error'
      });
    } finally {
      setReversionLoading(false);
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
    setShowBulkDeliveryDialog(false);
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

  // Alternar orden por fecha
  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const setSortField = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Documentos ordenados en memoria por fecha
  const documentosOrdenados = useMemo(() => {
    const dateKeys = ['fechaFactura', 'createdAt', 'fechaCreacion', 'created_at'];
    const defaultDateKey = documentos[0]?.fechaFactura ? 'fechaFactura' : (documentos[0]?.fechaCreacion ? 'fechaCreacion' : 'createdAt');
    const field = sortBy || defaultDateKey;
    const sorted = [...documentos].sort((a, b) => {
      // 🆕 PRIORIDAD POR ESTADO: LISTO > EN_PROCESO > OTROS (para Recepción)
      const prioridad = {
        'LISTO': 1,           // Mayor prioridad: listos para entregar
        'EN_PROCESO': 2,      // Segunda prioridad: en proceso
        'PENDIENTE': 3,
        'CANCELADO': 4,
        'ENTREGADO': 5        // Menor prioridad
      };

      const prioA = prioridad[a.status] || 99;
      const prioB = prioridad[b.status] || 99;

      // Si tienen diferente prioridad, ordenar por prioridad
      if (prioA !== prioB) {
        return prioA - prioB;
      }

      // Si tienen misma prioridad, aplicar ordenamiento por campo seleccionado
      let aVal = a[field] ?? a.fechaFactura ?? a.fechaCreacion ?? a.createdAt;
      let bVal = b[field] ?? b.fechaFactura ?? b.fechaCreacion ?? b.createdAt;

      if (dateKeys.includes(field)) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [documentos, sortBy, sortOrder]);
  const cerrarSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const documentosSeleccionadosMismoCliente = () => {
    if (selectedDocuments.length <= 1) return true;
    const docs = documentos.filter(doc => selectedDocuments.includes(doc.id));
    return new Set(docs.map(doc => doc.clientName)).size === 1;
  };

  // Mostrar botón Agrupar solo si hay más de un documento de ese cliente en la lista
  const hasMoreThanOneForClient = (doc) => {
    if (!doc) return false;
    const sameClientDocs = documentos.filter(d => {
      if (d.id === doc.id) return false;
      if (!['EN_PROCESO', 'LISTO'].includes(d.status)) return false;
      const sameName = d.clientName === doc.clientName;
      const sameId = doc.clientId ? d.clientId === doc.clientId : true;
      return sameName && sameId;
    });
    // ✅ Deduplicar por protocolo para evitar contar duplicados y excluir principal
    const seen = new Set();
    const unique = sameClientDocs.filter(d => {
      const key = d.protocolNumber || d.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.length > 0;
  };

  const getSelectedDocumentsAction = () => {
    const docs = documentos.filter(doc => selectedDocuments.includes(doc.id));
    const enProceso = docs.filter(doc => doc.status === 'EN_PROCESO');
    const listos = docs.filter(doc => doc.status === 'LISTO');
    // ✅ Marcar LISTO requiere mismo cliente; Entregar permite múltiples clientes (ej: mensajero)
    const disabledForListo = !documentosSeleccionadosMismoCliente();

    if (enProceso.length > 0 && listos.length === 0) {
      return { action: 'marcar-listo', text: `Marcar ${enProceso.length} como Listo`, color: 'success', disabled: disabledForListo };
    }
    if (listos.length > 0 && enProceso.length === 0) {
      // ✅ Entrega masiva habilitada para múltiples clientes (ej: mensajero retira varios)
      return { action: 'entregar', text: `Entregar ${listos.length} docs`, color: 'primary', disabled: false };
    }
    return { action: 'mixto', text: 'Estados mixtos', color: 'warning', disabled: true };
  };





  /**
   * Alternar selección de documento
   */
  const handleToggleSelection = (documentId) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.includes(documentId);
      if (isSelected) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  /**
   * Seleccionar/deseleccionar todos los documentos visibles
   */
  const handleToggleAll = (selectAll) => {
    if (selectAll) {
      const visibleIds = documentos.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(doc => doc.id);
      // Añadir solo los que no están ya seleccionados
      setSelectedDocuments(prev => {
        const newSelection = [...prev];
        visibleIds.forEach(id => {
          if (!newSelection.includes(id)) newSelection.push(id);
        });
        return newSelection;
      });
    } else {
      // Remover los visibles de la selección actual
      const visibleIds = documentos.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(doc => doc.id);
      setSelectedDocuments(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  /**
   * Abrir modal de entrega en bloque
   */
  const handleOpenBulkDelivery = () => {
    if (selectedDocuments.length === 0) {
      setSnackbar({
        open: true,
        message: 'Seleccione al menos un documento',
        severity: 'warning'
      });
      return;
    }
    setShowBulkDeliveryDialog(true);
  };

  /**
   * Completar entrega en bloque
   */
  const handleBulkDeliveryComplete = async () => {
    setSelectedDocuments([]);
    setShowBulkDeliveryDialog(false);
    await cargarDocumentos();
    onEstadisticasChange?.();
    setSnackbar({
      open: true,
      message: 'Entrega en bloque completada exitosamente',
      severity: 'success'
    });
  };

  // Calcular documentos paginados
  // CORRECCIÓN: Si es paginación server-side, los documentos ya vienen paginados y corresponden a la página actual.
  // No debemos hacer slice usando page * rowsPerPage porque el array solo contiene los elementos de la página.
  const documentosPaginados = documentosOrdenados;




  // Verificar estado de selección para checkbox master
  const allSelected = documentosPaginados.length > 0 && documentosPaginados.every(doc => selectedDocuments.includes(doc.id));
  const someSelected = documentosPaginados.some(doc => selectedDocuments.includes(doc.id));

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>📋 Gestión de Documentos</Typography>
            <Typography variant="body1" color="text.secondary">Vista unificada para marcar, entregar y consultar documentos.</Typography>
          </Box>



        </Box>

        <Card sx={{ mb: 3, overflow: 'visible' }}>
          <CardContent>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                {/* Fila 1: Búsqueda y Estados */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap-reverse', gap: 2 }}>
                  {/* Búsqueda a la izquierda */}
                  <TextField
                    size="small"
                    placeholder="Buscar por cliente, teléfono, protocolo o acto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ flex: 1, minWidth: 280, maxWidth: 500 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery && (
                        <InputAdornment position="end">
                          <Tooltip title="Limpiar búsqueda">
                            <IconButton size="small" onClick={handleClearSearch}>
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                  />

                  {/* Tabs/Pills de Estado a la derecha */}
                  <Box sx={{ minWidth: 280, ml: 'auto' }}>
                    <SegmentedControl
                      value={filters.estado || ''}
                      onChange={(e) => handleFilterChange('estado', e.target.value)}
                      options={[
                        { value: '', label: 'Todos' },
                        { value: 'EN_PROCESO', label: 'En Proceso' },
                        { value: 'LISTO', label: 'Listo' },
                        { value: 'ENTREGADO', label: 'Entregado' }
                      ]}
                    />
                  </Box>
                </Box>

                {/* Fila 2: Filtros secundarios (Fechas, Matrizador, Orden) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>

                  {/* Grupo Fechas Fusionado */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid',
                    borderColor: 'action.disabledBackground',
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'background.paper'
                  }}>
                    <DatePicker
                      value={parseLocalISO(filters.fechaDesde)}
                      onChange={(d) => handleFilterChange('fechaDesde', formatLocalISO(d))}
                      format="dd/MM/yyyy"
                      slotProps={{
                        textField: {
                          size: 'small',
                          placeholder: 'Desde',
                          variant: 'standard',
                          InputProps: { disableUnderline: true, sx: { px: 1.5, py: 0.5, fontSize: '0.875rem', width: 120 } }
                        }
                      }}
                    />
                    <Box sx={{ px: 0.5, color: 'text.disabled', userSelect: 'none' }}>→</Box>
                    <DatePicker
                      value={parseLocalISO(filters.fechaHasta)}
                      onChange={(d) => handleFilterChange('fechaHasta', formatLocalISO(d))}
                      format="dd/MM/yyyy"
                      minDate={parseLocalISO(filters.fechaDesde)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          placeholder: 'Hasta',
                          variant: 'standard',
                          InputProps: { disableUnderline: true, sx: { px: 1.5, py: 0.5, fontSize: '0.875rem', width: 120 } }
                        }
                      }}
                    />
                  </Box>

                  {/* Selector Matrizador */}
                  <FormControl size="small" sx={{ minWidth: 200, maxWidth: 250 }}>
                    <Select
                      value={filters.matrizador}
                      onChange={(e) => handleFilterChange('matrizador', e.target.value)}
                      displayEmpty
                      renderValue={(selected) => {
                        if (!selected) return <Typography variant="body2" color="text.secondary">Matrizador: Todos</Typography>;
                        const mat = matrizadores.find(m => m.id === selected);
                        return mat ? (mat.nombre || `${mat.firstName} ${mat.lastName}`) : selected;
                      }}
                      sx={{ '& .MuiSelect-select': { py: 0.85 } }}
                    >
                      <MenuItem value="">Todos los matrizadores</MenuItem>
                      {matrizadores.map(mat => (
                        <MenuItem key={mat.id} value={mat.id}>{mat.nombre || `${mat.firstName} ${mat.lastName}`}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Botón Orden */}
                  <Tooltip title={`Ordenar por fecha (${sortOrder === 'asc' ? 'Ascendente' : 'Descendente'})`}>
                    <IconButton
                      onClick={toggleSortOrder}
                      size="small"
                      sx={{ border: '1px solid', borderColor: 'action.disabledBackground', borderRadius: 1 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </Typography>
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Refrescar datos">
                    <IconButton onClick={() => cargarDocumentos()} color="primary" size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>

                  {/* Reset */}
                  <Typography
                    variant="caption"
                    onClick={() => {
                      setFilters(prev => ({ ...prev, matrizador: '', fechaDesde: '', fechaHasta: '', estado: '' }));
                      setSearchQuery('');
                      setPage(0);
                    }}
                    sx={{
                      color: 'text.secondary',
                      cursor: 'pointer',
                      ml: 'auto',
                      textDecoration: 'underline',
                      textUnderlineOffset: 4,
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: 'error.main'
                      }
                    }}
                  >
                    Limpiar filtros
                  </Typography>

                </Box>
              </Box>
            </LocalizationProvider>
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
                    indeterminate={someSelected && !allSelected}
                    checked={allSelected}
                    onChange={(e) => handleToggleAll(e.target.checked)}
                    disabled={documentosPaginados.length === 0}
                    color="primary"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>
                  <TableSortLabel
                    active={sortBy === 'clientName'}
                    direction={sortBy === 'clientName' ? sortOrder : 'asc'}
                    onClick={() => setSortField('clientName')}
                  >
                    Cliente / Documento
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Matrizador</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>
                  <TableSortLabel
                    active={sortBy === 'fechaFactura'}
                    direction={sortBy === 'fechaFactura' ? sortOrder : 'asc'}
                    onClick={() => {
                      setSortBy('fechaFactura');
                      toggleSortOrder();
                    }}
                  >
                    Fecha Factura
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2, minWidth: 120 }}>Estado</TableCell>
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
                documentosOrdenados.map((documento) => (
                  <TableRow
                    key={documento.id}
                    selected={selectedDocuments.includes(documento.id)}
                    hover
                    onClick={() => abrirDetalles(documento)}
                    data-document-id={documento.id} // Para scroll automático
                    sx={{
                      cursor: 'pointer',
                      ...(selectedDocuments.includes(documento.id) && {
                        bgcolor: 'action.selected'
                      }),
                      // Highlight para navegación específica desde alertas
                      ...(highlightedDocument === documento.id && {
                        bgcolor: 'warning.light',
                        '&:hover': {
                          bgcolor: 'warning.main'
                        },
                        animation: 'pulse 1.5s ease-in-out 3',
                        '@keyframes pulse': {
                          '0%': {
                            transform: 'scale(1)',
                            opacity: 1
                          },
                          '50%': {
                            transform: 'scale(1.02)',
                            opacity: 0.9
                          },
                          '100%': {
                            transform: 'scale(1)',
                            opacity: 1
                          }
                        }
                      })
                    }}
                  >
                    <TableCell
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()} // Evitar que abra el modal
                    >
                      <Checkbox
                        checked={selectedDocuments.includes(documento.id)}
                        onChange={() => handleToggleSelection(documento.id)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box>
                        <Tooltip title="Click para buscar todos los documentos de este cliente" arrow>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              cursor: 'pointer',
                              '&:hover': {
                                color: 'primary.main',
                                textDecoration: 'underline'
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(documento.clientName);
                              setFilters(prev => ({ ...prev, search: documento.clientName }));
                              // Scroll suave al inicio para ver los resultados
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            {documento.clientName}
                          </Typography>
                        </Tooltip>
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
                        {/* Acto Principal visible para Recepción */}
                        {documento.actoPrincipalDescripcion && (
                          <Typography
                            variant="caption"
                            component="div"
                            sx={{
                              mt: 0.25,
                              color: (theme) => theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280'
                            }}
                          >
                            Acto: {documento.actoPrincipalDescripcion}
                          </Typography>
                        )}
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
                        {new Date(documento.fechaFactura || documento.fechaCreacion).toLocaleDateString('es-EC', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(documento.fechaFactura || documento.fechaCreacion).toLocaleTimeString('es-EC', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <StatusIndicator status={documento.status} />
                        {/* Indicador de estado de pago */}
                        <PaymentIndicator 
                          paymentStatus={documento.paymentStatus} 
                          paymentInfo={documento.paymentInfo}
                          documentStatus={documento.status}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                        {/* Botón Detalles - SIEMPRE VISIBLE */}
                        <Tooltip title="Ver detalles e historial">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={(e) => { e.stopPropagation(); abrirDetalles(documento); }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Botón principal según estado */}
                        {documento.status === 'EN_PROCESO' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={(e) => { e.stopPropagation(); abrirConfirmacionIndividual(documento); }}
                          >
                            Marcar Listo
                          </Button>
                        )}

                        {documento.status === 'LISTO' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<SendIcon />}
                            onClick={(e) => { e.stopPropagation(); abrirModalEntrega(documento); }}
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
                            Entregado

                          </Typography>
                        )}

                        {/* Botón de revertir estado (directo) - SIEMPRE VISIBLE para LISTO/ENTREGADO */}
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
                                ml: 1, // Margen izquierdo para separarlo
                              }}
                            >
                              <UndoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <IconButton
                          size="small"
                          aria-label="more actions"
                          onClick={(event) => { event.stopPropagation(); handleMenuOpen(event, documento); }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
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




        {/* Separador visual para opciones de reversión */}
        {currentDocumento && ['LISTO', 'ENTREGADO'].includes(currentDocumento.status) && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', my: 0.5 }} />
        )}

      </Menu>

      <Dialog open={showConfirmDialog} onClose={cerrarConfirmacion} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType === 'individual' ? '🎯 Marcar Documento como Listo' : '👥 Marcar Grupo como Listo'}</DialogTitle>
        <DialogContent>
          {actionType === 'individual' && currentDocumento && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>¿Está seguro que desea marcar este documento como LISTO?</Typography>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
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
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Documentos:</strong> {selectedDocuments.length}</Typography>
                <Typography variant="body2"><strong>Cliente:</strong> {documentos.find(d => selectedDocuments.includes(d.id))?.clientName}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Se generarán códigos para cada documento.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarConfirmacion}>Cancelar</Button>
          <Button
            onClick={ejecutarMarcarListo}
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={!((actionType === 'individual' && currentDocumento) || (actionType === 'grupal' && selectedDocuments.length > 0))}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {showModalEntrega && documentoSeleccionado && <ModalEntrega documento={documentoSeleccionado} onClose={cerrarModales} onEntregaExitosa={onEntregaCompletada} />}






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

      {/* Modal de reversión de estado */}
      <ReversionModal
        open={reversionModalOpen}
        onClose={cerrarReversionModal}
        documento={currentDocumento}
        onConfirm={ejecutarReversion}
        loading={reversionLoading}
      />

      {/* 🎯 NUEVO: Modal de entrega en bloque */}
      <BulkDeliveryDialog
        open={showBulkDeliveryDialog}
        onClose={() => setShowBulkDeliveryDialog(false)}
        documentIds={selectedDocuments}
        documents={documentos.filter(d => selectedDocuments.includes(d.id))}
        onDeliveryComplete={handleBulkDeliveryComplete}
      />

      {/* 🎯 NUEVO: Barra flotante fija en parte inferior */}
      {selectedDocuments.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 3,
            py: 1.5,
            borderRadius: '24px',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
            border: (theme) => `2px solid ${theme.palette.primary.main}`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          }}
        >
          <Chip
            label={`${selectedDocuments.length} seleccionado${selectedDocuments.length > 1 ? 's' : ''}`}
            color="primary"
            sx={{ fontWeight: 600 }}
          />

          {selectedAction.action === 'marcar-listo' && (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircleIcon />}
              disabled={selectedAction.disabled}
              onClick={abrirConfirmacionGrupal}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              LISTO
            </Button>
          )}

          {selectedAction.action === 'entregar' && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<LocalShippingIcon />}
              disabled={selectedAction.disabled}
              onClick={handleOpenBulkDelivery}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Entregar
            </Button>
          )}

          {selectedAction.action === 'mixto' && (
            <Typography variant="body2" color="text.secondary">
              Estados mixtos
            </Typography>
          )}

          <IconButton
            size="small"
            onClick={() => setSelectedDocuments([])}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: 'error.main', color: 'white' }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

export default DocumentosUnificados;
