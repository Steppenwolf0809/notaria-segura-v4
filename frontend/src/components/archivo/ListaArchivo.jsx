import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Button,
  Divider
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import archivoService from '../../services/archivo-service';

/**
 * Vista Lista para documentos de archivo
 * Tabla completa con filtros y paginación
 */
const ListaArchivo = ({ documentos, onEstadoChange, onRefresh }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filtros, setFiltros] = useState({
    search: '',
    estado: 'TODOS'
  });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  /**
   * Filtrar documentos
   */
  const documentosFiltrados = documentos.filter(doc => {
    // Filtro de búsqueda
    const searchTerm = filtros.search.toLowerCase();
    const matchesSearch = !searchTerm || 
      doc.clientName.toLowerCase().includes(searchTerm) ||
      doc.protocolNumber.toLowerCase().includes(searchTerm) ||
      doc.clientPhone?.includes(searchTerm);

    // Filtro de estado
    const matchesEstado = filtros.estado === 'TODOS' || doc.status === filtros.estado;

    return matchesSearch && matchesEstado;
  });

  /**
   * Documentos de la página actual
   */
  const documentosPagina = documentosFiltrados.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  /**
   * Manejar cambio de página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Manejar cambio de filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Manejar cambio de filtros
   */
  const handleFilterChange = (field, value) => {
    setFiltros(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(0); // Resetear a primera página
  };

  /**
   * Abrir menú de acciones
   */
  const handleMenuOpen = (event, documento) => {
    setMenuAnchor(event.currentTarget);
    setSelectedDocument(documento);
  };

  /**
   * Cerrar menú
   */
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedDocument(null);
  };

  /**
   * Formatear fecha
   */
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  /**
   * Obtener color del estado
   */
  const getEstadoColor = (estado) => {
    const colores = {
      'PENDIENTE': 'warning',
      'EN_PROCESO': 'info',
      'LISTO': 'success',
      'ENTREGADO': 'default'
    };
    return colores[estado] || 'default';
  };

  return (
    <Box>
      {/* Controles y Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Búsqueda */}
          <TextField
            placeholder="Buscar por cliente, protocolo o teléfono..."
            value={filtros.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300, flex: 1 }}
            size="small"
          />

          {/* Filtro de Estado */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={filtros.estado}
              label="Estado"
              onChange={(e) => handleFilterChange('estado', e.target.value)}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
              <MenuItem value="LISTO">Listo</MenuItem>
              <MenuItem value="ENTREGADO">Entregado</MenuItem>
            </Select>
          </FormControl>

          {/* Botón Refrescar */}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            size="small"
          >
            Refrescar
          </Button>
        </Box>

        {/* Resumen de resultados */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {documentosPagina.length} de {documentosFiltrados.length} documentos
          </Typography>
          
          {filtros.search && (
            <Chip 
              label={`Búsqueda: "${filtros.search}"`} 
              size="small" 
              onDelete={() => handleFilterChange('search', '')}
            />
          )}
          
          {filtros.estado !== 'TODOS' && (
            <Chip 
              label={`Estado: ${archivoService.formatearEstado(filtros.estado).texto}`} 
              size="small" 
              onDelete={() => handleFilterChange('estado', 'TODOS')}
            />
          )}
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Protocolo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentosPagina.map((documento) => (
                <TableRow 
                  key={documento.id}
                  hover
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'action.hover',
                      cursor: 'pointer' 
                    } 
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      #{documento.protocolNumber}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {documento.clientName}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {documento.clientPhone || '-'}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {documento.documentType}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                      ${documento.totalFactura?.toFixed(2) || '0.00'}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip 
                      label={archivoService.formatearEstado(documento.status).texto}
                      color={getEstadoColor(documento.status)}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatearFecha(documento.createdAt)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, documento)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              
              {documentosPagina.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      {documentosFiltrados.length === 0 
                        ? 'No hay documentos que coincidan con los filtros'
                        : 'No hay documentos en esta página'
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          component="div"
          count={documentosFiltrados.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>

      {/* Menú de acciones */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          Ver Detalles
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          Editar
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          Cambiar Estado
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          Historial
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ListaArchivo;