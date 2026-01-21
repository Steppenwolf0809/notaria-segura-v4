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
  Typography,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import DateRangeFilter from '../shared/DateRangeFilter';

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
  paymentFilter,
  onPaymentFilterChange,
  debouncedSearchTerm,
  mostrarEntregados,
  onMostrarEntregadosChange,
  // Props para filtro de fechas
  fechaDesde,
  fechaHasta,
  onFechaDesdeChange,
  onFechaHastaChange,
  onClearDateFilter
}) => {
  const statusLabelMap = {
    'EN_PROCESO': 'En Proceso',
    'LISTO': 'Listo',
    'ENTREGADO': 'Entregado'
  };

  const paymentLabelMap = {
    'PAGADO': 'Pagado',
    'PENDIENTE': 'Pendiente'
  };

  // Componente reutilizable para Segmented Control
  const SegmentedControl = ({ options, value, onChange, label }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5, fontWeight: 500 }}>
          {label}
        </Typography>
      )}
      <Box sx={{
        display: 'flex',
        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'grey.100',
        p: 0.5,
        borderRadius: 2,
        gap: 0.5
      }}>
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <Box
              key={option.value}
              onClick={() => onChange({ target: { value: option.value } })}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                color: isActive ? 'text.primary' : 'text.secondary',
                bgcolor: isActive ? 'background.paper' : 'transparent',
                boxShadow: isActive ? '0px 1px 2px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap', // Evitar saltos de línea
                '&:hover': {
                  color: 'text.primary',
                  bgcolor: isActive ? 'background.paper' : 'rgba(0,0,0,0.04)'
                }
              }}
            >
              {option.label}
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <Card sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { xs: 'stretch', md: 'center' }, // Stretch en móvil, center en desktop
          flexWrap: 'wrap' // Permitir wrapping si hay poco espacio
        }}>
          {/* Campo de búsqueda (Flex grow para ocupar espacio disponible) */}
          <TextField
            placeholder="Buscar por cliente, código o tipo..."
            value={inputValue}
            onChange={onInputChange}
            sx={{ flex: 1, minWidth: { xs: '100%', md: '250px' } }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Filtros Segmentados (Flexibles y adaptables) */}
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: { xs: 1, md: 0 } }}>
            {/* Filtro Estado */}
            <SegmentedControl
              label="Estado del Trámite"
              value={statusFilter || ''}
              onChange={onStatusFilterChange}
              options={[
                { value: '', label: 'Todos' },
                { value: 'EN_PROCESO', label: 'En Proceso' },
                { value: 'LISTO', label: 'Listo' },
                { value: 'ENTREGADO', label: 'Entregado' }
              ]}
            />

            {/* Filtro Pago (NUEVO) */}
            <SegmentedControl
              label="Estado de Pago"
              value={paymentFilter || ''}
              onChange={onPaymentFilterChange}
              options={[
                { value: '', label: 'Todos' },
                { value: 'PAGADO', label: 'Pagado' },
                { value: 'PENDIENTE', label: 'Pendiente' }
              ]}
            />
          </Box>

          {/* Opciones Adicionales */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', ml: 'auto' }}>
            {/* Filtro por tipo */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Tipo de Trámite</InputLabel>
              <Select
                value={typeFilter}
                label="Tipo de Trámite"
                onChange={onTypeFilterChange}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="CERTIFICACION">Certificaciones</MenuItem>
                <MenuItem value="PROTOCOLO">Protocolo / Escrituras</MenuItem>
                <MenuItem value="DILIGENCIA">Diligencias</MenuItem>
                <MenuItem value="ARRENDAMIENTO">Arrendamientos</MenuItem>
                <MenuItem value="OTROS">Otros</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Filtro por rango de fechas */}
        {onFechaDesdeChange && onFechaHastaChange && (
          <Box sx={{ mt: 2 }}>
            <DateRangeFilter
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              onFechaDesdeChange={onFechaDesdeChange}
              onFechaHastaChange={onFechaHastaChange}
              onClear={onClearDateFilter}
              label="Filtrar por fecha de factura"
            />
          </Box>
        )}

        {/* Chips de Filtros Activos (Feedback visual) */}
        {(statusFilter || typeFilter || paymentFilter || (debouncedSearchTerm && debouncedSearchTerm.length >= 2)) && (
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
            {paymentFilter && (
              <Chip
                label={`Pago: ${paymentLabelMap[paymentFilter] || paymentFilter}`}
                onDelete={() => onPaymentFilterChange({ target: { value: '' } })}
                size="small"
                color="secondary"
                variant="outlined"
              />
            )}
            {typeFilter && (
              <Chip
                label={`Tipo: ${typeFilter}`}
                onDelete={() => onTypeFilterChange({ target: { value: '' } })}
                size="small"
                color="default"
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