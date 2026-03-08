import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
  Chip,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import axios from 'axios';

const API_BASE = '/api/formulario-uafe';

const COLORS = {
  primary: '#1e5a8e',
  primaryDark: '#0f3d66',
  primaryLight: '#e8f0f8',
  surface: '#f7f8fa',
  textPrimary: '#1a2332',
  textSecondary: '#5f6b7a',
  textMuted: '#8e99a8',
  border: '#e2e6ec',
  success: '#2e7d32',
};

const DECLARACION_UAFE = `La Unidad de Análisis Financiero y Económico UAFE, en cumplimiento a las políticas internas de prevención de lavado de activos, requiere la entrega de la siguiente información (favor completar todos los campos obligatoriamente). Autorizo expresamente a la UAFE, a través de la Notaría Décima Octava del cantón Quito, cuando lo considere oportuno obtenga información ampliada relativa a mi persona o a la empresa que represento, de instituciones financieras y de control. Acepto que la presente información servirá como insumo para controles sobre prevención, detección y erradicación del delito de lavado de activos y financiamiento de delitos.

Declaro bajo juramento que los recursos utilizados para pagar las facturas generadas por la Notaría 18 del cantón Quito por concepto de tasas notariales provenientes de los actos y contratos realizados, no proceden de ninguna de las actividades tipificadas en las normas de la legislación ecuatoriana vigente para prevenir el lavado de activos, eximiendo a la Notaría de toda responsabilidad.`;

const ESTADOS_CIVILES = ['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_LIBRE'];
const SITUACIONES_LABORALES = ['DEPENDIENTE', 'INDEPENDIENTE', 'JUBILADO', 'ESTUDIANTE', 'DESEMPLEADO', 'AMA_DE_CASA'];

function apiClient(sessionToken) {
  return axios.create({
    baseURL: API_BASE,
    headers: { 'x-session-token': sessionToken },
  });
}

// ── Login Screen ────────────────────────────────────────────
function LoginScreen({ onLogin, error, loading }) {
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');

  // Pre-fill from URL params
  const params = new URLSearchParams(window.location.search);
  const [protocolo, setProtocolo] = useState(params.get('protocolo') || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ numeroProtocolo: protocolo, cedula, pin });
  };

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', mt: 8, px: 2 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LockOutlinedIcon sx={{ fontSize: 40, color: COLORS.primary, mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary, mb: 0.5 }}>
            Formulario UAFE
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
            Ingrese sus datos para acceder al formulario de debida diligencia
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth size="small" label="No. Protocolo o ID" value={protocolo}
            onChange={(e) => setProtocolo(e.target.value)} sx={{ mb: 2 }} required
          />
          <TextField
            fullWidth size="small" label="Cedula de ciudadania" value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, '').slice(0, 10))}
            sx={{ mb: 2 }} required inputProps={{ maxLength: 10 }}
          />
          <TextField
            fullWidth size="small" label="PIN de 6 digitos" value={pin} type="password"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            sx={{ mb: 3 }} required inputProps={{ maxLength: 6 }}
          />
          <Button
            fullWidth variant="contained" type="submit" disabled={loading || !protocolo || !cedula || pin.length !== 6}
            startIcon={loading ? <CircularProgress size={16} /> : <LockOutlinedIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, py: 1.2, backgroundColor: COLORS.primary, '&:hover': { backgroundColor: COLORS.primaryDark } }}
          >
            {loading ? 'Verificando...' : 'Acceder al Formulario'}
          </Button>
        </form>
      </Paper>
      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: COLORS.textMuted }}>
        Este formulario es confidencial y sus datos estan protegidos
      </Typography>
    </Box>
  );
}

