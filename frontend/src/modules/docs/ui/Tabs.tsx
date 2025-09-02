import React from 'react';
import { Box, Tabs as MuiTabs, Tab, TextField, InputAdornment, IconButton, Tooltip, Select, MenuItem, FormControl, Pagination, Typography } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

interface TabsProps {
  activeTab: 'trabajo' | 'listo' | 'entregado';
  onTabChange: (tab: 'trabajo' | 'listo' | 'entregado') => void;
  search: string;
  onSearchChange: (value: string) => void;
  page: number; // 1-based
  totalPages: number;
  onPageChange: (page: number) => void;
  inputId?: string;
}

export default function Tabs(props: TabsProps) {
  const { activeTab, onTabChange, search, onSearchChange, page, totalPages, onPageChange, inputId } = props;
  return (
    <Box sx={{ mb: 2 }}>
      <MuiTabs
        value={activeTab}
        onChange={(_, v) => onTabChange(v)}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab value="trabajo" label="Trabajo (En Proceso + Listo)" />
        <Tab value="listo" label="Listo" />
        <Tab value="entregado" label="Entregado" />
      </MuiTabs>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          id={inputId}
          fullWidth
          size="small"
          placeholder="Buscar por cliente, teléfono, protocolo o acto principal..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'action.active' }} />
              </InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <Tooltip title="Limpiar búsqueda">
                  <IconButton aria-label="limpiar búsqueda" onClick={() => onSearchChange('')} edge="end" size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            )
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Pagination
          color="primary"
          page={page}
          count={Math.max(1, totalPages)}
          onChange={(_, value) => onPageChange(value)}
          showFirstButton
          showLastButton
        />
      </Box>
    </Box>
  );
}


