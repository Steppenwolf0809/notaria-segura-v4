import React, { useEffect, useRef } from 'react';
import { Box, TextField, InputAdornment, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const SearchBar = ({ value, onChange, placeholder, scope, onScopeChange, showScopeToggle }) => {
  const inputRef = useRef(null);

  // autofocus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // keyboard shortcuts: '/' focus, Alt+A toggle scope
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if ((e.altKey || e.metaKey) && (e.key?.toLowerCase() === 'a') && onScopeChange && showScopeToggle) {
        e.preventDefault();
        onScopeChange(scope === 'context' ? 'all' : 'context');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [scope, onScopeChange, showScopeToggle]);

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <TextField
        inputRef={inputRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder || 'Buscar por cliente o código (vista actual)'}
        size="small"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          )
        }}
      />
      {showScopeToggle && (
        <Tooltip title="Alt+A para alternar alcance">
          <ToggleButtonGroup
            value={scope}
            exclusive
            size="small"
            onChange={(e, val) => val && onScopeChange?.(val)}
          >
            <ToggleButton value="context">Actual</ToggleButton>
            <ToggleButton value="all">Todos</ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      )}
    </Box>
  );
};

export default SearchBar;

