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
  Edit as EditIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { API_BASE } from '../utils/apiConfig';
import { formatDateES, formatDateTimeES } from '../utils/dateUtils';

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
  const [openEditarPersona, setOpenEditarPersona] = useState(false);
  const [personaEditar, setPersonaEditar] = useState(null);
  const [openConfirmarEliminar, setOpenConfirmarEliminar] = useState(false);
  const [personaEliminar, setPersonaEliminar] = useState(null);

  // Estados de expansión de tabla
  const [expandedProtocol, setExpandedProtocol] = useState(null);

  // Estados de edición de protocolo
  const [modoEditarProtocolo, setModoEditarProtocolo] = useState(false);
  const [protocoloEditando, setProtocoloEditando] = useState(null);

  // Formulario de nuevo protocolo
  const [formProtocolo, setFormProtocolo] = useState({
    numeroProtocolo: '',
    fecha: new Date().toISOString().split('T')[0],
    actoContrato: '',
    avaluoMunicipal: '',
    valorContrato: ''
  });

  // Formas de pago (lista dinámica)
  const [formasPago, setFormasPago] = useState([
    { tipo: 'EFECTIVO', monto: '', banco: '' }
  ]);

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

    // Validar formas de pago
    const formasPagoValidas = formasPago.filter(fp => fp.monto && parseFloat(fp.monto) > 0);
    if (formasPagoValidas.length === 0) {
      mostrarSnackbar('Debes agregar al menos una forma de pago válida', 'warning');
      return;
    }

    // Validar que CHEQUE y TRANSFERENCIA tengan banco
    for (const fp of formasPagoValidas) {
      if (['CHEQUE', 'TRANSFERENCIA'].includes(fp.tipo) && !fp.banco) {
        mostrarSnackbar(`La forma de pago ${fp.tipo} requiere especificar el banco`, 'warning');
        return;
      }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Construir array de formasPago
      const formasPagoFinal = formasPagoValidas.map(fp => ({
        tipo: fp.tipo,
        monto: parseFloat(fp.monto),
        ...(fp.banco && { banco: fp.banco })
      }));

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
          formasPago: formasPagoFinal
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
        setModoEditarProtocolo(false);
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
   * Habilitar modo de edición de protocolo
   */
  const habilitarEdicionProtocolo = () => {
    setProtocoloEditando({
      numeroProtocolo: protocoloSeleccionado.numeroProtocolo,
      fecha: protocoloSeleccionado.fecha.split('T')[0],
      actoContrato: protocoloSeleccionado.actoContrato,
      avaluoMunicipal: protocoloSeleccionado.avaluoMunicipal || '',
      valorContrato: protocoloSeleccionado.valorContrato
    });
    setModoEditarProtocolo(true);
  };

  /**
   * Cancelar edición de protocolo
   */
  const cancelarEdicionProtocolo = () => {
    setModoEditarProtocolo(false);
    setProtocoloEditando(null);
  };

  /**
   * Guardar cambios del protocolo
   */
  const guardarCambiosProtocolo = async () => {
    if (!protocoloEditando.numeroProtocolo || !protocoloEditando.fecha ||
        !protocoloEditando.actoContrato || !protocoloEditando.valorContrato) {
      mostrarSnackbar('Todos los campos son obligatorios', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/formulario-uafe/protocolo/${protocoloSeleccionado.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            numeroProtocolo: protocoloEditando.numeroProtocolo,
            fecha: protocoloEditando.fecha,
            actoContrato: protocoloEditando.actoContrato,
            avaluoMunicipal: protocoloEditando.avaluoMunicipal || null,
            valorContrato: parseFloat(protocoloEditando.valorContrato)
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        mostrarSnackbar('Protocolo actualizado exitosamente', 'success');
        setModoEditarProtocolo(false);
        setProtocoloEditando(null);
        // Recargar detalles del protocolo
        await verDetallesProtocolo(protocoloSeleccionado.id);
        // Recargar lista de protocolos
        cargarProtocolos();
      } else {
        mostrarSnackbar(data.message || 'Error al actualizar protocolo', 'error');
      }
    } catch (error) {
      console.error('Error al actualizar protocolo:', error);
      mostrarSnackbar('Error al actualizar protocolo', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Previsualizar formulario público
   */
  const previsualizarFormulario = () => {
    // Abrir en nueva pestaña la URL del formulario público
    const urlFormularioPublico = `${window.location.origin}/formulario-uafe-protocolo.html`;
    window.open(urlFormularioPublico, '_blank');
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
      valorContrato: ''
    });
    setFormasPago([{ tipo: 'EFECTIVO', monto: '', banco: '' }]);
  };

  /**
   * Agregar nueva forma de pago
   */
  const agregarFormaPago = () => {
    setFormasPago([...formasPago, { tipo: 'EFECTIVO', monto: '', banco: '' }]);
  };

  /**
   * Quitar forma de pago
   */
  const quitarFormaPago = (index) => {
    if (formasPago.length > 1) {
      setFormasPago(formasPago.filter((_, i) => i !== index));
    }
  };

  /**
   * Actualizar forma de pago
   */
  const actualizarFormaPago = (index, campo, valor) => {
    const nuevas = [...formasPago];
    nuevas[index][campo] = valor;

    // Si cambia el tipo a EFECTIVO o TARJETA, limpiar el banco
    if (campo === 'tipo' && valor === 'EFECTIVO') {
      nuevas[index].banco = '';
    }

    setFormasPago(nuevas);
  };

  /**
   * Calcular total de formas de pago
   */
  const calcularTotalFormasPago = () => {
    return formasPago.reduce((sum, fp) => {
      const monto = parseFloat(fp.monto) || 0;
      return sum + monto;
    }, 0);
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
   * Abrir dialog para editar persona
   */
  const abrirEditarPersona = (persona) => {
    setPersonaEditar({
      id: persona.id,
      cedula: persona.cedula,
      calidad: persona.calidad,
      actuaPor: persona.actuaPor
    });
    setOpenEditarPersona(true);
  };

  /**
   * Actualizar datos de persona (calidad y actuaPor)
   */
  const actualizarPersona = async () => {
    if (!personaEditar || !protocoloSeleccionado) {
      mostrarSnackbar('Error: datos incompletos', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/formulario-uafe/protocolos/${protocoloSeleccionado.id}/personas/${personaEditar.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            calidad: personaEditar.calidad,
            actuaPor: personaEditar.actuaPor
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        mostrarSnackbar('Persona actualizada exitosamente', 'success');
        setOpenEditarPersona(false);
        setPersonaEditar(null);
        // Recargar detalles del protocolo
        verDetallesProtocolo(protocoloSeleccionado.id);
        cargarProtocolos();
      } else {
        mostrarSnackbar(data.message || 'Error al actualizar persona', 'error');
      }
    } catch (error) {
      console.error('Error al actualizar persona:', error);
      mostrarSnackbar('Error al actualizar persona', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abrir dialog de confirmación para eliminar persona
   */
  const confirmarEliminarPersona = (persona) => {
    setPersonaEliminar(persona);
    setOpenConfirmarEliminar(true);
  };

  /**
   * Eliminar persona del protocolo
   */
  const eliminarPersona = async () => {
    if (!personaEliminar || !protocoloSeleccionado) {
      mostrarSnackbar('Error: datos incompletos', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/formulario-uafe/protocolos/${protocoloSeleccionado.id}/personas/${personaEliminar.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        mostrarSnackbar('Persona eliminada exitosamente', 'success');
        setOpenConfirmarEliminar(false);
        setPersonaEliminar(null);
        // Recargar detalles del protocolo
        verDetallesProtocolo(protocoloSeleccionado.id);
        cargarProtocolos();
      } else {
        mostrarSnackbar(data.message || 'Error al eliminar persona', 'error');
      }
    } catch (error) {
      console.error('Error al eliminar persona:', error);
      mostrarSnackbar('Error al eliminar persona', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Descargar PDF individual de una persona
   */
  const descargarPDFIndividual = async (protocoloId, personaId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/formulario-uafe/protocolos/${protocoloId}/personas/${personaId}/pdf`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        mostrarSnackbar(errorData.message || 'Error al generar PDF', 'error');
        return;
      }

      // Obtener filename del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'formulario_uafe.pdf';

      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      mostrarSnackbar('PDF descargado exitosamente', 'success');
    } catch (error) {
      console.error('Error descargando PDF:', error);
      mostrarSnackbar('Error al descargar PDF', 'error');
    } finally {
      setLoading(false);
    }
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
   * Descargar PDFs profesionales de formularios UAFE
   */
  const descargarPDFs = async (protocoloId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/formulario-uafe/protocolo/${protocoloId}/generar-pdfs`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        mostrarSnackbar(errorData.message || 'Error al generar PDFs', 'error');
        return;
      }

      // Obtener filename del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'formularios_uafe.pdf';

      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      mostrarSnackbar('PDFs descargados exitosamente', 'success');
    } catch (error) {
      console.error('Error descargando PDFs:', error);
      mostrarSnackbar('Error al descargar PDFs', 'error');
    } finally {
      setLoading(false);
    }
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
                      {formatDateES(protocolo.fecha)}
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
                        <Tooltip title="Descargar PDFs">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => descargarPDFs(protocolo.id)}
                            disabled={!protocolo.personas || protocolo.personas.filter(p => p.completado).length === 0}
                          >
                            <PictureAsPdfIcon fontSize="small" />
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

            {/* Formas de Pago (Lista Dinámica) */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  💰 Formas de Pago
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: ${calcularTotalFormasPago().toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Stack>

              <Stack spacing={2}>
                {formasPago.map((formaPago, index) => (
                  <Card key={index} variant="outlined" sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Tipo</InputLabel>
                          <Select
                            value={formaPago.tipo}
                            label="Tipo"
                            onChange={(e) => actualizarFormaPago(index, 'tipo', e.target.value)}
                          >
                            <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                            <MenuItem value="CHEQUE">Cheque</MenuItem>
                            <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                            <MenuItem value="TARJETA">Tarjeta</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Monto"
                          value={formaPago.monto}
                          onChange={(e) => actualizarFormaPago(index, 'monto', e.target.value)}
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>
                          }}
                          placeholder="0.00"
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Banco"
                          value={formaPago.banco}
                          onChange={(e) => actualizarFormaPago(index, 'banco', e.target.value)}
                          disabled={formaPago.tipo === 'EFECTIVO'}
                          placeholder={formaPago.tipo === 'EFECTIVO' ? '(no aplica)' : 'Nombre del banco'}
                          helperText={['CHEQUE', 'TRANSFERENCIA'].includes(formaPago.tipo) ? 'Obligatorio' : ''}
                        />
                      </Grid>

                      <Grid item xs={12} sm={2}>
                        <Tooltip title="Quitar forma de pago">
                          <span>
                            <IconButton
                              color="error"
                              onClick={() => quitarFormaPago(index)}
                              disabled={formasPago.length === 1}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </Card>
                ))}

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={agregarFormaPago}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Agregar otra forma de pago
                </Button>

                {/* Advertencia si el total no coincide */}
                {formProtocolo.valorContrato && calcularTotalFormasPago() !== parseFloat(formProtocolo.valorContrato) && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    ⚠️ El total de formas de pago (${calcularTotalFormasPago().toLocaleString('es-EC', { minimumFractionDigits: 2 })})
                    no coincide con el valor del contrato (${parseFloat(formProtocolo.valorContrato).toLocaleString('es-EC', { minimumFractionDigits: 2 })})
                  </Alert>
                )}
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
                          <MenuItem value="REPRESENTANDO_A">Representando a otra persona</MenuItem>
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
        onClose={() => { setOpenVerProtocolo(false); cancelarEdicionProtocolo(); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'info.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Detalles del Protocolo</span>
          {protocoloSeleccionado && !modoEditarProtocolo && (
            <Box>
              <Tooltip title="Previsualizar Formulario Público">
                <IconButton
                  size="small"
                  onClick={previsualizarFormulario}
                  sx={{ color: 'white', mr: 1 }}
                >
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Editar Protocolo">
                <IconButton
                  size="small"
                  onClick={habilitarEdicionProtocolo}
                  sx={{ color: 'white' }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {protocoloSeleccionado && (
            <Stack spacing={3}>
              {/* Información básica */}
              <Box>
                <Typography variant="h6" gutterBottom>Información del Protocolo</Typography>

                {!modoEditarProtocolo ? (
                  // Modo visualización
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Número:</Typography>
                      <Typography variant="body1" fontWeight="bold">{protocoloSeleccionado.numeroProtocolo}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Fecha:</Typography>
                      <Typography variant="body1">{formatDateES(protocoloSeleccionado.fecha)}</Typography>
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
                ) : (
                  // Modo edición
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Editando protocolo. Los cambios afectarán a todas las personas asociadas.
                      </Alert>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Número de Protocolo"
                        value={protocoloEditando?.numeroProtocolo || ''}
                        onChange={(e) => setProtocoloEditando({ ...protocoloEditando, numeroProtocolo: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Fecha"
                        value={protocoloEditando?.fecha || ''}
                        onChange={(e) => setProtocoloEditando({ ...protocoloEditando, fecha: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Acto/Contrato"
                        value={protocoloEditando?.actoContrato || ''}
                        onChange={(e) => setProtocoloEditando({ ...protocoloEditando, actoContrato: e.target.value })}
                        required
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Valor del Contrato"
                        value={protocoloEditando?.valorContrato || ''}
                        onChange={(e) => setProtocoloEditando({ ...protocoloEditando, valorContrato: e.target.value })}
                        required
                        inputProps={{ step: '0.01', min: '0' }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Avalúo Municipal (opcional)"
                        value={protocoloEditando?.avaluoMunicipal || ''}
                        onChange={(e) => setProtocoloEditando({ ...protocoloEditando, avaluoMunicipal: e.target.value })}
                        inputProps={{ step: '0.01', min: '0' }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          onClick={cancelarEdicionProtocolo}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={guardarCambiosProtocolo}
                          disabled={loading}
                          startIcon={<SaveIcon />}
                        >
                          {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                )}
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
                      <ListItem
                        key={persona.id}
                        sx={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          mb: 2,
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '16px'
                        }}
                      >
                        {/* Header con nombre y estado */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {persona.nombre}
                          </Typography>
                          <Chip
                            icon={persona.completado ? <CheckCircleIcon /> : <PendingIcon />}
                            label={persona.completado ? 'Completado' : 'Pendiente'}
                            color={persona.completado ? 'success' : 'warning'}
                            size="small"
                          />
                        </Box>

                        {/* Información detallada */}
                        <Box sx={{ width: '100%', mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Cédula:</strong> {persona.cedula}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Calidad:</strong> {persona.calidad}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Actúa por:</strong> {persona.actuaPor === 'REPRESENTANDO_A' || persona.actuaPor === 'REPRESENTANDO' ? 'Representando a otra persona' : 'Sus propios derechos'}
                          </Typography>
                          {persona.completadoAt && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Fecha completado:</strong> {formatDateTimeES(persona.completadoAt)}
                            </Typography>
                          )}
                        </Box>

                        {/* Botones de acción */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => abrirEditarPersona(persona)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => confirmarEliminarPersona(persona)}
                          >
                            Eliminar
                          </Button>
                          {persona.completado && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<DownloadIcon />}
                              onClick={() => descargarPDFIndividual(protocoloSeleccionado.id, persona.id)}
                            >
                              Descargar PDF
                            </Button>
                          )}
                        </Box>
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

      {/* Dialog: Editar Persona */}
      <Dialog
        open={openEditarPersona}
        onClose={() => { setOpenEditarPersona(false); setPersonaEditar(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'warning.main', color: 'white' }}>
          Editar Persona
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {personaEditar && (
            <Stack spacing={3}>
              <Alert severity="info">
                Editando: <strong>{personaEditar.cedula}</strong>
              </Alert>

              <FormControl fullWidth>
                <InputLabel>Calidad</InputLabel>
                <Select
                  value={personaEditar.calidad}
                  label="Calidad"
                  onChange={(e) => setPersonaEditar({ ...personaEditar, calidad: e.target.value })}
                >
                  <MenuItem value="COMPRADOR">Comprador</MenuItem>
                  <MenuItem value="VENDEDOR">Vendedor</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Actúa Por</InputLabel>
                <Select
                  value={personaEditar.actuaPor}
                  label="Actúa Por"
                  onChange={(e) => setPersonaEditar({ ...personaEditar, actuaPor: e.target.value })}
                >
                  <MenuItem value="PROPIOS_DERECHOS">Por sus propios derechos</MenuItem>
                  <MenuItem value="REPRESENTANDO_A">Representando a otra persona</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditarPersona(false); setPersonaEditar(null); }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={actualizarPersona}
            disabled={loading}
            startIcon={<EditIcon />}
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar Eliminación */}
      <Dialog
        open={openConfirmarEliminar}
        onClose={() => { setOpenConfirmarEliminar(false); setPersonaEliminar(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'error.main', color: 'white' }}>
          Confirmar Eliminación
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {personaEliminar && (
            <Stack spacing={2}>
              <Alert severity="warning">
                ¿Estás seguro de que deseas eliminar esta persona del protocolo?
              </Alert>
              <Box>
                <Typography variant="body2"><strong>Nombre:</strong> {personaEliminar.nombre}</Typography>
                <Typography variant="body2"><strong>Cédula:</strong> {personaEliminar.cedula}</Typography>
                <Typography variant="body2"><strong>Calidad:</strong> {personaEliminar.calidad}</Typography>
              </Box>
              <Alert severity="error">
                Esta acción no se puede deshacer. Los datos del formulario completado se perderán.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenConfirmarEliminar(false); setPersonaEliminar(null); }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={eliminarPersona}
            disabled={loading}
            startIcon={<DeleteIcon />}
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
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

export default FormulariosUAFE;
