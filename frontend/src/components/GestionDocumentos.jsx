import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import ListView from './Documents/ListView';
import SearchAndFilters from './Documents/SearchAndFilters';
import useDebounce from '../hooks/useDebounce';
import useDocumentStore from '../store/document-store';

/**
 * Componente principal de Gestión de Documentos
  */
const GestionDocumentos = ({ documentoEspecifico, onDocumentoFound }) => {

  const [inputValue, setInputValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState(''); // Estado para filtro de pago
  const [mostrarEntregados, setMostrarEntregados] = useState(false);

  // Estado para filtros de fecha
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Estado para paginación y ordenamiento Server-Side
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [orderDirection, setOrderDirection] = useState('desc');

  const { fetchMyDocuments, totalDocuments, loading } = useDocumentStore();

  // DEBOUNCING: Solo buscar después de que el usuario pause por 400ms
  const debouncedSearchTerm = useDebounce(inputValue, 400);

  /**
   * Efecto principal para cargar documentos con paginación server-side
   */
  useEffect(() => {
    fetchMyDocuments({
      page: page + 1, // API usa 1-based index
      limit: rowsPerPage,
      search: debouncedSearchTerm,
      status: statusFilter,
      status: statusFilter,
      tipo: typeFilter,
      paymentStatus: paymentFilter, // Pasar filtro de pago
      orderBy: orderBy,
      orderDirection: orderDirection,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined
    });
  }, [page, rowsPerPage, debouncedSearchTerm, statusFilter, typeFilter, paymentFilter, orderBy, orderDirection, fechaDesde, fechaHasta]);

  /**
   * Handlers memoizados para evitar re-renders
   */
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
    setPage(0); // Reset página al buscar
  }, []);

  const handleClearInput = useCallback(() => {
    setInputValue('');
    setPage(0);
  }, []);

  const handleStatusFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
    setPage(0); // Reset página al filtrar
  }, []);

  const handleTypeFilterChange = useCallback((e) => {
    setTypeFilter(e.target.value);
    setPage(0); // Reset página al filtrar
  }, []);

  const handlePaymentFilterChange = useCallback((e) => {
    setPaymentFilter(e.target.value);
    setPage(0);
  }, []);

  const handleMostrarEntregadosChange = useCallback((e) => {
    setMostrarEntregados(e.target.checked);
    // No reseteamos página necesariamente, pero si cambia el set de datos visible
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newRows) => {
    setRowsPerPage(newRows);
    setPage(0);
  }, []);

  const handleSortChange = useCallback((property, direction) => {
    setOrderBy(property);
    setOrderDirection(direction);
  }, []);

  /**
   * 🆕 Manejar búsqueda por nombre de cliente (desde click en tabla)
   */
  const handleSearchByClient = useCallback((clientName) => {
    setInputValue(clientName);
    setPage(0);
    // Scroll suave al inicio para ver los resultados
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /**
   * Handlers para filtros de fecha
   */
  const handleFechaDesdeChange = useCallback((value) => {
    setFechaDesde(value);
    setPage(0);
  }, []);

  const handleFechaHastaChange = useCallback((value) => {
    setFechaHasta(value);
    setPage(0);
  }, []);

  const handleClearDateFilter = useCallback(() => {
    setFechaDesde('');
    setFechaHasta('');
    setPage(0);
  }, []);

  // Efecto para manejar navegación específica desde alertas
  useEffect(() => {
    if (documentoEspecifico && documentoEspecifico.autoSearch) {
      setInputValue(documentoEspecifico.protocolNumber);
    }
  }, [documentoEspecifico]);

  /**
   * Handler para refrescar documentos manteniendo filtros
   * (Pasado a ListView para recargar después de acciones)
   */
  const handleRefresh = useCallback(() => {
    fetchMyDocuments({
      page: page + 1, // API usa 1-based index
      limit: rowsPerPage,
      search: debouncedSearchTerm,
      status: statusFilter,
      status: statusFilter,
      tipo: typeFilter,
      paymentStatus: paymentFilter,
      orderBy: orderBy,
      orderDirection: orderDirection,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined
    });
  }, [page, rowsPerPage, debouncedSearchTerm, statusFilter, typeFilter, paymentFilter, orderBy, orderDirection, fechaDesde, fechaHasta, fetchMyDocuments]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header simplificado */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 0.5 }}>
            Gestión de Documentos
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Vista detallada con filtros avanzados
          </Typography>
        </Box>

        {/* Búsqueda y filtros */}
        <SearchAndFilters
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onInputClear={handleClearInput}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={handlePaymentFilterChange}
          debouncedSearchTerm={debouncedSearchTerm}
          mostrarEntregados={mostrarEntregados}
          onMostrarEntregadosChange={handleMostrarEntregadosChange}
          // Props para filtro de fechas
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          onFechaDesdeChange={handleFechaDesdeChange}
          onFechaHastaChange={handleFechaHastaChange}
          onClearDateFilter={handleClearDateFilter}
        />
      </Box>

      {/* Vista Lista única */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <ListView
          searchTerm={debouncedSearchTerm}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          documentoEspecifico={documentoEspecifico}
          onDocumentoFound={onDocumentoFound}
          mostrarEntregados={mostrarEntregados}
          onSearchByClient={handleSearchByClient}

          // Props para Server-Side Pagination
          serverSide={true}
          totalDocuments={totalDocuments}
          pageProp={page}
          rowsPerPageProp={rowsPerPage}
          loadingProp={loading}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onSortChange={handleSortChange}
          onRefresh={handleRefresh}
        />
      </Box>
    </Box>
  );
};

export default GestionDocumentos;