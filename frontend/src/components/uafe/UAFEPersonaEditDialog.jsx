import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';

import apiClient from '../../services/api-client';
import SemaforoIndicator from './SemaforoIndicator';
import CatalogoAutocomplete from './CatalogoAutocomplete';
import { NACIONALIDADES_UAFE, CANTONES_UAFE } from '../../data/catalogos-uafe';
import { UAFE_COLORS, CALIDADES_COMPARECIENTE } from './uafe-constants';

const ESTADOS_CIVILES = [
  { value: 'SOLTERO', label: 'Soltero/a' },
  { value: 'CASADO', label: 'Casado/a' },
  { value: 'DIVORCIADO', label: 'Divorciado/a' },
  { value: 'VIUDO', label: 'Viudo/a' },
  { value: 'UNION_LIBRE', label: 'Union libre' },
];

const GENEROS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'OTRO', label: 'Otro' },
];

const SITUACIONES_LABORALES = [
  { value: 'DEPENDIENTE', label: 'Empleado dependiente' },
  { value: 'INDEPENDIENTE', label: 'Trabajador independiente' },
  { value: 'JUBILADO', label: 'Jubilado/a' },
  { value: 'DESEMPLEADO', label: 'Desempleado/a' },
  { value: 'ESTUDIANTE', label: 'Estudiante' },
  { value: 'AMA_DE_CASA', label: 'Ama de casa' },
  { value: 'OTRO', label: 'Otro' },
];

const NIVELES_ESTUDIO = [
  { value: 'PRIMARIA', label: 'Primaria' },
  { value: 'SECUNDARIA', label: 'Secundaria' },
  { value: 'TECNICO', label: 'Tecnico/Tecnologico' },
  { value: 'UNIVERSITARIO', label: 'Universitario' },
  { value: 'POSTGRADO', label: 'Postgrado' },
  { value: 'NINGUNO', label: 'Ninguno' },
];

const PARENTESCOS_PEP = [
  { value: 'CONYUGE', label: 'Conyuge' },
  { value: 'PADRE', label: 'Padre' },
  { value: 'MADRE', label: 'Madre' },
  { value: 'HIJO_A', label: 'Hijo/a' },
  { value: 'HERMANO_A', label: 'Hermano/a' },
  { value: 'OTRO', label: 'Otro' },
];

/**
 * UAFEPersonaEditDialog - Modal para que el matrizador llene/edite
 * manualmente los datos de un compareciente (fallback OLA 3)
 */
