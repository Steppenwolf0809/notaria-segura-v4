import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Collapse
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon
} from '@mui/icons-material';
import { API_BASE } from '../../utils/apiConfig';
import { formatDateES, formatDateTimeES } from '../../utils/dateUtils';

/**
 * Componente de administración de Formularios UAFE
 * Permite al admin ver todos los protocolos y eliminarlos si es necesario
 */
const AdminFormulariosUAFE = () => {
  // Estados principales
  const [protocolos, setProtocolos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Estados de filtros
  const [filtroProtocolo, setFiltroProtocolo] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Estados de diálogos
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [protocoloAEliminar, setProtocoloAEliminar] = useState(null);
  const [expandedProtocol, setExpandedProtocol] = useState(null);

  const tableHeaderCellSx = {
    backgroundColor: 'primary.main',
    color: 'primary.contrastText',
    fontWeight: 'bold'
  };

  // Cargar protocolos al montar
  useEffect(() => {
    cargarProtocolos();
  }, [pagination.page]);

  /**
   * Cargar lista de protocolos
   */
  const cargarProtocolos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      if (filtroProtocolo) params.append('search', filtroProtocolo);

      const response = await fetch(`${API_BASE}/formulario-uafe/admin/protocolos?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setProtocolos(data.data);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }));
      } else {
        mostrarSnackbar('Error al cargar protocolos', 'error');
      }
    } catch (error) {
      mostrarSnackbar('Error al cargar protocolos', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buscar protocolos
   */
  const buscarProtocolos = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    cargarProtocolos();
  };

  /**
   * Confirmar eliminación de protocolo
   */
  const confirmarEliminar = (protocolo) => {
    setProtocoloAEliminar(protocolo);
    setOpenConfirmDelete(true);
  };

  /**
   * Eliminar protocolo
   */
  const eliminarProtocolo = async () => {
    if (!protocoloAEliminar) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/formulario-uafe/admin/protocolo/${protocoloAEliminar.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        mostrarSnackbar('Protocolo eliminado exitosamente', 'success');
        setOpenConfirmDelete(false);
        setProtocoloAEliminar(null);
        cargarProtocolos();
      } else {
        mostrarSnackbar(data.message || 'Error al eliminar protocolo', 'error');
      }
    } catch (error) {
      mostrarSnackbar('Error al eliminar protocolo', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mostrar snackbar
   */
  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  /**
   * Cambiar página
   */
  const cambiarPagina = (nuevaPagina) => {
    setPagination(prev => ({ ...prev, page: nuevaPagina }));
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'flex', alignItems: 'center' }}>
            <DescriptionIcon sx={{ mr: 1 }} />
            Gestión de Formularios UAFE
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administración de todos los protocolos UAFE del sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={cargarProtocolos}
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          Actualizar
        </Button>
      </Box>

      {/* Estadísticas rápidas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">{pagination.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total Protocolos</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {protocolos.reduce((sum, p) => sum + p.personasCompletadas, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Formularios Completados</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {protocolos.reduce((sum, p) => sum + (p.totalPersonas - p.personasCompletadas), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Formularios Pendientes</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                label="Buscar por No. Protocolo o Acto/Contrato"
                value={filtroProtocolo}
                onChange={(e) => setFiltroProtocolo(e.target.value)}
                placeholder="Ej: 2024-1234"
                onKeyPress={(e) => e.key === 'Enter' && buscarProtocolos()}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={buscarProtocolos}
                disabled={loading}
                startIcon={<SearchIcon />}
              >
                Buscar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla de Protocolos */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.main' }}>
              <TableCell sx={{ ...tableHeaderCellSx, width: 50 }}></TableCell>
              <TableCell sx={tableHeaderCellSx}>No. Protocolo</TableCell>
              <TableCell sx={tableHeaderCellSx}>Fecha</TableCell>
              <TableCell sx={tableHeaderCellSx}>Acto/Contrato</TableCell>
              <TableCell sx={tableHeaderCellSx}>Matrizador</TableCell>
              <TableCell sx={tableHeaderCellSx}>Personas</TableCell>
              <TableCell sx={tableHeaderCellSx}>Progreso</TableCell>
              <TableCell sx={tableHeaderCellSx} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : protocolos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay protocolos registrados.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              protocolos.map((protocolo) => (
                <React.Fragment key={protocolo.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedProtocol(
                          expandedProtocol === protocolo.id ? null : protocolo.id
                        )}
                      >
                        {expandedProtocol === protocolo.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {protocolo.numeroProtocolo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateES(protocolo.fecha)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {protocolo.actoContrato}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={protocolo.creador.email}>
                        <Typography variant="body2">
                          {protocolo.creador.nombre}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${protocolo.totalPersonas} persona(s)`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label={`${protocolo.personasCompletadas}/${protocolo.totalPersonas}`}
                          color={protocolo.personasCompletadas === protocolo.totalPersonas ? 'success' : 'warning'}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Eliminar Protocolo">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => confirmarEliminar(protocolo)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>

                  {/* Fila expandible con detalles */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                      <Collapse in={expandedProtocol === protocolo.id} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            Detalles del Protocolo
                          </Typography>
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Valor del Contrato:</strong> ${parseFloat(protocolo.valorContrato).toFixed(2)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Creado:</strong> {formatDateTimeES(protocolo.createdAt)}
                              </Typography>
                            </Grid>
                          </Grid>

                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Personas ({protocolo.totalPersonas})
                          </Typography>
                          {protocolo.personas && protocolo.personas.length > 0 ? (
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Nombre</TableCell>
                                  <TableCell>Cédula</TableCell>
                                  <TableCell>Calidad</TableCell>
                                  <TableCell>Estado</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {protocolo.personas.map((persona) => (
                                  <TableRow key={persona.id}>
                                    <TableCell>{persona.nombre}</TableCell>
                                    <TableCell>{persona.cedula}</TableCell>
                                    <TableCell>{persona.calidad}</TableCell>
                                    <TableCell>
                                      <Chip
                                        icon={persona.completado ? <CheckCircleIcon /> : <PendingIcon />}
                                        label={persona.completado ? 'Completado' : 'Pendiente'}
                                        color={persona.completado ? 'success' : 'warning'}
                                        size="small"
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <Alert severity="info">No hay personas registradas en este protocolo.</Alert>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
          <Button
            variant="outlined"
            disabled={pagination.page === 1}
            onClick={() => cambiarPagina(pagination.page - 1)}
          >
            Anterior
          </Button>
          <Typography sx={{ display: 'flex', alignItems: 'center' }}>
            Página {pagination.page} de {pagination.totalPages}
          </Typography>
          <Button
            variant="outlined"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => cambiarPagina(pagination.page + 1)}
          >
            Siguiente
          </Button>
        </Box>
      )}

      {/* Dialog: Confirmar Eliminación */}
      <Dialog
        open={openConfirmDelete}
        onClose={() => { setOpenConfirmDelete(false); setProtocoloAEliminar(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'error.main', color: 'white' }}>
          Confirmar Eliminación de Protocolo
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {protocoloAEliminar && (
            <Stack spacing={2}>
              <Alert severity="warning">
                ¿Estás seguro de que deseas eliminar este protocolo? Esta acción NO se puede deshacer.
              </Alert>
              <Box>
                <Typography variant="body2"><strong>No. Protocolo:</strong> {protocoloAEliminar.numeroProtocolo}</Typography>
                <Typography variant="body2"><strong>Acto/Contrato:</strong> {protocoloAEliminar.actoContrato}</Typography>
                <Typography variant="body2"><strong>Matrizador:</strong> {protocoloAEliminar.creador.nombre}</Typography>
                <Typography variant="body2"><strong>Personas:</strong> {protocoloAEliminar.totalPersonas}</Typography>
              </Box>
              <Alert severity="error">
                Se eliminarán:
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>{protocoloAEliminar.totalPersonas} persona(s) asociada(s)</li>
                  <li>{protocoloAEliminar.personasCompletadas} formulario(s) completado(s)</li>
                  <li>Todos los datos relacionados</li>
                </ul>
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenConfirmDelete(false); setProtocoloAEliminar(null); }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={eliminarProtocolo}
            disabled={loading}
            startIcon={<DeleteIcon />}
          >
            {loading ? 'Eliminando...' : 'Eliminar Protocolo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminFormulariosUAFE;
