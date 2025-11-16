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
  
  // SEPARACIÓN DE ESTADOS: inputValue (inmediato) vs searchTerm (debounced)
  const [inputValue, setInputValue] = useState(''); // Estado local del input
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [mostrarEntregados, setMostrarEntregados] = useState(false); // 🆕 Por defecto NO mostrar entregados

  // DEBOUNCING: Solo buscar después de que el usuario pause por 400ms
  const debouncedSearchTerm = useDebounce(inputValue, 400);

  /**
   * Handlers memoizados para evitar re-renders
   */
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleClearInput = useCallback(() => {
    setInputValue('');
  }, []);

  const handleStatusFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleTypeFilterChange = useCallback((e) => {
    setTypeFilter(e.target.value);
  }, []);

  const handleMostrarEntregadosChange = useCallback((e) => {
    setMostrarEntregados(e.target.checked);
  }, []);

  /**
   * 🆕 Manejar búsqueda por nombre de cliente (desde click en tabla)
   */
  const handleSearchByClient = useCallback((clientName) => {
    setInputValue(clientName);
    // Scroll suave al inicio para ver los resultados
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Efecto para manejar navegación específica desde alertas
  useEffect(() => {
    if (documentoEspecifico && documentoEspecifico.autoSearch) {
      console.log('🎯 Aplicando filtro automático en GestionDocumentos:', documentoEspecifico);
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
        />
      </Box>
    </Box>
  );
};

export default GestionDocumentos;