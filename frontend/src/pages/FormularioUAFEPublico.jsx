import { useState, useCallback, useEffect, useRef } from 'react';
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
  Tabs,
  Tab,
  LinearProgress,
  IconButton,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import axios from 'axios';

const API_BASE = '/api/personal';

const COLORS = {
  primary: '#1A5799',
  primaryDark: '#0d3a66',
  primaryLight: '#e8f0f8',
  surface: '#f7f8fa',
  textPrimary: '#1a2332',
  textSecondary: '#5f6b7a',
  textMuted: '#8e99a8',
  border: '#e2e6ec',
  success: '#2e7d32',
};

const DECLARACION_UAFE = `La Unidad de Analisis Financiero y Economico UAFE, en cumplimiento a las politicas internas de prevencion de lavado de activos, requiere la entrega de la siguiente informacion. Autorizo expresamente a la UAFE, a traves de la Notaria Decima Octava del canton Quito, cuando lo considere oportuno obtenga informacion ampliada relativa a mi persona o a la empresa que represento, de instituciones financieras y de control.

Declaro bajo juramento que los recursos utilizados para pagar las facturas generadas por la Notaria 18 del canton Quito por concepto de tasas notariales provenientes de los actos y contratos realizados, no proceden de ninguna de las actividades tipificadas en las normas de la legislacion ecuatoriana vigente para prevenir el lavado de activos, eximiendo a la Notaria de toda responsabilidad.`;

const ESTADOS_CIVILES = [
  { value: 'SOLTERO', label: 'Soltero/a' },
  { value: 'CASADO', label: 'Casado/a' },
  { value: 'CASADO_CON_DISOLUCION', label: 'Casado/a con disolucion de sociedad conyugal' },
  { value: 'DIVORCIADO', label: 'Divorciado/a' },
  { value: 'VIUDO', label: 'Viudo/a' },
  { value: 'UNION_LIBRE', label: 'Union Libre' },
  { value: 'UNION_LIBRE_CON_SEPARACION', label: 'Union Libre con separacion de bienes' },
];

const SITUACIONES_LABORALES = [
  { value: 'PUBLICO', label: 'Publico' },
  { value: 'PRIVADO', label: 'Privado' },
  { value: 'JUBILADO', label: 'Jubilado' },
  { value: 'NO_APLICA', label: 'No Aplica' },
];

const NIVELES_ESTUDIO = [
  { value: 'BACHILLER', label: 'Bachiller' },
  { value: 'UNIVERSITARIO', label: 'Universitario' },
  { value: 'MAESTRIA', label: 'Maestria' },
  { value: 'POSTGRADO', label: 'Post Grado' },
];

const api = axios.create({ baseURL: API_BASE });

function sessionApi(token) {
  return axios.create({
    baseURL: API_BASE,
    headers: { 'x-session-token': token },
  });
}

// ── Shared Layout ──────────────────────────────────────────
function PageLayout({ children }) {
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: 3, px: 2 }}>
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Paper elevation={0} sx={{ borderRadius: '15px 15px 0 0', textAlign: 'center', p: 2.5 }}>
          <Typography sx={{ color: COLORS.primary, fontSize: '1.4rem', fontWeight: 800 }}>
            Notaria 18 - Quito
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
            Registro de Informacion Personal
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ borderRadius: '0 0 15px 15px', p: 3 }}>
          {children}
        </Paper>
      </Box>
    </Box>
  );
}

// ── PIN Input ──────────────────────────────────────────────
function PinInput({ value, onChange, label }) {
  const [show, setShow] = useState(false);
  const inputsRef = useRef([]);

  const handleDigit = (index, digit) => {
    if (!/^\d?$/.test(digit)) return;
    const arr = (value || '').split('');
    while (arr.length < 6) arr.push('');
    arr[index] = digit;
    onChange(arr.join(''));
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value?.[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <Box sx={{ textAlign: 'center', mb: 2 }}>
      {label && <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>{label}</Typography>}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 0.5 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <TextField
            key={i}
            inputRef={el => inputsRef.current[i] = el}
            value={value?.[i] || ''}
            onChange={e => handleDigit(i, e.target.value.slice(-1))}
            onKeyDown={e => handleKeyDown(i, e)}
            type={show ? 'text' : 'password'}
            inputProps={{ maxLength: 1, inputMode: 'numeric', style: { textAlign: 'center', fontSize: '1.5rem', padding: '8px' } }}
            sx={{ width: 48, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
        ))}
      </Box>
      <Button size="small" onClick={() => setShow(!show)} startIcon={show ? <VisibilityOffIcon /> : <VisibilityIcon />}
        sx={{ textTransform: 'none', fontSize: '0.75rem', color: COLORS.primary }}>
        {show ? 'Ocultar' : 'Mostrar'} PIN
      </Button>
    </Box>
  );
}

