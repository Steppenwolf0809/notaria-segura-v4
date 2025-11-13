import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Cancel as ExpiredIcon,
  Search as SearchIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { API_BASE } from '../utils/apiConfig';

/**
 * Componente para gestionar formularios UAFE
 * Permite al matrizador:
 * - Asignar formularios a personas por cédula
 * - Ver lista de asignaciones
 * - Copiar links únicos
 * - Ver respuestas completadas
 */
const FormulariosUAFE = () => {
  // Estados
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetallesDialog, setOpenDetallesDialog] = useState(false);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMatriz, setFiltroMatriz] = useState('');

  // Formulario de nueva asignación
  const [formData, setFormData] = useState({
    numeroIdentificacion: '',
    numeroMatriz: '',
    actoContrato: '',
    calidadPersona: 'COMPRADOR',
    actuaPor: 'PROPIOS_DERECHOS'
  });
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [personaEncontrada, setPersonaEncontrada] = useState(null);

  // Cargar asignaciones al montar
  useEffect(() => {
    cargarAsignaciones();
  }, [filtroEstado, filtroMatriz]);

  /**
   * Cargar lista de asignaciones del matrizador
   */
  const cargarAsignaciones = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      if (filtroMatriz) params.append('numeroMatriz', filtroMatriz);

      const response = await fetch(`${API_BASE}/formulario-uafe/mis-asignaciones?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setAsignaciones(data.asignaciones);
      } else {
        mostrarSnackbar('Error al cargar asignaciones', 'error');
      }
    } catch (error) {
      console.error('Error al cargar asignaciones:', error);
      mostrarSnackbar('Error al cargar asignaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buscar persona por cédula
   */
  const buscarPersona = async () => {
    if (!formData.numeroIdentificacion) {
      mostrarSnackbar('Ingresa un número de identificación', 'warning');
      return;
    }

    setBuscandoPersona(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/personal/verificar-cedula/${formData.numeroIdentificacion}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success && data.existe) {
        setPersonaEncontrada(data);
        mostrarSnackbar('Persona encontrada', 'success');
      } else {
        setPersonaEncontrada(null);
        mostrarSnackbar('Persona no encontrada. Debe registrarse primero en el sistema.', 'warning');
      }
    } catch (error) {
      console.error('Error al buscar persona:', error);
      mostrarSnackbar('Error al buscar persona', 'error');
    } finally {
      setBuscandoPersona(false);
    }
  };

  /**
   * Crear nueva asignación
   */
  const crearAsignacion = async () => {
    if (!personaEncontrada) {
      mostrarSnackbar('Primero busca a la persona', 'warning');
      return;
    }

    if (!formData.numeroMatriz || !formData.actoContrato) {
      mostrarSnackbar('Completa todos los campos', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/formulario-uafe/asignar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        mostrarSnackbar('Formulario asignado exitosamente', 'success');
        setOpenDialog(false);
        resetForm();
        cargarAsignaciones();

        // Copiar link automáticamente
        navigator.clipboard.writeText(data.asignacion.linkPublico);
        mostrarSnackbar('Link copiado al portapapeles', 'info');
      } else {
        mostrarSnackbar(data.error || 'Error al asignar formulario', 'error');
      }
    } catch (error) {
      console.error('Error al crear asignación:', error);
      mostrarSnackbar('Error al crear asignación', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copiar link al portapapeles
   */
  const copiarLink = (link) => {
    navigator.clipboard.writeText(link);
    mostrarSnackbar('Link copiado al portapapeles', 'success');
  };

  /**
   * Ver detalles de asignación
   */
  const verDetalles = async (asignacionId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/formulario-uafe/asignacion/${asignacionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setAsignacionSeleccionada(data.asignacion);
        setOpenDetallesDialog(true);
      } else {
        mostrarSnackbar('Error al cargar detalles', 'error');
      }
    } catch (error) {
      console.error('Error al cargar detalles:', error);
      mostrarSnackbar('Error al cargar detalles', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resetear formulario
   */
  const resetForm = () => {
    setFormData({
      numeroIdentificacion: '',
      numeroMatriz: '',
      actoContrato: '',
      calidadPersona: 'COMPRADOR',
      actuaPor: 'PROPIOS_DERECHOS'
    });
    setPersonaEncontrada(null);
  };

  /**
   * Mostrar snackbar
   */
  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  /**
   * Obtener color del chip según estado
   */
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'COMPLETADO':
        return 'success';
      case 'PENDIENTE':
        return 'warning';
      case 'EXPIRADO':
        return 'error';
      default:
        return 'default';
    }
  };

  /**
   * Obtener icono según estado
   */
  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'COMPLETADO':
        return <CheckCircleIcon />;
      case 'PENDIENTE':
        return <PendingIcon />;
      case 'EXPIRADO':
        return <ExpiredIcon />;
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Formularios UAFE
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona los formularios UAFE asignados a clientes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          Nueva Asignación
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filtroEstado}
                  label="Estado"
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                  <MenuItem value="COMPLETADO">Completado</MenuItem>
                  <MenuItem value="EXPIRADO">Expirado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Buscar por No. Matriz"
                value={filtroMatriz}
                onChange={(e) => setFiltroMatriz(e.target.value)}
                placeholder="Ej: 2024-1234"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={cargarAsignaciones}
                disabled={loading}
              >
                Buscar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla de Asignaciones */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>No. Matriz</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Acto/Contrato</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Persona</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Calidad</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : asignaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay asignaciones. Crea tu primera asignación.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              asignaciones.map((asignacion) => (
                <TableRow key={asignacion.id} hover>
                  <TableCell>{asignacion.numeroMatriz}</TableCell>
                  <TableCell>{asignacion.actoContrato}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {asignacion.persona.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {asignacion.persona.numeroIdentificacion}
                    </Typography>
                  </TableCell>
                  <TableCell>{asignacion.calidadPersona}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getEstadoIcon(asignacion.estado)}
                      label={asignacion.estado}
                      color={getEstadoColor(asignacion.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(asignacion.createdAt).toLocaleDateString('es-EC')}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Copiar Link">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => copiarLink(asignacion.linkPublico)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {asignacion.completado && (
                        <Tooltip title="Ver Respuesta">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => verDetalles(asignacion.id)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog: Nueva Asignación */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
          Asignar Nuevo Formulario UAFE
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            {/* Buscar Persona */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                1. Buscar Persona
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Número de Identificación"
                  value={formData.numeroIdentificacion}
                  onChange={(e) => setFormData({ ...formData, numeroIdentificacion: e.target.value })}
                  placeholder="Ej: 1234567890"
                />
                <Button
                  variant="contained"
                  onClick={buscarPersona}
                  disabled={buscandoPersona}
                  startIcon={<SearchIcon />}
                  sx={{ minWidth: 120 }}
                >
                  {buscandoPersona ? 'Buscando...' : 'Buscar'}
                </Button>
              </Stack>
              {personaEncontrada && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Persona encontrada: <strong>{personaEncontrada.tipoPersona === 'NATURAL' ?
                    `${personaEncontrada.datosPersonaNatural?.nombres || ''} ${personaEncontrada.datosPersonaNatural?.apellidos || ''}` :
                    personaEncontrada.datosPersonaJuridica?.razonSocial || 'N/A'}</strong>
                </Alert>
              )}
            </Box>

            <Divider />

            {/* Datos del Trámite */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                2. Información del Trámite
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="No. Matriz"
                    value={formData.numeroMatriz}
                    onChange={(e) => setFormData({ ...formData, numeroMatriz: e.target.value })}
                    placeholder="Ej: 2024-1234"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Acto / Contrato"
                    value={formData.actoContrato}
                    onChange={(e) => setFormData({ ...formData, actoContrato: e.target.value })}
                    placeholder="Ej: Compraventa de Inmueble"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Calidad en el Acto</InputLabel>
                    <Select
                      value={formData.calidadPersona}
                      label="Calidad en el Acto"
                      onChange={(e) => setFormData({ ...formData, calidadPersona: e.target.value })}
                    >
                      <MenuItem value="COMPRADOR">Comprador</MenuItem>
                      <MenuItem value="VENDEDOR">Vendedor</MenuItem>
                      <MenuItem value="OTRO">Otro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Actúa Por</InputLabel>
                    <Select
                      value={formData.actuaPor}
                      label="Actúa Por"
                      onChange={(e) => setFormData({ ...formData, actuaPor: e.target.value })}
                    >
                      <MenuItem value="PROPIOS_DERECHOS">Por sus propios derechos</MenuItem>
                      <MenuItem value="REPRESENTANDO_A">Representando a</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenDialog(false); resetForm(); }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={crearAsignacion}
            disabled={loading || !personaEncontrada}
            startIcon={<LinkIcon />}
          >
            {loading ? 'Creando...' : 'Crear y Copiar Link'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Ver Detalles */}
      <Dialog
        open={openDetallesDialog}
        onClose={() => setOpenDetallesDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'success.main', color: 'white' }}>
          Detalles de la Respuesta - Formulario UAFE
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {asignacionSeleccionada && asignacionSeleccionada.respuesta ? (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Formulario completado el {new Date(asignacionSeleccionada.respuesta.completadoEn).toLocaleString('es-EC')}
              </Alert>

              {/* Aquí irían los detalles completos de la respuesta */}
              <Typography variant="body2" color="text.secondary">
                Visualización completa de respuestas - Por implementar en siguiente fase
              </Typography>
            </Box>
          ) : (
            <Typography>No hay respuesta disponible</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetallesDialog(false)}>Cerrar</Button>
          {asignacionSeleccionada?.respuesta && (
            <Button variant="contained" disabled>
              Exportar PDF
            </Button>
          )}
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

export default FormulariosUAFE;
