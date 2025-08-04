import React, { memo } from 'react';
import {
  Box,
  TextField,
  Card,
  CardContent,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon
} from '@mui/icons-material';

/**
 * Componente SearchAndFilters completamente separado y memoizado
 * Esto evita re-renders del componente padre cuando cambia inputValue
 */
const SearchAndFilters = memo(({
  inputValue,
  onInputChange,
  onInputClear,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  debouncedSearchTerm
}) => {
  return (
    <Card sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { md: 'center' }
        }}>
          {/* Campo de búsqueda */}
          <TextField
            placeholder="Buscar por cliente, código o tipo..."
            value={inputValue}
            onChange={onInputChange}
            sx={{ flex: 1 }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Filtro por estado */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={statusFilter}
              label="Estado"
              onChange={onStatusFilterChange}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
              <MenuItem value="LISTO">Listo para Entrega</MenuItem>
              <MenuItem value="ENTREGADO">Entregado</MenuItem>
            </Select>
          </FormControl>

          {/* Filtro por tipo */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={typeFilter}
              label="Tipo"
              onChange={onTypeFilterChange}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="CERTIFICACIONES">Certificaciones</MenuItem>
              <MenuItem value="PROTOCOLO">Protocolo</MenuItem>
              <MenuItem value="COMPRAVENTA">Compraventa</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Filtros activos */}
        {(statusFilter || typeFilter || (debouncedSearchTerm && debouncedSearchTerm.length >= 2)) && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {debouncedSearchTerm && debouncedSearchTerm.length >= 2 && (
              <Chip
                label={`Búsqueda: "${debouncedSearchTerm}"`}
                onDelete={onInputClear}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {statusFilter && (
              <Chip
                label={`Estado: ${statusFilter}`}
                onDelete={() => onStatusFilterChange({ target: { value: '' } })}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {typeFilter && (
              <Chip
                label={`Tipo: ${typeFilter}`}
                onDelete={() => onTypeFilterChange({ target: { value: '' } })}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

// Nombre para debugging
SearchAndFilters.displayName = 'SearchAndFilters';

export default SearchAndFilters;