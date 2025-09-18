import React, { useEffect, useCallback } from 'react';
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
  Tooltip
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
import useUnifiedDocumentsStore from '../store/unified-documents-store';

/**
 * 🎯 Centro de Documentos Unificado - UI Activos/Entregados
 * Componente principal que maneja la nueva interfaz con pestañas y búsqueda global
 */
const DocumentCenter = () => {
  // 🔍 DEBUG: Verificar feature flag y log inicial
  const featureFlag = import.meta.env.VITE_UI_ACTIVOS_ENTREGADOS;
  console.log('🎯 DOC-CENTER v2 mounted - Feature flag:', featureFlag);
  console.log('🎯 DOC-CENTER v2 - Environment:', {
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
  } = useUnifiedDocumentsStore();

  // Cargar datos iniciales
  useEffect(() => {
    fetchDocuments();
    fetchCounts();
  }, []);

  // Atajo de teclado "/" para enfocar búsqueda
  useHotkeys('/', (e) => {
    e.preventDefault();
    const searchInput = document.getElementById('global-search-input');
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

  // Renderizar fila de documento
  const renderDocumentRow = (doc) => (
    <TableRow key={doc.id} hover>
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
              onClick={() => handleClientClick(doc.clientId, doc.clientName)}
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
        {query || clientId ? 'No se encontraron documentos' : `No hay documentos ${tab.toLowerCase()}`}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {query || clientId
          ? 'Intenta ajustar los filtros de búsqueda'
          : 'Los documentos aparecerán aquí cuando estén disponibles'
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
          Gestión de Documentos
        </Typography>

        {/* Barra de búsqueda */}
        <TextField
          id="global-search-input"
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

      {/* Tabla de documentos */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Código</strong></TableCell>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Tipo</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell align="right"><strong>Valor</strong></TableCell>
            </TableRow>
          </TableHead>
          {loading ? renderSkeletons() : (
            <TableBody>
              {hasResults() ? documents.map(renderDocumentRow) : (
                <TableRow>
                  <TableCell colSpan={6}>
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
              Mostrando {documents.length} de {total} documentos
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
    </Box>
  );
};

export default DocumentCenter;