// ── Success Screen ──────────────────────────────────────────
function SuccessScreen() {
  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8, px: 2, textAlign: 'center' }}>
      <Paper elevation={0} sx={{ p: 5, borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 64, color: COLORS.success, mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary, mb: 1 }}>
          Formulario enviado exitosamente
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary, mb: 3 }}>
          Sus datos han sido registrados correctamente. Puede cerrar esta ventana.
        </Typography>
        <Chip label="Completado" color="success" sx={{ fontWeight: 600 }} />
      </Paper>
    </Box>
  );
}

// ── Already Completed Screen ────────────────────────────────
function AlreadyCompletedScreen() {
  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8, px: 2, textAlign: 'center' }}>
      <Paper elevation={0} sx={{ p: 5, borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 64, color: COLORS.success, mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary, mb: 1 }}>
          Formulario ya completado
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
          Usted ya completo este formulario anteriormente. Si necesita hacer cambios, contacte al matrizador.
        </Typography>
      </Paper>
    </Box>
  );
}

// ── Form Screen ─────────────────────────────────────────────
function FormScreen({ sessionData, sessionToken, onComplete }) {
  const { data } = sessionData;
  const preFill = data.datosPreLlenados || {};
  const existingData = data.tusDatos?.datosPersonaNatural || {};
  const existingPersonales = existingData.datosPersonales || {};
  const existingContacto = existingData.contacto || {};
  const existingDireccion = existingData.direccion || {};
  const existingLaboral = existingData.informacionLaboral || {};

  // Merge: existing data > pre-filled from minuta > empty
  const initial = {
    // Datos personales (UAFE obligatorio - read only si viene de minuta)
    nombres: existingPersonales.nombres || preFill.nombres || '',
    apellidos: existingPersonales.apellidos || preFill.apellidos || '',
    nacionalidad: existingPersonales.nacionalidad || preFill.nacionalidad || 'ECUATORIANA',
    estadoCivil: existingPersonales.estadoCivil || preFill.estadoCivil || '',
    genero: existingPersonales.genero || '',
    // Contacto
    celular: existingContacto.celular || existingContacto.telefono || preFill.telefono || '',
    correo: existingContacto.correoElectronico || existingContacto.correo || preFill.correo || '',
    // Direccion
    callePrincipal: existingDireccion.callePrincipal || '',
    calleSecundaria: existingDireccion.calleSecundaria || '',
    numeroCasa: existingDireccion.numero || existingDireccion.numeroCasa || '',
    provincia: existingDireccion.provincia || 'PICHINCHA',
    canton: existingDireccion.canton || 'QUITO',
    parroquia: existingDireccion.parroquia || '',
    // Laboral
    situacionLaboral: existingLaboral.situacion || existingLaboral.situacionLaboral || '',
    profesion: existingLaboral.profesionOcupacion || existingLaboral.profesion || preFill.profesion || '',
    ingresoMensual: existingLaboral.ingresoMensual || '',
    nombreEntidad: existingLaboral.entidad || existingLaboral.nombreEntidad || '',
    cargo: existingLaboral.cargo || '',
    // PEP
    esPEP: existingData.declaracionPEP?.esPEP || existingData.pep?.esPEP || false,
    pepDetalle: existingData.declaracionPEP?.detalle || existingData.pep?.detalle || '',
    // Conyuge
    conyugeNombres: existingData.conyuge?.nombres || '',
    conyugeApellidos: existingData.conyuge?.apellidos || '',
    conyugeCedula: existingData.conyuge?.numeroIdentificacion || existingData.conyuge?.cedula || '',
    // Declaracion
    aceptaDeclaracion: false,
  };

  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const needsConyuge = ['CASADO', 'UNION_LIBRE'].includes(form.estadoCivil);

  const handleSubmit = async () => {
    if (!form.aceptaDeclaracion) {
      setError('Debe aceptar la declaracion para enviar el formulario');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient(sessionToken).post('/responder', {
        datosPersonales: {
          nombres: form.nombres,
          apellidos: form.apellidos,
          nacionalidad: form.nacionalidad,
          estadoCivil: form.estadoCivil,
          genero: form.genero,
        },
        contacto: {
          celular: form.celular,
          correoElectronico: form.correo,
        },
        direccion: {
          callePrincipal: form.callePrincipal,
          calleSecundaria: form.calleSecundaria,
          numero: form.numeroCasa,
          provincia: form.provincia,
          canton: form.canton,
          parroquia: form.parroquia,
        },
        informacionLaboral: {
          situacion: form.situacionLaboral,
          profesionOcupacion: form.profesion,
          ingresoMensual: form.ingresoMensual ? parseFloat(form.ingresoMensual) : null,
          entidad: form.nombreEntidad,
          cargo: form.cargo,
        },
        declaracionPEP: {
          esPEP: form.esPEP,
          detalle: form.pepDetalle,
        },
        conyuge: needsConyuge ? {
          nombres: form.conyugeNombres,
          apellidos: form.conyugeApellidos,
          numeroIdentificacion: form.conyugeCedula,
        } : null,
        _declaracionAceptada: true,
        _declaracionFecha: new Date().toISOString(),
      });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al enviar el formulario');
    } finally {
      setSubmitting(false);
    }
  };

  const sectionTitle = (text) => (
    <Typography variant="overline" sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: COLORS.textMuted, display: 'block', mb: 1, mt: 2 }}>
      {text}
    </Typography>
  );

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4, px: 2, pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
          Formulario de Debida Diligencia
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary, mt: 0.5 }}>
          Protocolo: {data.protocolo?.numeroProtocolo || 'Sin numero'} &middot; {data.protocolo?.actoContrato || ''}
        </Typography>
        {data.tuRol && (
          <Chip size="small" label={`${data.tuRol.calidad || ''}`} sx={{ mt: 1, fontWeight: 600, backgroundColor: COLORS.primaryLight, color: COLORS.primary }} />
        )}
      </Box>

      {/* Declaracion UAFE */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fffde7' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: COLORS.textPrimary }}>
          Declaracion Obligatoria
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.78rem', lineHeight: 1.6, whiteSpace: 'pre-line', mb: 2 }}>
          {DECLARACION_UAFE}
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={form.aceptaDeclaracion} onChange={(e) => update('aceptaDeclaracion', e.target.checked)} />}
          label={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>He leido y acepto la declaracion anterior</Typography>}
        />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
        {/* Datos Personales */}
        {sectionTitle('Datos Personales (Obligatorio UAFE)')}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Apellidos *" value={form.apellidos} onChange={(e) => update('apellidos', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Nombres *" value={form.nombres} onChange={(e) => update('nombres', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Nacionalidad *" value={form.nacionalidad} onChange={(e) => update('nacionalidad', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado Civil</InputLabel>
              <Select value={form.estadoCivil} label="Estado Civil" onChange={(e) => update('estadoCivil', e.target.value)}>
                {ESTADOS_CIVILES.map(ec => <MenuItem key={ec} value={ec}>{ec.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Genero</InputLabel>
              <Select value={form.genero} label="Genero" onChange={(e) => update('genero', e.target.value)}>
                <MenuItem value="M">Masculino</MenuItem>
                <MenuItem value="F">Femenino</MenuItem>
                <MenuItem value="O">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        {/* Contacto */}
        {sectionTitle('Datos de Contacto')}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Celular" placeholder="09XXXXXXXX" value={form.celular}
              onChange={(e) => update('celular', e.target.value.replace(/\D/g, '').slice(0, 10))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Correo electronico" type="email" value={form.correo} onChange={(e) => update('correo', e.target.value)} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        {/* Direccion */}
        {sectionTitle('Direccion de Domicilio')}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth size="small" label="Calle principal" value={form.callePrincipal} onChange={(e) => update('callePrincipal', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth size="small" label="Calle secundaria" value={form.calleSecundaria} onChange={(e) => update('calleSecundaria', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField fullWidth size="small" label="Numero" value={form.numeroCasa} onChange={(e) => update('numeroCasa', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Provincia" value={form.provincia} onChange={(e) => update('provincia', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Canton" value={form.canton} onChange={(e) => update('canton', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Parroquia" value={form.parroquia} onChange={(e) => update('parroquia', e.target.value)} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        {/* Laboral */}
        {sectionTitle('Informacion Laboral')}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Situacion Laboral</InputLabel>
              <Select value={form.situacionLaboral} label="Situacion Laboral" onChange={(e) => update('situacionLaboral', e.target.value)}>
                {SITUACIONES_LABORALES.map(sl => <MenuItem key={sl} value={sl}>{sl.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Profesion u ocupacion" value={form.profesion} onChange={(e) => update('profesion', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Ingreso mensual (USD)" type="number" value={form.ingresoMensual} onChange={(e) => update('ingresoMensual', e.target.value)} />
          </Grid>
          {['DEPENDIENTE'].includes(form.situacionLaboral) && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Nombre de la entidad" value={form.nombreEntidad} onChange={(e) => update('nombreEntidad', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Cargo" value={form.cargo} onChange={(e) => update('cargo', e.target.value)} />
              </Grid>
            </>
          )}
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        {/* PEP */}
        {sectionTitle('Persona Expuesta Politicamente (PEP)')}
        <FormControlLabel
          control={<Checkbox checked={form.esPEP} onChange={(e) => update('esPEP', e.target.checked)} />}
          label={<Typography variant="body2" sx={{ fontSize: '0.82rem' }}>Soy o he sido Persona Expuesta Politicamente</Typography>}
        />
        {form.esPEP && (
          <TextField fullWidth size="small" label="Especifique cargo o funcion publica" value={form.pepDetalle}
            onChange={(e) => update('pepDetalle', e.target.value)} sx={{ mt: 1 }} />
        )}

        {/* Conyuge */}
        {needsConyuge && (
          <>
            <Divider sx={{ my: 2.5 }} />
            {sectionTitle('Datos del Conyuge')}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Nombres" value={form.conyugeNombres} onChange={(e) => update('conyugeNombres', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Apellidos" value={form.conyugeApellidos} onChange={(e) => update('conyugeApellidos', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Cedula" value={form.conyugeCedula}
                  onChange={(e) => update('conyugeCedula', e.target.value.replace(/\D/g, '').slice(0, 10))} />
              </Grid>
            </Grid>
          </>
        )}

        {/* Submit */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained" size="large" onClick={handleSubmit}
            disabled={submitting || !form.aceptaDeclaracion || !form.apellidos || !form.nombres || !form.nacionalidad}
            startIcon={submitting ? <CircularProgress size={18} /> : <SendOutlinedIcon />}
            sx={{
              textTransform: 'none', fontWeight: 700, px: 5, py: 1.3,
              backgroundColor: COLORS.success, '&:hover': { backgroundColor: '#1b5e20' },
            }}
          >
            {submitting ? 'Enviando...' : 'Enviar Formulario'}
          </Button>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textMuted }}>
            Los campos marcados con * son obligatorios para el reporte UAFE
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function FormularioUAFEPublico() {
  const [step, setStep] = useState('login'); // login | form | success | already
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = useCallback(async ({ numeroProtocolo, cedula, pin }) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { data } = await axios.post(`${API_BASE}/login`, { numeroProtocolo, cedula, pin });
      if (data.success) {
        setSessionToken(data.sessionToken);
        setSessionData(data);
        if (data.data?.completado) {
          setStep('already');
        } else {
          setStep('form');
        }
      } else {
        setLoginError(data.message || 'Error de autenticacion');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Error al iniciar sesion';
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  }, []);

  if (step === 'login') {
    return <LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading} />;
  }

  if (step === 'already') {
    return <AlreadyCompletedScreen />;
  }

  if (step === 'success') {
    return <SuccessScreen />;
  }

  return <FormScreen sessionData={sessionData} sessionToken={sessionToken} onComplete={() => setStep('success')} />;
}
