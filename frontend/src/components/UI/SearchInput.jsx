import React, { memo } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

/**
 * Componente SearchInput optimizado con memoización
 * 
 * Características:
 * - Memoizado para evitar re-renders innecesarios
 * - Input responsivo sin bloqueos
 * - Callbacks optimizados
 * - Interfaz consistente entre componentes
 * 
 * @param {string} value - Valor actual del input
 * @param {function} onChange - Callback cuando cambia el valor
 * @param {function} onClear - Callback para limpiar el input
 * @param {string} placeholder - Texto de placeholder
 * @param {object} sx - Estilos personalizados de MUI
 */
const SearchInput = memo(({
  value,
  onChange,
  onClear,
  placeholder = "Buscar...",
  sx = {},
  ...props
}) => {
  return (
    <TextField
      fullWidth
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: value && (
          <InputAdornment position="end">
            <IconButton onClick={onClear} size="small">
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        )
      }}
      sx={sx}
      {...props}
    />
  );
});

// Nombre del componente para debugging
SearchInput.displayName = 'SearchInput';

export default SearchInput;