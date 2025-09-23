import React, { useEffect, useCallback, useState, useMemo } from 'react';
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
  Button
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  Description as DocumentIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useHotkeys } from 'react-hotkeys-hook';
import useReceptionsStore from '../store/receptions-store';
import DocumentDetailModal from './Documents/DocumentDetailModal.jsx';
// Toolbar y modal de acciones masivas (reutilizados)
import BulkActionToolbar from './bulk/BulkActionToolbar.jsx';
import BulkStatusChangeModal from './bulk/BulkStatusChangeModal.jsx';
import receptionService from '../services/reception-service.js';
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
    setPage,
    setPageSize,
    fetchDocuments,
    fetchCounts,
    refresh,
    clearError,
    isEmpty,
    hasResults
  } = useReceptionsStore();

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

  // Manejar cambio de pestaña
  const handleTabChange = useCallback((event, newValue) => {
    setTab(newValue);
  }, [setTab]);

  // Manejar búsqueda
  const handleSearchChange = useCallback((event) => {
    setQuery(event.target.value);
  }, [setQuery]);

  // Limpiar búsqueda
  const handleClearSearch = useCallback(() => {
    setQuery('');
  }, [setQuery]);

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
    // Habilitamos LISTO si hay al menos 1 documento del grupo en EN_PROCESO
    const hasAnyEnProceso = selectedItems.some(item =>
      Array.isArray(item.documents) && item.documents.some(x => x.status === 'EN_PROCESO')
    );
    const list = [];
    if (hasAnyEnProceso) list.push('LISTO');
    // Futuro: ENTREGADO/REVERTIR pueden agregarse aquí
    return list;
  };

  const onBulkAction = (targetStatus) => {
    if (!targetStatus) return;
    setPendingBulkAction({ toStatus: targetStatus, documents: selectedItems });
    setBulkModalOpen(true);
  };

  const executeBulk = async ({ toStatus }) => {
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
        const resp = await receptionService.bulkMarkReady(ids, true);
        console.info('[RECEPTION][BULK][LISTO] resp:', resp);
        await fetchDocuments();
        await fetchCounts();
        clearSelection();
        setBulkModalOpen(false);
      } else {
        console.info('[RECEPTION][BULK] Acción no implementada:', toStatus);
        setBulkModalOpen(false);
      }
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

  const renderReceptionRow = (doc) => (
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
    </TableRow>
  );

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
      {(query || clientId) && (
        <Typography
          variant="body2"
          sx={{ mt: 1, cursor: 'pointer', color: 'primary.main' }}
          onClick={() => {
            setQuery('');
            clearClientId();
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

        {/* Barra de búsqueda */}
        <TextField
          id="reception-search-input"
          fullWidth
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
          sx={{ mb: 2 }}
        />

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
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell align="right"><strong>Valor</strong></TableCell>
            </TableRow>
          </TableHead>
          {loading ? renderSkeletons() : (
            <TableBody>
              {hasResults() ? documents.map(renderReceptionRow) : (
                <TableRow>
                  <TableCell colSpan={8}>
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