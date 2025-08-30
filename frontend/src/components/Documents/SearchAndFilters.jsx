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
              sx={{
                bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderRadius: 1,
                p: 0.25,
                '& .MuiToggleButton-root': {
                  border: 0,
                  textTransform: 'none',
                  px: 1.5,
                  height: 32,
                }
              }}
            >
              <ToggleButton value="">Todos</ToggleButton>
              <ToggleButton 
                value="EN_PROCESO"
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'info.main',
                    color: 'common.white'
                  },
                  '&.Mui-selected:hover': { bgcolor: 'info.dark' }
                }}
              >
                En Proceso
              </ToggleButton>
              <ToggleButton 
                value="LISTO"
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'success.main',
                    color: 'common.white'
                  },
                  '&.Mui-selected:hover': { bgcolor: 'success.dark' }
                }}
              >
                Listo
              </ToggleButton>
              <ToggleButton 
                value="ENTREGADO"
                sx={{
                  '&.Mui-selected': {
                    bgcolor: (t) => t.palette.mode === 'dark' ? t.palette.grey[700] : t.palette.grey[300],
                    color: 'text.primary'
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: (t) => t.palette.mode === 'dark' ? t.palette.grey[600] : t.palette.grey[400]
                  }
                }}
              >
                Entregado
              </ToggleButton>
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