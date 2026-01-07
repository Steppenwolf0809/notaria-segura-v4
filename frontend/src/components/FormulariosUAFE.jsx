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
  Save as SaveIcon,
  LockReset as LockResetIcon,
  HowToReg as HowToRegIcon
} from '@mui/icons-material';
import { API_BASE } from '../utils/apiConfig';
import { formatDateES, formatDateTimeES } from '../utils/dateUtils';
import ResetearPinDialog from './ResetearPinDialog';
import VistaPreviewFormulario from './VistaPreviewFormulario';
import apiClient from '../services/api-client';

/**
 * Componente para gestionar formularios UAFE con sistema de Protocolos
 * Nuevo flujo: 1 Protocolo → N Personas
 *
 * Flujo:
 * 1. Crear Protocolo (datos del trámite)
 * 2. Agregar personas al protocolo
 * 3. Cada persona puede acceder con: Protocolo + Cédula + PIN
 */

// Tipos de Acto/Contrato disponibles
const TIPOS_ACTO_CONTRATO = [
  { value: 'COMPRAVENTA', label: 'Compraventa de Bien Inmueble' },
  { value: 'VENTA_VEHICULO', label: 'Venta de Vehículo' },
  { value: 'DONACION', label: 'Donación' },
  { value: 'CESION_DERECHOS', label: 'Cesión de Derechos' },
  { value: 'PROMESA_COMPRAVENTA', label: 'Promesa de Compraventa' },
  { value: 'OTROS', label: 'Otros (especificar)' }
];

// Tipos que requieren datos de bien inmueble
const TIPOS_BIEN_INMUEBLE = ['COMPRAVENTA', 'DONACION', 'CESION_DERECHOS', 'PROMESA_COMPRAVENTA'];
// Tipos que requieren datos de vehículo
const TIPOS_VEHICULO = ['VENTA_VEHICULO'];

import ModalDatosRepresentado from './ModalDatosRepresentado';

