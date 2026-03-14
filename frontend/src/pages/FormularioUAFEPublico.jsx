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
  InputAdornment,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import axios from 'axios';
import CatalogoAutocomplete from '../components/uafe/CatalogoAutocomplete';
import { NACIONALIDADES_UAFE, CANTONES_UAFE } from '../data/catalogos-uafe';

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

const TIPOS_IDENTIFICACION = [
  { value: 'CEDULA', label: 'Cedula' },
  { value: 'RUC', label: 'RUC' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
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
      <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>{cedula.length === 13 ? 'RUC' : cedula.length === 10 ? 'Cedula' : 'Identificacion'}: <strong>{cedula}</strong></Alert>
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
function LoginScreen({ cedula, onLogin, onBack, onPinReset }) {
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
      const respData = err.response?.data;
      if (respData?.pinReseteado && onPinReset) {
        onPinReset();
        return;
      }
      setError(respData?.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 1, fontWeight: 600 }}>Iniciar Sesion</Typography>
      <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>{cedula.length === 13 ? 'RUC' : cedula.length === 10 ? 'Cedula' : 'Identificacion'}: <strong>{cedula}</strong></Alert>
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

// ── Step 2c: PIN temporal → crear PIN propio ───────────────
function CreatePinScreen({ cedula, onCreated, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const isSeq = (p) => '012345678901234567890123456789'.includes(p) || '098765432109876543210'.includes(p);
  const isRepeat = (p) => /^(.)\1{5}$/.test(p);
  const pinValid = pin.length === 6 && !isSeq(pin) && !isRepeat(pin);
  const pinsMatch = pin === pinConfirm && pinConfirm.length === 6;

  const handleCreatePin = async () => {
    setLoading(true);
    setError(null);
    try {
      const pinTemporal = cedula.slice(-6);
      const { data } = await api.post('/crear-pin', {
        cedula,
        pinTemporal,
        nuevoPin: pin,
        confirmacionPin: pinConfirm,
      });
      if (data.success) {
        onCreated({ sessionToken: data.sessionToken, tipoPersona: data.tipoPersona });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear PIN. Contacte a la notaria.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 1, fontWeight: 600 }}>Bienvenido/a</Typography>
      <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
        Es la primera vez que accede al sistema. Acepte la autorizacion y cree un PIN personal para proteger su informacion.
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

      {aceptaDatos && (
        <>
          <Divider sx={{ my: 2 }} />
          <PinInput value={pin} onChange={setPin} label="Cree un PIN de 6 digitos:" />
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: pin.length === 6 ? COLORS.success : COLORS.textMuted }}>
              {pin.length === 6 ? '\u2713' : '\u25CB'} 6 digitos numericos
            </Typography><br />
            <Typography variant="caption" sx={{ color: pin.length === 6 && !isSeq(pin) ? COLORS.success : COLORS.textMuted }}>
              {pin.length === 6 && !isSeq(pin) ? '\u2713' : '\u25CB'} No usar secuencias (123456)
            </Typography><br />
            <Typography variant="caption" sx={{ color: pin.length === 6 && !isRepeat(pin) ? COLORS.success : COLORS.textMuted }}>
              {pin.length === 6 && !isRepeat(pin) ? '\u2713' : '\u25CB'} No usar repeticiones (111111)
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
        <Button variant="contained" onClick={handleCreatePin}
          disabled={!aceptaDatos || !pinValid || !pinsMatch || loading}
          sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: COLORS.primary, borderRadius: '8px' }}>
          {loading ? <CircularProgress size={20} /> : 'Crear PIN y Continuar'}
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
        direccionLaboral: lab.direccionLaboral || '',
        provinciaLaboral: lab.provinciaLaboral || '',
        cantonLaboral: lab.cantonLaboral || '',
        conyugeApellidos: con.apellidos || '', conyugeNombres: con.nombres || '',
        conyugeTipoIdentificacion: con.tipoIdentificacion || '',
        conyugeNumeroIdentificacion: con.numeroIdentificacion || '',
        conyugeNacionalidad: con.nacionalidad || '', conyugeEmail: con.correoElectronico || '',
        conyugeCelular: con.celular || '',
        conyugeSituacionLaboral: con.situacionLaboral || '', conyugeProfesionOcupacion: con.profesionOcupacion || '',
        conyugeEntidad: con.entidad || '', conyugeCargo: con.cargo || '',
        conyugeIngresoMensual: con.ingresoMensual || '',
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
        direccionLaboral: '', provinciaLaboral: '', cantonLaboral: '',
        conyugeApellidos: '', conyugeNombres: '', conyugeTipoIdentificacion: '', conyugeNumeroIdentificacion: '',
        conyugeNacionalidad: '', conyugeEmail: '', conyugeCelular: '',
        conyugeSituacionLaboral: '', conyugeProfesionOcupacion: '', conyugeEntidad: '', conyugeCargo: '', conyugeIngresoMensual: '',
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
            entidad: form.entidad, cargo: form.cargo, ingresoMensual: form.ingresoMensual && !isNaN(parseFloat(String(form.ingresoMensual).replace(',', '.'))) ? parseFloat(String(form.ingresoMensual).replace(',', '.')) : null,
            direccionLaboral: form.direccionLaboral, provinciaLaboral: form.provinciaLaboral, cantonLaboral: form.cantonLaboral,
          },
          conyuge: needsConyuge ? {
            apellidos: form.conyugeApellidos, nombres: form.conyugeNombres,
            tipoIdentificacion: form.conyugeTipoIdentificacion,
            numeroIdentificacion: form.conyugeNumeroIdentificacion,
            nacionalidad: form.conyugeNacionalidad, correoElectronico: form.conyugeEmail,
            celular: form.conyugeCelular,
            situacionLaboral: form.conyugeSituacionLaboral || null,
            profesionOcupacion: form.conyugeProfesionOcupacion || null,
            entidad: form.conyugeEntidad || null,
            cargo: form.conyugeCargo || null,
            ingresoMensual: form.conyugeIngresoMensual && !isNaN(parseFloat(String(form.conyugeIngresoMensual).replace(',', '.'))) ? parseFloat(String(form.conyugeIngresoMensual).replace(',', '.')) : null,
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
          <Grid size={{ xs: 6 }}>{field('Apellidos *', 'apellidos', { autoComplete: 'family-name', inputProps: { autoCapitalize: 'words' } })}</Grid>
          <Grid size={{ xs: 6 }}>{field('Nombres *', 'nombres', { autoComplete: 'given-name', inputProps: { autoCapitalize: 'words' } })}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Genero', 'genero', [{ value: 'MASCULINO', label: 'Masculino' }, { value: 'FEMENINO', label: 'Femenino' }])}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Estado Civil', 'estadoCivil', ESTADOS_CIVILES)}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Nivel Estudio', 'nivelEstudio', NIVELES_ESTUDIO)}</Grid>
          <Grid size={{ xs: 6 }}>{field('Email', 'correoElectronico', { type: 'email', autoComplete: 'email', inputProps: { inputMode: 'email' } })}</Grid>
          <Grid size={{ xs: 6 }}>{field('Celular', 'celular', { type: 'tel', autoComplete: 'tel', inputProps: { inputMode: 'tel' } })}</Grid>
          <Grid size={{ xs: 12 }}>
            <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={form.nacionalidad} label="Nacionalidad *" placeholder="Buscar nacionalidad..."
              onChange={(opt) => setForm(f => ({ ...f, nacionalidad: opt?.label || '', nacionalidadCodigo: opt?.codigo || '' }))} />
          </Grid>
        </Grid>
      </Box>

      {/* Tab: Direccion */}
      <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 8 }}>{field('Calle Principal', 'callePrincipal')}</Grid>
          <Grid size={{ xs: 4 }}>{field('Numero', 'numero')}</Grid>
          <Grid size={{ xs: 12 }}>{field('Calle Secundaria', 'calleSecundaria')}</Grid>
          <Grid size={{ xs: 4 }}>
            <CatalogoAutocomplete options={CANTONES_UAFE} value={form.canton} label="Canton" placeholder="Buscar canton..."
              onChange={(opt) => setForm(f => ({ ...f, canton: opt?.canton || '', cantonCodigo: opt?.codigo || '', provincia: opt?.provincia || '' }))} />
          </Grid>
          <Grid size={{ xs: 4 }}>{field('Provincia', 'provincia', { disabled: !!form.cantonCodigo })}</Grid>
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
          <Grid size={{ xs: 6 }}>{field('Ingreso Mensual (USD)', 'ingresoMensual', { inputProps: { inputMode: 'decimal' }, placeholder: 'Ej: 1500.00' })}</Grid>
          <Grid size={{ xs: 12 }}>{field('Direccion de la empresa', 'direccionLaboral', { placeholder: 'Ej: Av. Amazonas N24-45 y Colon' })}</Grid>
          <Grid size={{ xs: 6 }}>
            <CatalogoAutocomplete options={CANTONES_UAFE} value={form.cantonLaboral} label="Canton (laboral)" placeholder="Buscar canton..."
              onChange={(opt) => setForm(f => ({ ...f, cantonLaboral: opt?.canton || '', cantonLaboralCodigo: opt?.codigo || '', provinciaLaboral: opt?.provincia || '' }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>{field('Provincia (laboral)', 'provinciaLaboral', { disabled: !!form.cantonLaboralCodigo })}</Grid>
        </Grid>
      </Box>

      {/* Tab: Conyuge (condicional) */}
      {needsConyuge && (
        <Box sx={{ display: tab === TABS.indexOf('Conyuge') ? 'block' : 'none' }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
            Ingrese primero el numero de identificacion del conyuge para buscar si ya tiene datos registrados.
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>{selectField('Tipo Identificacion', 'conyugeTipoIdentificacion', TIPOS_IDENTIFICACION)}</Grid>
            <Grid size={{ xs: 8 }}>{field('Numero Identificacion', 'conyugeNumeroIdentificacion', { inputProps: { inputMode: 'numeric', pattern: '[0-9]*' } })}</Grid>
            <Grid size={{ xs: 6 }}>{field('Apellidos', 'conyugeApellidos', { inputProps: { autoCapitalize: 'words' } })}</Grid>
            <Grid size={{ xs: 6 }}>{field('Nombres', 'conyugeNombres', { inputProps: { autoCapitalize: 'words' } })}</Grid>
            <Grid size={{ xs: 4 }}>
              <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={form.conyugeNacionalidad} label="Nacionalidad"
                onChange={(opt) => setForm(f => ({ ...f, conyugeNacionalidad: opt?.label || '', conyugeNacionalidadCodigo: opt?.codigo || '' }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>{field('Email', 'conyugeEmail', { type: 'email', inputProps: { inputMode: 'email' } })}</Grid>
            <Grid size={{ xs: 4 }}>{field('Celular', 'conyugeCelular', { type: 'tel', inputProps: { inputMode: 'tel' } })}</Grid>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: '#1976d2', fontWeight: 600 }}>Informacion Laboral del Conyuge</Typography></Grid>
            <Grid size={{ xs: 6 }}>{selectField('Situacion Laboral', 'conyugeSituacionLaboral', SITUACIONES_LABORALES)}</Grid>
            <Grid size={{ xs: 6 }}>{field('Profesion / Ocupacion', 'conyugeProfesionOcupacion')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Nombre de la Entidad', 'conyugeEntidad')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Cargo', 'conyugeCargo')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Ingreso Mensual (USD)', 'conyugeIngresoMensual', { inputProps: { inputMode: 'decimal' }, placeholder: 'Ej: 1500.00' })}</Grid>
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
  const [fieldErrors, setFieldErrors] = useState({});

  const [buscandoRep, setBuscandoRep] = useState(false);
  const [buscandoCon, setBuscandoCon] = useState(false);
  const [buscandoSocio, setBuscandoSocio] = useState(null);
  const [busquedaMsg, setBusquedaMsg] = useState({});

  const SOCIO_NATURAL_EMPTY = { tipoSocio: 'NATURAL', apellidos: '', nombres: '', tipoIdentificacion: 'CEDULA', numeroIdentificacion: '', nacionalidad: 'ECUATORIANA', porcentajeParticipacion: '' };
  const SOCIO_JURIDICA_EMPTY = { tipoSocio: 'JURIDICA', razonSocial: '', ruc: '', nacionalidad: 'ECUATORIANA', porcentajeParticipacion: '', subSocios: [] };

  const buscarPorCedula = async (cedula) => {
    if (!cedula || cedula.length < 10) return null;
    try {
      const { data } = await axios.get(`${API_BASE}/verificar-cedula/${cedula}`);
      if (data.success && data.existe && data.tipoPersona === 'NATURAL' && data.datosPersonaNatural) {
        return data.datosPersonaNatural;
      }
      return null;
    } catch {
      return null;
    }
  };

  const buscarRepresentante = async () => {
    const cedula = form.repNumeroIdentificacion?.trim();
    if (!cedula || cedula.length < 10) {
      setBusquedaMsg({ rep: { tipo: 'warning', texto: 'Ingrese una cedula valida (min. 10 digitos)' } });
      return;
    }
    setBuscandoRep(true);
    setBusquedaMsg(prev => ({ ...prev, rep: null }));
    const datos = await buscarPorCedula(cedula);
    setBuscandoRep(false);
    if (datos) {
      const dp = datos.datosPersonales || {};
      const contacto = datos.contacto || {};
      const dir = datos.direccion || {};
      setForm(prev => ({
        ...prev,
        repApellidos: dp.apellidos || prev.repApellidos,
        repNombres: dp.nombres || prev.repNombres,
        repNacionalidad: datos.identificacion?.nacionalidad || prev.repNacionalidad,
        repGenero: dp.genero || prev.repGenero,
        repEstadoCivil: dp.estadoCivil || prev.repEstadoCivil,
        repNivelEstudio: dp.nivelEstudio || prev.repNivelEstudio,
        repCelular: contacto.celular || prev.repCelular,
        repCorreoElectronico: contacto.email || prev.repCorreoElectronico,
        repCallePrincipal: dir.callePrincipal || prev.repCallePrincipal,
        repCalleSecundaria: dir.calleSecundaria || prev.repCalleSecundaria,
        repNumero: dir.numero || prev.repNumero,
        repProvincia: dir.provincia || prev.repProvincia,
        repCanton: dir.canton || prev.repCanton,
        repParroquia: dir.parroquia || prev.repParroquia,
      }));
      const nombre = `${dp.nombres || ''} ${dp.apellidos || ''}`.trim();
      setBusquedaMsg(prev => ({ ...prev, rep: { tipo: 'success', texto: `Datos encontrados: ${nombre}` } }));
    } else {
      setBusquedaMsg(prev => ({ ...prev, rep: { tipo: 'info', texto: 'No se encontraron datos previos para esta cedula' } }));
    }
  };

  const buscarConyugeRep = async () => {
    const cedula = form.conNumeroIdentificacion?.trim();
    if (!cedula || cedula.length < 10) {
      setBusquedaMsg(prev => ({ ...prev, con: { tipo: 'warning', texto: 'Ingrese una cedula valida (min. 10 digitos)' } }));
      return;
    }
    setBuscandoCon(true);
    setBusquedaMsg(prev => ({ ...prev, con: null }));
    const datos = await buscarPorCedula(cedula);
    setBuscandoCon(false);
    if (datos) {
      const dp = datos.datosPersonales || {};
      const contacto = datos.contacto || {};
      setForm(prev => ({
        ...prev,
        conApellidos: dp.apellidos || prev.conApellidos,
        conNombres: dp.nombres || prev.conNombres,
        conNacionalidad: datos.identificacion?.nacionalidad || prev.conNacionalidad,
        conCelular: contacto.celular || prev.conCelular,
        conCorreoElectronico: contacto.email || prev.conCorreoElectronico,
      }));
      const nombre = `${dp.nombres || ''} ${dp.apellidos || ''}`.trim();
      setBusquedaMsg(prev => ({ ...prev, con: { tipo: 'success', texto: `Datos encontrados: ${nombre}` } }));
    } else {
      setBusquedaMsg(prev => ({ ...prev, con: { tipo: 'info', texto: 'No se encontraron datos previos para esta cedula' } }));
    }
  };

  const buscarSocioPorCedula = async (idx) => {
    const cedula = socios[idx]?.numeroIdentificacion?.trim();
    if (!cedula || cedula.length < 10) {
      setBusquedaMsg(prev => ({ ...prev, [`socio_${idx}`]: { tipo: 'warning', texto: 'Ingrese una cedula valida' } }));
      return;
    }
    setBuscandoSocio(idx);
    setBusquedaMsg(prev => ({ ...prev, [`socio_${idx}`]: null }));
    const datos = await buscarPorCedula(cedula);
    setBuscandoSocio(null);
    if (datos) {
      const dp = datos.datosPersonales || {};
      setSocios(prev => prev.map((s, i) => i === idx ? {
        ...s,
        apellidos: dp.apellidos || s.apellidos,
        nombres: dp.nombres || s.nombres,
        nacionalidad: datos.identificacion?.nacionalidad || s.nacionalidad,
      } : s));
      const nombre = `${dp.nombres || ''} ${dp.apellidos || ''}`.trim();
      setBusquedaMsg(prev => ({ ...prev, [`socio_${idx}`]: { tipo: 'success', texto: `Encontrado: ${nombre}` } }));
    } else {
      setBusquedaMsg(prev => ({ ...prev, [`socio_${idx}`]: { tipo: 'info', texto: 'No encontrado' } }));
    }
  };

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
        razonSocial: comp.razonSocial || '', ruc: comp.ruc || '', objetoSocial: comp.objetoSocial || '', compNacionalidad: comp.nacionalidad || comp.paisConstitucion || 'Ecuador', compNacionalidadCodigo: comp.nacionalidadCodigo || '',
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
        conSituacionLaboral: con.situacionLaboral || '', conProfesionOcupacion: con.profesionOcupacion || '',
        conEntidad: con.entidad || '', conCargo: con.cargo || '', conIngresoMensual: con.ingresoMensual || '',
        // PEP
        esPEP: pep.esPEP || false, esFamiliarPEP: pep.esFamiliarPEP || false,
        esColaboradorPEP: pep.esColaboradorPEP || false,
        pepInstitucion: pep.pepInstitucion || '', pepCargo: pep.pepCargo || '',
        pepDireccionLaboral: pep.pepDireccionLaboral || '',
        pepFechaDesde: pep.pepFechaDesde || '', pepFechaHasta: pep.pepFechaHasta || '',
        pepFamiliarNombre: pep.pepFamiliarNombre || '', pepFamiliarParentesco: pep.pepFamiliarParentesco || '',
        pepFamiliarCargo: pep.pepFamiliarCargo || '', pepFamiliarInstitucion: pep.pepFamiliarInstitucion || '',
        pepSocioNombre: pep.pepSocioNombre || '', pepSocioCargo: pep.pepSocioCargo || '',
        pepSocioInstitucion: pep.pepSocioInstitucion || '',
        aceptaDeclaracion: false,
      });
      setSocios(j.socios && j.socios.length > 0 ? j.socios : []);
    }).catch(() => {
      setForm({
        razonSocial: '', ruc: '', objetoSocial: '', compNacionalidad: 'Ecuador', compNacionalidadCodigo: 'ECU',
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
        conSituacionLaboral: '', conProfesionOcupacion: '', conEntidad: '', conCargo: '', conIngresoMensual: '',
        esPEP: false, esFamiliarPEP: false, esColaboradorPEP: false,
        pepInstitucion: '', pepCargo: '', pepDireccionLaboral: '',
        pepFechaDesde: '', pepFechaHasta: '',
        pepFamiliarNombre: '', pepFamiliarParentesco: '', pepFamiliarCargo: '', pepFamiliarInstitucion: '',
        pepSocioNombre: '', pepSocioCargo: '', pepSocioInstitucion: '',
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
  const addSocio = (tipo = 'NATURAL') => setSocios(prev => [...prev, tipo === 'JURIDICA' ? { ...SOCIO_JURIDICA_EMPTY, subSocios: [] } : { ...SOCIO_NATURAL_EMPTY }]);
  const removeSocio = (idx) => setSocios(prev => prev.filter((_, i) => i !== idx));
  const updateSocio = (idx, fld, value) => setSocios(prev => prev.map((s, i) => i === idx ? { ...s, [fld]: value } : s));

  // Validation
  const isValidEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isValidRuc = (v) => /^\d{13}$/.test(v);
  const isValidCedula = (v) => /^\d{10}$/.test(v);
  const isValidPhone = (v) => !v || /^\d{7,15}$/.test(v.replace(/[\s\-+]/g, ''));

  const validate = () => {
    const errs = {};
    // Compania
    if (!form.razonSocial.trim()) errs.razonSocial = 'Requerido';
    if (!form.ruc.trim()) errs.ruc = 'Requerido';
    else if (!isValidRuc(form.ruc.trim())) errs.ruc = 'RUC debe tener 13 digitos';
    if (form.emailCompania && !isValidEmail(form.emailCompania)) errs.emailCompania = 'Email invalido';
    if (form.telefonoCompania && !isValidPhone(form.telefonoCompania)) errs.telefonoCompania = 'Formato invalido';
    if (form.celularCompania && !isValidPhone(form.celularCompania)) errs.celularCompania = 'Formato invalido';
    // Rep. Legal
    if (!form.repApellidos.trim()) errs.repApellidos = 'Requerido';
    if (!form.repNombres.trim()) errs.repNombres = 'Requerido';
    if (!form.repNumeroIdentificacion.trim()) errs.repNumeroIdentificacion = 'Requerido';
    else if (form.repTipoIdentificacion === 'CEDULA' && !isValidCedula(form.repNumeroIdentificacion.trim()))
      errs.repNumeroIdentificacion = 'Cedula debe tener 10 digitos';
    if (form.repCorreoElectronico && !isValidEmail(form.repCorreoElectronico)) errs.repCorreoElectronico = 'Email invalido';
    if (form.repCelular && !isValidPhone(form.repCelular)) errs.repCelular = 'Formato invalido';
    // Conyuge
    if (needsConyugeRep) {
      if (!form.conApellidos.trim()) errs.conApellidos = 'Requerido';
      if (!form.conNombres.trim()) errs.conNombres = 'Requerido';
      if (!form.conNumeroIdentificacion.trim()) errs.conNumeroIdentificacion = 'Requerido';
      if (form.conCorreoElectronico && !isValidEmail(form.conCorreoElectronico)) errs.conCorreoElectronico = 'Email invalido';
    }
    // Socios: validar % participacion
    socios.forEach((s, i) => {
      const pct = parseFloat(s.porcentajeParticipacion);
      if (s.porcentajeParticipacion !== '' && (isNaN(pct) || pct < 0 || pct > 100))
        errs[`socio_${i}_porcentaje`] = 'Debe ser entre 0 y 100';
    });
    // PEP
    if (!form.aceptaDeclaracion) errs.aceptaDeclaracion = 'Debe aceptar la declaracion';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Navigate to the first tab with errors
      const companiaFields = ['razonSocial', 'ruc', 'emailCompania', 'telefonoCompania', 'celularCompania'];
      const repFields = ['repApellidos', 'repNombres', 'repNumeroIdentificacion', 'repCorreoElectronico', 'repCelular'];
      const conFields = ['conApellidos', 'conNombres', 'conNumeroIdentificacion', 'conCorreoElectronico'];
      const socioFields = Object.keys(errs).filter(k => k.startsWith('socio_'));
      const pepFields = ['aceptaDeclaracion'];
      const errorKeys = Object.keys(errs);
      if (errorKeys.some(k => companiaFields.includes(k))) setTab(0);
      else if (errorKeys.some(k => repFields.includes(k))) setTab(1);
      else if (needsConyugeRep && errorKeys.some(k => conFields.includes(k))) setTab(TABS.indexOf('Conyuge Rep.'));
      else if (socioFields.length > 0) setTab(TABS.indexOf('Socios'));
      else if (errorKeys.some(k => pepFields.includes(k))) setTab(TABS.indexOf('PEP'));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      setError('Hay campos con errores. Revise los campos marcados en rojo.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await sessionApi(sessionToken).put('/mi-informacion', {
        datosPersonaJuridica: {
          compania: {
            razonSocial: form.razonSocial, ruc: form.ruc, objetoSocial: form.objetoSocial, nacionalidad: form.compNacionalidad, nacionalidadCodigo: form.compNacionalidadCodigo,
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
            situacionLaboral: form.conSituacionLaboral || null,
            profesionOcupacion: form.conProfesionOcupacion || null,
            entidad: form.conEntidad || null,
            cargo: form.conCargo || null,
            ingresoMensual: form.conIngresoMensual && !isNaN(parseFloat(String(form.conIngresoMensual).replace(',', '.'))) ? parseFloat(String(form.conIngresoMensual).replace(',', '.')) : null,
          } : null,
          socios: socios,
          declaracionPEP: {
            esPEP: form.esPEP, esFamiliarPEP: form.esFamiliarPEP,
            esColaboradorPEP: form.esColaboradorPEP,
            pepInstitucion: form.pepInstitucion, pepCargo: form.pepCargo,
            pepDireccionLaboral: form.pepDireccionLaboral,
            pepFechaDesde: form.pepFechaDesde, pepFechaHasta: form.pepFechaHasta,
            pepFamiliarNombre: form.pepFamiliarNombre, pepFamiliarParentesco: form.pepFamiliarParentesco,
            pepFamiliarCargo: form.pepFamiliarCargo, pepFamiliarInstitucion: form.pepFamiliarInstitucion,
            pepSocioNombre: form.pepSocioNombre, pepSocioCargo: form.pepSocioCargo,
            pepSocioInstitucion: form.pepSocioInstitucion,
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
    esFamiliarPEP: 'Padres, hijos, hermanos, conyuge del representante legal que sean PEP (1er y 2do grado de consanguinidad)',
    esColaboradorPEP: 'Si alguno de los socios de la compania es o ha sido PEP, el representante legal se considera colaborador cercano',
  };

  const tipIcon = (key) => TOOLTIPS[key] ? (
    <Tooltip title={TOOLTIPS[key]} arrow placement="top">
      <HelpOutlineIcon sx={{ fontSize: 15, color: COLORS.textMuted, ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
    </Tooltip>
  ) : null;

  const field = (label, key, props = {}) => (
    <TextField fullWidth size="small" label={<>{label}{tipIcon(key)}</>} value={form[key]}
      onChange={e => { u(key, e.target.value); if (fieldErrors[key]) setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; }); }}
      error={!!fieldErrors[key]} helperText={fieldErrors[key] || ''} {...props} />
  );

  const selectField = (label, key, options) => (
    <FormControl fullWidth size="small" error={!!fieldErrors[key]}>
      <InputLabel>{label}{tipIcon(key)}</InputLabel>
      <Select value={form[key]} label={label} onChange={e => { u(key, e.target.value); if (fieldErrors[key]) setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; }); }}>
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
          <Grid size={{ xs: 12 }}>{field('Razon Social *', 'razonSocial', { inputProps: { autoCapitalize: 'words' } })}</Grid>
          <Grid size={{ xs: 4 }}>{field('RUC *', 'ruc', { inputProps: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 13 }, placeholder: '13 digitos' })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Objeto Social', 'objetoSocial')}</Grid>
          <Grid size={{ xs: 4 }}>
            <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={form.compNacionalidad} label="Pais de Constitucion"
              onChange={(opt) => setForm(f => ({ ...f, compNacionalidad: opt?.label || '', compNacionalidadCodigo: opt?.codigo || '' }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ color: COLORS.textMuted }}>Direccion</Typography></Divider>
          </Grid>
          <Grid size={{ xs: 8 }}>{field('Calle Principal', 'compCallePrincipal', { autoComplete: 'street-address' })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Numero', 'compNumero')}</Grid>
          <Grid size={{ xs: 12 }}>{field('Calle Secundaria', 'compCalleSecundaria')}</Grid>
          <Grid size={{ xs: 4 }}>
            <CatalogoAutocomplete options={CANTONES_UAFE} value={form.compCanton} label="Canton"
              onChange={(opt) => setForm(f => ({ ...f, compCanton: opt?.canton || '', compCantonCodigo: opt?.codigo || '', compProvincia: opt?.provincia || '' }))} />
          </Grid>
          <Grid size={{ xs: 4 }}>{field('Provincia', 'compProvincia', { disabled: !!form.compCantonCodigo })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Parroquia', 'compParroquia')}</Grid>
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ color: COLORS.textMuted }}>Contacto</Typography></Divider>
          </Grid>
          <Grid size={{ xs: 4 }}>{field('Email Compania', 'emailCompania', { type: 'email', inputProps: { inputMode: 'email' } })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Telefono', 'telefonoCompania', { type: 'tel', inputProps: { inputMode: 'tel' } })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Celular', 'celularCompania', { type: 'tel', inputProps: { inputMode: 'tel' } })}</Grid>
        </Grid>
      </Box>

      {/* Tab: Representante Legal */}
      <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
        <Alert severity="info" icon={<SearchIcon />} sx={{ mb: 2, borderRadius: '8px', '& .MuiAlert-message': { fontSize: '0.85rem' } }}>
          Ingrese primero el numero de identificacion y presione 🔍 para buscar datos existentes en el sistema.
        </Alert>
        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            {selectField('Tipo Identificacion', 'repTipoIdentificacion', [
              { value: 'CEDULA', label: 'Cedula' },
              { value: 'PASAPORTE', label: 'Pasaporte' },
              { value: 'RUC', label: 'RUC' },
            ])}
          </Grid>
          <Grid size={{ xs: 8 }}>
            {field('Numero Identificacion *', 'repNumeroIdentificacion', {
              inputProps: { inputMode: 'numeric', pattern: '[0-9]*' },
              InputProps: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={buscarRepresentante} disabled={buscandoRep}
                      title="Buscar datos por cedula">
                      {buscandoRep ? <CircularProgress size={18} /> : <SearchIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            })}
            {busquedaMsg.rep && (
              <Alert severity={busquedaMsg.rep.tipo} sx={{ mt: 0.5, py: 0, fontSize: '0.75rem', borderRadius: '6px' }}>
                {busquedaMsg.rep.texto}
              </Alert>
            )}
          </Grid>
          <Grid size={{ xs: 6 }}>{field('Apellidos *', 'repApellidos', { autoComplete: 'family-name', inputProps: { autoCapitalize: 'words' } })}</Grid>
          <Grid size={{ xs: 6 }}>{field('Nombres *', 'repNombres', { autoComplete: 'given-name', inputProps: { autoCapitalize: 'words' } })}</Grid>
          <Grid size={{ xs: 4 }}>
            <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={form.repNacionalidad} label="Nacionalidad"
              onChange={(opt) => setForm(f => ({ ...f, repNacionalidad: opt?.label || '', repNacionalidadCodigo: opt?.codigo || '' }))} />
          </Grid>
          <Grid size={{ xs: 4 }}>{selectField('Genero', 'repGenero', [{ value: 'MASCULINO', label: 'Masculino' }, { value: 'FEMENINO', label: 'Femenino' }])}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Estado Civil', 'repEstadoCivil', ESTADOS_CIVILES)}</Grid>
          <Grid size={{ xs: 4 }}>{selectField('Nivel Estudio', 'repNivelEstudio', NIVELES_ESTUDIO)}</Grid>
          <Grid size={{ xs: 4 }}>{field('Celular', 'repCelular', { type: 'tel', autoComplete: 'tel', inputProps: { inputMode: 'tel' } })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Correo Electronico', 'repCorreoElectronico', { type: 'email', autoComplete: 'email', inputProps: { inputMode: 'email' } })}</Grid>
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ color: COLORS.textMuted }}>Direccion Representante</Typography></Divider>
          </Grid>
          <Grid size={{ xs: 8 }}>{field('Calle Principal', 'repCallePrincipal', { autoComplete: 'street-address' })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Numero', 'repNumero')}</Grid>
          <Grid size={{ xs: 12 }}>{field('Calle Secundaria', 'repCalleSecundaria')}</Grid>
          <Grid size={{ xs: 4 }}>
            <CatalogoAutocomplete options={CANTONES_UAFE} value={form.repCanton} label="Canton"
              onChange={(opt) => setForm(f => ({ ...f, repCanton: opt?.canton || '', repCantonCodigo: opt?.codigo || '', repProvincia: opt?.provincia || '' }))} />
          </Grid>
          <Grid size={{ xs: 4 }}>{field('Provincia', 'repProvincia', { disabled: !!form.repCantonCodigo })}</Grid>
          <Grid size={{ xs: 4 }}>{field('Parroquia', 'repParroquia')}</Grid>
        </Grid>
      </Box>

      {/* Tab: Conyuge Representante (condicional) */}
      {needsConyugeRep && (
        <Box sx={{ display: tab === TABS.indexOf('Conyuge Rep.') ? 'block' : 'none' }}>
          <Alert severity="info" icon={<SearchIcon />} sx={{ mb: 2, borderRadius: '8px', '& .MuiAlert-message': { fontSize: '0.85rem' } }}>
            Ingrese primero el numero de identificacion y presione 🔍 para buscar datos existentes en el sistema.
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              {field('Numero Identificacion *', 'conNumeroIdentificacion', {
                inputProps: { inputMode: 'numeric', pattern: '[0-9]*' },
                InputProps: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={buscarConyugeRep} disabled={buscandoCon}
                        title="Buscar datos por cedula">
                        {buscandoCon ? <CircularProgress size={18} /> : <SearchIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              })}
              {busquedaMsg.con && (
                <Alert severity={busquedaMsg.con.tipo} sx={{ mt: 0.5, py: 0, fontSize: '0.75rem', borderRadius: '6px' }}>
                  {busquedaMsg.con.texto}
                </Alert>
              )}
            </Grid>
            <Grid size={{ xs: 6 }}>{field('Apellidos *', 'conApellidos', { inputProps: { autoCapitalize: 'words' } })}</Grid>
            <Grid size={{ xs: 6 }}>{field('Nombres *', 'conNombres', { inputProps: { autoCapitalize: 'words' } })}</Grid>
            <Grid size={{ xs: 4 }}>
              <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={form.conNacionalidad} label="Nacionalidad"
                onChange={(opt) => setForm(f => ({ ...f, conNacionalidad: opt?.label || '', conNacionalidadCodigo: opt?.codigo || '' }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>{field('Correo Electronico', 'conCorreoElectronico', { type: 'email', inputProps: { inputMode: 'email' } })}</Grid>
            <Grid size={{ xs: 4 }}>{field('Celular', 'conCelular', { type: 'tel', inputProps: { inputMode: 'tel' } })}</Grid>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: '#1976d2', fontWeight: 600 }}>Informacion Laboral del Conyuge</Typography></Grid>
            <Grid size={{ xs: 6 }}>{selectField('Situacion Laboral', 'conSituacionLaboral', SITUACIONES_LABORALES)}</Grid>
            <Grid size={{ xs: 6 }}>{field('Profesion / Ocupacion', 'conProfesionOcupacion')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Nombre de la Entidad', 'conEntidad')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Cargo', 'conCargo')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Ingreso Mensual (USD)', 'conIngresoMensual', { inputProps: { inputMode: 'decimal' }, placeholder: 'Ej: 1500.00' })}</Grid>
          </Grid>
        </Box>
      )}

      {/* Tab: Socios */}
      <Box sx={{ display: tab === TABS.indexOf('Socios') ? 'block' : 'none' }}>
        <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
          Agregue los socios o accionistas de la compania. Si un socio es otra empresa, seleccione "Persona Juridica" y agregue sus sub-socios hasta llegar a la persona natural final.
        </Alert>
        {socios.map((socio, idx) => {
          const isJuridica = socio.tipoSocio === 'JURIDICA';
          return (
          <Paper key={idx} elevation={0} sx={{ p: 2, mb: 2, borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                Socio {idx + 1} {isJuridica ? '(Empresa)' : '(Persona)'}
              </Typography>
              <Button size="small" color="error" onClick={() => removeSocio(idx)} sx={{ textTransform: 'none', minWidth: 'auto' }}>
                Eliminar
              </Button>
            </Box>
            {/* Tipo de socio selector */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {[
                { value: 'NATURAL', label: 'Persona Natural', icon: <PersonIcon sx={{ fontSize: 16 }} /> },
                { value: 'JURIDICA', label: 'Persona Juridica', icon: <BusinessIcon sx={{ fontSize: 16 }} /> },
              ].map(opt => (
                <Paper key={opt.value} elevation={0} onClick={() => {
                  if ((socio.tipoSocio || 'NATURAL') !== opt.value) {
                    const newSocio = opt.value === 'JURIDICA'
                      ? { ...SOCIO_JURIDICA_EMPTY, porcentajeParticipacion: socio.porcentajeParticipacion, subSocios: [] }
                      : { ...SOCIO_NATURAL_EMPTY, porcentajeParticipacion: socio.porcentajeParticipacion };
                    setSocios(prev => prev.map((s, i) => i === idx ? newSocio : s));
                  }
                }}
                  sx={{
                    flex: 1, p: 1, textAlign: 'center', cursor: 'pointer', borderRadius: '8px',
                    border: `2px solid ${(socio.tipoSocio || 'NATURAL') === opt.value ? COLORS.primary : COLORS.border}`,
                    backgroundColor: (socio.tipoSocio || 'NATURAL') === opt.value ? COLORS.primaryLight : 'white',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                  }}>
                  <Box sx={{ color: (socio.tipoSocio || 'NATURAL') === opt.value ? COLORS.primary : COLORS.textMuted }}>{opt.icon}</Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: (socio.tipoSocio || 'NATURAL') === opt.value ? COLORS.primary : COLORS.textSecondary }}>
                    {opt.label}
                  </Typography>
                </Paper>
              ))}
            </Box>
            {isJuridica ? (
              /* Socio Persona Juridica */
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" label="Razon Social *" value={socio.razonSocial}
                    onChange={e => updateSocio(idx, 'razonSocial', e.target.value)}
                    inputProps={{ autoCapitalize: 'words' }} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="RUC *" value={socio.ruc}
                    onChange={e => updateSocio(idx, 'ruc', e.target.value)}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 13 }}
                    placeholder="13 digitos" />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={socio.nacionalidad} label="Nacionalidad"
                    onChange={(opt) => { updateSocio(idx, 'nacionalidad', opt?.label || ''); updateSocio(idx, 'nacionalidadCodigo', opt?.codigo || ''); }} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small"
                    label={<>% Participacion{tipIcon('porcentajeParticipacion')}</>}
                    value={socio.porcentajeParticipacion}
                    onChange={e => updateSocio(idx, 'porcentajeParticipacion', e.target.value)}
                    error={!!fieldErrors[`socio_${idx}_porcentaje`]}
                    helperText={fieldErrors[`socio_${idx}_porcentaje`] || ''}
                    inputProps={{ inputMode: 'decimal' }} />
                </Grid>
                {/* Sub-socios */}
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }}>
                    <Typography variant="caption" sx={{ color: COLORS.textMuted }}>Socios de {socio.razonSocial || 'esta empresa'}</Typography>
                  </Divider>
                  {(socio.subSocios || []).map((sub, subIdx) => {
                    const isSubJuridica = sub.tipoSocio === 'JURIDICA';
                    return (
                      <Paper key={subIdx} elevation={0} sx={{ p: 1.5, mb: 1.5, borderRadius: '8px', border: `1px dashed ${COLORS.primary}`, backgroundColor: 'white', ml: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: COLORS.primary }}>
                            Sub-socio {subIdx + 1} {isSubJuridica ? '(Empresa)' : '(Persona)'}
                          </Typography>
                          <Button size="small" color="error" sx={{ textTransform: 'none', minWidth: 'auto', fontSize: '0.7rem' }}
                            onClick={() => {
                              const newSubSocios = (socio.subSocios || []).filter((_, si) => si !== subIdx);
                              updateSocio(idx, 'subSocios', newSubSocios);
                            }}>Eliminar</Button>
                        </Box>
                        {/* Tipo selector sub-socio */}
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                          {['NATURAL', 'JURIDICA'].map(tp => (
                            <Paper key={tp} elevation={0} onClick={() => {
                              if ((sub.tipoSocio || 'NATURAL') !== tp) {
                                const newSub = tp === 'JURIDICA'
                                  ? { ...SOCIO_JURIDICA_EMPTY, porcentajeParticipacion: sub.porcentajeParticipacion, subSocios: [] }
                                  : { ...SOCIO_NATURAL_EMPTY, porcentajeParticipacion: sub.porcentajeParticipacion };
                                const newSubSocios = [...(socio.subSocios || [])];
                                newSubSocios[subIdx] = newSub;
                                updateSocio(idx, 'subSocios', newSubSocios);
                              }
                            }}
                              sx={{
                                flex: 1, p: 0.5, textAlign: 'center', cursor: 'pointer', borderRadius: '6px',
                                border: `1px solid ${(sub.tipoSocio || 'NATURAL') === tp ? COLORS.primary : COLORS.border}`,
                                backgroundColor: (sub.tipoSocio || 'NATURAL') === tp ? COLORS.primaryLight : 'white',
                              }}>
                              <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: (sub.tipoSocio || 'NATURAL') === tp ? COLORS.primary : COLORS.textMuted }}>
                                {tp === 'NATURAL' ? 'Persona' : 'Empresa'}
                              </Typography>
                            </Paper>
                          ))}
                        </Box>
                        {isSubJuridica ? (
                          <Grid container spacing={1}>
                            <Grid size={{ xs: 12 }}>
                              <TextField fullWidth size="small" label="Razon Social" value={sub.razonSocial || ''}
                                onChange={e => { const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, razonSocial: e.target.value }; updateSocio(idx, 'subSocios', ns); }} />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <TextField fullWidth size="small" label="RUC" value={sub.ruc || ''}
                                onChange={e => { const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, ruc: e.target.value }; updateSocio(idx, 'subSocios', ns); }}
                                inputProps={{ inputMode: 'numeric', maxLength: 13 }} />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <TextField fullWidth size="small" label="% Participacion" value={sub.porcentajeParticipacion || ''}
                                onChange={e => { const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, porcentajeParticipacion: e.target.value }; updateSocio(idx, 'subSocios', ns); }}
                                inputProps={{ inputMode: 'decimal' }} />
                            </Grid>
                            {/* Nivel 3: sub-sub-socios */}
                            <Grid size={{ xs: 12 }}>
                              <Divider sx={{ my: 0.5 }}>
                                <Typography variant="caption" sx={{ color: COLORS.textMuted, fontSize: '0.65rem' }}>Socios de {sub.razonSocial || 'esta empresa'}</Typography>
                              </Divider>
                              {(sub.subSocios || []).map((sub3, sub3Idx) => (
                                <Paper key={sub3Idx} elevation={0} sx={{ p: 1, mb: 1, borderRadius: '6px', border: `1px dotted ${COLORS.textMuted}`, backgroundColor: COLORS.surface, ml: 1 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: COLORS.textSecondary }}>
                                      Socio Final {sub3Idx + 1}
                                    </Typography>
                                    <Button size="small" color="error" sx={{ textTransform: 'none', minWidth: 'auto', fontSize: '0.6rem', p: 0 }}
                                      onClick={() => {
                                        const newSub3s = (sub.subSocios || []).filter((_, si) => si !== sub3Idx);
                                        const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, subSocios: newSub3s }; updateSocio(idx, 'subSocios', ns);
                                      }}>✕</Button>
                                  </Box>
                                  <Grid container spacing={1}>
                                    <Grid size={{ xs: 6 }}>
                                      <TextField fullWidth size="small" label="Apellidos" value={sub3.apellidos || ''}
                                        onChange={e => { const newSub3s = [...(sub.subSocios || [])]; newSub3s[sub3Idx] = { ...sub3, apellidos: e.target.value }; const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, subSocios: newSub3s }; updateSocio(idx, 'subSocios', ns); }}
                                        inputProps={{ style: { fontSize: '0.8rem' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                      <TextField fullWidth size="small" label="Nombres" value={sub3.nombres || ''}
                                        onChange={e => { const newSub3s = [...(sub.subSocios || [])]; newSub3s[sub3Idx] = { ...sub3, nombres: e.target.value }; const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, subSocios: newSub3s }; updateSocio(idx, 'subSocios', ns); }}
                                        inputProps={{ style: { fontSize: '0.8rem' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                      <TextField fullWidth size="small" label="Numero ID" value={sub3.numeroIdentificacion || ''}
                                        onChange={e => { const newSub3s = [...(sub.subSocios || [])]; newSub3s[sub3Idx] = { ...sub3, numeroIdentificacion: e.target.value }; const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, subSocios: newSub3s }; updateSocio(idx, 'subSocios', ns); }}
                                        inputProps={{ inputMode: 'numeric', style: { fontSize: '0.8rem' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                      <TextField fullWidth size="small" label="% Participacion" value={sub3.porcentajeParticipacion || ''}
                                        onChange={e => { const newSub3s = [...(sub.subSocios || [])]; newSub3s[sub3Idx] = { ...sub3, porcentajeParticipacion: e.target.value }; const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, subSocios: newSub3s }; updateSocio(idx, 'subSocios', ns); }}
                                        inputProps={{ inputMode: 'decimal', style: { fontSize: '0.8rem' } }} />
                                    </Grid>
                                  </Grid>
                                </Paper>
                              ))}
                              <Button size="small" variant="text" onClick={() => {
                                const newSub3 = { tipoSocio: 'NATURAL', apellidos: '', nombres: '', numeroIdentificacion: '', porcentajeParticipacion: '' };
                                const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, subSocios: [...(sub.subSocios || []), newSub3] }; updateSocio(idx, 'subSocios', ns);
                              }}
                                sx={{ textTransform: 'none', fontSize: '0.7rem', color: COLORS.primary }}>
                                + Agregar socio persona natural
                              </Button>
                            </Grid>
                          </Grid>
                        ) : (
                          <Grid container spacing={1}>
                            <Grid size={{ xs: 4 }}>
                              <TextField fullWidth size="small" label="Numero ID" value={sub.numeroIdentificacion || ''}
                                onChange={e => { const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, numeroIdentificacion: e.target.value }; updateSocio(idx, 'subSocios', ns); }}
                                inputProps={{ inputMode: 'numeric' }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton size="small" onClick={async () => {
                                        const datos = await buscarPorCedula(sub.numeroIdentificacion);
                                        if (datos) {
                                          const dp = datos.datosPersonales || {};
                                          const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, apellidos: dp.apellidos || sub.apellidos, nombres: dp.nombres || sub.nombres, nacionalidad: datos.identificacion?.nacionalidad || sub.nacionalidad }; updateSocio(idx, 'subSocios', ns);
                                        }
                                      }} title="Buscar">
                                        <SearchIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </InputAdornment>
                                  ),
                                }} />
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                              <TextField fullWidth size="small" label="Apellidos" value={sub.apellidos || ''}
                                onChange={e => { const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, apellidos: e.target.value }; updateSocio(idx, 'subSocios', ns); }} />
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                              <TextField fullWidth size="small" label="Nombres" value={sub.nombres || ''}
                                onChange={e => { const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, nombres: e.target.value }; updateSocio(idx, 'subSocios', ns); }} />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={sub.nacionalidad || ''} label="Nacionalidad"
                                onChange={(opt) => { const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, nacionalidad: opt?.label || '', nacionalidadCodigo: opt?.codigo || '' }; updateSocio(idx, 'subSocios', ns); }} />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <TextField fullWidth size="small" label="% Participacion" value={sub.porcentajeParticipacion || ''}
                                onChange={e => { const ns = [...(socio.subSocios || [])]; ns[subIdx] = { ...sub, porcentajeParticipacion: e.target.value }; updateSocio(idx, 'subSocios', ns); }}
                                inputProps={{ inputMode: 'decimal' }} />
                            </Grid>
                          </Grid>
                        )}
                      </Paper>
                    );
                  })}
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1 }}>
                    <Button size="small" variant="text" startIcon={<PersonIcon sx={{ fontSize: 14 }} />}
                      onClick={() => updateSocio(idx, 'subSocios', [...(socio.subSocios || []), { ...SOCIO_NATURAL_EMPTY }])}
                      sx={{ textTransform: 'none', fontSize: '0.75rem', color: COLORS.primary }}>
                      + Persona Natural
                    </Button>
                    <Button size="small" variant="text" startIcon={<BusinessIcon sx={{ fontSize: 14 }} />}
                      onClick={() => updateSocio(idx, 'subSocios', [...(socio.subSocios || []), { ...SOCIO_JURIDICA_EMPTY, subSocios: [] }])}
                      sx={{ textTransform: 'none', fontSize: '0.75rem', color: COLORS.primary }}>
                      + Persona Juridica
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              /* Socio Persona Natural */
              <Grid container spacing={1.5}>
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
                <Grid size={{ xs: 8 }}>
                  <TextField fullWidth size="small" label="Numero ID" value={socio.numeroIdentificacion}
                    onChange={e => updateSocio(idx, 'numeroIdentificacion', e.target.value)}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                    helperText="Ingrese la cedula y presione 🔍 para autocompletar"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => buscarSocioPorCedula(idx)}
                            disabled={buscandoSocio === idx} title="Buscar por cedula">
                            {buscandoSocio === idx ? <CircularProgress size={16} /> : <SearchIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }} />
                  {busquedaMsg[`socio_${idx}`] && (
                    <Alert severity={busquedaMsg[`socio_${idx}`].tipo} sx={{ mt: 0.5, py: 0, fontSize: '0.7rem', borderRadius: '6px' }}>
                      {busquedaMsg[`socio_${idx}`].texto}
                    </Alert>
                  )}
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Apellidos" value={socio.apellidos}
                    onChange={e => updateSocio(idx, 'apellidos', e.target.value)}
                    inputProps={{ autoCapitalize: 'words' }} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Nombres" value={socio.nombres}
                    onChange={e => updateSocio(idx, 'nombres', e.target.value)}
                    inputProps={{ autoCapitalize: 'words' }} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <CatalogoAutocomplete options={NACIONALIDADES_UAFE} value={socio.nacionalidad} label="Nacionalidad"
                    onChange={(opt) => { updateSocio(idx, 'nacionalidad', opt?.label || ''); updateSocio(idx, 'nacionalidadCodigo', opt?.codigo || ''); }} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small"
                    label={<>% Participacion{tipIcon('porcentajeParticipacion')}</>}
                    value={socio.porcentajeParticipacion}
                    onChange={e => updateSocio(idx, 'porcentajeParticipacion', e.target.value)}
                    error={!!fieldErrors[`socio_${idx}_porcentaje`]}
                    helperText={fieldErrors[`socio_${idx}_porcentaje`] || ''}
                    inputProps={{ inputMode: 'decimal' }} />
                </Grid>
              </Grid>
            )}
          </Paper>
          );
        })}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Button variant="outlined" startIcon={<PersonIcon />} onClick={() => addSocio('NATURAL')}
            sx={{ textTransform: 'none', borderColor: COLORS.primary, color: COLORS.primary }}>
            + Socio Persona Natural
          </Button>
          <Button variant="outlined" startIcon={<BusinessIcon />} onClick={() => addSocio('JURIDICA')}
            sx={{ textTransform: 'none', borderColor: COLORS.primary, color: COLORS.primary }}>
            + Socio Persona Juridica
          </Button>
        </Box>
      </Box>

      {/* Tab: PEP */}
      <Box sx={{ display: tab === TABS.indexOf('PEP') ? 'block' : 'none' }}>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>Persona Expuesta Politicamente (PEP)</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Se considera PEP a quienes desempenan o han desempenado funciones publicas destacadas en los ultimos 5 anos.
          </Typography>
        </Alert>

        <FormControlLabel control={<Checkbox checked={form.esPEP} onChange={e => u('esPEP', e.target.checked)} />}
          label={<Typography variant="body2">¿El representante legal es una Persona Expuesta Politicamente?{tipIcon('esPEP')}</Typography>} sx={{ mb: 1 }} />
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
          label={<Typography variant="body2">¿El representante legal es familiar de un PEP?{tipIcon('esFamiliarPEP')}</Typography>} sx={{ mb: 1 }} />
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
          label={<Typography variant="body2">¿Alguno de los socios de la compania es PEP?{tipIcon('esColaboradorPEP')}</Typography>} sx={{ mb: 1 }} />
        {form.esColaboradorPEP && (
          <Grid container spacing={2} sx={{ ml: 3, mb: 2 }}>
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ borderRadius: '8px', mb: 1 }}>
                <Typography variant="caption">
                  Si un socio es PEP, el representante legal se considera colaborador cercano de dicho PEP.
                </Typography>
              </Alert>
            </Grid>
            <Grid size={{ xs: 6 }}>{field('Nombre completo del socio PEP', 'pepSocioNombre')}</Grid>
            <Grid size={{ xs: 6 }}>{field('Cargo publico del socio', 'pepSocioCargo')}</Grid>
            <Grid size={{ xs: 12 }}>{field('Institucion donde labora/laboraba el socio', 'pepSocioInstitucion')}</Grid>
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
      return <LoginScreen cedula={verifyResult.cedula} onLogin={handleSession} onBack={handleBack} onPinReset={() => setStep('create-pin')} />;
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