// ── Step 1: Verificar Cedula ───────────────────────────────
function VerifyScreen({ onResult }) {
  const [cedula, setCedula] = useState('');
  const [tipoPersona, setTipoPersona] = useState('NATURAL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (cedula.length < 10) {
      setError('Ingrese un numero de cedula o RUC valido');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/verificar-cedula/${cedula}`);
      onResult({
        cedula,
        tipoPersona: data.tipoPersona || tipoPersona,
        existe: data.existe,
        pinCreado: data.pinCreado,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al verificar cedula');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 3, fontWeight: 600 }}>Verificacion de Identidad</Typography>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{error}</Alert>}
      <TextField
        fullWidth label="Numero de Cedula o RUC" value={cedula}
        onChange={e => setCedula(e.target.value.replace(/\D/g, '').slice(0, 13))}
        inputProps={{ inputMode: 'numeric' }}
        helperText="Ingrese su numero de identificacion sin espacios ni guiones"
        sx={{ mb: 3 }}
      />
      <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
        {[
          { value: 'NATURAL', label: 'Persona Natural', icon: <PersonIcon /> },
          { value: 'JURIDICA', label: 'Persona Juridica', icon: <BusinessIcon /> },
        ].map(opt => (
          <Paper key={opt.value} elevation={0} onClick={() => setTipoPersona(opt.value)}
            sx={{
              flex: 1, p: 2, textAlign: 'center', cursor: 'pointer', borderRadius: '10px',
              border: `2px solid ${tipoPersona === opt.value ? COLORS.primary : COLORS.border}`,
              backgroundColor: tipoPersona === opt.value ? COLORS.primaryLight : 'white',
              transition: 'all 0.2s',
            }}>
            <Box sx={{ color: tipoPersona === opt.value ? COLORS.primary : COLORS.textMuted, mb: 0.5 }}>{opt.icon}</Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tipoPersona === opt.value ? COLORS.primary : COLORS.textSecondary }}>
              {opt.label}
            </Typography>
          </Paper>
        ))}
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || cedula.length < 10}
          sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: COLORS.primary, borderRadius: '8px', px: 4, py: 1.2 }}>
          {loading ? <CircularProgress size={20} /> : 'Continuar'}
        </Button>
      </Box>
    </PageLayout>
  );
}

// ── Step 2a: Crear Cuenta (nuevo usuario) ──────────────────
function CreateAccountScreen({ cedula, tipoPersona, onCreated, onBack }) {
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSeq = (p) => '012345678901234567890123456789'.includes(p) || '098765432109876543210'.includes(p);
  const isRepeat = (p) => /^(.)\1{5}$/.test(p);
  const pinValid = pin.length === 6 && !isSeq(pin) && !isRepeat(pin);
  const pinsMatch = pin === pinConfirm && pinConfirm.length === 6;

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/registrar', { cedula, tipoPersona, pin, pinConfirmacion: pinConfirm });
      if (data.success) {
        onCreated({ sessionToken: data.sessionToken, tipoPersona });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 1, fontWeight: 600 }}>Crear Cuenta Nueva</Typography>
      <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>Cedula: <strong>{cedula}</strong></Alert>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{error}</Alert>}
      <PinInput value={pin} onChange={setPin} label="Cree un PIN de 6 digitos:" />
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ color: pin.length === 6 ? COLORS.success : COLORS.textMuted }}>
          {pin.length === 6 ? '✓' : '○'} 6 digitos numericos
        </Typography><br />
        <Typography variant="caption" sx={{ color: pin.length === 6 && !isSeq(pin) ? COLORS.success : COLORS.textMuted }}>
          {pin.length === 6 && !isSeq(pin) ? '✓' : '○'} No usar secuencias (123456)
        </Typography><br />
        <Typography variant="caption" sx={{ color: pin.length === 6 && !isRepeat(pin) ? COLORS.success : COLORS.textMuted }}>
          {pin.length === 6 && !isRepeat(pin) ? '✓' : '○'} No usar repeticiones (111111)
        </Typography>
      </Box>
      <PinInput value={pinConfirm} onChange={setPinConfirm} label="Confirme su PIN:" />
      {pinConfirm.length === 6 && !pinsMatch && (
        <Typography variant="caption" sx={{ color: 'error.main', textAlign: 'center', display: 'block' }}>
          Los PINs no coinciden
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
        <Button variant="outlined" onClick={onBack} sx={{ textTransform: 'none', borderColor: COLORS.primary, color: COLORS.primary }}>
          Volver
        </Button>
        <Button variant="contained" onClick={handleCreate} disabled={!pinValid || !pinsMatch || loading}
          sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: COLORS.primary, borderRadius: '8px' }}>
          {loading ? <CircularProgress size={20} /> : 'Crear Cuenta'}
        </Button>
      </Box>
    </PageLayout>
  );
}

// ── Step 2b: Login ─────────────────────────────────────────
function LoginScreen({ cedula, onLogin, onBack }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/login', { cedula, pin });
      if (data.success) {
        onLogin({ sessionToken: data.sessionToken, tipoPersona: data.tipoPersona });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 1, fontWeight: 600 }}>Iniciar Sesion</Typography>
      <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>Cedula: <strong>{cedula}</strong></Alert>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{error}</Alert>}
      <PinInput value={pin} onChange={setPin} label="Ingrese su PIN de 6 digitos:" />
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
        <Button variant="outlined" onClick={onBack} sx={{ textTransform: 'none', borderColor: COLORS.primary, color: COLORS.primary }}>
          Volver
        </Button>
        <Button variant="contained" onClick={handleLogin} disabled={pin.length !== 6 || loading}
          sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: COLORS.primary, borderRadius: '8px' }}>
          {loading ? <CircularProgress size={20} /> : 'Ingresar'}
        </Button>
      </Box>
      <Divider sx={{ my: 3 }} />
      <Alert severity="warning" sx={{ borderRadius: '8px' }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>¿Olvido su PIN?</Typography>
        <Typography variant="caption" sx={{ display: 'block' }}>
          Acerquese a la Notaria 18 con su cedula fisica para resetear su PIN.
        </Typography>
      </Alert>
    </PageLayout>
  );
}

// ── Step 2c: Crear PIN propio (reemplaza temporal) ─────────
function CreatePinScreen({ cedula, onCreated, onBack }) {
  const [pinTemporal, setPinTemporal] = useState('');
  const [nuevoPin, setNuevoPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSeq = (p) => '012345678901234567890123456789'.includes(p) || '098765432109876543210'.includes(p);
  const isRepeat = (p) => /^(.)\1{5}$/.test(p);
  const pinValid = nuevoPin.length === 6 && !isSeq(nuevoPin) && !isRepeat(nuevoPin);
  const pinsMatch = nuevoPin === confirmPin && confirmPin.length === 6;

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/crear-pin', {
        cedula, pinTemporal, nuevoPin, confirmacionPin: confirmPin,
      });
      if (data.success) {
        onCreated({ sessionToken: data.sessionToken, tipoPersona: data.tipoPersona });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 1, fontWeight: 600 }}>Crear su PIN Personal</Typography>
      <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
        Se le asigno un PIN temporal. Debe crear su propio PIN para acceder a su informacion.
      </Alert>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{error}</Alert>}
      <PinInput value={pinTemporal} onChange={setPinTemporal} label="PIN temporal (proporcionado por la notaria):" />
      <Divider sx={{ my: 2 }} />
      <PinInput value={nuevoPin} onChange={setNuevoPin} label="Nuevo PIN:" />
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ color: nuevoPin.length === 6 ? COLORS.success : COLORS.textMuted }}>
          {nuevoPin.length === 6 ? '✓' : '○'} 6 digitos numericos
        </Typography><br />
        <Typography variant="caption" sx={{ color: nuevoPin.length === 6 && !isSeq(nuevoPin) ? COLORS.success : COLORS.textMuted }}>
          {nuevoPin.length === 6 && !isSeq(nuevoPin) ? '✓' : '○'} No usar secuencias
        </Typography><br />
        <Typography variant="caption" sx={{ color: nuevoPin.length === 6 && !isRepeat(nuevoPin) ? COLORS.success : COLORS.textMuted }}>
          {nuevoPin.length === 6 && !isRepeat(nuevoPin) ? '✓' : '○'} No usar repeticiones
        </Typography>
      </Box>
      <PinInput value={confirmPin} onChange={setConfirmPin} label="Confirme nuevo PIN:" />
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
        <Button variant="outlined" onClick={onBack} sx={{ textTransform: 'none', borderColor: COLORS.primary, color: COLORS.primary }}>
          Volver
        </Button>
        <Button variant="contained" onClick={handleCreate}
          disabled={pinTemporal.length !== 6 || !pinValid || !pinsMatch || loading}
          sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: COLORS.primary, borderRadius: '8px' }}>
          {loading ? <CircularProgress size={20} /> : 'Crear PIN'}
        </Button>
      </Box>
    </PageLayout>
  );
}

// ── Step 3: Form (Persona Natural) ─────────────────────────
function NaturalForm({ sessionToken, onComplete, onLogout }) {
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionApi(sessionToken).get('/mi-informacion').then(({ data }) => {
      const d = data.data?.datosPersonaNatural || {};
      const dp = d.datosPersonales || {};
      const ct = d.contacto || {};
      const dir = d.direccion || {};
      const lab = d.informacionLaboral || {};
      const con = d.conyuge || {};
      const pep = d.declaracionPEP || {};
      setForm({
        apellidos: dp.apellidos || '', nombres: dp.nombres || '',
        genero: dp.genero || '', estadoCivil: dp.estadoCivil || '',
        nivelEstudio: dp.nivelEstudio || '', nacionalidad: dp.nacionalidad || 'ECUATORIANA',
        celular: ct.celular || '', correoElectronico: ct.correoElectronico || ct.correo || '',
        callePrincipal: dir.callePrincipal || '', calleSecundaria: dir.calleSecundaria || '',
        numero: dir.numero || '', provincia: dir.provincia || 'PICHINCHA',
        canton: dir.canton || 'QUITO', parroquia: dir.parroquia || '',
        situacion: lab.situacion || '', profesionOcupacion: lab.profesionOcupacion || '',
        entidad: lab.entidad || '', cargo: lab.cargo || '',
        ingresoMensual: lab.ingresoMensual || '',
        conyugeApellidos: con.apellidos || '', conyugeNombres: con.nombres || '',
        conyugeNumeroIdentificacion: con.numeroIdentificacion || '',
        conyugeNacionalidad: con.nacionalidad || '', conyugeEmail: con.correoElectronico || '',
        conyugeCelular: con.celular || '',
        esPEP: pep.esPEP || false, esFamiliarPEP: pep.esFamiliarPEP || false,
        esColaboradorPEP: pep.esColaboradorPEP || false,
        aceptaDeclaracion: false,
      });
    }).catch(() => {
      setForm({
        apellidos: '', nombres: '', genero: '', estadoCivil: '', nivelEstudio: '',
        nacionalidad: 'ECUATORIANA', celular: '', correoElectronico: '',
        callePrincipal: '', calleSecundaria: '', numero: '', provincia: 'PICHINCHA',
        canton: 'QUITO', parroquia: '', situacion: '', profesionOcupacion: '',
        entidad: '', cargo: '', ingresoMensual: '',
        conyugeApellidos: '', conyugeNombres: '', conyugeNumeroIdentificacion: '',
        conyugeNacionalidad: '', conyugeEmail: '', conyugeCelular: '',
        esPEP: false, esFamiliarPEP: false, esColaboradorPEP: false,
        aceptaDeclaracion: false,
      });
    }).finally(() => setLoading(false));
  }, [sessionToken]);

  if (loading || !form) {
    return <PageLayout><Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box></PageLayout>;
  }

  const u = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const needsConyuge = ['CASADO', 'UNION_LIBRE', 'CASADO_CON_DISOLUCION', 'UNION_LIBRE_CON_SEPARACION'].includes(form.estadoCivil);
  const TABS = ['Personales', 'Direccion', 'Laboral', needsConyuge ? 'Conyuge' : null, 'PEP'].filter(Boolean);
  const totalTabs = TABS.length;
  const progress = ((tab + 1) / totalTabs) * 100;

  const handleSave = async () => {
    if (!form.aceptaDeclaracion) {
      setError('Debe aceptar la declaracion UAFE para guardar');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await sessionApi(sessionToken).put('/mi-informacion', {
        datosPersonales: {
          apellidos: form.apellidos, nombres: form.nombres, genero: form.genero,
          estadoCivil: form.estadoCivil, nivelEstudio: form.nivelEstudio,
          nacionalidad: form.nacionalidad,
        },
        contacto: { celular: form.celular, correoElectronico: form.correoElectronico },
        direccion: {
          callePrincipal: form.callePrincipal, calleSecundaria: form.calleSecundaria,
          numero: form.numero, provincia: form.provincia, canton: form.canton,
          parroquia: form.parroquia,
        },
        informacionLaboral: {
          situacion: form.situacion, profesionOcupacion: form.profesionOcupacion,
          entidad: form.entidad, cargo: form.cargo, ingresoMensual: form.ingresoMensual ? parseFloat(form.ingresoMensual) : null,
        },
        conyuge: needsConyuge ? {
          apellidos: form.conyugeApellidos, nombres: form.conyugeNombres,
          numeroIdentificacion: form.conyugeNumeroIdentificacion,
          nacionalidad: form.conyugeNacionalidad, correoElectronico: form.conyugeEmail,
          celular: form.conyugeCelular,
        } : null,
        declaracionPEP: {
          esPEP: form.esPEP, esFamiliarPEP: form.esFamiliarPEP,
          esColaboradorPEP: form.esColaboradorPEP,
        },
      });
      setSaved(true);
      onComplete();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, props = {}) => (
    <TextField fullWidth size="small" label={label} value={form[key]} onChange={e => u(key, e.target.value)} {...props} />
  );

  const selectField = (label, key, options) => (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select value={form[key]} label={label} onChange={e => u(key, e.target.value)}>
        {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <PageLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Mi Informacion</Typography>
        <Button size="small" variant="outlined" color="error" onClick={onLogout} sx={{ textTransform: 'none' }}>
          Cerrar Sesion
        </Button>
      </Box>
      <LinearProgress variant="determinate" value={progress} sx={{ mb: 0.5, borderRadius: 4, height: 6, backgroundColor: COLORS.border, '& .MuiLinearProgress-bar': { backgroundColor: COLORS.primary } }} />
      <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 2 }}>
        Paso {tab + 1} de {totalTabs}: {TABS[tab]}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', minWidth: 80, fontSize: '0.8rem' } }}>
        {TABS.map(t => <Tab key={t} label={t} />)}
      </Tabs>

      {/* Tab: Personales */}
      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>{field('Apellidos *', 'apellidos')}</Grid>
          <Grid size={{ xs: 6 }}>{field('Nombres *', 'nombres')}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Genero', 'genero', [{ value: 'MASCULINO', label: 'Masculino' }, { value: 'FEMENINO', label: 'Femenino' }])}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Estado Civil', 'estadoCivil', ESTADOS_CIVILES)}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Nivel Estudio', 'nivelEstudio', NIVELES_ESTUDIO)}</Grid>
          <Grid size={{ xs: 6 }}>{field('Email', 'correoElectronico', { type: 'email' })}</Grid>
          <Grid size={{ xs: 6 }}>{field('Celular', 'celular', { type: 'tel' })}</Grid>
          <Grid size={{ xs: 12 }}>{field('Nacionalidad *', 'nacionalidad')}</Grid>
        </Grid>
      </Box>

      {/* Tab: Direccion */}
      <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 8 }}>{field('Calle Principal', 'callePrincipal')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Numero', 'numero')}</Grid>
          <Grid size={{ xs: 12 }}>{field('Calle Secundaria', 'calleSecundaria')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Provincia', 'provincia')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Canton', 'canton')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Parroquia', 'parroquia')}</Grid>
        </Grid>
      </Box>

      {/* Tab: Laboral */}
      <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>{selectField('Situacion Laboral', 'situacion', SITUACIONES_LABORALES)}</Grid>
          <Grid size={{ xs: 6 }}>{field('Profesion / Ocupacion', 'profesionOcupacion')}</Grid>
          <Grid size={{ xs: 12 }}>{field('Nombre de la Entidad', 'entidad')}</Grid>
          <Grid size={{ xs: 6 }}>{field('Cargo', 'cargo')}</Grid>
          <Grid size={{ xs: 6 }}>{field('Ingreso Mensual', 'ingresoMensual', { inputProps: { inputMode: 'decimal' } })}</Grid>
        </Grid>
      </Box>

      {/* Tab: Conyuge (condicional) */}
      {needsConyuge && (
        <Box sx={{ display: tab === TABS.indexOf('Conyuge') ? 'block' : 'none' }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
            Complete esta seccion si su estado civil es Casado/a o Union Libre.
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>{field('Apellidos', 'conyugeApellidos')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Nombres', 'conyugeNombres')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Numero Identificacion', 'conyugeNumeroIdentificacion')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Nacionalidad', 'conyugeNacionalidad')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Email', 'conyugeEmail', { type: 'email' })}</Grid>
            <Grid size={{ xs: 6 }}>{field('Celular', 'conyugeCelular', { type: 'tel' })}</Grid>
          </Grid>
        </Box>
      )}

      {/* Tab: PEP */}
      <Box sx={{ display: tab === TABS.indexOf('PEP') ? 'block' : 'none' }}>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>Persona Expuesta Politicamente (PEP)</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Se considera PEP a quienes desempenan o han desempenado funciones publicas destacadas.
          </Typography>
        </Alert>
        <FormControlLabel control={<Checkbox checked={form.esPEP} onChange={e => u('esPEP', e.target.checked)} />}
          label={<Typography variant="body2">¿Se considera una Persona Expuesta Politicamente?</Typography>} sx={{ mb: 1 }} />
        <FormControlLabel control={<Checkbox checked={form.esFamiliarPEP} onChange={e => u('esFamiliarPEP', e.target.checked)} />}
          label={<Typography variant="body2">¿Es familiar de un PEP? (1er y 2do grado)</Typography>} sx={{ mb: 1 }} />
        <FormControlLabel control={<Checkbox checked={form.esColaboradorPEP} onChange={e => u('esColaboradorPEP', e.target.checked)} />}
          label={<Typography variant="body2">¿Es colaborador cercano de un PEP?</Typography>} sx={{ mb: 2 }} />

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', mb: 1, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
          {DECLARACION_UAFE}
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={form.aceptaDeclaracion} onChange={e => u('aceptaDeclaracion', e.target.checked)} />}
          label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Acepto la declaracion anterior</Typography>}
        />
      </Box>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button variant="outlined" disabled={tab === 0} onClick={() => setTab(tab - 1)}
          sx={{ textTransform: 'none', borderColor: COLORS.primary, color: COLORS.primary }}>
          Anterior
        </Button>
        {tab < totalTabs - 1 ? (
          <Button variant="contained" onClick={() => setTab(tab + 1)}
            sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: COLORS.primary }}>
            Siguiente
          </Button>
        ) : (
          <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={handleSave}
            disabled={saving || !form.aceptaDeclaracion}
            sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: COLORS.success }}>
            {saving ? <CircularProgress size={20} /> : 'Guardar Informacion'}
          </Button>
        )}
      </Box>
    </PageLayout>
  );
}

// ── Success Screen ─────────────────────────────────────────
function SuccessScreen() {
  return (
    <PageLayout>
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 60, color: COLORS.success, mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Informacion Guardada</Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary, mb: 3 }}>
          Sus datos han sido registrados exitosamente. Puede cerrar esta pagina.
        </Typography>
        <Button variant="outlined" onClick={() => window.location.reload()}
          sx={{ textTransform: 'none', borderColor: COLORS.primary, color: COLORS.primary }}>
          Volver al inicio
        </Button>
      </Box>
    </PageLayout>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function FormularioUAFEPublico() {
  const [step, setStep] = useState('verify');
  const [verifyResult, setVerifyResult] = useState(null);
  const [session, setSession] = useState(null);

  const handleVerifyResult = (result) => {
    setVerifyResult(result);
    if (!result.existe) {
      setStep('create-account');
    } else if (!result.pinCreado) {
      setStep('create-pin');
    } else {
      setStep('login');
    }
  };

  const handleSession = ({ sessionToken, tipoPersona }) => {
    setSession({ sessionToken, tipoPersona });
    setStep('form');
  };

  const handleBack = () => {
    setStep('verify');
    setVerifyResult(null);
  };

  const handleLogout = () => {
    setSession(null);
    setStep('verify');
    setVerifyResult(null);
  };

  switch (step) {
    case 'verify':
      return <VerifyScreen onResult={handleVerifyResult} />;
    case 'create-account':
      return <CreateAccountScreen cedula={verifyResult.cedula} tipoPersona={verifyResult.tipoPersona} onCreated={handleSession} onBack={handleBack} />;
    case 'login':
      return <LoginScreen cedula={verifyResult.cedula} onLogin={handleSession} onBack={handleBack} />;
    case 'create-pin':
      return <CreatePinScreen cedula={verifyResult.cedula} onCreated={handleSession} onBack={handleBack} />;
    case 'form':
      return <NaturalForm sessionToken={session.sessionToken} onComplete={() => setStep('success')} onLogout={handleLogout} />;
    case 'success':
      return <SuccessScreen />;
    default:
      return <VerifyScreen onResult={handleVerifyResult} />;
  }
}