export default function UAFEPersonaEditDialog({
  open,
  onClose,
  persona,
  onSaved,
}) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [buscandoRepresentante, setBuscandoRepresentante] = useState(false);

  useEffect(() => {
    if (persona && open) {
      const datos = persona.datosPersona || {};
      const dp = datos.datosPersonales || {};
      const contacto = datos.contacto || {};
      const direccion = datos.direccion || {};
      const laboral = datos.informacionLaboral || {};
      const conyuge = datos.conyuge || {};
      const pep = datos.declaracionPEP || {};

      setForm({
        actuaPor: persona.actuaPor || 'PROPIOS_DERECHOS',
        apellidos: dp.apellidos || '',
        nombres: dp.nombres || '',
        genero: dp.genero || '',
        estadoCivil: dp.estadoCivil || '',
        nivelEstudio: dp.nivelEstudio || '',
        nacionalidad: dp.nacionalidad || '',
        celular: contacto.celular || '',
        correoElectronico: contacto.correoElectronico || contacto.correo || '',
        callePrincipal: direccion.callePrincipal || '',
        calleSecundaria: direccion.calleSecundaria || '',
        numero: direccion.numero || '',
        provincia: direccion.provincia || '',
        canton: direccion.canton || '',
        parroquia: direccion.parroquia || '',
        sector: direccion.sector || '',
        referencia: direccion.referencia || '',
        situacion: laboral.situacion || '',
        profesionOcupacion: laboral.profesionOcupacion || '',
        entidad: laboral.entidad || '',
        cargo: laboral.cargo || '',
        ingresoMensual: laboral.ingresoMensual || '',
        direccionLaboral: laboral.direccionLaboral || '',
        provinciaLaboral: laboral.provinciaLaboral || '',
        cantonLaboral: laboral.cantonLaboral || '',
        conyugeApellidos: conyuge.apellidos || '',
        conyugeNombres: conyuge.nombres || '',
        conyugeTipoIdentificacion: conyuge.tipoIdentificacion || 'CEDULA',
        conyugeNumeroIdentificacion: conyuge.numeroIdentificacion || '',
        conyugeNacionalidad: conyuge.nacionalidad || '',
        conyugeCorreoElectronico: conyuge.correoElectronico || '',
        conyugeCelular: conyuge.celular || '',
        conyugeSituacionLaboral: conyuge.situacionLaboral || '',
        conyugeProfesionOcupacion: conyuge.profesionOcupacion || '',
        conyugeEntidad: conyuge.entidad || '',
        conyugeCargo: conyuge.cargo || '',
        conyugeIngresoMensual: conyuge.ingresoMensual || '',
        esPEP: pep.esPEP || false,
        esFamiliarPEP: pep.esFamiliarPEP || false,
        esColaboradorPEP: pep.esColaboradorPEP || false,
        pepInstitucion: pep.pepInstitucion || '',
        pepCargo: pep.pepCargo || '',
        pepDireccionLaboral: pep.pepDireccionLaboral || '',
        pepFechaDesde: pep.pepFechaDesde || '',
        pepFechaHasta: pep.pepFechaHasta || '',
        pepFamiliarNombre: pep.pepFamiliarNombre || '',
        pepFamiliarParentesco: pep.pepFamiliarParentesco || '',
        pepFamiliarCargo: pep.pepFamiliarCargo || '',
        pepFamiliarInstitucion: pep.pepFamiliarInstitucion || '',
        pepColaboradorNombre: pep.pepColaboradorNombre || '',
        pepColaboradorTipoRelacion: pep.pepColaboradorTipoRelacion || '',
        // Mandante (beneficiario final)
        mandanteApellidos: datos.mandante?.apellidos || '',
        mandanteNombres: datos.mandante?.nombres || '',
        mandanteTipoIdentificacion: datos.mandante?.tipoIdentificacion || 'CEDULA',
        mandanteNumeroIdentificacion: datos.mandante?.numeroIdentificacion || '',
        mandanteNacionalidad: datos.mandante?.nacionalidad || '',
        mandanteGenero: datos.mandante?.genero || '',
        mandanteDireccion: datos.mandante?.direccion || '',
        mandanteProvincia: datos.mandante?.provincia || '',
        mandanteCanton: datos.mandante?.canton || '',
        mandanteParroquia: datos.mandante?.parroquia || '',
        mandanteSector: datos.mandante?.sector || '',
        mandanteReferencia: datos.mandante?.referencia || '',
        mandanteCelular: datos.mandante?.celular || '',
        mandanteCorreo: datos.mandante?.correo || '',
        mandanteActividadOcupacional: datos.mandante?.actividadOcupacional || '',
        mandanteIngresoMensual: datos.mandante?.ingresoMensual || '',
      });
      setError(null);
    }
  }, [persona, open]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Buscar datos del representante por cédula en la BD
  const buscarRepresentante = async () => {
    const ced = form.mandanteNumeroIdentificacion?.trim();
    if (!ced || ced.length < 10) return;
    setBuscandoRepresentante(true);
    try {
      const { data } = await apiClient.get(`/formulario-uafe/persona/${ced}/datos`);
      if (data.success && data.data) {
        const d = data.data.datosPersonaNatural || {};
        const dp = d.datosPersonales || {};
        const contacto = d.contacto || {};
        const direccion = d.direccion || {};
        const laboral = d.informacionLaboral || {};
        setForm(prev => ({
          ...prev,
          mandanteApellidos: dp.apellidos || prev.mandanteApellidos,
          mandanteNombres: dp.nombres || prev.mandanteNombres,
          mandanteTipoIdentificacion: dp.tipoIdentificacion || (ced.length === 13 ? 'RUC' : 'CEDULA'),
          mandanteNacionalidad: dp.nacionalidad || prev.mandanteNacionalidad,
          mandanteGenero: dp.genero || prev.mandanteGenero,
          mandanteDireccion: direccion.callePrincipal || prev.mandanteDireccion,
          mandanteProvincia: direccion.provincia || prev.mandanteProvincia,
          mandanteCanton: direccion.canton || prev.mandanteCanton,
          mandanteParroquia: direccion.parroquia || prev.mandanteParroquia,
          mandanteSector: direccion.sector || prev.mandanteSector,
          mandanteReferencia: direccion.referencia || prev.mandanteReferencia,
          mandanteCelular: contacto.celular || prev.mandanteCelular,
          mandanteCorreo: contacto.correoElectronico || contacto.correo || prev.mandanteCorreo,
          mandanteActividadOcupacional: laboral.profesionOcupacion || prev.mandanteActividadOcupacional,
          mandanteIngresoMensual: laboral.ingresoMensual || prev.mandanteIngresoMensual,
        }));
      }
    } catch { /* persona no encontrada, se llena manual */ }
    setBuscandoRepresentante(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const cedula = persona.personaCedula || persona.cedula;
      const payload = {
        datosPersonales: {
          apellidos: form.apellidos,
          nombres: form.nombres,
          genero: form.genero,
          estadoCivil: form.estadoCivil,
          nivelEstudio: form.nivelEstudio,
          nacionalidad: form.nacionalidad,
        },
        contacto: {
          celular: form.celular,
          correoElectronico: form.correoElectronico,
        },
        direccion: {
          callePrincipal: form.callePrincipal,
          calleSecundaria: form.calleSecundaria,
          numero: form.numero,
          provincia: form.provincia,
          canton: form.canton,
          parroquia: form.parroquia,
          sector: form.sector,
          referencia: form.referencia,
        },
        informacionLaboral: {
          situacion: form.situacion,
          profesionOcupacion: form.profesionOcupacion,
          entidad: form.entidad,
          cargo: form.cargo,
          ingresoMensual: form.ingresoMensual,
          direccionLaboral: form.direccionLaboral,
          provinciaLaboral: form.provinciaLaboral,
          cantonLaboral: form.cantonLaboral,
        },
        conyuge: {
          apellidos: form.conyugeApellidos,
          nombres: form.conyugeNombres,
          tipoIdentificacion: form.conyugeTipoIdentificacion,
          numeroIdentificacion: form.conyugeNumeroIdentificacion,
          nacionalidad: form.conyugeNacionalidad,
          correoElectronico: form.conyugeCorreoElectronico,
          celular: form.conyugeCelular,
          situacionLaboral: form.conyugeSituacionLaboral || null,
          profesionOcupacion: form.conyugeProfesionOcupacion || null,
          entidad: form.conyugeEntidad || null,
          cargo: form.conyugeCargo || null,
          ingresoMensual: form.conyugeIngresoMensual && !isNaN(parseFloat(String(form.conyugeIngresoMensual).replace(',', '.'))) ? parseFloat(String(form.conyugeIngresoMensual).replace(',', '.')) : null,
        },
        declaracionPEP: {
          esPEP: form.esPEP,
          esFamiliarPEP: form.esFamiliarPEP,
          esColaboradorPEP: form.esColaboradorPEP,
          pepInstitucion: form.pepInstitucion, pepCargo: form.pepCargo,
          pepDireccionLaboral: form.pepDireccionLaboral,
          pepFechaDesde: form.pepFechaDesde, pepFechaHasta: form.pepFechaHasta,
          pepFamiliarNombre: form.pepFamiliarNombre, pepFamiliarParentesco: form.pepFamiliarParentesco,
          pepFamiliarCargo: form.pepFamiliarCargo, pepFamiliarInstitucion: form.pepFamiliarInstitucion,
          pepColaboradorNombre: form.pepColaboradorNombre, pepColaboradorTipoRelacion: form.pepColaboradorTipoRelacion,
        },
        mandante: isApoderado ? {
          apellidos: form.mandanteApellidos, nombres: form.mandanteNombres,
          tipoIdentificacion: form.mandanteTipoIdentificacion,
          numeroIdentificacion: form.mandanteNumeroIdentificacion,
          nacionalidad: form.mandanteNacionalidad, genero: form.mandanteGenero,
          direccion: form.mandanteDireccion, provincia: form.mandanteProvincia,
          canton: form.mandanteCanton, parroquia: form.mandanteParroquia,
          sector: form.mandanteSector, referencia: form.mandanteReferencia,
          celular: form.mandanteCelular, correo: form.mandanteCorreo,
          actividadOcupacional: form.mandanteActividadOcupacional,
          ingresoMensual: form.mandanteIngresoMensual,
        } : null,
        _origenEdicion: 'MATRIZADOR',
      };

      await apiClient.put(`/formulario-uafe/persona/${cedula}`, payload);

      // Actualizar actuaPor en PersonaProtocolo si cambió
      const ppId = persona.id || persona._personaProtocoloId;
      if (ppId && form.actuaPor !== persona.actuaPor) {
        await apiClient.patch(`/formulario-uafe/persona-protocolo/${ppId}`, {
          actuaPor: form.actuaPor,
        });
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error guardando datos persona:', err);
      setError(err.response?.data?.message || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  if (!persona) return null;

  const nombre = persona.nombre || `${form.apellidos} ${form.nombres}`.trim() || 'Sin nombre';
  const cedula = persona.personaCedula || persona.cedula || '-';
  const esCasado = form.estadoCivil === 'CASADO' || form.estadoCivil === 'UNION_LIBRE';
  const actuaPorActual = form.actuaPor || persona.actuaPor || 'PROPIOS_DERECHOS';
  const isApoderado = actuaPorActual && actuaPorActual !== 'PROPIOS_DERECHOS';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '12px' },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PersonOutlineIcon sx={{ color: UAFE_COLORS.primary }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Editar datos de {nombre}
          </Typography>
          <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted }}>
            Cedula: {cedula} &middot; Calidad: {persona.calidad || '-'}
          </Typography>
        </Box>
        <SemaforoIndicator
          level={persona.estadoCompletitud === 'completo' ? 'VERDE' : persona.estadoCompletitud === 'incompleto' ? 'AMARILLO' : 'ROJO'}
          variant="chip"
          missingFields={persona.camposFaltantes || []}
        />
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <Alert severity="info" icon={<WarningAmberIcon />} sx={{ mb: 2.5 }}>
          Esta edicion se registra en auditoria como origen MATRIZADOR.
          Use esta opcion si el compareciente no puede llenar el formulario en linea.
        </Alert>

        {/* Tipo de representación */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Comparece</InputLabel>
              <Select
                value={form.actuaPor || 'PROPIOS_DERECHOS'}
                label="Comparece"
                onChange={(e) => handleChange('actuaPor', e.target.value)}
              >
                <MenuItem value="PROPIOS_DERECHOS">Por sus propios derechos</MenuItem>
                <MenuItem value="APODERADO_GENERAL">Representado/a por apoderado general</MenuItem>
                <MenuItem value="APODERADO_ESPECIAL">Representado/a por apoderado especial</MenuItem>
                <MenuItem value="REPRESENTANTE_LEGAL">Representado/a por representante legal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Datos Personales */}
        <SectionTitle title="Datos Personales" subtitle="Obligatorio UAFE" badge="UAFE" />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Apellidos *" value={form.apellidos} onChange={e => handleChange('apellidos', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Nombres *" value={form.nombres} onChange={e => handleChange('nombres', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={form.nacionalidad} label="Nacionalidad *"
              onChange={(opt) => { handleChange('nacionalidad', opt?.label || ''); handleChange('nacionalidadCodigo', opt?.codigo || ''); }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado Civil</InputLabel>
              <Select value={form.estadoCivil} label="Estado Civil" onChange={e => handleChange('estadoCivil', e.target.value)}>
                {ESTADOS_CIVILES.map(ec => <MenuItem key={ec.value} value={ec.value}>{ec.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Genero</InputLabel>
              <Select value={form.genero} label="Genero" onChange={e => handleChange('genero', e.target.value)}>
                {GENEROS.map(g => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Nivel de Estudio</InputLabel>
              <Select value={form.nivelEstudio} label="Nivel de Estudio" onChange={e => handleChange('nivelEstudio', e.target.value)}>
                {NIVELES_ESTUDIO.map(n => <MenuItem key={n.value} value={n.value}>{n.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Contacto */}
        <SectionTitle title="Contacto" subtitle="Debida diligencia" />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Celular" value={form.celular} onChange={e => handleChange('celular', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Correo electronico" value={form.correoElectronico} onChange={e => handleChange('correoElectronico', e.target.value)} />
          </Grid>
        </Grid>

        {/* Dirección */}
        <SectionTitle title="Direccion Domicilio" subtitle="Debida diligencia" />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth size="small" label="Calle principal" value={form.callePrincipal} onChange={e => handleChange('callePrincipal', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth size="small" label="Calle secundaria" value={form.calleSecundaria} onChange={e => handleChange('calleSecundaria', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField fullWidth size="small" label="Numero" value={form.numero} onChange={e => handleChange('numero', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CatalogoAutocomplete options={CANTONES_UAFE} value={form.canton} label="Canton"
              onChange={(opt) => { handleChange('canton', opt?.canton || ''); handleChange('cantonCodigo', opt?.codigo || ''); handleChange('provincia', opt?.provincia || ''); }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Provincia" value={form.provincia} onChange={e => handleChange('provincia', e.target.value)} disabled={!!form.cantonCodigo} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Parroquia" value={form.parroquia} onChange={e => handleChange('parroquia', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Sector" value={form.sector} onChange={e => handleChange('sector', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Referencia" value={form.referencia} onChange={e => handleChange('referencia', e.target.value)} />
          </Grid>
        </Grid>

        {/* Información Laboral */}
        <SectionTitle title="Informacion Laboral" subtitle="Debida diligencia" />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Situacion laboral</InputLabel>
              <Select value={form.situacion} label="Situacion laboral" onChange={e => handleChange('situacion', e.target.value)}>
                {SITUACIONES_LABORALES.map(sl => <MenuItem key={sl.value} value={sl.value}>{sl.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Profesion/Ocupacion" value={form.profesionOcupacion} onChange={e => handleChange('profesionOcupacion', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Ingreso mensual (USD)" type="number" value={form.ingresoMensual} onChange={e => handleChange('ingresoMensual', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Entidad/Empresa" value={form.entidad} onChange={e => handleChange('entidad', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Cargo" value={form.cargo} onChange={e => handleChange('cargo', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Direccion empresa" value={form.direccionLaboral} onChange={e => handleChange('direccionLaboral', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CatalogoAutocomplete options={CANTONES_UAFE} value={form.cantonLaboral} label="Canton laboral"
              onChange={(opt) => { handleChange('cantonLaboral', opt?.canton || ''); handleChange('cantonLaboralCodigo', opt?.codigo || ''); handleChange('provinciaLaboral', opt?.provincia || ''); }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Provincia laboral" value={form.provinciaLaboral} onChange={e => handleChange('provinciaLaboral', e.target.value)} disabled={!!form.cantonLaboralCodigo} />
          </Grid>
        </Grid>

        {/* Cónyuge (condicional) */}
        {esCasado && (
          <>
            <SectionTitle title="Datos del Conyuge" subtitle="Debida diligencia" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Apellidos conyuge" value={form.conyugeApellidos} onChange={e => handleChange('conyugeApellidos', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Nombres conyuge" value={form.conyugeNombres} onChange={e => handleChange('conyugeNombres', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo ID</InputLabel>
                  <Select value={form.conyugeTipoIdentificacion} label="Tipo ID" onChange={e => handleChange('conyugeTipoIdentificacion', e.target.value)}>
                    <MenuItem value="CEDULA">Cedula</MenuItem>
                    <MenuItem value="PASAPORTE">Pasaporte</MenuItem>
                    <MenuItem value="RUC">RUC</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth size="small" label="No. Identificacion conyuge" value={form.conyugeNumeroIdentificacion} onChange={e => handleChange('conyugeNumeroIdentificacion', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={form.conyugeNacionalidad} label="Nacionalidad conyuge"
                  onChange={(opt) => { handleChange('conyugeNacionalidad', opt?.label || ''); handleChange('conyugeNacionalidadCodigo', opt?.codigo || ''); }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth size="small" label="Celular conyuge" type="tel" value={form.conyugeCelular} onChange={e => handleChange('conyugeCelular', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Correo electronico conyuge" type="email" value={form.conyugeCorreoElectronico} onChange={e => handleChange('conyugeCorreoElectronico', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#1976d2', mt: 1 }}>Informacion Laboral del Conyuge</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Situacion laboral conyuge</InputLabel>
                  <Select value={form.conyugeSituacionLaboral} label="Situacion laboral conyuge" onChange={e => handleChange('conyugeSituacionLaboral', e.target.value)}>
                    {SITUACIONES_LABORALES.map(sl => <MenuItem key={sl.value} value={sl.value}>{sl.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Profesion / Ocupacion conyuge" value={form.conyugeProfesionOcupacion} onChange={e => handleChange('conyugeProfesionOcupacion', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Entidad donde trabaja conyuge" value={form.conyugeEntidad} onChange={e => handleChange('conyugeEntidad', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Cargo conyuge" value={form.conyugeCargo} onChange={e => handleChange('conyugeCargo', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Ingreso mensual conyuge (USD)" value={form.conyugeIngresoMensual} onChange={e => handleChange('conyugeIngresoMensual', e.target.value)} inputProps={{ inputMode: 'decimal' }} placeholder="Ej: 1500.00" />
              </Grid>
            </Grid>
          </>
        )}

        {/* PEP */}
        <SectionTitle title="Declaracion PEP" subtitle="Art. 30 Reglamento" badge="UAFE" />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Checkbox checked={!!form.esPEP} onChange={e => handleChange('esPEP', e.target.checked)} />}
              label="¿Es Persona Expuesta Politicamente (PEP)?"
            />
          </Grid>
          {form.esPEP && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Institucion donde labora" value={form.pepInstitucion} onChange={e => handleChange('pepInstitucion', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Cargo que desempena" value={form.pepCargo} onChange={e => handleChange('pepCargo', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Direccion laboral (completa)" value={form.pepDireccionLaboral} onChange={e => handleChange('pepDireccionLaboral', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Fecha de designacion" type="date" InputLabelProps={{ shrink: true }} value={form.pepFechaDesde} onChange={e => handleChange('pepFechaDesde', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Fecha de culminacion (si aplica)" type="date" InputLabelProps={{ shrink: true }} value={form.pepFechaHasta} onChange={e => handleChange('pepFechaHasta', e.target.value)} />
              </Grid>
            </>
          )}

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Checkbox checked={!!form.esFamiliarPEP} onChange={e => handleChange('esFamiliarPEP', e.target.checked)} />}
              label="¿Es familiar de un PEP?"
            />
          </Grid>
          {form.esFamiliarPEP && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Nombre completo del PEP" value={form.pepFamiliarNombre} onChange={e => handleChange('pepFamiliarNombre', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Parentesco</InputLabel>
                  <Select value={form.pepFamiliarParentesco} label="Parentesco" onChange={e => handleChange('pepFamiliarParentesco', e.target.value)}>
                    {PARENTESCOS_PEP.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Cargo del PEP" value={form.pepFamiliarCargo} onChange={e => handleChange('pepFamiliarCargo', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Institucion del PEP" value={form.pepFamiliarInstitucion} onChange={e => handleChange('pepFamiliarInstitucion', e.target.value)} />
              </Grid>
            </>
          )}

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Checkbox checked={!!form.esColaboradorPEP} onChange={e => handleChange('esColaboradorPEP', e.target.checked)} />}
              label="¿Es colaborador cercano de un PEP?"
            />
          </Grid>
          {form.esColaboradorPEP && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Nombre completo del PEP" value={form.pepColaboradorNombre} onChange={e => handleChange('pepColaboradorNombre', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Tipo de relacion" value={form.pepColaboradorTipoRelacion} onChange={e => handleChange('pepColaboradorTipoRelacion', e.target.value)} />
              </Grid>
            </>
          )}
        </Grid>

        {/* Mandante / Beneficiario Final (condicional) */}
        {isApoderado && (
          <>
            <SectionTitle title="Datos del Representante / Apoderado" subtitle="Art. 30 §1.3" badge="UAFE" />
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
              Complete los datos de la persona que representa a {nombre} en este acto.
            </Alert>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Apellidos *" value={form.mandanteApellidos} onChange={e => handleChange('mandanteApellidos', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Nombres *" value={form.mandanteNombres} onChange={e => handleChange('mandanteNombres', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo ID</InputLabel>
                  <Select value={form.mandanteTipoIdentificacion} label="Tipo ID" onChange={e => handleChange('mandanteTipoIdentificacion', e.target.value)}>
                    <MenuItem value="CEDULA">Cedula</MenuItem>
                    <MenuItem value="PASAPORTE">Pasaporte</MenuItem>
                    <MenuItem value="RUC">RUC</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Numero de identificacion *"
                  value={form.mandanteNumeroIdentificacion}
                  onChange={e => handleChange('mandanteNumeroIdentificacion', e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Buscar datos en la base de datos">
                            <span>
                              <IconButton
                                size="small"
                                onClick={buscarRepresentante}
                                disabled={buscandoRepresentante || !form.mandanteNumeroIdentificacion || form.mandanteNumeroIdentificacion.trim().length < 10}
                              >
                                {buscandoRepresentante ? <CircularProgress size={18} /> : <SearchIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={form.mandanteNacionalidad} label="Nacionalidad"
                  onChange={(opt) => { handleChange('mandanteNacionalidad', opt?.label || ''); handleChange('mandanteNacionalidadCodigo', opt?.codigo || ''); }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Genero</InputLabel>
                  <Select value={form.mandanteGenero} label="Genero" onChange={e => handleChange('mandanteGenero', e.target.value)}>
                    {GENEROS.map(g => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth size="small" label="Direccion completa" value={form.mandanteDireccion} onChange={e => handleChange('mandanteDireccion', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CatalogoAutocomplete options={CANTONES_UAFE} value={form.mandanteCanton} label="Canton"
                  onChange={(opt) => { handleChange('mandanteCanton', opt?.canton || ''); handleChange('mandanteCantonCodigo', opt?.codigo || ''); handleChange('mandanteProvincia', opt?.provincia || ''); }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Provincia" value={form.mandanteProvincia} onChange={e => handleChange('mandanteProvincia', e.target.value)} disabled={!!form.mandanteCantonCodigo} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Parroquia" value={form.mandanteParroquia} onChange={e => handleChange('mandanteParroquia', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth size="small" label="Sector" value={form.mandanteSector} onChange={e => handleChange('mandanteSector', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth size="small" label="Referencia" value={form.mandanteReferencia} onChange={e => handleChange('mandanteReferencia', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth size="small" label="Celular" value={form.mandanteCelular} onChange={e => handleChange('mandanteCelular', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth size="small" label="Correo" value={form.mandanteCorreo} onChange={e => handleChange('mandanteCorreo', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Actividad ocupacional" value={form.mandanteActividadOcupacional} onChange={e => handleChange('mandanteActividadOcupacional', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Ingreso mensual (USD)" value={form.mandanteIngresoMensual} onChange={e => handleChange('mandanteIngresoMensual', e.target.value)} />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveOutlinedIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            backgroundColor: UAFE_COLORS.primary,
            '&:hover': { backgroundColor: UAFE_COLORS.primaryDark },
          }}
        >
          {saving ? 'Guardando...' : 'Guardar Datos'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SectionTitle({ title, subtitle, badge }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: UAFE_COLORS.textPrimary }}>
        {title}
      </Typography>
      {badge && (
        <Chip
          size="small"
          label={badge}
          sx={{
            fontSize: '0.6rem',
            fontWeight: 700,
            height: 20,
            backgroundColor: '#fff3e0',
            color: '#e65100',
            border: '1px solid #ffcc80',
          }}
        />
      )}
      <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted, fontStyle: 'italic' }}>
        {subtitle}
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  );
}
