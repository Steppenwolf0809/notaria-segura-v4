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
  FormControlLabel,
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
  TableSortLabel,
  Tabs,
  Tab,
  Pagination
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
  GroupWork as GroupWorkIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import ModalEntrega from './ModalEntrega';
import ModalEntregaGrupal from './ModalEntregaGrupal';
import ReversionModal from './ReversionModal';
import QuickGroupingModal from '../grouping/QuickGroupingModal';
import GroupInfoModal from '../shared/GroupInfoModal';
import DocumentDetailModal from '../Documents/DocumentDetailModal';
import GroupingDetector from '../grouping/GroupingDetector';
import receptionService from '../../services/reception-service';
import documentService from '../../services/document-service';
import useDocumentStore from '../../store/document-store';
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

function DocumentosUnificados({ onEstadisticasChange, documentoEspecifico, onDocumentoFound }) {
  const { createDocumentGroup, detectGroupableDocuments } = useDocumentStore();
  const [documentos, setDocumentos] = useState([]);
  // pestañas: 'pendientes' (EN_PROCESO + LISTO) | 'entregados' (ENTREGADO)
  const [activeTab, setActiveTab] = useState('pendientes');
  const [selectedDocuments, setSelectedDocuments] = useState([]); // Solo para visualización
  const [visualSelection, setVisualSelection] = useState(new Set()); // 🎯 NUEVA: Selección visual sin funcionalidad
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matrizadores, setMatrizadores] = useState([]);
  
  const [filters, setFilters] = useState({
    search: '',
    matrizador: '',
    estado: '', // 🎯 ACTUALIZADO: Mostrar todos los estados por defecto (Recepción ahora se enfoca en marcar como listo)
    fechaDesde: '',
    fechaHasta: '',
    globalSearchAllStates: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  
  const [pagePendientes, setPagePendientes] = useState(0);
  const [pageEntregados, setPageEntregados] = useState(0);
  // límite por página solicitado: 25, 50 y 100
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  // Orden
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

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
  
  // Estados para modal de reversión
  const [reversionModalOpen, setReversionModalOpen] = useState(false);
  const [reversionLoading, setReversionLoading] = useState(false);
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // Cache de conteos de agrupables por cliente (clave: name|id)
  const [groupableCountCache, setGroupableCountCache] = useState(new Map());

  // Estados para navegación específica desde alertas
  const [highlightedDocument, setHighlightedDocument] = useState(null);
  const [scrollToDocument, setScrollToDocument] = useState(null);

  const cargarDocumentos = useCallback(async () => {
    try {
      setLoading(true);
      const currentPage = (activeTab === 'entregados' ? pageEntregados : pagePendientes) + 1;

      const hasSearch = !!(filters.search && filters.search.trim());
      const useGlobalSearch = hasSearch && !!filters.globalSearchAllStates;

      // BÚSQUEDA GLOBAL: si hay término de búsqueda y flag activo, ignorar pestaña y estado
      if (useGlobalSearch) {
        const baseParams = {
          page: String(currentPage),
          limit: String(Math.max(rowsPerPage, 500)), // ampliar más para filtro local
          sortBy: sortBy,
          sortOrder: sortOrder,
          search: filters.search
        };
        if (filters.matrizador) baseParams.matrizador = filters.matrizador;
        if (filters.fechaDesde) baseParams.fechaDesde = filters.fechaDesde;
        if (filters.fechaHasta) baseParams.fechaHasta = filters.fechaHasta;

        let docs = [];
        try {
          // Intentar búsqueda directa en backend
          const result = await receptionService.getTodosDocumentos(baseParams);
          if (!result.success) throw new Error(result.error);
          docs = result.data.documents || [];
        } catch (e) {
          console.warn('Búsqueda backend 500, fallback a filtro local (multipágina):', e);
          // Fallback: descargar varias páginas sin search y filtrar local
          const pageSize = 250;
          let page = 1;
          let totalPages = 5; // valor inicial hasta conocer real
          const aggregated = [];

          while (page <= totalPages && aggregated.length < 2000) {
            const fbRes = await receptionService.getTodosDocumentos({
              page: String(page),
              limit: String(pageSize),
              sortBy,
              sortOrder
            });
            if (fbRes && fbRes.success) {
              const payload = fbRes.data || {};
              aggregated.push(...(payload.documents || []));
              const pag = payload.pagination || {};
              totalPages = Number(pag.totalPages || totalPages);
              page += 1;
            } else {
              // Si una página falla, cortar para evitar bucles
              console.warn('Fallo al cargar página para fallback local:', fbRes?.error);
              break;
            }
          }
          docs = aggregated;
        }

        // Normalización e índice local por término (global, sin importar pestaña)
        const termRaw = filters.search.toString().toLowerCase().trim();
        const normalize = (v) => (v || '')
          .toString()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // quitar acentos
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '');
        const term = normalize(termRaw);
        const includes = (v) => {
          const s = (v || '').toString().toLowerCase();
          if (!term) return true;
          return s.includes(termRaw) || normalize(v).includes(term);
        };
        const filtered = docs.filter(d =>
          includes(d.clientName) ||
          includes(d.protocolNumber) ||
          includes(d.clientId) ||
          includes(d.actoPrincipalDescripcion) ||
          includes(d.detalle_documento) ||
          includes(d.clientPhone) ||
          includes(d.clientEmail)
        );

        setDocumentos(filtered);
        setTotalCount(filtered.length);
        setTotalPages(1);
        setError(null);
        return; // evitar lógica por pestaña
      }

      if (activeTab === 'entregados') {
        // Usar endpoint de Recepción con filtro de estado para evitar 403 por rol
        const baseParams = {
          page: String(currentPage),
          limit: String(rowsPerPage),
          sortBy: sortBy,
          sortOrder: sortOrder,
          estado: 'ENTREGADO'
        };
        if (filters.search) baseParams.search = filters.search;
        if (filters.matrizador) baseParams.matrizador = filters.matrizador;
        if (filters.fechaDesde) baseParams.fechaDesde = filters.fechaDesde;
        if (filters.fechaHasta) baseParams.fechaHasta = filters.fechaHasta;

        try {
          const result = await receptionService.getTodosDocumentos(baseParams);
          if (!result.success) throw new Error(result.error);

          const docs = result.data.documents || [];
          setDocumentos(docs);

          const pag = result.data.pagination || {};
          const total = Number(pag.total || 0);
          setTotalCount(total);
          setTotalPages(Number(pag.totalPages || Math.ceil(total / rowsPerPage)) || 1);
          setError(null);
        } catch (fetchErr) {
          console.warn('Fallo búsqueda en ENTREGADOS, usando fallback local:', fetchErr);
          // Reintentar sin search y filtrar en frontend
          const { search, ...restFilters } = filters;
          const fallbackParams = { ...baseParams };
          delete fallbackParams.search;

          const fbRes = await receptionService.getTodosDocumentos(fallbackParams);
          if (fbRes && fbRes.success) {
            const allDocs = fbRes.data.documents || [];
            const term = (filters.search || '').toString().toLowerCase();
            const matches = (value) => (value || '').toString().toLowerCase().includes(term);
            const filtered = term
              ? allDocs.filter(d =>
                  matches(d.clientName) ||
                  matches(d.protocolNumber) ||
                  matches(d.clientId) ||
                  matches(d.actoPrincipalDescripcion) ||
                  matches(d.detalle_documento)
                )
              : allDocs;

            setDocumentos(filtered);
            // Sin total exacto del backend para el término, usar conteo local
            setTotalCount(filtered.length);
            setTotalPages(1);
            setError(null);
          } else {
            throw new Error(fbRes?.error || 'Error cargando documentos ENTREGADOS');
          }
        }
      } else {
        // Pestaña principal: EN_PROCESO + LISTO (excluir ENTREGADO)
        const baseParams = {
          page: String(currentPage),
          limit: String(rowsPerPage),
          sortBy: sortBy,
          sortOrder: sortOrder
        };
        if (filters.search) baseParams.search = filters.search;
        if (filters.matrizador) baseParams.matrizador = filters.matrizador;
        if (filters.fechaDesde) baseParams.fechaDesde = filters.fechaDesde;
        if (filters.fechaHasta) baseParams.fechaHasta = filters.fechaHasta;

        const result = await receptionService.getTodosDocumentos(baseParams);
        if (!result.success) throw new Error(result.error);

        const docsAll = result.data.documents || [];
        const docs = docsAll.filter(d => d.status === 'EN_PROCESO' || d.status === 'LISTO');
        setDocumentos(docs);

        // Calcular total exacto sumando conteos por estado
        const [enProcesoCountRes, listoCountRes] = await Promise.all([
          receptionService.getTodosDocumentos({ ...baseParams, page: '1', limit: '1', estado: 'EN_PROCESO' }),
          receptionService.getTodosDocumentos({ ...baseParams, page: '1', limit: '1', estado: 'LISTO' })
        ]);
        const totalEnProceso = enProcesoCountRes.success ? (enProcesoCountRes.data.pagination?.total || 0) : 0;
        const totalListo = listoCountRes.success ? (listoCountRes.data.pagination?.total || 0) : 0;
        const total = totalEnProceso + totalListo;
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / rowsPerPage)));
        setError(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error cargando documentos');
    } finally {
      setLoading(false);
    }
  }, [pagePendientes, pageEntregados, rowsPerPage, filters.search, filters.matrizador, filters.estado, filters.fechaDesde, filters.fechaHasta, sortBy, sortOrder, activeTab]);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  // Resetear paginación cuando cambia el término de búsqueda para que sea global
  useEffect(() => {
    setPagePendientes(0);
    setPageEntregados(0);
  }, [filters.search]);

  // Persistir el flag de búsqueda global en localStorage (default OFF)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ns-recepcion-global-search');
      if (saved !== null) {
        setFilters(prev => ({ ...prev, globalSearchAllStates: saved === 'true' }));
      } else {
        localStorage.setItem('ns-recepcion-global-search', 'false');
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('ns-recepcion-global-search', String(!!filters.globalSearchAllStates));
    } catch {}
  }, [filters.globalSearchAllStates]);

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

  // Efecto para manejar navegación específica desde alertas
  useEffect(() => {
    if (documentoEspecifico && documentoEspecifico.autoSearch) {
      console.log('🎯 Navegación específica a documento:', documentoEspecifico);
      
      // Aplicar filtro automático por código de protocolo
      setFilters(prev => ({
        ...prev,
        search: documentoEspecifico.protocolNumber
      }));
      setSearchQuery(documentoEspecifico.protocolNumber);
      
      // Setear para highlight y scroll
      setHighlightedDocument(documentoEspecifico.id);
      setScrollToDocument(documentoEspecifico.id);
      
      // Resetear páginas para asegurar que encuentre el documento
      setPagePendientes(0);
      setPageEntregados(0);
    }
  }, [documentoEspecifico]);

  // Efecto para manejar scroll y highlight después de cargar documentos
  useEffect(() => {
    if (scrollToDocument && documentos.length > 0) {
      // Buscar el documento en la lista actual
      const foundDocument = documentos.find(doc => doc.id === scrollToDocument);
      
      if (foundDocument) {
        console.log('✅ Documento encontrado en la lista actual:', foundDocument);
        
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
    // Resetear paginación en ambas pestañas al cambiar filtros/búsqueda
    setPagePendientes(0);
    setPageEntregados(0);
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

  // Fallback: si en Pendientes con búsqueda no hay resultados, probar automáticamente Entregados
  useEffect(() => {
    if (activeTab === 'pendientes' && filters.search && !loading && documentos.length === 0) {
      // Evitar loop: solo cambiar si aún no estamos en entregados
      setActiveTab('entregados');
      setPageEntregados(0);
    }
  }, [activeTab, filters.search, loading, documentos.length]);

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
      
      console.log('🎯 Iniciando marcar como listo:', {
        actionType,
        documentoId: currentDocumento?.id,
        selectedDocuments: selectedDocuments.length,
        timestamp: new Date().toISOString()
      });
      
      if (actionType === 'individual' && currentDocumento) {
        console.log('📄 Marcando documento individual:', currentDocumento.id);
        result = await receptionService.marcarComoListo(currentDocumento.id);
      } else if (actionType === 'grupal' && selectedDocuments.length > 0) {
        console.log('📁 Marcando grupo de documentos:', selectedDocuments);
        result = await receptionService.marcarGrupoListo(selectedDocuments);
      } else {
        // Fallback conservador por si el estado actionType se perdió
        if (currentDocumento?.id) {
          console.warn('⚠️ actionType no definido; aplicando fallback a individual');
          result = await receptionService.marcarComoListo(currentDocumento.id);
        } else if (selectedDocuments.length > 0) {
          console.warn('⚠️ actionType no definido; aplicando fallback a grupal');
          result = await receptionService.marcarGrupoListo(selectedDocuments);
        }
      }

      console.log('✅ Resultado completo del servicio:', {
        result,
        type: typeof result,
        success: result?.success,
        error: result?.error,
        message: result?.message,
        keys: result ? Object.keys(result) : 'null/undefined'
      });

      // Verificar que result existe y es un objeto válido
      if (!result) {
        console.error('❌ Resultado del servicio es null/undefined');
        throw new Error('El servicio no retornó una respuesta válida');
      }

      if (result.success === true) {
        // Notificación global según WhatsApp
        const w = result.data?.whatsapp || {};
        const sentLike = !!(w.sent || ['sent','queued','delivered'].includes(w.status) || w.sid || w.messageId);
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
        console.log('🔄 Recargando documentos...');
        await cargarDocumentos();
        console.log('📊 Actualizando estadísticas...');
        onEstadisticasChange?.();
        setSelectedDocuments([]);
        console.log('✅ Proceso completado exitosamente');
      } else {
        console.error('❌ Error en resultado del servicio:', {
          success: result?.success,
          error: result?.error,
          message: result?.message,
          fullResult: result
        });
        
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
      console.error('Error marcando como listo:', error);
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
      
      console.log('🔄 Iniciando reversión de documento:', {
        documentId,
        newStatus,
        reversionReason,
        timestamp: new Date().toISOString()
      });

      const result = await receptionService.revertirEstadoDocumento(documentId, newStatus, reversionReason);

      console.log('✅ Resultado de reversión:', result);

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
      console.error('❌ Error en reversión:', error);
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
    if (activeTab === 'entregados') {
      setPageEntregados(newPage);
    } else {
      setPagePendientes(newPage);
    }
  };
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    if (activeTab === 'entregados') {
      setPageEntregados(0);
    } else {
      setPagePendientes(0);
    }
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
    const dateKeys = ['createdAt','fechaCreacion','created_at'];
    const defaultDateKey = documentos[0]?.fechaCreacion ? 'fechaCreacion' : 'createdAt';
    const field = sortBy || defaultDateKey;
    const sorted = [...documentos].sort((a, b) => {
      let aVal = a[field] ?? a[defaultDateKey] ?? a.createdAt ?? a.fechaCreacion;
      let bVal = b[field] ?? b[defaultDateKey] ?? b.createdAt ?? b.fechaCreacion;

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
      return sameName && sameId && !d.isGrouped;
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
    const currentPageIndex = activeTab === 'entregados' ? pageEntregados : pagePendientes;
    if (selectAll) {
      const visibleIds = documentos.slice(currentPageIndex * rowsPerPage, (currentPageIndex + 1) * rowsPerPage).map(doc => doc.id);
      setVisualSelection(new Set(visibleIds));
    } else {
      setVisualSelection(new Set());
    }
  };

  // Calcular documentos paginados
  const currentPageIndex = activeTab === 'entregados' ? pageEntregados : pagePendientes;
  const documentosPaginados = documentos.slice(currentPageIndex * rowsPerPage, (currentPageIndex + 1) * rowsPerPage);
  
  // Prefetch de conteos por cliente para los documentos visibles
  useEffect(() => {
    const fetchCounts = async () => {
      const candidates = documentosPaginados.filter(d => ['EN_PROCESO','LISTO'].includes(d.status) && !d.isGrouped);
      for (const doc of candidates) {
        const key = `${doc.clientName}|${doc.clientId || ''}`;
        if (groupableCountCache.has(key)) continue;
        try {
          const result = await detectGroupableDocuments({ clientName: doc.clientName, clientId: doc.clientId || '' });
          const uniqueCount = (result.groupableDocuments || []).reduce((acc, d) => {
            const k = d.protocolNumber || d.id;
            if (!acc.has(k)) acc.add(k);
            return acc;
          }, new Set()).size; // el backend ya incluye al principal
          setGroupableCountCache(prev => {
            const next = new Map(prev);
            next.set(key, uniqueCount);
            return next;
          });
        } catch (e) {
          // silencioso
        }
      }
    };
    fetchCounts();
  }, [documentosPaginados, currentPageIndex, rowsPerPage]);

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
      {/* Tabs principales: Pendientes vs Entregados */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => {
            setActiveTab(v);
            // sincronizar filtro de estado para que la UI sea consistente
            if (v === 'entregados') {
              setFilters(prev => ({ ...prev, estado: 'ENTREGADO' }));
            } else {
              // pestaña principal: mostrar EN_PROCESO + LISTO (excluir ENTREGADO)
              // limpiamos el filtro estado para permitir ambos y filtramos en cliente
              setFilters(prev => ({ ...prev, estado: '' }));
            }
            // Resetear página del tab de destino
            if (v === 'entregados') setPageEntregados(0); else setPagePendientes(0);
          }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="pendientes" label="Pendientes (En Proceso + Listos)" />
          <Tab value="entregados" label="Entregados" />
        </Tabs>
      </Box>
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
                  placeholder="Buscar por cliente, teléfono, protocolo o acto principal..."
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
              <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Button 
                  variant="outlined" 
                  onClick={toggleSortOrder}
                  sx={{ textTransform: 'none' }}
                >
                  {sortOrder === 'asc' ? 'Fecha ↑' : 'Fecha ↓'}
                </Button>
              </Grid>

              {/* Fila 2 */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!filters.globalSearchAllStates}
                      onChange={(e) => handleFilterChange('globalSearchAllStates', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2">Buscar en todos los estados</Typography>}
                />
              </Grid>
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
                    active={['createdAt','fechaCreacion'].includes(sortBy)}
                    direction={['createdAt','fechaCreacion'].includes(sortBy) ? sortOrder : 'asc'}
                    onClick={() => {
                      setSortBy(documentos[0]?.fechaCreacion ? 'fechaCreacion' : 'createdAt');
                      toggleSortOrder();
                    }}
                  >
                    Fecha Creación
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2, minWidth: 120 }}>Estado / Agrupación</TableCell>
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
                // filtrar según pestaña activa: principales excluye ENTREGADO
                (activeTab === 'pendientes'
                  ? documentosOrdenados.filter(d => d.status === 'EN_PROCESO' || d.status === 'LISTO')
                  : documentosOrdenados.filter(d => d.status === 'ENTREGADO')
                ).map((documento) => (
                  <TableRow 
                    key={documento.id} 
                    selected={visualSelection.has(documento.id)} 
                    hover
                    onClick={() => abrirDetalles(documento)}
                    data-document-id={documento.id} // Para scroll automático
                    sx={{ 
                      cursor: 'pointer',
                      ...(visualSelection.has(documento.id) && {
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
                        checked={visualSelection.has(documento.id)}
                        onChange={() => handleToggleVisualSelection(documento.id)}
                        color="primary"
                        // 🎯 Solo visual para Recepción (sin funcionalidad de cambio masivo)
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box>
                        {/* Al hacer clic en el nombre, autocompletar buscador y filtrar */}
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, textDecoration: 'underline', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const term = documento.clientName || '';
                            setSearchQuery(term);
                            handleFilterChange('search', term);
                          }}
                        >
                          {documento.clientName}
                        </Typography>
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
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <StatusIndicator status={documento.status} />
                        
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
                          // Mostrar botón solo si hay más de un documento del mismo cliente
                          ['EN_PROCESO', 'LISTO'].includes(documento.status) && hasMoreThanOneForClient(documento) && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              startIcon={<GroupWorkIcon />}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const result = await detectGroupableDocuments({
                                    clientName: documento.clientName,
                                    clientId: documento.clientId || ''
                                  });
                                  
                                  // ✅ Excluir el documento principal y deduplicar por protocolo
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
                                // Mostrar total devuelto por backend si está en caché (incluye principal)
                                const key = `${documento.clientName}|${documento.clientId || ''}`;
                                const count = groupableCountCache.get(key);
                                if (count && count > 1) return `Agrupar (${count})`;
                                // Fallback local (página actual)
                                const same = documentos.filter(d => d.id !== documento.id && ['EN_PROCESO','LISTO'].includes(d.status) && d.clientName === documento.clientName && (documento.clientId ? d.clientId === documento.clientId : true) && !d.isGrouped);
                                const uniqueCount = Array.from(new Set(same.map(d => d.protocolNumber || d.id))).length + 1;
                                return uniqueCount > 1 ? `Agrupar (${uniqueCount})` : 'Agrupar';
                              })()}
                            </Button>
                          )
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
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
                            Completado
                          </Typography>
                        )}
                        
                        {/* Botón de revertir estado (directo) - SIEMPRE VISIBLE para LISTO/ENTREGADO */}
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
                                ml: 1, // Margen izquierdo para separarlo
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="rows-per-page-label">Filas</InputLabel>
            <Select
              labelId="rows-per-page-label"
              label="Filas"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                // Resetear página del tab actual
                if (activeTab === 'entregados') setPageEntregados(0); else setPagePendientes(0);
              }}
            >
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
          <Pagination
            color="primary"
            page={(activeTab === 'entregados' ? pageEntregados : pagePendientes) + 1}
            count={Math.max(1, totalPages)}
            onChange={(_, value) => {
              if (activeTab === 'entregados') setPageEntregados(value - 1); else setPagePendientes(value - 1);
            }}
            showFirstButton
            showLastButton
          />
        </Box>
      </Card>
      
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { if (currentDocumento) abrirDetalles(currentDocumento); handleMenuClose(); }}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ver Detalles</ListItemText>
        </MenuItem>
        
        {/* Opción de ver información de grupo si está agrupado */}
        {currentDocumento?.isGrouped && (
          <MenuItem onClick={() => {
            handleOpenGroupInfo(currentDocumento);
            handleMenuClose();
          }}>
            <ListItemIcon><GroupWorkIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>Info del Grupo</ListItemText>
          </MenuItem>
        )}
        
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

      {/* Modal de reversión de estado */}
      <ReversionModal
        open={reversionModalOpen}
        onClose={cerrarReversionModal}
        documento={currentDocumento}
        onConfirm={ejecutarReversion}
        loading={reversionLoading}
      />

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
