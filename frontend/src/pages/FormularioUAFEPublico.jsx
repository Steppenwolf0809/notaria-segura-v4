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
  Tooltip,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
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

const DECLARACION_DATOS = `De conformidad con la Ley Organica de Proteccion de Datos Personales (LOPDP) del Ecuador y la normativa vigente en materia de prevencion de lavado de activos, autorizo a la Notaria Decima Octava del canton Quito a:

1. Recopilar, almacenar y tratar mis datos personales con el fin exclusivo de cumplir las obligaciones legales de debida diligencia y prevencion de lavado de activos establecidas por la UAFE.

2. Utilizar la informacion contenida en documentos notariales (minutas, escrituras y demas instrumentos) en los que intervengo como compareciente, para completar mi perfil de debida diligencia, incluyendo cualquier tratamiento previo de datos efectuado con anterioridad a esta autorizacion y necesario para dicho fin.

3. Compartir mi informacion con la UAFE y organismos de control cuando la ley asi lo requiera.

ADVERTENCIA: Conforme al Art. 47 de la Ley Organica de Prevencion, Deteccion y Combate del Delito de Lavado de Activos y de la Financiacion de Otros Delitos, cuando no se cumplan las medidas de debida diligencia, el sujeto obligado debera realizar un reporte de operacion sospechosa ante la Unidad de Analisis Financiero y Economico (UAFE).`;

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
  const [aceptaDatos, setAceptaDatos] = useState(false);
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

      <Box sx={{ mb: 2, p: 2, backgroundColor: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`, maxHeight: 200, overflow: 'auto' }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1, color: COLORS.textPrimary }}>
          Autorizacion de Tratamiento de Datos Personales
        </Typography>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {DECLARACION_DATOS}
        </Typography>
      </Box>
      <FormControlLabel
        control={<Checkbox checked={aceptaDatos} onChange={e => setAceptaDatos(e.target.checked)} />}
        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Acepto la autorizacion de tratamiento de datos personales</Typography>}
        sx={{ mb: 2 }}
      />

      {aceptaDatos && (
        <>
          <Divider sx={{ my: 2 }} />
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
        </>
      )}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
        <Button variant="outlined" onClick={onBack} sx={{ textTransform: 'none', borderColor: COLORS.primary, color: COLORS.primary }}>
          Volver
        </Button>
        <Button variant="contained" onClick={handleCreate} disabled={!aceptaDatos || !pinValid || !pinsMatch || loading}
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
  const [aceptaDatos, setAceptaDatos] = useState(false);
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

      <Box sx={{ mb: 2, p: 2, backgroundColor: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`, maxHeight: 200, overflow: 'auto' }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1, color: COLORS.textPrimary }}>
          Autorizacion de Tratamiento de Datos Personales
        </Typography>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {DECLARACION_DATOS}
        </Typography>
      </Box>
      <FormControlLabel
        control={<Checkbox checked={aceptaDatos} onChange={e => setAceptaDatos(e.target.checked)} />}
        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Acepto la autorizacion de tratamiento de datos personales</Typography>}
        sx={{ mb: 2 }}
      />

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
          disabled={!aceptaDatos || pinTemporal.length !== 6 || !pinValid || !pinsMatch || loading}
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
        sector: dir.sector || '', referencia: dir.referencia || '',
        situacion: lab.situacion || '', profesionOcupacion: lab.profesionOcupacion || '',
        entidad: lab.entidad || '', cargo: lab.cargo || '',
        ingresoMensual: lab.ingresoMensual || '',
        conyugeApellidos: con.apellidos || '', conyugeNombres: con.nombres || '',
        conyugeNumeroIdentificacion: con.numeroIdentificacion || '',
        conyugeNacionalidad: con.nacionalidad || '', conyugeEmail: con.correoElectronico || '',
        conyugeCelular: con.celular || '',
        esPEP: pep.esPEP || false, esFamiliarPEP: pep.esFamiliarPEP || false,
        esColaboradorPEP: pep.esColaboradorPEP || false,
        pepInstitucion: pep.pepInstitucion || '', pepCargo: pep.pepCargo || '',
        pepDireccionLaboral: pep.pepDireccionLaboral || '',
        pepFechaDesde: pep.pepFechaDesde || '', pepFechaHasta: pep.pepFechaHasta || '',
        pepFamiliarNombre: pep.pepFamiliarNombre || '', pepFamiliarParentesco: pep.pepFamiliarParentesco || '',
        pepFamiliarCargo: pep.pepFamiliarCargo || '', pepFamiliarInstitucion: pep.pepFamiliarInstitucion || '',
        pepColaboradorNombre: pep.pepColaboradorNombre || '', pepColaboradorTipoRelacion: pep.pepColaboradorTipoRelacion || '',
        aceptaDeclaracion: false,
      });
    }).catch(() => {
      setForm({
        apellidos: '', nombres: '', genero: '', estadoCivil: '', nivelEstudio: '',
        nacionalidad: 'ECUATORIANA', celular: '', correoElectronico: '',
        callePrincipal: '', calleSecundaria: '', numero: '', provincia: 'PICHINCHA',
        canton: 'QUITO', parroquia: '', sector: '', referencia: '',
        situacion: '', profesionOcupacion: '',
        entidad: '', cargo: '', ingresoMensual: '',
        conyugeApellidos: '', conyugeNombres: '', conyugeNumeroIdentificacion: '',
        conyugeNacionalidad: '', conyugeEmail: '', conyugeCelular: '',
        esPEP: false, esFamiliarPEP: false, esColaboradorPEP: false,
        pepInstitucion: '', pepCargo: '', pepDireccionLaboral: '',
        pepFechaDesde: '', pepFechaHasta: '',
        pepFamiliarNombre: '', pepFamiliarParentesco: '', pepFamiliarCargo: '', pepFamiliarInstitucion: '',
        pepColaboradorNombre: '', pepColaboradorTipoRelacion: '',
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
        datosPersonaNatural: {
          datosPersonales: {
            apellidos: form.apellidos, nombres: form.nombres, genero: form.genero,
            estadoCivil: form.estadoCivil, nivelEstudio: form.nivelEstudio,
            nacionalidad: form.nacionalidad,
          },
          contacto: { celular: form.celular, correoElectronico: form.correoElectronico },
          direccion: {
            callePrincipal: form.callePrincipal, calleSecundaria: form.calleSecundaria,
            numero: form.numero, provincia: form.provincia, canton: form.canton,
            parroquia: form.parroquia, sector: form.sector, referencia: form.referencia,
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
            pepInstitucion: form.pepInstitucion, pepCargo: form.pepCargo,
            pepDireccionLaboral: form.pepDireccionLaboral,
            pepFechaDesde: form.pepFechaDesde, pepFechaHasta: form.pepFechaHasta,
            pepFamiliarNombre: form.pepFamiliarNombre, pepFamiliarParentesco: form.pepFamiliarParentesco,
            pepFamiliarCargo: form.pepFamiliarCargo, pepFamiliarInstitucion: form.pepFamiliarInstitucion,
            pepColaboradorNombre: form.pepColaboradorNombre, pepColaboradorTipoRelacion: form.pepColaboradorTipoRelacion,
          },
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

  const TOOLTIPS = {
    nacionalidad: 'Escriba su nacionalidad tal como aparece en su cedula',
    estadoCivil: 'Seleccione su estado civil actual segun su documento de identidad',
    situacion: 'Publico: empleado del Estado. Privado: empresa privada. No Aplica: sin actividad laboral',
    profesionOcupacion: 'Titulo profesional o actividad principal (Ej: Abogado, Ingeniero, Comerciante). Si es jubilado, indique su profesion anterior',
    cargo: 'Puesto actual en su lugar de trabajo. Si es jubilado o no aplica, puede dejar vacio',
    entidad: 'Empresa o institucion donde trabaja. Si es jubilado, puede indicar la ultima o dejar vacio',
    ingresoMensual: 'Ingreso aproximado en dolares antes de impuestos',
    esPEP: 'Funcionarios publicos de alto nivel, jueces, militares de alto rango, directivos de empresas publicas',
    esFamiliarPEP: 'Padres, hijos, hermanos, conyuge de una persona PEP (1er y 2do grado de consanguinidad)',
    esColaboradorPEP: 'Socios comerciales o personas con relacion financiera cercana a un PEP',
  };

  const tipIcon = (key) => TOOLTIPS[key] ? (
    <Tooltip title={TOOLTIPS[key]} arrow placement="top">
      <HelpOutlineIcon sx={{ fontSize: 15, color: COLORS.textMuted, ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
    </Tooltip>
  ) : null;

  const field = (label, key, props = {}) => (
    <TextField fullWidth size="small" label={<>{label}{tipIcon(key)}</>} value={form[key]} onChange={e => u(key, e.target.value)} {...props} />
  );

  const selectField = (label, key, options) => (
    <FormControl fullWidth size="small">
      <InputLabel>{label}{tipIcon(key)}</InputLabel>
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
          <Grid size={{ xs: 6 }}>{field('Sector', 'sector')}</Grid>
          <Grid size={{ xs: 6 }}>{field('Referencia', 'referencia')}</Grid>
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
          label={<Typography variant="body2">¿Se considera una Persona Expuesta Politicamente?{tipIcon('esPEP')}</Typography>} sx={{ mb: 1 }} />
        {form.esPEP && (
          <Grid container spacing={2} sx={{ ml: 3, mb: 2 }}>
            <Grid size={{ xs: 6 }}>{field('Institucion donde labora', 'pepInstitucion')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Cargo que desempena', 'pepCargo')}</Grid>
            <Grid size={{ xs: 12 }}>{field('Direccion laboral (completa)', 'pepDireccionLaboral')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Fecha de designacion', 'pepFechaDesde', { type: 'date', InputLabelProps: { shrink: true } })}</Grid>
            <Grid size={{ xs: 6 }}>{field('Fecha de culminacion (si aplica)', 'pepFechaHasta', { type: 'date', InputLabelProps: { shrink: true } })}</Grid>
          </Grid>
        )}

        <FormControlLabel control={<Checkbox checked={form.esFamiliarPEP} onChange={e => u('esFamiliarPEP', e.target.checked)} />}
          label={<Typography variant="body2">¿Es familiar de un PEP?{tipIcon('esFamiliarPEP')}</Typography>} sx={{ mb: 1 }} />
        {form.esFamiliarPEP && (
          <Grid container spacing={2} sx={{ ml: 3, mb: 2 }}>
            <Grid size={{ xs: 6 }}>{field('Nombre completo del PEP', 'pepFamiliarNombre')}</Grid>
            <Grid size={{ xs: 6 }}>
              {selectField('Parentesco', 'pepFamiliarParentesco', [
                { value: 'CONYUGE', label: 'Conyuge' }, { value: 'PADRE', label: 'Padre' },
                { value: 'MADRE', label: 'Madre' }, { value: 'HIJO_A', label: 'Hijo/a' },
                { value: 'HERMANO_A', label: 'Hermano/a' }, { value: 'OTRO', label: 'Otro' },
              ])}
            </Grid>
            <Grid size={{ xs: 6 }}>{field('Cargo del PEP', 'pepFamiliarCargo')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Institucion del PEP', 'pepFamiliarInstitucion')}</Grid>
          </Grid>
        )}

        <FormControlLabel control={<Checkbox checked={form.esColaboradorPEP} onChange={e => u('esColaboradorPEP', e.target.checked)} />}
          label={<Typography variant="body2">¿Es colaborador cercano de un PEP?{tipIcon('esColaboradorPEP')}</Typography>} sx={{ mb: 1 }} />
        {form.esColaboradorPEP && (
          <Grid container spacing={2} sx={{ ml: 3, mb: 2 }}>
            <Grid size={{ xs: 6 }}>{field('Nombre completo del PEP', 'pepColaboradorNombre')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Tipo de relacion', 'pepColaboradorTipoRelacion')}</Grid>
          </Grid>
        )}

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

// ── Step 3b: Form (Persona Juridica) ────────────────────────
function JuridicaForm({ sessionToken, onComplete, onLogout }) {
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [socios, setSocios] = useState([]);

  const SOCIO_EMPTY = { apellidos: '', nombres: '', tipoIdentificacion: 'CEDULA', numeroIdentificacion: '', nacionalidad: 'ECUATORIANA', porcentajeParticipacion: '' };

  useEffect(() => {
    sessionApi(sessionToken).get('/mi-informacion').then(({ data }) => {
      const j = data.data?.datosPersonaJuridica || {};
      const comp = j.compania || {};
      const dirComp = comp.direccion || {};
      const ctComp = comp.contacto || {};
      const rep = j.representanteLegal || {};
      const dirRep = rep.direccion || {};
      const con = j.conyugeRepresentante || {};
      const pep = j.declaracionPEP || {};
      setForm({
        // Compania
        razonSocial: comp.razonSocial || '', ruc: comp.ruc || '', objetoSocial: comp.objetoSocial || '',
        compCallePrincipal: dirComp.callePrincipal || '', compCalleSecundaria: dirComp.calleSecundaria || '',
        compNumero: dirComp.numero || '', compProvincia: dirComp.provincia || 'PICHINCHA',
        compCanton: dirComp.canton || 'QUITO', compParroquia: dirComp.parroquia || '',
        emailCompania: ctComp.emailCompania || comp.emailCompania || '',
        telefonoCompania: ctComp.telefonoCompania || comp.telefonoCompania || '',
        celularCompania: ctComp.celularCompania || comp.celularCompania || '',
        // Representante Legal
        repApellidos: rep.apellidos || '', repNombres: rep.nombres || '',
        repTipoIdentificacion: rep.tipoIdentificacion || 'CEDULA',
        repNumeroIdentificacion: rep.numeroIdentificacion || '',
        repNacionalidad: rep.nacionalidad || 'ECUATORIANA',
        repGenero: rep.genero || '', repEstadoCivil: rep.estadoCivil || '',
        repNivelEstudio: rep.nivelEstudio || '',
        repCelular: rep.celular || '', repCorreoElectronico: rep.correoElectronico || '',
        repCallePrincipal: dirRep.callePrincipal || '', repCalleSecundaria: dirRep.calleSecundaria || '',
        repNumero: dirRep.numero || '', repProvincia: dirRep.provincia || 'PICHINCHA',
        repCanton: dirRep.canton || 'QUITO', repParroquia: dirRep.parroquia || '',
        // Conyuge Representante
        conApellidos: con.apellidos || '', conNombres: con.nombres || '',
        conNumeroIdentificacion: con.numeroIdentificacion || '',
        conNacionalidad: con.nacionalidad || '', conCorreoElectronico: con.correoElectronico || '',
        conCelular: con.celular || '',
        // PEP
        esPEP: pep.esPEP || false, esFamiliarPEP: pep.esFamiliarPEP || false,
        esColaboradorPEP: pep.esColaboradorPEP || false,
        aceptaDeclaracion: false,
      });
      setSocios(j.socios && j.socios.length > 0 ? j.socios : []);
    }).catch(() => {
      setForm({
        razonSocial: '', ruc: '', objetoSocial: '',
        compCallePrincipal: '', compCalleSecundaria: '', compNumero: '',
        compProvincia: 'PICHINCHA', compCanton: 'QUITO', compParroquia: '',
        emailCompania: '', telefonoCompania: '', celularCompania: '',
        repApellidos: '', repNombres: '', repTipoIdentificacion: 'CEDULA',
        repNumeroIdentificacion: '', repNacionalidad: 'ECUATORIANA',
        repGenero: '', repEstadoCivil: '', repNivelEstudio: '',
        repCelular: '', repCorreoElectronico: '',
        repCallePrincipal: '', repCalleSecundaria: '', repNumero: '',
        repProvincia: 'PICHINCHA', repCanton: 'QUITO', repParroquia: '',
        conApellidos: '', conNombres: '', conNumeroIdentificacion: '',
        conNacionalidad: '', conCorreoElectronico: '', conCelular: '',
        esPEP: false, esFamiliarPEP: false, esColaboradorPEP: false,
        aceptaDeclaracion: false,
      });
      setSocios([]);
    }).finally(() => setLoading(false));
  }, [sessionToken]);

  if (loading || !form) {
    return <PageLayout><Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box></PageLayout>;
  }

  const u = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const needsConyugeRep = ['CASADO', 'UNION_LIBRE', 'CASADO_CON_DISOLUCION', 'UNION_LIBRE_CON_SEPARACION'].includes(form.repEstadoCivil);
  const TABS = ['Compania', 'Rep. Legal', needsConyugeRep ? 'Conyuge Rep.' : null, 'Socios', 'PEP'].filter(Boolean);
  const totalTabs = TABS.length;
  const progress = ((tab + 1) / totalTabs) * 100;

  // Socios helpers
  const addSocio = () => setSocios(prev => [...prev, { ...SOCIO_EMPTY }]);
  const removeSocio = (idx) => setSocios(prev => prev.filter((_, i) => i !== idx));
  const updateSocio = (idx, field, value) => setSocios(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const handleSave = async () => {
    if (!form.aceptaDeclaracion) {
      setError('Debe aceptar la declaracion UAFE para guardar');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await sessionApi(sessionToken).put('/mi-informacion', {
        datosPersonaJuridica: {
          compania: {
            razonSocial: form.razonSocial, ruc: form.ruc, objetoSocial: form.objetoSocial,
            direccion: {
              callePrincipal: form.compCallePrincipal, calleSecundaria: form.compCalleSecundaria,
              numero: form.compNumero, provincia: form.compProvincia,
              canton: form.compCanton, parroquia: form.compParroquia,
            },
            emailCompania: form.emailCompania, telefonoCompania: form.telefonoCompania,
            celularCompania: form.celularCompania,
          },
          representanteLegal: {
            apellidos: form.repApellidos, nombres: form.repNombres,
            tipoIdentificacion: form.repTipoIdentificacion,
            numeroIdentificacion: form.repNumeroIdentificacion,
            nacionalidad: form.repNacionalidad, genero: form.repGenero,
            estadoCivil: form.repEstadoCivil, nivelEstudio: form.repNivelEstudio,
            celular: form.repCelular, correoElectronico: form.repCorreoElectronico,
            direccion: {
              callePrincipal: form.repCallePrincipal, calleSecundaria: form.repCalleSecundaria,
              numero: form.repNumero, provincia: form.repProvincia,
              canton: form.repCanton, parroquia: form.repParroquia,
            },
          },
          conyugeRepresentante: needsConyugeRep ? {
            apellidos: form.conApellidos, nombres: form.conNombres,
            numeroIdentificacion: form.conNumeroIdentificacion,
            nacionalidad: form.conNacionalidad, correoElectronico: form.conCorreoElectronico,
            celular: form.conCelular,
          } : null,
          socios: socios,
          declaracionPEP: {
            esPEP: form.esPEP, esFamiliarPEP: form.esFamiliarPEP,
            esColaboradorPEP: form.esColaboradorPEP,
          },
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

  const TOOLTIPS = {
    razonSocial: 'Nombre legal completo de la compania tal como aparece en el RUC',
    ruc: 'Registro Unico de Contribuyentes de la compania (13 digitos)',
    objetoSocial: 'Actividad economica principal segun la escritura de constitucion',
    porcentajeParticipacion: 'Porcentaje de participacion del socio en la compania (0-100)',
    esPEP: 'Funcionarios publicos de alto nivel, jueces, militares de alto rango, directivos de empresas publicas',
    esFamiliarPEP: 'Padres, hijos, hermanos, conyuge de una persona PEP (1er y 2do grado de consanguinidad)',
    esColaboradorPEP: 'Socios comerciales o personas con relacion financiera cercana a un PEP',
  };

  const tipIcon = (key) => TOOLTIPS[key] ? (
    <Tooltip title={TOOLTIPS[key]} arrow placement="top">
      <HelpOutlineIcon sx={{ fontSize: 15, color: COLORS.textMuted, ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
    </Tooltip>
  ) : null;

  const field = (label, key, props = {}) => (
    <TextField fullWidth size="small" label={<>{label}{tipIcon(key)}</>} value={form[key]} onChange={e => u(key, e.target.value)} {...props} />
  );

  const selectField = (label, key, options) => (
    <FormControl fullWidth size="small">
      <InputLabel>{label}{tipIcon(key)}</InputLabel>
      <Select value={form[key]} label={label} onChange={e => u(key, e.target.value)}>
        {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <PageLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Informacion Empresa</Typography>
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

      {/* Tab: Compania */}
      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>{field('Razon Social *', 'razonSocial')}</Grid>
          <Grid size={{ xs: 6 }}>{field('RUC *', 'ruc')}</Grid>
          <Grid size={{ xs: 6 }}>{field('Objeto Social', 'objetoSocial')}</Grid>
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ color: COLORS.textMuted }}>Direccion</Typography></Divider>
          </Grid>
          <Grid size={{ xs: 8 }}>{field('Calle Principal', 'compCallePrincipal')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Numero', 'compNumero')}</Grid>
          <Grid size={{ xs: 12 }}>{field('Calle Secundaria', 'compCalleSecundaria')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Provincia', 'compProvincia')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Canton', 'compCanton')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Parroquia', 'compParroquia')}</Grid>
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ color: COLORS.textMuted }}>Contacto</Typography></Divider>
          </Grid>
          <Grid size={{ xs: 4 }}>{field('Email Compania', 'emailCompania', { type: 'email' })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Telefono', 'telefonoCompania', { type: 'tel' })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Celular', 'celularCompania', { type: 'tel' })}</Grid>
        </Grid>
      </Box>

      {/* Tab: Representante Legal */}
      <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>{field('Apellidos *', 'repApellidos')}</Grid>
          <Grid size={{ xs: 6 }}>{field('Nombres *', 'repNombres')}</Grid>
          <Grid size={{ xs: 4 }}>
            {selectField('Tipo Identificacion', 'repTipoIdentificacion', [
              { value: 'CEDULA', label: 'Cedula' },
              { value: 'PASAPORTE', label: 'Pasaporte' },
              { value: 'RUC', label: 'RUC' },
            ])}
          </Grid>
          <Grid size={{ xs: 4 }}>{field('Numero Identificacion *', 'repNumeroIdentificacion')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Nacionalidad', 'repNacionalidad')}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Genero', 'repGenero', [{ value: 'MASCULINO', label: 'Masculino' }, { value: 'FEMENINO', label: 'Femenino' }])}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Estado Civil', 'repEstadoCivil', ESTADOS_CIVILES)}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Nivel Estudio', 'repNivelEstudio', NIVELES_ESTUDIO)}</Grid>
          <Grid size={{ xs: 6 }}>{field('Celular', 'repCelular', { type: 'tel' })}</Grid>
          <Grid size={{ xs: 6 }}>{field('Correo Electronico', 'repCorreoElectronico', { type: 'email' })}</Grid>
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ color: COLORS.textMuted }}>Direccion Representante</Typography></Divider>
          </Grid>
          <Grid size={{ xs: 8 }}>{field('Calle Principal', 'repCallePrincipal')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Numero', 'repNumero')}</Grid>
          <Grid size={{ xs: 12 }}>{field('Calle Secundaria', 'repCalleSecundaria')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Provincia', 'repProvincia')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Canton', 'repCanton')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Parroquia', 'repParroquia')}</Grid>
        </Grid>
      </Box>

      {/* Tab: Conyuge Representante (condicional) */}
      {needsConyugeRep && (
        <Box sx={{ display: tab === TABS.indexOf('Conyuge Rep.') ? 'block' : 'none' }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
            Complete esta seccion si el representante legal es Casado/a o Union Libre.
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>{field('Apellidos', 'conApellidos')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Nombres', 'conNombres')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Numero Identificacion', 'conNumeroIdentificacion')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Nacionalidad', 'conNacionalidad')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Correo Electronico', 'conCorreoElectronico', { type: 'email' })}</Grid>
            <Grid size={{ xs: 6 }}>{field('Celular', 'conCelular', { type: 'tel' })}</Grid>
          </Grid>
        </Box>
      )}

      {/* Tab: Socios */}
      <Box sx={{ display: tab === TABS.indexOf('Socios') ? 'block' : 'none' }}>
        <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
          Agregue los socios o accionistas de la compania con su porcentaje de participacion.
        </Alert>
        {socios.map((socio, idx) => (
          <Paper key={idx} elevation={0} sx={{ p: 2, mb: 2, borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                Socio {idx + 1}
              </Typography>
              <Button size="small" color="error" onClick={() => removeSocio(idx)} sx={{ textTransform: 'none', minWidth: 'auto' }}>
                Eliminar
              </Button>
            </Box>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth size="small" label="Apellidos" value={socio.apellidos}
                  onChange={e => updateSocio(idx, 'apellidos', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth size="small" label="Nombres" value={socio.nombres}
                  onChange={e => updateSocio(idx, 'nombres', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo ID</InputLabel>
                  <Select value={socio.tipoIdentificacion} label="Tipo ID"
                    onChange={e => updateSocio(idx, 'tipoIdentificacion', e.target.value)}>
                    <MenuItem value="CEDULA">Cedula</MenuItem>
                    <MenuItem value="PASAPORTE">Pasaporte</MenuItem>
                    <MenuItem value="RUC">RUC</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField fullWidth size="small" label="Numero ID" value={socio.numeroIdentificacion}
                  onChange={e => updateSocio(idx, 'numeroIdentificacion', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField fullWidth size="small" label="Nacionalidad" value={socio.nacionalidad}
                  onChange={e => updateSocio(idx, 'nacionalidad', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small"
                  label={<>% Participacion{tipIcon('porcentajeParticipacion')}</>}
                  value={socio.porcentajeParticipacion}
                  onChange={e => updateSocio(idx, 'porcentajeParticipacion', e.target.value)}
                  inputProps={{ inputMode: 'decimal' }} />
              </Grid>
            </Grid>
          </Paper>
        ))}
        <Box sx={{ textAlign: 'center' }}>
          <Button variant="outlined" onClick={addSocio}
            sx={{ textTransform: 'none', borderColor: COLORS.primary, color: COLORS.primary }}>
            + Agregar Socio
          </Button>
        </Box>
      </Box>

      {/* Tab: PEP */}
      <Box sx={{ display: tab === TABS.indexOf('PEP') ? 'block' : 'none' }}>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>Persona Expuesta Politicamente (PEP)</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Se considera PEP a quienes desempenan o han desempenado funciones publicas destacadas.
          </Typography>
        </Alert>
        <FormControlLabel control={<Checkbox checked={form.esPEP} onChange={e => u('esPEP', e.target.checked)} />}
          label={<Typography variant="body2">¿El representante legal es una Persona Expuesta Politicamente?{tipIcon('esPEP')}</Typography>} sx={{ mb: 1 }} />
        <FormControlLabel control={<Checkbox checked={form.esFamiliarPEP} onChange={e => u('esFamiliarPEP', e.target.checked)} />}
          label={<Typography variant="body2">¿Es familiar de un PEP?{tipIcon('esFamiliarPEP')}</Typography>} sx={{ mb: 1 }} />
        <FormControlLabel control={<Checkbox checked={form.esColaboradorPEP} onChange={e => u('esColaboradorPEP', e.target.checked)} />}
          label={<Typography variant="body2">¿Es colaborador cercano de un PEP?{tipIcon('esColaboradorPEP')}</Typography>} sx={{ mb: 2 }} />

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
      return session.tipoPersona === 'JURIDICA'
        ? <JuridicaForm sessionToken={session.sessionToken} onComplete={() => setStep('success')} onLogout={handleLogout} />
        : <NaturalForm sessionToken={session.sessionToken} onComplete={() => setStep('success')} onLogout={handleLogout} />;
    case 'success':
      return <SuccessScreen />;
    default:
      return <VerifyScreen onResult={handleVerifyResult} />;
  }
}
