import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button
} from '@mui/material';
import {
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';
import KanbanView from './Documents/KanbanView';
import ListView from './Documents/ListView';
import SearchAndFilters from './Documents/SearchAndFilters';
import useDebounce from '../hooks/useDebounce';

/**
 * Componente principal de Gestión de Documentos
  */
const GestionDocumentos = () => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  
  // SEPARACIÓN DE ESTADOS: inputValue (inmediato) vs searchTerm (debounced)
  const [inputValue, setInputValue] = useState(''); // Estado local del input
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header con toggle - EXACTO AL PROTOTIPO */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 0.5 }}>
              Gestión de Documentos
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {viewMode === 'kanban' 
                ? 'Vista panorámica del flujo de documentos' 
                : 'Vista detallada con filtros avanzados'
              }
            </Typography>
          </Box>
          
          {/* Toggle Kanban/Lista - EXACTO AL PROTOTIPO */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            p: 0.5, 
            bgcolor: 'action.hover', 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <Button
              onClick={() => setViewMode('kanban')}
              variant={viewMode === 'kanban' ? 'contained' : 'text'}
              size="small"
              startIcon={<ViewModuleIcon />}
              sx={{
                minWidth: 100,
                bgcolor: viewMode === 'kanban' ? 'primary.main' : 'transparent',
                color: viewMode === 'kanban' ? 'white' : 'text.primary',
                fontWeight: 'medium',
                '&:hover': {
                  bgcolor: viewMode === 'kanban' ? 'primary.dark' : 'action.selected'
                }
              }}
            >
              Kanban
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'contained' : 'text'}
              size="small"
              startIcon={<ViewListIcon />}
              sx={{
                minWidth: 100,
                bgcolor: viewMode === 'list' ? 'primary.main' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'text.primary',
                fontWeight: 'medium',
                '&:hover': {
                  bgcolor: viewMode === 'list' ? 'primary.dark' : 'action.selected'
                }
              }}
            >
              Lista
            </Button>
          </Box>
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
        />
      </Box>

      {/* Vista Kanban - HORIZONTAL */}
      {viewMode === 'kanban' && (
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <KanbanView 
            searchTerm={debouncedSearchTerm}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
          />
        </Box>
      )}

      {/* Vista Lista - TABLA */}
      {viewMode === 'list' && (
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <ListView 
            searchTerm={debouncedSearchTerm}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
          />
        </Box>
      )}
    </Box>
  );
};

export default GestionDocumentos;