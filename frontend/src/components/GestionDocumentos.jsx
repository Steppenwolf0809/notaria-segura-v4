import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
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
  Search as SearchIcon,
  Add as AddIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import KanbanView from './Documents/KanbanView';
import ListView from './Documents/ListView';

/**
 * Componente principal de Gestión de Documentos
 * Incluye toggle Kanban/Lista y vistas separadas - EXACTO AL PROTOTIPO
 */
const GestionDocumentos = () => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  /**
   * Componente de búsqueda y filtros - EXACTO AL PROTOTIPO
   */
  const SearchAndFilters = () => (
    <Card sx={{ mb: 3 }}>
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value)}
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
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="CERTIFICACIONES">Certificaciones</MenuItem>
              <MenuItem value="PROTOCOLO">Protocolo</MenuItem>
              <MenuItem value="COMPRAVENTA">Compraventa</MenuItem>
            </Select>
          </FormControl>

          {/* Botón nuevo documento */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Nuevo Documento
          </Button>
        </Box>

        {/* Filtros activos */}
        {(statusFilter || typeFilter || searchTerm) && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {searchTerm && (
              <Chip
                label={`Búsqueda: "${searchTerm}"`}
                onDelete={() => setSearchTerm('')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {statusFilter && (
              <Chip
                label={`Estado: ${statusFilter}`}
                onDelete={() => setStatusFilter('')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {typeFilter && (
              <Chip
                label={`Tipo: ${typeFilter}`}
                onDelete={() => setTypeFilter('')}
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
        <SearchAndFilters />
      </Box>

      {/* Vista Kanban - HORIZONTAL */}
      {viewMode === 'kanban' && (
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <KanbanView 
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
          />
        </Box>
      )}

      {/* Vista Lista - TABLA */}
      {viewMode === 'list' && (
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <ListView 
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
          />
        </Box>
      )}
    </Box>
  );
};

export default GestionDocumentos;