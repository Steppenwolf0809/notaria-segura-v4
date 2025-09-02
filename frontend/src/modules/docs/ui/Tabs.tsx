import React from 'react';
import { Box, Tabs as MuiTabs, Tab, TextField, InputAdornment, IconButton, Tooltip, Select, MenuItem, FormControl, Pagination, Typography, InputLabel } from '@mui/material';
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
  rowsPerPage: number;
  onRowsPerPageChange: (value: number) => void;
  fechaDesde?: string;
  fechaHasta?: string;
  onFechaDesdeChange?: (value: string) => void;
  onFechaHastaChange?: (value: string) => void;
}

export default function Tabs(props: TabsProps) {
  const { activeTab, onTabChange, search, onSearchChange, page, totalPages, onPageChange, inputId, rowsPerPage, onRowsPerPageChange, fechaDesde, fechaHasta, onFechaDesdeChange, onFechaHastaChange } = props;
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

        <TextField
          type="date"
          size="small"
          label="Desde"
          value={fechaDesde || ''}
          onChange={(e) => onFechaDesdeChange && onFechaDesdeChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          type="date"
          size="small"
          label="Hasta"
          value={fechaHasta || ''}
          onChange={(e) => onFechaHastaChange && onFechaHastaChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="rows-per-page-label">Por página</InputLabel>
          <Select
            labelId="rows-per-page-label"
            label="Por página"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          >
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>
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


