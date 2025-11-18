import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Paper,
  TablePagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableSortLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import receptionService from '../../services/reception-service';

/**
 * Componente para mostrar el historial de entregas
 */
function HistorialEntregas() {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  // Orden
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    search: '',
    fechaInicio: '',
    fechaFin: '',
    usuarioEntrega: ''
  });

  // Cargar historial al montar el componente
  useEffect(() => {
    cargarHistorial();
  }, [page, filters]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.fechaInicio && { fechaInicio: filters.fechaInicio }),
        ...(filters.fechaFin && { fechaFin: filters.fechaFin }),
        ...(filters.usuarioEntrega && { usuarioEntrega: filters.usuarioEntrega }),
        sortBy: 'fechaEntrega',
        sortOrder: sortOrder
      };

      const result = await receptionService.getHistorialEntregas(params);

      if (result.success) {
        setEntregas(result.data.entregas || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setError(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError('Error cargando historial de entregas');
    } finally {
      setLoading(false);
    }
  };

  const handleBusqueda = (valor) => {
    setFilters(prev => ({ ...prev, search: valor }));
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Alternar orden por fecha
  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // Orden en memoria por fechaEntrega
  const entregasOrdenadas = useMemo(() => {
    const sorted = [...entregas].sort((a, b) => {
      let aVal = a.fechaEntrega || a.createdAt;
      let bVal = b.fechaEntrega || b.createdAt;
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [entregas, sortOrder]);

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando historial...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={cargarHistorial}>
            Reintentar
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>
          Historial de Entregas
        </Typography>
        
        {/* Filtros */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              {/* Búsqueda */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Buscar por cliente, protocolo..."
                  value={filters.search}
                  onChange={(e) => handleBusqueda(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                  }}
                />
              </Grid>
              
              {/* Fecha inicio */}
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha Inicio"
                  value={filters.fechaInicio}
                  onChange={(e) => setFilters(prev => ({ ...prev, fechaInicio: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Fecha fin */}
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha Fin"
                  value={filters.fechaFin}
                  onChange={(e) => setFilters(prev => ({ ...prev, fechaFin: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Usuario entrega */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Usuario Entrega"
                  value={filters.usuarioEntrega}
                  onChange={(e) => setFilters(prev => ({ ...prev, usuarioEntrega: e.target.value }))}
                  placeholder="Nombre del receptor"
                />
              </Grid>
              
              {/* Botón refrescar */}
              <Grid item xs={12} md={1.5} sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={toggleSortOrder} sx={{ textTransform: 'none' }}>
                  {sortOrder === 'asc' ? 'Fecha ↑' : 'Fecha ↓'}
                </Button>
                <Tooltip title="Refrescar">
                  <IconButton onClick={cargarHistorial} color="primary" size="large">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Tabla de historial */}
      {entregas.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hay entregas registradas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Las entregas realizadas aparecerán aquí
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    <TableSortLabel
                      active={true}
                      direction={sortOrder}
                      onClick={toggleSortOrder}
                    >
                      Fecha
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Protocolo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Entregado A</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Relación</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entregasOrdenadas.map((entrega) => (
                  <TableRow key={entrega.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />
                        <Typography variant="body2">
                          {formatFecha(entrega.fechaEntrega)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {entrega.clientName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="primary" sx={{ fontFamily: 'monospace' }}>
                        {entrega.protocolNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={entrega.documentType} 
                        size="small" 
                        color="info"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />
                        <Typography variant="body2">
                          {entrega.entregadoA}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={entrega.relacionTitular || 'No especificado'} 
                        size="small" 
                        color="secondary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entrega.usuarioEntrega?.firstName} {entrega.usuarioEntrega?.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={entrega.codigoRetiro || 'N/A'} 
                        size="small" 
                        color="default"
                        sx={{ fontFamily: 'monospace' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label="ENTREGADO" 
                        size="small" 
                        color="success"
                        icon={<CheckCircleIcon />}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Paginación */}
          <TablePagination
            component="div"
            count={totalPages * rowsPerPage}
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
        </Card>
      )}
    </Box>
  );
}

export default HistorialEntregas;