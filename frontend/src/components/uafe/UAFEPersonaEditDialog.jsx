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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import apiClient from '../../services/api-client';
import SemaforoIndicator from './SemaforoIndicator';
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

/**
 * UAFEPersonaEditDialog - Modal para que el matrizador llene/edite
 * manualmente los datos de un compareciente (fallback OLA 3)
 */
export default function UAFEPersonaEditDialog({
  open,
  onClose,
  persona,
  protocoloId,
  onSaved,
}) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
        apellidos: dp.apellidos || '',
        nombres: dp.nombres || '',
        genero: dp.genero || '',
        estadoCivil: dp.estadoCivil || '',
        nacionalidad: dp.nacionalidad || '',
        celular: contacto.celular || '',
        correoElectronico: contacto.correoElectronico || contacto.correo || '',
        callePrincipal: direccion.callePrincipal || '',
        calleSecundaria: direccion.calleSecundaria || '',
        numero: direccion.numero || '',
        provincia: direccion.provincia || '',
        canton: direccion.canton || '',
        parroquia: direccion.parroquia || '',
        situacion: laboral.situacion || '',
        profesionOcupacion: laboral.profesionOcupacion || '',
        entidad: laboral.entidad || '',
        cargo: laboral.cargo || '',
        ingresoMensual: laboral.ingresoMensual || '',
        conyugeApellidos: conyuge.apellidos || '',
        conyugeNombres: conyuge.nombres || '',
        conyugeNumeroIdentificacion: conyuge.numeroIdentificacion || '',
        esPEP: pep.esPEP || false,
        pepDetalle: pep.detalle || '',
      });
      setError(null);
    }
  }, [persona, open]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
        },
        informacionLaboral: {
          situacion: form.situacion,
          profesionOcupacion: form.profesionOcupacion,
          entidad: form.entidad,
          cargo: form.cargo,
          ingresoMensual: form.ingresoMensual,
        },
        conyuge: {
          apellidos: form.conyugeApellidos,
          nombres: form.conyugeNombres,
          numeroIdentificacion: form.conyugeNumeroIdentificacion,
        },
        declaracionPEP: {
          esPEP: form.esPEP,
          detalle: form.pepDetalle,
        },
        _origenEdicion: 'MATRIZADOR',
      };

      await apiClient.put(`/formulario-uafe/persona/${cedula}`, payload);
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
            <TextField fullWidth size="small" label="Nacionalidad *" value={form.nacionalidad} onChange={e => handleChange('nacionalidad', e.target.value)} />
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
            <TextField fullWidth size="small" label="Provincia" value={form.provincia} onChange={e => handleChange('provincia', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Canton" value={form.canton} onChange={e => handleChange('canton', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Parroquia" value={form.parroquia} onChange={e => handleChange('parroquia', e.target.value)} />
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
        </Grid>

        {/* Cónyuge (condicional) */}
        {esCasado && (
          <>
            <SectionTitle title="Datos del Conyuge" subtitle="Debida diligencia" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Apellidos conyuge" value={form.conyugeApellidos} onChange={e => handleChange('conyugeApellidos', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Nombres conyuge" value={form.conyugeNombres} onChange={e => handleChange('conyugeNombres', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Cedula conyuge" value={form.conyugeNumeroIdentificacion} onChange={e => handleChange('conyugeNumeroIdentificacion', e.target.value)} />
              </Grid>
            </Grid>
          </>
        )}

        {/* PEP */}
        <SectionTitle title="Declaracion PEP" subtitle="Debida diligencia" />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Checkbox checked={!!form.esPEP} onChange={e => handleChange('esPEP', e.target.checked)} />}
              label="Es Persona Expuesta Politicamente (PEP)"
            />
          </Grid>
          {form.esPEP && (
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Detalle PEP (cargo, institucion)" value={form.pepDetalle} onChange={e => handleChange('pepDetalle', e.target.value)} multiline rows={2} />
            </Grid>
          )}
        </Grid>
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
