import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Badge,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Tooltip,
  Checkbox,
  Button,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  Description as DocumentIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  AssignmentInd as AssignmentIndIcon
} from '@mui/icons-material';
import { useHotkeys } from 'react-hotkeys-hook';
import useReceptionsStore from '../store/receptions-store';
import DocumentDetailModal from './Documents/DocumentDetailModal.jsx';
// Toolbar y modal de acciones masivas (reutilizados)
import BulkActionToolbar from './bulk/BulkActionToolbar.jsx';
import BulkStatusChangeModal from './bulk/BulkStatusChangeModal.jsx';
import BulkDeliveryModal from './bulk/BulkDeliveryModal.jsx';
import receptionService from '../services/reception-service.js';
import documentService from '../services/document-service.js';
import { readFlag } from '../config/featureFlags.js';

/**
 * 🎯 Centro de Recepciones Unificado - UI Activos/Entregados
 * Componente principal que maneja la nueva interfaz de recepción con pestañas y búsqueda global
 */
const ReceptionCenter = () => {
  // 🔍 DEBUG: Verificar feature flag y log inicial
  const featureFlag = readFlag('VITE_UI_ACTIVOS_ENTREGADOS', true);
  console.log('🎯 RECEPTION-CENTER v2 mounted - Feature flag:', featureFlag);
  console.log('🎯 RECEPTION-CENTER v2 - Environment:', {
    NODE_ENV: import.meta.env.MODE,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_UI_ACTIVOS_ENTREGADOS: featureFlag
  });
  const {
    // Estado
    tab,
    query,
    clientId,
    matrizadorId,
    page,
    pageSize,
    documents,
    total,
    pages,
    counts,
    loading,
    loadingCounts,
    error,

    // Acciones
    setTab,
    setQuery,
    setClientId,
    clearClientId,
    setMatrizadorId,
    clearMatrizadorId,
    setPage,
    setPageSize,
    fetchDocuments,
    fetchCounts,
    refresh,
    clearError,
    isEmpty,
    hasResults
  } = useReceptionsStore();

  // Typeahead state
  const [suggestions, setSuggestions] = useState({ clients: [], codes: [] });
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestTimer, setSuggestTimer] = useState(null);
  const searchInputRef = useRef(null);

  // Cargar datos iniciales
  useEffect(() => {
    fetchDocuments();
    fetchCounts();
  }, []);

  // Atajo de teclado "/" para enfocar búsqueda
  useHotkeys('/', (e) => {
    e.preventDefault();
    const searchInput = document.getElementById('reception-search-input');
    if (searchInput) {
      searchInput.focus();
    }
  });

  // Cerrar typeahead con ESC
  useHotkeys('esc', () => {
    setSuggestOpen(false);
  });

  // Manejar cambio de pestaña
  const handleTabChange = useCallback((event, newValue) => {
    setTab(newValue);
  }, [setTab]);

  // Manejar búsqueda + typeahead (debounce)
  const handleSearchChange = useCallback((event) => {
    const value = event.target.value || '';
    setQuery(value);

    // Sugerencias: debounce 250ms
    if (suggestTimer) clearTimeout(suggestTimer);
    if (value.trim().length >= 2) {
      const t = setTimeout(async () => {
        try {
          setSuggestLoading(true);
          const resp = await receptionService.getSuggestions(value.trim());
          if (resp.success) {
            setSuggestions(resp.data || { clients: [], codes: [] });
            const hasAny = (resp.data?.clients?.length || 0) + (resp.data?.codes?.length || 0) > 0;
            setSuggestOpen(hasAny);
          } else {
            setSuggestions({ clients: [], codes: [] });
            setSuggestOpen(false);
          }
        } catch (e) {
          console.error('[RECEPTION][SUGGEST][ERR]', e);
          setSuggestions({ clients: [], codes: [] });
          setSuggestOpen(false);
        } finally {
          setSuggestLoading(false);
        }
      }, 250);
      setSuggestTimer(t);
    } else {
      setSuggestions({ clients: [], codes: [] });
      setSuggestOpen(false);
    }
  }, [setQuery, suggestTimer]);

  // Limpiar búsqueda
  const handleClearSearch = useCallback(() => {
    setQuery('');
    // Limpiar typeahead
    if (suggestTimer) clearTimeout(suggestTimer);
    setSuggestTimer(null);
    setSuggestions({ clients: [], codes: [] });
    setSuggestOpen(false);
  }, [setQuery, suggestTimer]);

  // Selección de sugerencias
  const handleSelectClient = useCallback((client) => {
    try {
      if (client?.clientId) {
        setClientId(client.clientId);
        setQuery('');
      } else if (client?.clientName) {
        setQuery(client.clientName);
      }
    } finally {
      if (suggestTimer) clearTimeout(suggestTimer);
      setSuggestTimer(null);
      setSuggestOpen(false);
    }
  }, [setClientId, setQuery, suggestTimer]);

  const handleSelectCode = useCallback((item) => {
    try {
      if (item?.code) {
        setQuery(item.code);
      }
    } finally {
      if (suggestTimer) clearTimeout(suggestTimer);
      setSuggestTimer(null);
      setSuggestOpen(false);
    }
  }, [setQuery, suggestTimer]);

  // Manejar clic en nombre de cliente
  const handleClientClick = useCallback((clientId, clientName) => {
    setClientId(clientId);
    // Aquí se podría emitir un evento para el modal de retiro
    window.dispatchEvent(new CustomEvent('open-retiro', {
      detail: {
        titularNombre: clientName,
        titularIdentificacion: clientId
      }
    }));
  }, [setClientId]);

  // Manejar clic en nombre de matrizador
  const handleMatrizadorClick = useCallback((matrizadorId, matrizadorName) => {
    if (!matrizadorId) return; // No filtrar si es "Sin asignar"
    console.info('[RECEPTION] Filtrar por matrizador:', matrizadorId, matrizadorName);
    setMatrizadorId(matrizadorId);
  }, [setMatrizadorId]);

  // Manejar cambio de página
  const handlePageChange = useCallback((event, value) => {
    setPage(value);
  }, [setPage]);

  // Manejar cambio de tamaño de página
  const handlePageSizeChange = useCallback((event) => {
    setPageSize(parseInt(event.target.value));
  }, [setPageSize]);

  // ===== Selección múltiple y acciones masivas =====
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDeliveryModalOpen, setBulkDeliveryModalOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState(null);

  const clearSelection = () => setSelectedIds(new Set());

  const pageDocs = useMemo(() => documents, [documents]);

  const isAllSelected = useMemo(() => {
    if (pageDocs.length === 0) return false;
    return pageDocs.every(d => selectedIds.has(d.id));
  }, [pageDocs, selectedIds]);

  const isIndeterminate = useMemo(() => {
    const count = pageDocs.filter(d => selectedIds.has(d.id)).length;
    return count > 0 && count < pageDocs.length;
  }, [pageDocs, selectedIds]);

  const toggleSelectAll = (checked) => {
    const next = new Set(selectedIds);
    if (checked) {
      pageDocs.forEach(d => next.add(d.id));
    } else {
      pageDocs.forEach(d => next.delete(d.id));
    }
    setSelectedIds(next);
  };

  const toggleRow = (e, id) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  // Calcular transición válida: por ahora solo LISTO (EN_PROCESO -> LISTO) masivo para Recepción
  const selectedItems = useMemo(() => pageDocs.filter(d => selectedIds.has(d.id)), [pageDocs, selectedIds]);
  const selectionCount = selectedItems.length;

  const getValidTransitions = () => {
    const list = [];
    const hasAnyEnProceso = selectedItems.some(item =>
      Array.isArray(item.documents) && item.documents.some(x => x.status === 'EN_PROCESO')
    );
    const hasAnyListo = selectedItems.some(item =>
      Array.isArray(item.documents) && item.documents.some(x => x.status === 'LISTO')
    );
    const hasAnyDeliverable = hasAnyListo;
    const hasAnyRevertible = selectedItems.some(item =>
      Array.isArray(item.documents) && item.documents.some(x => x.status === 'LISTO' || x.status === 'ENTREGADO')
    );

    if (hasAnyEnProceso) list.push('LISTO');
    if (hasAnyDeliverable) list.push('ENTREGADO');
    if (hasAnyRevertible) list.push('REVERTIR');

    return list;
  };

  const onBulkAction = (targetStatus, options = {}) => {
    if (!targetStatus) return;
    setPendingBulkAction({ toStatus: targetStatus, documents: selectedItems, options });

    // Si es ENTREGADO, abrir modal específico de entrega
    if (targetStatus === 'ENTREGADO') {
      setBulkDeliveryModalOpen(true);
    } else {
      setBulkModalOpen(true);
    }
  };

  const executeBulk = async ({ toStatus, sendNotifications, deliveryData }) => {
    try {
      if (toStatus === 'LISTO') {
        // Expandir selección por grupos a IDs de documentos EN_PROCESO
        const ids = [];
        selectedItems.forEach(item => {
          (item.documents || []).forEach(d => {
            if (d.status === 'EN_PROCESO') ids.push(d.id);
          });
        });
        if (ids.length === 0) {
          console.info('[RECEPTION][BULK] Nada por actualizar (no hay EN_PROCESO)');
          setBulkModalOpen(false);
          return;
        }
        const resp = await receptionService.bulkMarkReady(ids, typeof sendNotifications === 'boolean' ? sendNotifications : true);
        console.info('[RECEPTION][BULK][LISTO] resp:', resp);
        await fetchDocuments();
        await fetchCounts();
        clearSelection();
        setBulkModalOpen(false);
        return;
      }

      if (toStatus === 'ENTREGADO') {
        // Entrega masiva con datos capturados del modal
        const deliverIds = [];
        selectedItems.forEach(item => {
          (item.documents || []).forEach(d => {
            if (d.status === 'LISTO') deliverIds.push(d.id);
          });
        });
        if (deliverIds.length === 0) {
          console.info('[RECEPTION][BULK][ENTREGADO] No hay documentos LISTO para entregar');
          setBulkDeliveryModalOpen(false);
          return;
        }
        // Construir payload con los datos del modal
        const payload = {
          entregadoA: deliveryData?.entregadoA || 'Entrega masiva',
          relacionTitular: 'titular',
          verificacionManual: true,
          codigoVerificacion: '',
          facturaPresenta: false,
          observacionesEntrega: deliveryData?.observacionesEntrega || 'Entrega masiva desde Recepción'
        };
        console.info('[RECEPTION][BULK][ENTREGADO] Entregando', deliverIds.length, 'documentos con datos:', payload);
        await Promise.allSettled(deliverIds.map(id => documentService.deliverDocument(id, payload)));
        await fetchDocuments();
        await fetchCounts();
        clearSelection();
        setBulkDeliveryModalOpen(false);
        return;
      }

      if (toStatus === 'REVERTIR') {
        // Revertir masivo:
        // - Si documento está LISTO → revertir a EN_PROCESO
        // - Si documento está ENTREGADO → revertir a LISTO
        let reason = window.prompt('Ingrese la razón para revertir estado (obligatoria):');
        if (!reason || !reason.trim()) {
          console.info('[RECEPTION][BULK][REVERTIR] Operación cancelada por falta de razón');
          setBulkModalOpen(false);
          return;
        }
        const operations = [];
        selectedItems.forEach(item => {
          // Buscar un candidato por grupo (cualquier LISTO o ENTREGADO)
          const cand = (item.documents || []).find(d => d.status === 'LISTO' || d.status === 'ENTREGADO');
          if (!cand) return;
          const target = cand.status === 'LISTO' ? 'EN_PROCESO' : 'LISTO';
          operations.push(receptionService.revertirEstadoDocumento(cand.id, target, reason.trim()));
        });
        if (operations.length === 0) {
          console.info('[RECEPTION][BULK][REVERTIR] No hay documentos revertibles en la selección');
          setBulkModalOpen(false);
          return;
        }
        await Promise.allSettled(operations);
        await fetchDocuments();
        await fetchCounts();
        clearSelection();
        setBulkModalOpen(false);
        return;
      }

      console.info('[RECEPTION][BULK] Acción no implementada:', toStatus);
      setBulkModalOpen(false);
    } catch (e) {
      console.error('[RECEPTION][BULK][ERR]', e);
      setBulkModalOpen(false);
    }
  };

  // Renderizar badge con conteo
  const renderTabWithBadge = (label, count, isLoading) => (
    <Badge
      badgeContent={isLoading ? <Skeleton width={20} height={20} /> : count}
      color="primary"
      max={999}
    >
      <span>{label}</span>
    </Badge>
  );

  // Renderizar fila de recepción
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [individualDeliveryModalOpen, setIndividualDeliveryModalOpen] = useState(false);
  const [selectedGroupForDelivery, setSelectedGroupForDelivery] = useState(null);

  // Manejar acción individual de marcar como listo
  const handleMarkReadyIndividual = async (group) => {
    try {
      const ids = (group.documents || [])
        .filter(d => d.status === 'EN_PROCESO')
        .map(d => d.id);

      if (ids.length === 0) {
        alert('No hay documentos en proceso para marcar como listo');
        return;
      }

      const resp = await receptionService.bulkMarkReady(ids, true);
      if (resp.success) {
        await fetchDocuments();
        await fetchCounts();
      } else {
        alert(`Error: ${resp.error || 'No se pudo marcar como listo'}`);
      }
    } catch (error) {
      console.error('[RECEPTION][MARK_READY_INDIVIDUAL]', error);
      alert('Error al marcar documentos como listo');
    }
  };

  // Manejar acción individual de entregar
  const handleDeliverIndividual = (group) => {
    setSelectedGroupForDelivery(group);
    setIndividualDeliveryModalOpen(true);
  };

  // Ejecutar entrega individual
  const executeIndividualDelivery = async (deliveryData) => {
    try {
      const deliverIds = (selectedGroupForDelivery.documents || [])
        .filter(d => d.status === 'LISTO')
        .map(d => d.id);

      if (deliverIds.length === 0) {
        alert('No hay documentos listos para entregar');
        setIndividualDeliveryModalOpen(false);
        return;
      }

      const payload = {
        entregadoA: deliveryData.entregadoA,
        relacionTitular: 'titular',
        verificacionManual: true,
        codigoVerificacion: '',
        facturaPresenta: false,
        observacionesEntrega: deliveryData.observacionesEntrega || ''
      };

      await Promise.allSettled(deliverIds.map(id => documentService.deliverDocument(id, payload)));
      await fetchDocuments();
      await fetchCounts();
      setIndividualDeliveryModalOpen(false);
      setSelectedGroupForDelivery(null);
    } catch (error) {
      console.error('[RECEPTION][DELIVER_INDIVIDUAL]', error);
      alert('Error al entregar documentos');
    }
  };

  const renderReceptionRow = (doc) => {
    // Determinar qué acciones mostrar según el estado de los documentos
    const hasEnProceso = (doc.documents || []).some(d => d.status === 'EN_PROCESO');
    const hasListo = (doc.documents || []).some(d => d.status === 'LISTO');

    return (
      <TableRow
        key={doc.id}
        hover
        sx={{ cursor: 'pointer' }}
        onClick={() => {
          setSelectedDocument(doc);
          setDetailOpen(true);
        }}
      >
        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(doc.id)}
            onChange={(e) => toggleRow(e, doc.id)}
            color="primary"
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace">
            {doc.code}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Tooltip title="Click para filtrar por este cliente">
              <Typography
                variant="body2"
                sx={{
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline', color: 'primary.main' }
                }}
                onClick={(e) => { e.stopPropagation(); handleClientClick(doc.clientId, doc.clientName); }}
              >
                {doc.clientName}
              </Typography>
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              ({doc.clientIdentification})
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={doc.typeLabel}
            size="small"
            variant="outlined"
            icon={<DocumentIcon />}
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {doc.mainAct || '—'}
          </Typography>
          {!!doc.groupSize && doc.groupSize > 1 && (
            <Typography variant="caption" color="text.secondary">
              {doc.groupSize} documentos
            </Typography>
          )}
        </TableCell>
        <TableCell>
          {doc.matrizadorId ? (
            <Tooltip title="Click para filtrar por este matrizador">
              <Typography
                variant="body2"
                sx={{
                  cursor: 'pointer',
                  color: 'text.secondary',
                  '&:hover': { textDecoration: 'underline', color: 'primary.main' }
                }}
                onClick={(e) => { e.stopPropagation(); handleMatrizadorClick(doc.matrizadorId, doc.matrizador); }}
              >
                {doc.matrizador}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.disabled">
              Sin asignar
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Chip
            label={doc.statusLabel}
            size="small"
            color={tab === 'ACTIVOS' ? 'warning' : 'success'}
            variant="filled"
          />
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {doc.receivedAtFmt}
            </Typography>
          </Box>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight="medium">
            {doc.amountFmt}
          </Typography>
        </TableCell>
        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            {hasEnProceso && (
              <Tooltip title="Marcar como Listo">
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => handleMarkReadyIndividual(doc)}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Listo
                </Button>
              </Tooltip>
            )}
            {hasListo && (
              <Tooltip title="Marcar como Entregado">
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => handleDeliverIndividual(doc)}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Entregar
                </Button>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  // Renderizar estado vacío
  const renderEmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        textAlign: 'center'
      }}
    >
      <DocumentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {query || clientId ? 'No se encontraron recepciones' : `No hay recepciones ${tab.toLowerCase()}`}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {query || clientId
          ? 'Intenta ajustar los filtros de búsqueda'
          : 'Las recepciones aparecerán aquí cuando estén disponibles'
        }
      </Typography>
      {(query || clientId || matrizadorId) && (
        <Typography
          variant="body2"
          sx={{ mt: 1, cursor: 'pointer', color: 'primary.main' }}
          onClick={() => {
            setQuery('');
            clearClientId();
            clearMatrizadorId();
          }}
        >
          Limpiar filtros
        </Typography>
      )}
    </Box>
  );

  // Renderizar skeletons de carga
  const renderSkeletons = () => (
    <TableBody>
      {Array.from({ length: pageSize }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header con búsqueda */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Gestión de Recepciones
        </Typography>

        {/* Barra de búsqueda con typeahead */}
        <Box sx={{ position: 'relative', mb: 2 }}>
          <TextField
            id="reception-search-input"
            fullWidth
            inputRef={searchInputRef}
            placeholder="Buscar por código, cliente, identificación o tipo... (presiona / para enfocar)"
            value={query}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: query && (
                <InputAdornment position="end">
                  <IconButton onClick={handleClearSearch} size="small">
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {suggestOpen && (
            <Paper
              elevation={6}
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                zIndex: 20,
                mt: 0.5,
                maxHeight: 300,
                overflowY: 'auto'
              }}
              // Evitar que el blur cierre antes del onClick
              onMouseDown={(e) => e.preventDefault()}
            >
              <Box sx={{ p: 1 }}>
                {suggestLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Buscando...</Typography>
                  </Box>
                ) : (
                  <>
                    {(suggestions.clients?.length > 0) && (
                      <Box sx={{ p: 1 }}>
                        <Typography variant="caption" color="text.secondary">Clientes</Typography>
                        {suggestions.clients.map((c, idx) => (
                          <Box
                            key={`cli-${idx}`}
                            sx={{ py: 1, px: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                            onClick={() => handleSelectClient(c)}
                          >
                            <Typography variant="body2">{c.clientName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(c.clientId || 'sin identificación')}{c.clientPhone ? ` · ${c.clientPhone}` : ''}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {(suggestions.codes?.length > 0) && (
                      <Box sx={{ p: 1, pt: suggestions.clients?.length ? 0 : 1 }}>
                        <Typography variant="caption" color="text.secondary">Códigos</Typography>
                        {suggestions.codes.map((k, idx) => (
                          <Box
                            key={`code-${idx}`}
                            sx={{ py: 1, px: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                            onClick={() => handleSelectCode(k)}
                          >
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{k.code}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {(!suggestions.clients?.length && !suggestions.codes?.length) && (
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Sin sugerencias</Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Paper>
          )}
        </Box>

        {/* Filtros activos */}
        {clientId && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonIcon color="primary" />
            <Typography variant="body2">
              Filtrando por cliente: {clientId}
            </Typography>
            <IconButton onClick={clearClientId} size="small">
              <ClearIcon />
            </IconButton>
          </Box>
        )}
        {matrizadorId && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AssignmentIndIcon color="primary" />
            <Typography variant="body2">
              Filtrando por matrizador: {documents[0]?.matrizador || `ID ${matrizadorId}`}
            </Typography>
            <IconButton onClick={clearMatrizadorId} size="small">
              <ClearIcon />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Pestañas con badges */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab
            label={renderTabWithBadge('Activos', counts.ACTIVOS, loadingCounts)}
            value="ACTIVOS"
          />
          <Tab
            label={renderTabWithBadge('Entregados', counts.ENTREGADOS, loadingCounts)}
            value="ENTREGADOS"
          />
        </Tabs>
      </Box>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Tabla de recepciones */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  disabled={documents.length === 0}
                  color="primary"
                />
              </TableCell>
              <TableCell><strong>Código</strong></TableCell>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Tipo</strong></TableCell>
              <TableCell><strong>Acto principal</strong></TableCell>
              <TableCell><strong>Matrizador</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell align="right"><strong>Valor</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          {loading ? renderSkeletons() : (
            <TableBody>
              {hasResults() ? documents.map(renderReceptionRow) : (
                <TableRow>
                  <TableCell colSpan={10}>
                    {renderEmptyState()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>
      </TableContainer>

      {/* Paginación y controles */}
      {hasResults() && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {documents.length} de {total} recepciones
            </Typography>

            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>Por página</InputLabel>
              <Select
                value={pageSize}
                label="Por página"
                onChange={handlePageSizeChange}
              >
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Pagination
            count={pages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* Toolbar de acciones masivas */}
      <BulkActionToolbar
        selectionCount={selectionCount}
        commonStatus={null}
        validTransitions={getValidTransitions()}
        maxSelection={999}
        isExecuting={false}
        onClearSelection={clearSelection}
        onBulkAction={(target) => onBulkAction(target)}
      />

      {/* Modal de confirmación masiva */}
      <BulkStatusChangeModal
        open={bulkModalOpen}
        onClose={() => { setBulkModalOpen(false); setPendingBulkAction(null); }}
        documents={pendingBulkAction?.documents || []}
        fromStatus={null}
        toStatus={pendingBulkAction?.toStatus}
        onConfirm={(actionData) => executeBulk({ toStatus: actionData.toStatus })}
        loading={false}
      />

      {/* Modal de entrega masiva */}
      <BulkDeliveryModal
        open={bulkDeliveryModalOpen}
        onClose={() => { setBulkDeliveryModalOpen(false); setPendingBulkAction(null); }}
        documents={pendingBulkAction?.documents || []}
        onConfirm={(deliveryData) => executeBulk({ toStatus: 'ENTREGADO', deliveryData })}
        loading={false}
      />

      {/* Modal de entrega individual */}
      <BulkDeliveryModal
        open={individualDeliveryModalOpen}
        onClose={() => { setIndividualDeliveryModalOpen(false); setSelectedGroupForDelivery(null); }}
        documents={selectedGroupForDelivery ? [selectedGroupForDelivery] : []}
        onConfirm={executeIndividualDelivery}
        loading={false}
      />

      {/* Drawer/Modal de detalle */}
      <DocumentDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        document={selectedDocument}
        onDocumentUpdated={() => {}}
      />
    </Box>
  );
};

export default ReceptionCenter;