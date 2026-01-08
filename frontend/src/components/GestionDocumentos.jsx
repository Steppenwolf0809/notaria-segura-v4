import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import ListView from './Documents/ListView';
import SearchAndFilters from './Documents/SearchAndFilters';
import useDebounce from '../hooks/useDebounce';

/**
 * Componente principal de Gestión de Documentos
  */
const GestionDocumentos = ({ documentoEspecifico, onDocumentoFound }) => {

  // Estado para paginación y ordenamiento Server-Side
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
      tipo: typeFilter,
      orderBy: orderBy,
      orderDirection: orderDirection
    });
  }, [page, rowsPerPage, debouncedSearchTerm, statusFilter, typeFilter, orderBy, orderDirection]);

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

  // Efecto para manejar navegación específica desde alertas
  useEffect(() => {
    if (documentoEspecifico && documentoEspecifico.autoSearch) {
      setInputValue(documentoEspecifico.protocolNumber);
    }
  }, [documentoEspecifico]);

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
          debouncedSearchTerm={debouncedSearchTerm}
          mostrarEntregados={mostrarEntregados}
          onMostrarEntregadosChange={handleMostrarEntregadosChange}
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
        />
      </Box>
    </Box>
  );
};

export default GestionDocumentos;