const FormulariosUAFE = ({ adminMode = false }) => {
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
  const [openConfirmarEliminarProtocolo, setOpenConfirmarEliminarProtocolo] = useState(false);
  const [personaEliminar, setPersonaEliminar] = useState(null);
  const [openResetearPin, setOpenResetearPin] = useState(false);

  // Estados para preview de formulario
  const [openPreview, setOpenPreview] = useState(false);
  const [previewPersona, setPreviewPersona] = useState(null);

  // Estados de expansión de tabla
  const [expandedProtocol, setExpandedProtocol] = useState(null);

  // Estados de edición de protocolo
  const [modoEditarProtocolo, setModoEditarProtocolo] = useState(false);
  const [protocoloEditando, setProtocoloEditando] = useState(null);
  const [formasPagoEditando, setFormasPagoEditando] = useState([]);

  // Formulario de nuevo protocolo
  const [formProtocolo, setFormProtocolo] = useState({
    numeroProtocolo: '',
    fecha: new Date().toISOString().split('T')[0],
    actoContrato: '',
    tipoActoOtro: '',           // Campo para "Otros (especificar)"
    // Campos para bien inmueble
    bienInmuebleDescripcion: '',
    bienInmuebleUbicacion: '',
    // Campos para vehículo
    vehiculoPlaca: '',
    vehiculoMarca: '',
    vehiculoModelo: '',
    vehiculoAnio: '',
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
      const params = new URLSearchParams();
      if (filtroProtocolo) params.append('search', filtroProtocolo);

      const url = adminMode
        ? `/formulario-uafe/admin/protocolos?${params}`
        : `/formulario-uafe/protocolos?${params}`;

      const response = await apiClient.get(url);

      if (response.data.success) {
        setProtocolos(response.data.data);
      } else {
        mostrarSnackbar('Error al cargar protocolos', 'error');
      }
    } catch (error) {
      mostrarSnackbar('Error al cargar protocolos', 'error');
      console.error('Error cargando protocolos:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Guardar protocolo (Crear o Editar)
   */
  const guardarProtocolo = async () => {
    // Validaciones básicas
    if (!formProtocolo.numeroProtocolo || !formProtocolo.actoContrato || !formProtocolo.valorContrato) {
      mostrarSnackbar('Completa los campos obligatorios: Número de Protocolo, Acto/Contrato y Valor del Contrato', 'warning');
      return;
    }

    // Validar campo "Otros" si está seleccionado
    if (formProtocolo.actoContrato === 'OTROS' && !formProtocolo.tipoActoOtro?.trim()) {
      mostrarSnackbar('Debes especificar el tipo de acto/contrato', 'warning');
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
      // Construir array de formasPago
      const formasPagoFinal = formasPagoValidas.map(fp => ({
        tipo: fp.tipo,
        monto: parseFloat(fp.monto),
        ...(fp.banco && { banco: fp.banco })
      }));

      // Construir datos del protocolo con campos condicionales
      const datosProtocolo = {
        numeroProtocolo: formProtocolo.numeroProtocolo,
        fecha: formProtocolo.fecha,
        actoContrato: formProtocolo.actoContrato,
        avaluoMunicipal: formProtocolo.avaluoMunicipal || null,
        valorContrato: formProtocolo.valorContrato,
        formasPago: formasPagoFinal
      };

      // Añadir campos condicionales según tipo de acto
      if (formProtocolo.actoContrato === 'OTROS') {
        datosProtocolo.tipoActoOtro = formProtocolo.tipoActoOtro;
      }

      if (TIPOS_BIEN_INMUEBLE.includes(formProtocolo.actoContrato)) {
        datosProtocolo.bienInmuebleDescripcion = formProtocolo.bienInmuebleDescripcion || null;
        datosProtocolo.bienInmuebleUbicacion = formProtocolo.bienInmuebleUbicacion || null;
      }

      if (TIPOS_VEHICULO.includes(formProtocolo.actoContrato)) {
        datosProtocolo.vehiculoPlaca = formProtocolo.vehiculoPlaca || null;
        datosProtocolo.vehiculoMarca = formProtocolo.vehiculoMarca || null;
        datosProtocolo.vehiculoModelo = formProtocolo.vehiculoModelo || null;
        datosProtocolo.vehiculoAnio = formProtocolo.vehiculoAnio || null;
      }

      let response;
      if (modoEditarProtocolo && protocoloSeleccionado) {
        // UPDATE
        response = await apiClient.put(`/formulario-uafe/protocolo/${protocoloSeleccionado.id}`, datosProtocolo);
      } else {
        // CREATE
        response = await apiClient.post('/formulario-uafe/protocolo', datosProtocolo);
      }

      if (response.data.success) {
        mostrarSnackbar(modoEditarProtocolo ? 'Protocolo actualizado exitosamente' : 'Protocolo creado exitosamente', 'success');
        setOpenNuevoProtocolo(false);
        resetFormProtocolo();
        cargarProtocolos();
      } else {
        mostrarSnackbar(response.data.message || 'Error al guardar protocolo', 'error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al guardar protocolo';
      mostrarSnackbar(errorMsg, 'error');
      console.error('Error guardando protocolo:', error);
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
      const response = await apiClient.get(`/personal/verificar-cedula/${formPersona.cedula}`);

      if (response.data.success && response.data.existe) {
        setPersonaEncontrada(response.data);
        mostrarSnackbar('Persona encontrada', 'success');
      } else {
        setPersonaEncontrada(null);
        mostrarSnackbar('Persona no encontrada. Debe registrarse primero en /registro-personal', 'warning');
      }
    } catch (error) {
      mostrarSnackbar('Error al buscar persona', 'error');
      console.error('Error buscando persona:', error);
    } finally {
      setBuscandoPersona(false);
    }
  };

  /**
   * Agregar persona al protocolo
   */
  // Estado para modal de representado
  const [openModalRepresentado, setOpenModalRepresentado] = useState(false);

  /**
   * Agregar persona al protocolo
   */
  const agregarPersonaAProtocolo = async (datosExtra = null) => {
    if (!personaEncontrada) {
      mostrarSnackbar('Primero busca a la persona', 'warning');
      return;
    }

    if (!protocoloSeleccionado) {
      mostrarSnackbar('No hay protocolo seleccionado', 'error');
      return;
    }

    // Interceptar si es REPRESENTANDO_A y no tenemos datosExtra todavia
    if (formPersona.actuaPor === 'REPRESENTANDO_A' && !datosExtra) {
      setOpenModalRepresentado(true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        cedula: formPersona.cedula,
        calidad: formPersona.calidad,
        actuaPor: formPersona.actuaPor
      };

      if (datosExtra) {
        if (datosExtra.representadoId) payload.representadoId = datosExtra.representadoId;
        if (datosExtra.datosRepresentado) payload.datosRepresentado = datosExtra.datosRepresentado;
      }

      const response = await apiClient.post(
        `/formulario-uafe/protocolo/${protocoloSeleccionado.id}/persona`,
        payload
      );

      if (response.data.success) {
        mostrarSnackbar('Persona agregada al protocolo exitosamente', 'success');
        setOpenAgregarPersona(false);
        setOpenModalRepresentado(false); // Asegurar cierre
        resetFormPersona();
        verDetallesProtocolo(protocoloSeleccionado.id); // Actualizar vista detalles
        cargarProtocolos(); // Actualizar lista principal
      } else {
        mostrarSnackbar(response.data.message || 'Error al agregar persona', 'error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al agregar persona';
      mostrarSnackbar(errorMsg, 'error');
      console.error('Error agregando persona:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRepresentado = (datos) => {
    agregarPersonaAProtocolo(datos);
  };

  /**
   * Ver detalles de un protocolo
   */
  const verDetallesProtocolo = async (protocoloId) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/formulario-uafe/protocolo/${protocoloId}`);

      if (response.data.success) {
        setProtocoloSeleccionado(response.data.data);
        setModoEditarProtocolo(false);
        setOpenVerProtocolo(true);
      } else {
        mostrarSnackbar('Error al cargar detalles', 'error');
      }
    } catch (error) {
      mostrarSnackbar('Error al cargar detalles', 'error');
      console.error('Error cargando detalles:', error);
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
    // Cargar formas de pago existentes o inicializar con una vacía
    setFormasPagoEditando(
      protocoloSeleccionado.formasPago && protocoloSeleccionado.formasPago.length > 0
        ? protocoloSeleccionado.formasPago.map(fp => ({ ...fp }))
        : [{ tipo: 'EFECTIVO', monto: '', banco: '' }]
    );
    setModoEditarProtocolo(true);
  };

  /**
   * Cancelar edición de protocolo
   */
  const cancelarEdicionProtocolo = () => {
    setModoEditarProtocolo(false);
    setProtocoloEditando(null);
    setFormasPagoEditando([]);
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

    // Validar formas de pago
    const formasPagoValidas = formasPagoEditando.filter(fp => fp.monto && parseFloat(fp.monto) > 0);
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
      // Construir array de formasPago
      const formasPagoFinal = formasPagoValidas.map(fp => ({
        tipo: fp.tipo,
        monto: parseFloat(fp.monto),
        ...(fp.banco && { banco: fp.banco })
      }));

      const response = await apiClient.put(
        `/formulario-uafe/protocolo/${protocoloSeleccionado.id}`,
        {
          numeroProtocolo: protocoloEditando.numeroProtocolo,
          fecha: protocoloEditando.fecha,
          actoContrato: protocoloEditando.actoContrato,
          avaluoMunicipal: protocoloEditando.avaluoMunicipal || null,
          valorContrato: parseFloat(protocoloEditando.valorContrato),
          formasPago: formasPagoFinal
        }
      );

      if (response.data.success) {
        mostrarSnackbar('Protocolo actualizado exitosamente', 'success');
        setModoEditarProtocolo(false);
        setProtocoloEditando(null);
        setFormasPagoEditando([]);
        // Recargar detalles del protocolo
        await verDetallesProtocolo(protocoloSeleccionado.id);
        // Recargar lista de protocolos
        cargarProtocolos();
      } else {
        mostrarSnackbar(response.data.message || 'Error al actualizar protocolo', 'error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al actualizar protocolo';
      mostrarSnackbar(errorMsg, 'error');
      console.error('Error actualizando protocolo:', error);
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
  /**
   * Resetear formulario de protocolo
   */
  const resetFormProtocolo = () => {
    setFormProtocolo({
      numeroProtocolo: '',
      fecha: new Date().toISOString().split('T')[0],
      actoContrato: '',
      tipoActoOtro: '',
      bienInmuebleDescripcion: '',
      bienInmuebleUbicacion: '',
      vehiculoPlaca: '',
      vehiculoMarca: '',
      vehiculoModelo: '',
      vehiculoAnio: '',
      avaluoMunicipal: '',
      valorContrato: ''
    });
    setFormasPago([{ tipo: 'EFECTIVO', monto: '', banco: '' }]);
    setModoEditarProtocolo(false);
    if (!openVerProtocolo) {
      setProtocoloSeleccionado(null);
    }
  };

  /**
   * Abrir dialog para editar protocolo
   */
  const abrirEditarProtocolo = (protocolo) => {
    setFormProtocolo({
      numeroProtocolo: protocolo.numeroProtocolo,
      fecha: protocolo.fecha ? protocolo.fecha.split('T')[0] : '',
      actoContrato: protocolo.actoContrato || '',
      tipoActoOtro: protocolo.tipoActoOtro || '',
      bienInmuebleDescripcion: protocolo.bienInmuebleDescripcion || '',
      bienInmuebleUbicacion: protocolo.bienInmuebleUbicacion || '',
      vehiculoPlaca: protocolo.vehiculoPlaca || '',
      vehiculoMarca: protocolo.vehiculoMarca || '',
      vehiculoModelo: protocolo.vehiculoModelo || '',
      vehiculoAnio: protocolo.vehiculoAnio || '',
      avaluoMunicipal: protocolo.avaluoMunicipal || '',
      valorContrato: protocolo.valorContrato || ''
    });

    if (Array.isArray(protocolo.formasPago) && protocolo.formasPago.length > 0) {
      setFormasPago(protocolo.formasPago.map(fp => ({
        ...fp,
        monto: fp.monto ? fp.monto.toString() : '',
        banco: fp.banco || ''
      })));
    } else {
      setFormasPago([{ tipo: 'EFECTIVO', monto: '', banco: '' }]);
    }

    setProtocoloSeleccionado(protocolo);
    setModoEditarProtocolo(true);
    setOpenNuevoProtocolo(true);
  };

  /**
   * Confirmar eliminación de protocolo
   */
  const confirmarEliminarProtocolo = (protocolo) => {
    setProtocoloSeleccionado(protocolo);
    setOpenConfirmarEliminarProtocolo(true);
  };

  /**
   * Eliminar protocolo
   */
  const eliminarProtocolo = async () => {
    if (!protocoloSeleccionado) return;

    setLoading(true);
    try {
      const response = await apiClient.delete(`/formulario-uafe/protocolo/${protocoloSeleccionado.id}`);
      if (response.data.success) {
        mostrarSnackbar('Protocolo eliminado exitosamente', 'success');
        setOpenConfirmarEliminarProtocolo(false);
        setProtocoloSeleccionado(null);
        cargarProtocolos();
      } else {
        mostrarSnackbar(response.data.message || 'Error al eliminar protocolo', 'error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error eliminando protocolo';
      mostrarSnackbar(errorMsg, 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
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
   * Funciones para manejar formas de pago en modo edición
   */
  const agregarFormaPagoEdicion = () => {
    setFormasPagoEditando([...formasPagoEditando, { tipo: 'EFECTIVO', monto: '', banco: '' }]);
  };

  const quitarFormaPagoEdicion = (index) => {
    if (formasPagoEditando.length > 1) {
      setFormasPagoEditando(formasPagoEditando.filter((_, i) => i !== index));
    }
  };

  const actualizarFormaPagoEdicion = (index, campo, valor) => {
    const nuevas = [...formasPagoEditando];
    nuevas[index][campo] = valor;
    if (campo === 'tipo' && valor === 'EFECTIVO') {
      nuevas[index].banco = '';
    }
    setFormasPagoEditando(nuevas);
  };

  const calcularTotalFormasPagoEdicion = () => {
    return formasPagoEditando.reduce((sum, fp) => {
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
   * Copiar link del formulario UAFE al portapapeles
   */
  const copiarLinkFormulario = () => {
    const link = 'https://notaria18quito.com.ec/formulario-uafe/';
    navigator.clipboard.writeText(link).then(() => {
      mostrarSnackbar('Link del formulario UAFE copiado al portapapeles', 'success');
    }).catch(err => {
      mostrarSnackbar('Error al copiar el link', 'error');
    });
  };

  /**
   * Copiar link del registro de usuarios al portapapeles
   */
  const copiarLinkRegistro = () => {
    const link = 'https://notaria18quito.com.ec/registro-personal/';
    navigator.clipboard.writeText(link).then(() => {
      mostrarSnackbar('Link del registro de usuarios copiado al portapapeles', 'success');
    }).catch(err => {
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
      const response = await apiClient.patch(
        `/formulario-uafe/protocolos/${protocoloSeleccionado.id}/personas/${personaEditar.id}`,
        {
          calidad: personaEditar.calidad,
          actuaPor: personaEditar.actuaPor
        }
      );

      if (response.data.success) {
        mostrarSnackbar('Persona actualizada exitosamente', 'success');
        setOpenEditarPersona(false);
        setPersonaEditar(null);
        // Recargar detalles del protocolo
        verDetallesProtocolo(protocoloSeleccionado.id);
        cargarProtocolos();
      } else {
        mostrarSnackbar(response.data.message || 'Error al actualizar persona', 'error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al actualizar persona';
      mostrarSnackbar(errorMsg, 'error');
      console.error('Error actualizando persona:', error);
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
      const response = await apiClient.delete(
        `/formulario-uafe/protocolos/${protocoloSeleccionado.id}/personas/${personaEliminar.id}`
      );

      if (response.data.success) {
        mostrarSnackbar('Persona eliminada exitosamente', 'success');
        setOpenConfirmarEliminar(false);
        setPersonaEliminar(null);
        // Recargar detalles del protocolo
        verDetallesProtocolo(protocoloSeleccionado.id);
        cargarProtocolos();
      } else {
        mostrarSnackbar(response.data.message || 'Error al eliminar persona', 'error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar persona';
      mostrarSnackbar(errorMsg, 'error');
      console.error('Error eliminando persona:', error);
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
      const response = await apiClient.get(
        `/formulario-uafe/protocolos/${protocoloId}/personas/${personaId}/pdf`,
        { responseType: 'blob' }
      );

      // Verificar que la respuesta sea válida (los PDFs son mayores a 1KB)
      if (response.data.size < 1000) {
        // Probablemente es un error JSON, intentar leerlo
        const text = await response.data.text();
        try {
          const errorData = JSON.parse(text);
          mostrarSnackbar(errorData.message || 'Error al generar PDF', 'error');
          return;
        } catch {
          // No es JSON, pero aún así es muy pequeño
          mostrarSnackbar('El PDF generado está vacío o corrupto', 'error');
          return;
        }
      }

      // Obtener filename del header Content-Disposition
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'formulario_uafe.pdf';

      // Descargar archivo con content-type correcto
      const blob = new Blob([response.data], { type: 'application/pdf' });
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
      // Intentar extraer mensaje de error del blob
      let errorMsg = 'Error al descargar PDF';
      if (error.response?.data) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            errorMsg = errorData.message || errorMsg;
          } catch {
            // Mantener mensaje por defecto
          }
        } else {
          errorMsg = error.response.data.message || errorMsg;
        }
      }
      mostrarSnackbar(errorMsg, 'error');
      console.error('Error descargando PDF:', error);
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
      const response = await apiClient.get(
        `/formulario-uafe/protocolo/${protocoloId}/generar-pdfs`,
        { responseType: 'blob' }
      );

      // Verificar que la respuesta sea válida (los PDFs/ZIPs son mayores a 1KB)
      if (response.data.size < 1000) {
        const text = await response.data.text();
        try {
          const errorData = JSON.parse(text);
          mostrarSnackbar(errorData.message || 'Error al generar PDFs', 'error');
          return;
        } catch {
          mostrarSnackbar('Los PDFs generados están vacíos o corruptos', 'error');
          return;
        }
      }

      // Obtener filename del header Content-Disposition
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'formularios_uafe.pdf';

      // Determinar content-type basado en el filename
      const contentType = filename.endsWith('.zip')
        ? 'application/zip'
        : 'application/pdf';

      // Descargar archivo con content-type correcto
      const blob = new Blob([response.data], { type: contentType });
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
      // Intentar extraer mensaje de error del blob
      let errorMsg = 'Error al descargar PDFs';
      if (error.response?.data) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            errorMsg = errorData.message || errorMsg;
          } catch {
            // Mantener mensaje por defecto
          }
        } else {
          errorMsg = error.response.data.message || errorMsg;
        }
      }
      mostrarSnackbar(errorMsg, 'error');
      console.error('Error descargando PDFs:', error);
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
            {adminMode ? 'Gestión de Formularios UAFE (Admin)' : 'Formularios UAFE - Sistema de Protocolos'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {adminMode ? 'Administración de todos los protocolos' : 'Crea protocolos y agrega personas. Acceso con: Protocolo + Cédula + PIN'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<LockResetIcon />}
            onClick={() => setOpenResetearPin(true)}
            sx={{ borderRadius: 2 }}
            color="warning"
          >
            Resetear PIN
          </Button>
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={copiarLinkFormulario}
            sx={{ borderRadius: 2 }}
          >
            Link Formulario
          </Button>
          <Button
            variant="outlined"
            startIcon={<HowToRegIcon />}
            onClick={copiarLinkRegistro}
            sx={{ borderRadius: 2 }}
            color="info"
          >
            Link Registro
          </Button>
          {!adminMode && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setModoEditarProtocolo(false);
                resetFormProtocolo();
                setOpenNuevoProtocolo(true);
              }}
              sx={{ borderRadius: 2 }}
            >
              Nuevo Protocolo
            </Button>
          )}
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
              {adminMode && <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Matrizador</TableCell>}
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
                    {adminMode && (
                      <TableCell>
                        <Tooltip title={protocolo.creador?.email || ''}>
                          <Typography variant="body2">{protocolo.creador?.nombre || 'Desconocido'}</Typography>
                        </Tooltip>
                      </TableCell>
                    )}
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
                        <Tooltip title="Ver Detalles">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => verDetallesProtocolo(protocolo.id)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar Protocolo">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => abrirEditarProtocolo(protocolo)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Agregar Persona">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => abrirAgregarPersona(protocolo)}
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Descargar PDFs">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => descargarPDFs(protocolo.id)}
                            disabled={!protocolo.personas || protocolo.personas.length === 0}
                          >
                            <PictureAsPdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar Protocolo">
                          <IconButton
                            size="small"
                            color="error" // Red
                            onClick={() => confirmarEliminarProtocolo(protocolo)}
                          >
                            <DeleteIcon fontSize="small" />
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
                                    <Stack direction="row" spacing={1}>
                                      <Tooltip title="Vista previa del formulario">
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          color="info"
                                          startIcon={<VisibilityIcon />}
                                          onClick={() => {
                                            setPreviewPersona({ ...persona, protocolId: protocolo.id });
                                            setProtocoloSeleccionado(protocolo);
                                            setOpenPreview(true);
                                          }}
                                        >
                                          Vista
                                        </Button>
                                      </Tooltip>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        color={persona.completado ? 'success' : 'primary'}
                                        startIcon={<PictureAsPdfIcon />}
                                        onClick={() => descargarPDFIndividual(protocolo.id, persona.id)}
                                      >
                                        PDF
                                      </Button>
                                    </Stack>
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
          {modoEditarProtocolo ? 'Editar Protocolo UAFE' : 'Crear Nuevo Protocolo UAFE'}
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
                <Grid item xs={6} sm={4}>
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
                <Grid item xs={6} sm={8}>
                  <FormControl fullWidth required>
                    <InputLabel>Acto / Contrato</InputLabel>
                    <Select
                      fullWidth
                      value={formProtocolo.actoContrato}
                      label="Acto / Contrato"
                      onChange={(e) => setFormProtocolo({
                        ...formProtocolo,
                        actoContrato: e.target.value,
                        // Reset conditional fields when type changes
                        tipoActoOtro: '',
                        bienInmuebleDescripcion: '',
                        bienInmuebleUbicacion: '',
                        vehiculoPlaca: '',
                        vehiculoMarca: '',
                        vehiculoModelo: '',
                        vehiculoAnio: ''
                      })}
                    >
                      {TIPOS_ACTO_CONTRATO.map((tipo) => (
                        <MenuItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Campo "Otros" - especificar */}
                {formProtocolo.actoContrato === 'OTROS' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Especifique el tipo de acto"
                      value={formProtocolo.tipoActoOtro}
                      onChange={(e) => setFormProtocolo({ ...formProtocolo, tipoActoOtro: e.target.value })}
                      placeholder="Ej: Constitución de Hipoteca"
                    />
                  </Grid>
                )}

                {/* Campos para Bien Inmueble */}
                {TIPOS_BIEN_INMUEBLE.includes(formProtocolo.actoContrato) && (
                  <>
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 1 }}>
                        🏠 Datos del Bien Inmueble
                      </Alert>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Descripción del Bien Inmueble"
                        value={formProtocolo.bienInmuebleDescripcion}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, bienInmuebleDescripcion: e.target.value })}
                        placeholder="Ej: Casa de dos pisos con terreno de 200m², linderos..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Ubicación del Inmueble"
                        value={formProtocolo.bienInmuebleUbicacion}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, bienInmuebleUbicacion: e.target.value })}
                        placeholder="Ej: Av. República E7-123 y Diego de Almagro, Quito"
                      />
                    </Grid>
                  </>
                )}

                {/* Campos para Vehículo */}
                {TIPOS_VEHICULO.includes(formProtocolo.actoContrato) && (
                  <>
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 1 }}>
                        🚗 Datos del Vehículo
                      </Alert>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Placa"
                        value={formProtocolo.vehiculoPlaca}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, vehiculoPlaca: e.target.value.toUpperCase() })}
                        placeholder="AAA-1234"
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Marca"
                        value={formProtocolo.vehiculoMarca}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, vehiculoMarca: e.target.value })}
                        placeholder="Ej: Toyota"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Modelo"
                        value={formProtocolo.vehiculoModelo}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, vehiculoModelo: e.target.value })}
                        placeholder="Ej: Corolla"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Año"
                        value={formProtocolo.vehiculoAnio}
                        onChange={(e) => setFormProtocolo({ ...formProtocolo, vehiculoAnio: e.target.value })}
                        placeholder="Ej: 2020"
                        type="number"
                        inputProps={{ min: 1900, max: 2099 }}
                      />
                    </Grid>
                  </>
                )}

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
            onClick={guardarProtocolo}
            disabled={loading}
            startIcon={<DescriptionIcon />}
          >
            {loading ? (modoEditarProtocolo ? 'Guardando...' : 'Creando...') : (modoEditarProtocolo ? 'Guardar Cambios' : 'Crear Protocolo')}
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
                  </Grid>
                )}
              </Box>

              <Divider />

              {/* Formas de Pago */}
              <Box>
                <Typography variant="h6" gutterBottom>Formas de Pago</Typography>

                {!modoEditarProtocolo ? (
                  // Modo visualización
                  protocoloSeleccionado.formasPago && protocoloSeleccionado.formasPago.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell><strong>Tipo</strong></TableCell>
                            <TableCell align="right"><strong>Monto</strong></TableCell>
                            <TableCell><strong>Banco</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {protocoloSeleccionado.formasPago.map((fp, index) => (
                            <TableRow key={index}>
                              <TableCell>{fp.tipo}</TableCell>
                              <TableCell align="right">${parseFloat(fp.monto).toFixed(2)}</TableCell>
                              <TableCell>{fp.banco || '-'}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell><strong>TOTAL</strong></TableCell>
                            <TableCell align="right">
                              <strong>
                                ${protocoloSeleccionado.formasPago.reduce((sum, fp) => sum + parseFloat(fp.monto), 0).toFixed(2)}
                              </strong>
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">No hay formas de pago registradas</Alert>
                  )
                ) : (
                  // Modo edición
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Total: ${calcularTotalFormasPagoEdicion().toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Stack>

                    <Stack spacing={2}>
                      {formasPagoEditando.map((formaPago, index) => (
                        <Card key={index} variant="outlined" sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={3}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Tipo</InputLabel>
                                <Select
                                  value={formaPago.tipo}
                                  label="Tipo"
                                  onChange={(e) => actualizarFormaPagoEdicion(index, 'tipo', e.target.value)}
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
                                onChange={(e) => actualizarFormaPagoEdicion(index, 'monto', e.target.value)}
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
                                onChange={(e) => actualizarFormaPagoEdicion(index, 'banco', e.target.value)}
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
                                    onClick={() => quitarFormaPagoEdicion(index)}
                                    disabled={formasPagoEditando.length === 1}
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
                        onClick={agregarFormaPagoEdicion}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Agregar otra forma de pago
                      </Button>

                      {/* Advertencia si el total no coincide */}
                      {protocoloEditando?.valorContrato && calcularTotalFormasPagoEdicion() !== parseFloat(protocoloEditando.valorContrato) && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          ⚠️ El total de formas de pago (${calcularTotalFormasPagoEdicion().toLocaleString('es-EC', { minimumFractionDigits: 2 })})
                          no coincide con el valor del contrato (${parseFloat(protocoloEditando.valorContrato).toLocaleString('es-EC', { minimumFractionDigits: 2 })})
                        </Alert>
                      )}
                    </Stack>

                    {/* Botones de guardar/cancelar al final de formas de pago */}
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
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
                  </Box>
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
                            <strong>Actúa por:</strong> {(persona.actuaPor === 'REPRESENTANDO_A' || persona.actuaPor === 'REPRESENTANDO') ? (
                              <span>
                                Representando a <strong>{persona.representado?.nombre || persona.datosRepresentado?.nombres || '...'}</strong>
                              </span>
                            ) : 'Sus propios derechos'}
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
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<DownloadIcon />}
                            onClick={() => descargarPDFIndividual(protocoloSeleccionado.id, persona.id)}
                          >
                            Descargar PDF
                          </Button>
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

      {/* Diálogo de resetear PIN */}
      {/* Dialog: Vista Previa Formulario */}
      <VistaPreviewFormulario
        open={openPreview}
        onClose={() => {
          setOpenPreview(false);
          setPreviewPersona(null);
        }}
        protocolo={protocoloSeleccionado}
        persona={previewPersona}
        loading={loading}
        onRefresh={async () => {
          // Refresh protocol data from server
          if (protocoloSeleccionado?.id) {
            setLoading(true);
            try {
              const response = await apiClient.get(`/formulario-uafe/protocolo/${protocoloSeleccionado.id}`);
              if (response.data.success) {
                setProtocoloSeleccionado(response.data.data);
                // Update the person data in the preview
                const updatedPersona = response.data.data.personas?.find(
                  p => p.id === previewPersona?.id
                );
                if (updatedPersona) {
                  setPreviewPersona({ ...updatedPersona, protocolId: protocoloSeleccionado.id });
                }
                mostrarSnackbar('Datos actualizados', 'success');
              }
            } catch (error) {
              mostrarSnackbar('Error al actualizar datos', 'error');
            } finally {
              setLoading(false);
            }
          }
        }}
        onGeneratePDF={() => {
          if (previewPersona?.id && protocoloSeleccionado?.id) {
            descargarPDFIndividual(protocoloSeleccionado.id, previewPersona.id);
            setOpenPreview(false);
          }
        }}
      />

      {/* Dialog: Confirmar Eliminación Protocolo */}
      <Dialog
        open={openConfirmarEliminarProtocolo}
        onClose={() => { setOpenConfirmarEliminarProtocolo(false); setProtocoloSeleccionado(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'error.main', color: 'white' }}>
          Confirmar Eliminación de Protocolo
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {protocoloSeleccionado && (
            <Stack spacing={2}>
              <Alert severity="error">
                ¿Estás seguro de que deseas eliminar el Protocolo <strong>{protocoloSeleccionado.numeroProtocolo}</strong>?
              </Alert>
              <Typography variant="body2">
                Esta acción eliminará el protocolo y <strong>TODAS</strong> las personas/formularios asociados.
                <br />
                <strong>Esta acción no se puede deshacer.</strong>
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenConfirmarEliminarProtocolo(false); setProtocoloSeleccionado(null); }}>
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

      {/* Dialog: Resetear PIN */}
      <ResetearPinDialog
        open={openResetearPin}
        onClose={() => setOpenResetearPin(false)}
        onSuccess={(data) => {
          mostrarSnackbar(`PIN reseteado para cédula ${data.data.cedula}`, 'success');
        }}
      />

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
