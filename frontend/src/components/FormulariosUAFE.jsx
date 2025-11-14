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
  Divider,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { API_BASE } from '../utils/apiConfig';

/**
 * Componente para gestionar formularios UAFE con sistema de Protocolos
 * Nuevo flujo: 1 Protocolo → N Personas
 *
 * Flujo:
 * 1. Crear Protocolo (datos del trámite)
 * 2. Agregar personas al protocolo
 * 3. Cada persona puede acceder con: Protocolo + Cédula + PIN
 */
const FormulariosUAFE = () => {
  // Estados principales
  const [protocolos, setProtocolos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Estados de diálogos
  const [openNuevoProtocolo, setOpenNuevoProtocolo] = useState(false);
  const [openAgregarPersona, setOpenAgregarPersona] = useState(false);
  const [openVerProtocolo, setOpenVerProtocolo] = useState(false);
  const [protocoloSeleccionado, setProtocoloSeleccionado] = useState(null);

  // Estados de expansión de tabla
  const [expandedProtocol, setExpandedProtocol] = useState(null);

  // Formulario de nuevo protocolo
  const [formProtocolo, setFormProtocolo] = useState({
    numeroProtocolo: '',
    fecha: new Date().toISOString().split('T')[0],
    actoContrato: '',
    avaluoMunicipal: '',
    valorContrato: '',
    // Forma de pago
    formaPagoCheque: false,
    formaPagoEfectivo: false,
    formaPagoTransferencia: false,
    formaPagoTarjeta: false,
    montoCheque: '',
    montoEfectivo: '',
    montoTransferencia: '',
    montoTarjeta: '',
    bancoCheque: '',
    bancoTransferencia: '',
    bancoTarjeta: ''
  });

  // Formulario de agregar persona
  const [formPersona, setFormPersona] = useState({
    cedula: '',
    calidad: 'COMPRADOR',
    actuaPor: 'PROPIOS_DERECHOS'
  });
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [personaEncontrada, setPersonaEncontrada] = useState(null);

  // Filtros
  const [filtroProtocolo, setFiltroProtocolo] = useState('');

  // Cargar protocolos al montar
  useEffect(() => {
    cargarProtocolos();
  }, []);

  /**
   * Cargar lista de protocolos del matrizador
   */
  const cargarProtocolos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filtroProtocolo) params.append('search', filtroProtocolo);

      const response = await fetch(`${API_BASE}/formulario-uafe/protocolos?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setProtocolos(data.data);
      } else {
        mostrarSnackbar('Error al cargar protocolos', 'error');
      }
    } catch (error) {
      console.error('Error al cargar protocolos:', error);
      mostrarSnackbar('Error al cargar protocolos', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crear nuevo protocolo
   */
  const crearProtocolo = async () => {
    // Validaciones
    if (!formProtocolo.numeroProtocolo || !formProtocolo.actoContrato || !formProtocolo.valorContrato) {
      mostrarSnackbar('Completa los campos obligatorios: Número de Protocolo, Acto/Contrato y Valor del Contrato', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Construir objeto formaPago
      const formaPago = {};
      if (formProtocolo.formaPagoCheque && formProtocolo.montoCheque) {
        formaPago.cheque = { monto: parseFloat(formProtocolo.montoCheque), banco: formProtocolo.bancoCheque };
      }
      if (formProtocolo.formaPagoEfectivo && formProtocolo.montoEfectivo) {
        formaPago.efectivo = { monto: parseFloat(formProtocolo.montoEfectivo) };
      }
      if (formProtocolo.formaPagoTransferencia && formProtocolo.montoTransferencia) {
        formaPago.transferencia = { monto: parseFloat(formProtocolo.montoTransferencia), banco: formProtocolo.bancoTransferencia };
      }
      if (formProtocolo.formaPagoTarjeta && formProtocolo.montoTarjeta) {
        formaPago.tarjeta = { monto: parseFloat(formProtocolo.montoTarjeta), banco: formProtocolo.bancoTarjeta };
      }

      const response = await fetch(`${API_BASE}/formulario-uafe/protocolo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          numeroProtocolo: formProtocolo.numeroProtocolo,
          fecha: formProtocolo.fecha,
          actoContrato: formProtocolo.actoContrato,
          avaluoMunicipal: formProtocolo.avaluoMunicipal || null,
          valorContrato: formProtocolo.valorContrato,
          formaPago
        })
      });

      const data = await response.json();
      if (data.success) {
        mostrarSnackbar('Protocolo creado exitosamente', 'success');
        setOpenNuevoProtocolo(false);
        resetFormProtocolo();
        cargarProtocolos();
      } else {
        mostrarSnackbar(data.message || 'Error al crear protocolo', 'error');
      }
    } catch (error) {
      console.error('Error al crear protocolo:', error);
      mostrarSnackbar('Error al crear protocolo', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buscar persona por cédula
   */
  const buscarPersona = async () => {
    if (!formPersona.cedula) {
      mostrarSnackbar('Ingresa un número de cédula', 'warning');
      return;
    }

    setBuscandoPersona(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/personal/verificar-cedula/${formPersona.cedula}`, {
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
        mostrarSnackbar('Persona no encontrada. Debe registrarse primero en /registro-personal', 'warning');
      }
    } catch (error) {
      console.error('Error al buscar persona:', error);
      mostrarSnackbar('Error al buscar persona', 'error');
    } finally {
      setBuscandoPersona(false);
    }
  };

  /**
   * Agregar persona al protocolo
   */
  const agregarPersonaAProtocolo = async () => {
    if (!personaEncontrada) {
      mostrarSnackbar('Primero busca a la persona', 'warning');
      return;
    }

    if (!protocoloSeleccionado) {
      mostrarSnackbar('No hay protocolo seleccionado', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/formulario-uafe/protocolo/${protocoloSeleccionado.id}/persona`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            cedula: formPersona.cedula,
            calidad: formPersona.calidad,
            actuaPor: formPersona.actuaPor
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        mostrarSnackbar('Persona agregada al protocolo exitosamente', 'success');
        setOpenAgregarPersona(false);
        resetFormPersona();
        cargarProtocolos();
      } else {
        mostrarSnackbar(data.message || 'Error al agregar persona', 'error');
      }
    } catch (error) {
      console.error('Error al agregar persona:', error);
      mostrarSnackbar('Error al agregar persona', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ver detalles de un protocolo
   */
  const verDetallesProtocolo = async (protocoloId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/formulario-uafe/protocolo/${protocoloId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setProtocoloSeleccionado(data.data);
        setOpenVerProtocolo(true);
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
   * Abrir modal para agregar persona
   */
  const abrirAgregarPersona = (protocolo) => {
    setProtocoloSeleccionado(protocolo);
    setOpenAgregarPersona(true);
  };

  /**
   * Resetear formulario de protocolo
   */
  const resetFormProtocolo = () => {
    setFormProtocolo({
      numeroProtocolo: '',
      fecha: new Date().toISOString().split('T')[0],
      actoContrato: '',
      avaluoMunicipal: '',
      valorContrato: '',
      formaPagoCheque: false,
      formaPagoEfectivo: false,
      formaPagoTransferencia: false,
      formaPagoTarjeta: false,
      montoCheque: '',
      montoEfectivo: '',
      montoTransferencia: '',
      montoTarjeta: '',
      bancoCheque: '',
      bancoTransferencia: '',
      bancoTarjeta: ''
    });
  };

  /**
   * Resetear formulario de persona
   */
  const resetFormPersona = () => {
    setFormPersona({
      cedula: '',
      calidad: 'COMPRADOR',
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
   * Copiar link del formulario al portapapeles
   */
  const copiarLinkFormulario = () => {
    const link = `${window.location.origin}/formulario-uafe-protocolo.html`;
    navigator.clipboard.writeText(link).then(() => {
      mostrarSnackbar('Link copiado al portapapeles', 'success');
    }).catch(err => {
      console.error('Error al copiar:', err);
      mostrarSnackbar('Error al copiar el link', 'error');
    });
  };

  /**
   * Obtener nombre de persona al buscar (endpoint verificar-cedula)
   */
  const obtenerNombreBusqueda = (persona) => {
    if (!persona) return 'Sin nombre';
    if (persona.tipoPersona === 'NATURAL' && persona.datosPersonaNatural) {
      const datos = persona.datosPersonaNatural;
      if (datos.datosPersonales?.nombres && datos.datosPersonales?.apellidos) {
        return `${datos.datosPersonales.nombres} ${datos.datosPersonales.apellidos}`.trim();
      }
    } else if (persona.tipoPersona === 'JURIDICA' && persona.datosPersonaJuridica) {
      const datos = persona.datosPersonaJuridica;
      if (datos.compania?.razonSocial) {
        return datos.compania.razonSocial.trim();
      }
    }
    return 'Sin nombre';
  };

  /**
   * Calcular progreso de personas completadas
   */
  const calcularProgreso = (protocolo) => {
    if (!protocolo.personas || protocolo.personas.length === 0) return 0;
    const completadas = protocolo.personas.filter(p => p.completado).length;
    return Math.round((completadas / protocolo.personas.length) * 100);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Formularios UAFE - Sistema de Protocolos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crea protocolos y agrega personas. Acceso con: Protocolo + Cédula + PIN
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={copiarLinkFormulario}
            sx={{ borderRadius: 2 }}
          >
            Copiar Link
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenNuevoProtocolo(true)}
            sx={{ borderRadius: 2 }}
          >
            Nuevo Protocolo
          </Button>
        </Stack>
      </Box>

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
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={cargarProtocolos}
                disabled={loading}
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
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 50 }}></TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>No. Protocolo</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Acto/Contrato</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Valor</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Personas</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Progreso</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Acciones</TableCell>
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
                    No hay protocolos. Crea tu primer protocolo.
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
                      {new Date(protocolo.fecha).toLocaleDateString('es-EC')}
                    </TableCell>
                    <TableCell>{protocolo.actoContrato}</TableCell>
                    <TableCell>${parseFloat(protocolo.valorContrato).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${protocolo.personas?.length || 0} persona(s)`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="caption">
                            {calcularProgreso(protocolo)}%
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`${protocolo.personas?.filter(p => p.completado).length || 0}/${protocolo.personas?.length || 0}`}
                          color={calcularProgreso(protocolo) === 100 ? 'success' : 'warning'}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Agregar Persona">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => abrirAgregarPersona(protocolo)}
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ver Detalles">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => verDetallesProtocolo(protocolo.id)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>

                  {/* Fila expandible con lista de personas */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                      <Collapse in={expandedProtocol === protocolo.id} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Personas en este protocolo
                          </Typography>
                          {protocolo.personas && protocolo.personas.length > 0 ? (
                            <List dense>
                              {protocolo.personas.map((persona) => (
                                <ListItem key={persona.id}>
                                  <ListItemText
                                    primary={persona.nombre}
                                    secondary={
                                      <>
                                        <Typography component="span" variant="body2">
                                          {persona.cedula} - {persona.calidad} ({persona.actuaPor})
                                        </Typography>
                                      </>
                                    }
                                  />
                                  <ListItemSecondaryAction>
                                    <Chip
                                      icon={persona.completado ? <CheckCircleIcon /> : <PendingIcon />}
                                      label={persona.completado ? 'Completado' : 'Pendiente'}
                                      color={persona.completado ? 'success' : 'warning'}
                                      size="small"
                                    />
                                  </ListItemSecondaryAction>
                                </ListItem>
                              ))}
                            </List>
                          ) : (
                            <Alert severity="info">
                              No hay personas agregadas. Haz clic en "Agregar Persona" para añadir la primera.
                            </Alert>
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

      {/* Dialog: Nuevo Protocolo */}
      <Dialog
        open={openNuevoProtocolo}
        onClose={() => setOpenNuevoProtocolo(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
          Crear Nuevo Protocolo UAFE
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            {/* Datos básicos del protocolo */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Información del Protocolo
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Número de Protocolo"
                    value={formProtocolo.numeroProtocolo}
                    onChange={(e) => setFormProtocolo({ ...formProtocolo, numeroProtocolo: e.target.value })}
                    placeholder="Ej: 2024-1234"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    label="Fecha"
                    value={formProtocolo.fecha}
                    onChange={(e) => setFormProtocolo({ ...formProtocolo, fecha: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Acto / Contrato"
                    value={formProtocolo.actoContrato}
                    onChange={(e) => setFormProtocolo({ ...formProtocolo, actoContrato: e.target.value })}
                    placeholder="Ej: Compraventa de Inmueble"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Avalúo Municipal (opcional)"
                    value={formProtocolo.avaluoMunicipal}
                    onChange={(e) => setFormProtocolo({ ...formProtocolo, avaluoMunicipal: e.target.value })}
                    placeholder="0.00"
                    InputProps={{ startAdornment: '$' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Valor del Contrato"
                    value={formProtocolo.valorContrato}
                    onChange={(e) => setFormProtocolo({ ...formProtocolo, valorContrato: e.target.value })}
                    placeholder="0.00"
                    InputProps={{ startAdornment: '$' }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Forma de Pago */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Forma de Pago
              </Typography>
              <Stack spacing={2}>
                {/* Cheque */}
                <Box>
                  <FormControl component="fieldset">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <input
                        type="checkbox"
                        checked={formProtocolo.formaPagoCheque}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, formaPagoCheque: e.target.checked })}
                      />
                      <Typography>Cheque</Typography>
                    </Stack>
                  </FormControl>
                  {formProtocolo.formaPagoCheque && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Monto"
                          value={formProtocolo.montoCheque}
                          onChange={(e) => setFormProtocolo({ ...formProtocolo, montoCheque: e.target.value })}
                          InputProps={{ startAdornment: '$' }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Banco"
                          value={formProtocolo.bancoCheque}
                          onChange={(e) => setFormProtocolo({ ...formProtocolo, bancoCheque: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>

                {/* Efectivo */}
                <Box>
                  <FormControl component="fieldset">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <input
                        type="checkbox"
                        checked={formProtocolo.formaPagoEfectivo}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, formaPagoEfectivo: e.target.checked })}
                      />
                      <Typography>Efectivo</Typography>
                    </Stack>
                  </FormControl>
                  {formProtocolo.formaPagoEfectivo && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Monto"
                          value={formProtocolo.montoEfectivo}
                          onChange={(e) => setFormProtocolo({ ...formProtocolo, montoEfectivo: e.target.value })}
                          InputProps={{ startAdornment: '$' }}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>

                {/* Transferencia */}
                <Box>
                  <FormControl component="fieldset">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <input
                        type="checkbox"
                        checked={formProtocolo.formaPagoTransferencia}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, formaPagoTransferencia: e.target.checked })}
                      />
                      <Typography>Transferencia</Typography>
                    </Stack>
                  </FormControl>
                  {formProtocolo.formaPagoTransferencia && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Monto"
                          value={formProtocolo.montoTransferencia}
                          onChange={(e) => setFormProtocolo({ ...formProtocolo, montoTransferencia: e.target.value })}
                          InputProps={{ startAdornment: '$' }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Banco"
                          value={formProtocolo.bancoTransferencia}
                          onChange={(e) => setFormProtocolo({ ...formProtocolo, bancoTransferencia: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>

                {/* Tarjeta */}
                <Box>
                  <FormControl component="fieldset">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <input
                        type="checkbox"
                        checked={formProtocolo.formaPagoTarjeta}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, formaPagoTarjeta: e.target.checked })}
                      />
                      <Typography>Tarjeta</Typography>
                    </Stack>
                  </FormControl>
                  {formProtocolo.formaPagoTarjeta && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Monto"
                          value={formProtocolo.montoTarjeta}
                          onChange={(e) => setFormProtocolo({ ...formProtocolo, montoTarjeta: e.target.value })}
                          InputProps={{ startAdornment: '$' }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Banco"
                          value={formProtocolo.bancoTarjeta}
                          onChange={(e) => setFormProtocolo({ ...formProtocolo, bancoTarjeta: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenNuevoProtocolo(false); resetFormProtocolo(); }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={crearProtocolo}
            disabled={loading}
            startIcon={<DescriptionIcon />}
          >
            {loading ? 'Creando...' : 'Crear Protocolo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Agregar Persona al Protocolo */}
      <Dialog
        open={openAgregarPersona}
        onClose={() => { setOpenAgregarPersona(false); resetFormPersona(); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'success.main', color: 'white' }}>
          Agregar Persona al Protocolo
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            {protocoloSeleccionado && (
              <Alert severity="info">
                Protocolo: <strong>{protocoloSeleccionado.numeroProtocolo}</strong>
              </Alert>
            )}

            {/* Buscar Persona */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Buscar Persona por Cédula
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Número de Cédula"
                  value={formPersona.cedula}
                  onChange={(e) => setFormPersona({ ...formPersona, cedula: e.target.value })}
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
                  Persona encontrada: <strong>{obtenerNombreBusqueda(personaEncontrada)}</strong>
                </Alert>
              )}
            </Box>

            {/* Datos del rol en el trámite */}
            {personaEncontrada && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Rol en el Trámite
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Calidad</InputLabel>
                        <Select
                          value={formPersona.calidad}
                          label="Calidad"
                          onChange={(e) => setFormPersona({ ...formPersona, calidad: e.target.value })}
                        >
                          <MenuItem value="COMPRADOR">Comprador</MenuItem>
                          <MenuItem value="VENDEDOR">Vendedor</MenuItem>
                          <MenuItem value="TESTIGO">Testigo</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Actúa Por</InputLabel>
                        <Select
                          value={formPersona.actuaPor}
                          label="Actúa Por"
                          onChange={(e) => setFormPersona({ ...formPersona, actuaPor: e.target.value })}
                        >
                          <MenuItem value="PROPIOS_DERECHOS">Por sus propios derechos</MenuItem>
                          <MenuItem value="REPRESENTANDO">Representando</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenAgregarPersona(false); resetFormPersona(); }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={agregarPersonaAProtocolo}
            disabled={loading || !personaEncontrada}
            startIcon={<PersonAddIcon />}
          >
            {loading ? 'Agregando...' : 'Agregar Persona'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Ver Detalles del Protocolo */}
      <Dialog
        open={openVerProtocolo}
        onClose={() => setOpenVerProtocolo(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'info.main', color: 'white' }}>
          Detalles del Protocolo
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {protocoloSeleccionado && (
            <Stack spacing={3}>
              {/* Información básica */}
              <Box>
                <Typography variant="h6" gutterBottom>Información del Protocolo</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Número:</Typography>
                    <Typography variant="body1" fontWeight="bold">{protocoloSeleccionado.numeroProtocolo}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Fecha:</Typography>
                    <Typography variant="body1">{new Date(protocoloSeleccionado.fecha).toLocaleDateString('es-EC')}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Acto/Contrato:</Typography>
                    <Typography variant="body1">{protocoloSeleccionado.actoContrato}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Valor del Contrato:</Typography>
                    <Typography variant="body1" fontWeight="bold">${parseFloat(protocoloSeleccionado.valorContrato).toFixed(2)}</Typography>
                  </Grid>
                  {protocoloSeleccionado.avaluoMunicipal && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Avalúo Municipal:</Typography>
                      <Typography variant="body1">${parseFloat(protocoloSeleccionado.avaluoMunicipal).toFixed(2)}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider />

              {/* Personas */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Personas ({protocoloSeleccionado.personas?.length || 0})
                </Typography>
                {protocoloSeleccionado.personas && protocoloSeleccionado.personas.length > 0 ? (
                  <List>
                    {protocoloSeleccionado.personas.map((persona) => (
                      <ListItem key={persona.id}>
                        <ListItemText
                          primary={persona.nombre}
                          secondary={
                            <>
                              {persona.cedula} - {persona.calidad}
                              <br />
                              {persona.actuaPor}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Chip
                            icon={persona.completado ? <CheckCircleIcon /> : <PendingIcon />}
                            label={persona.completado ? 'Completado' : 'Pendiente'}
                            color={persona.completado ? 'success' : 'warning'}
                            size="small"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">No hay personas agregadas a este protocolo.</Alert>
                )}
              </Box>

              <Divider />

              {/* Instrucciones de acceso */}
              <Box>
                <Typography variant="h6" gutterBottom>Instrucciones de Acceso</Typography>
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Las personas pueden acceder al formulario con:</strong>
                  </Typography>
                  <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Número de Protocolo: <strong>{protocoloSeleccionado.numeroProtocolo}</strong></li>
                    <li>Su Cédula</li>
                    <li>Su PIN personal (configurado al registrarse)</li>
                  </ol>
                </Alert>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVerProtocolo(false)}>Cerrar</Button>
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
