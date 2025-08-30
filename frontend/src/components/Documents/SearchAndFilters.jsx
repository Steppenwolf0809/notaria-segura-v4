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
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Typography
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
  const statusLabelMap = {
    'EN_PROCESO': 'En Proceso',
    'LISTO': 'Listo para Entrega',
    'ENTREGADO': 'Entregado'
  };

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

          {/* Filtro por estado (botones) */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
              Estado
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={statusFilter || ''}
              onChange={(e, value) => onStatusFilterChange({ target: { value: value || '' } })}
            >
              <ToggleButton value="" sx={{ textTransform: 'none' }}>Todos</ToggleButton>
              <ToggleButton value="EN_PROCESO" sx={{ textTransform: 'none' }}>En Proceso</ToggleButton>
              <ToggleButton value="LISTO" sx={{ textTransform: 'none' }}>Listo</ToggleButton>
              <ToggleButton value="ENTREGADO" sx={{ textTransform: 'none' }}>Entregado</ToggleButton>
            </ToggleButtonGroup>
          </Box>

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
                label={`Estado: ${statusLabelMap[statusFilter] || statusFilter}`}
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