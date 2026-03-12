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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';

import apiClient from '../../services/api-client';
import {
  UAFE_COLORS,
  getUAFEColors,
  TIPOS_ACTO_UAFE,
  FORMAS_PAGO,
  CALIDADES_COMPARECIENTE,
  formatCurrency,
} from './uafe-constants';
import { useTheme } from '@mui/material/styles';

// Tipos de acto aplicables a vehículos
const TIPOS_ACTO_VEHICULO = TIPOS_ACTO_UAFE.filter(t => ['74', '81'].includes(t.codigo));

// Calidades relevantes para vehículos según tipo de acto
const CALIDADES_POR_ACTO = {
  '74': ['VENDEDOR', 'COMPRADOR'],   // Compraventa
  '81': ['DONANTE', 'DONATARIO'],    // Donación
};

function useUAFEColors() {
  const theme = useTheme();
  return getUAFEColors(theme.palette.mode === 'dark');
}

/**
 * UAFEVehiculoForm - Dialog para crear/editar protocolos UAFE de vehículos
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onSaved: (protocolo) => void — callback after successful save
 * - protocol: object | null — if editing, pass existing protocol; null for new
 */
export default function UAFEVehiculoForm({ open, onClose, onSaved, protocol }) {
  const colors = useUAFEColors();
  const isEdit = !!protocol;

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Form state — Tab 1: Acto
  const [acto, setActo] = useState({
    tipoActo: '74',
    fecha: new Date().toISOString().slice(0, 10),
    valorContrato: '',
    avaluoMunicipal: '',
    formasPago: [{ tipo: '', monto: null, detalle: '' }],
    numeroDiligencia: '',
  });

  // Form state — Tab 2: Vehículo
  const [vehiculo, setVehiculo] = useState({
    vehiculoMarca: '',
    vehiculoModelo: '',
    vehiculoAnio: '',
    vehiculoPlaca: '',
    vehiculoColor: '',
    vehiculoMotor: '',
    vehiculoChasis: '',
    vehiculoCiudadComercializacion: 'QUITO',
  });

  // Form state — Tab 3: Intervinientes
  const [personas, setPersonas] = useState([
    { cedula: '', nombre: '', calidad: 'VENDEDOR', actuaPor: 'PROPIOS_DERECHOS' },
    { cedula: '', nombre: '', calidad: 'COMPRADOR', actuaPor: 'PROPIOS_DERECHOS' },
  ]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [umbralAlerta, setUmbralAlerta] = useState(null);

  // Initialize form when protocol changes (edit mode)
  useEffect(() => {
    if (protocol) {
      setActo({
        tipoActo: protocol.tipoActo || '74',
        fecha: protocol.fecha ? new Date(protocol.fecha).toISOString().split('T')[0] : new Date().toISOString().slice(0, 10),
        valorContrato: protocol.valorContrato ?? '',
        avaluoMunicipal: protocol.avaluoMunicipal ?? '',
        formasPago: protocol.formasPago?.length ? protocol.formasPago : [{ tipo: '', monto: null, detalle: '' }],
        numeroDiligencia: protocol.numeroDiligencia || '',
      });
      setVehiculo({
        vehiculoMarca: protocol.vehiculoMarca || '',
        vehiculoModelo: protocol.vehiculoModelo || '',
        vehiculoAnio: protocol.vehiculoAnio || '',
        vehiculoPlaca: protocol.vehiculoPlaca || '',
        vehiculoColor: protocol.vehiculoColor || '',
        vehiculoMotor: protocol.vehiculoMotor || '',
        vehiculoChasis: protocol.vehiculoChasis || '',
        vehiculoCiudadComercializacion: protocol.vehiculoCiudadComercializacion || 'QUITO',
      });
      // Load existing personas
      if (protocol.personas?.length) {
        setPersonas(protocol.personas.map(pp => ({
          cedula: pp.personaCedula || pp.persona?.numeroIdentificacion || '',
          nombre: pp.nombreTemporal || `${pp.persona?.datosPersonaNatural?.datosPersonales?.apellidos || ''} ${pp.persona?.datosPersonaNatural?.datosPersonales?.nombres || ''}`.trim() || '',
          calidad: pp.calidad || 'OTRO',
          actuaPor: pp.actuaPor || 'PROPIOS_DERECHOS',
          id: pp.id, // keep for edit
        })));
      }
    } else {
      // Reset for new
      setActo({
        tipoActo: '74',
        fecha: new Date().toISOString().slice(0, 10),
        valorContrato: '',
        avaluoMunicipal: '',
        formasPago: [{ tipo: '', monto: null, detalle: '' }],
        numeroDiligencia: '',
      });
      setVehiculo({
        vehiculoMarca: '',
        vehiculoModelo: '',
        vehiculoAnio: '',
        vehiculoPlaca: '',
        vehiculoColor: '',
        vehiculoMotor: '',
        vehiculoChasis: '',
        vehiculoCiudadComercializacion: 'QUITO',
      });
      setPersonas([
        { cedula: '', nombre: '', calidad: 'VENDEDOR', actuaPor: 'PROPIOS_DERECHOS' },
        { cedula: '', nombre: '', calidad: 'COMPRADOR', actuaPor: 'PROPIOS_DERECHOS' },
      ]);
    }
    setActiveTab(0);
    setError(null);
    setUmbralAlerta(null);
  }, [protocol, open]);

  // Update default calidades when tipoActo changes
  const handleTipoActoChange = (newTipo) => {
    setActo(prev => ({ ...prev, tipoActo: newTipo }));
    const calidades = CALIDADES_POR_ACTO[newTipo] || ['VENDEDOR', 'COMPRADOR'];
    setPersonas(prev => prev.map((p, idx) => ({
      ...p,
      calidad: calidades[idx] || calidades[0] || p.calidad,
    })));
  };

  // Decimal field handler
  const handleDecimal = (setter, field, value) => {
    const v = value.replace(',', '.');
    if (v === '' || /^\d*\.?\d*$/.test(v)) {
      setter(prev => ({ ...prev, [field]: v }));
    }
  };

  // Forma de pago handlers
  const updateFormaPago = (idx, field, value) => {
    setActo(prev => {
      const arr = [...prev.formasPago];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...prev, formasPago: arr };
    });
  };
  const addFormaPago = () => {
    setActo(prev => ({ ...prev, formasPago: [...prev.formasPago, { tipo: '', monto: null, detalle: '' }] }));
  };
  const removeFormaPago = (idx) => {
    setActo(prev => ({ ...prev, formasPago: prev.formasPago.filter((_, i) => i !== idx) }));
  };

  // Persona handlers
  const updatePersona = (idx, field, value) => {
    setPersonas(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: value };
      return arr;
    });
  };
  const addPersona = () => {
    const calidades = CALIDADES_POR_ACTO[acto.tipoActo] || ['VENDEDOR', 'COMPRADOR'];
    setPersonas(prev => [...prev, { cedula: '', nombre: '', calidad: calidades[1] || calidades[0], actuaPor: 'PROPIOS_DERECHOS' }]);
  };
  const removePersona = (idx) => {
    setPersonas(prev => prev.filter((_, i) => i !== idx));
  };

  // Validation
  const validate = () => {
    if (!acto.fecha) return 'Ingrese la fecha del acto';
    if (!acto.tipoActo) return 'Seleccione el tipo de acto';
    if (!acto.valorContrato || parseFloat(acto.valorContrato) <= 0) return 'Ingrese la cuantia (precio de venta)';
    if (!vehiculo.vehiculoMarca) return 'Ingrese la marca del vehiculo';
    if (!vehiculo.vehiculoPlaca) return 'Ingrese la placa del vehiculo';
    const validPersonas = personas.filter(p => p.cedula && p.cedula.length >= 10);
    if (validPersonas.length < 2) return 'Ingrese al menos 2 comparecientes con cedula valida';
    // Check formasPago
    const fps = acto.formasPago.filter(fp => fp.tipo);
    if (fps.length === 0) return 'Ingrese al menos una forma de pago';
    for (const fp of fps) {
      if (!fp.monto || parseFloat(fp.monto) <= 0) return 'Cada forma de pago debe tener un monto mayor a 0';
    }
    return null;
  };

  // Save
  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        fecha: acto.fecha,
        actoContrato: acto.tipoActo,
        valorContrato: parseFloat(acto.valorContrato),
        avaluoMunicipal: acto.avaluoMunicipal ? parseFloat(acto.avaluoMunicipal) : null,
        formasPago: acto.formasPago.filter(fp => fp.tipo),
        numeroDiligencia: acto.numeroDiligencia || null,
        ...vehiculo,
      };

      let savedProtocol;

      if (isEdit) {
        // Update existing protocol
        const { data } = await apiClient.put(`/formulario-uafe/protocolo/${protocol.id}`, payload);
        savedProtocol = data.data || data;
      } else {
        // Create new protocol
        const { data } = await apiClient.post('/formulario-uafe/protocolo', payload);
        savedProtocol = data.data || data;

        // Add personas one by one
        const validPersonas = personas.filter(p => p.cedula && p.cedula.length >= 10);
        for (const p of validPersonas) {
          try {
            await apiClient.post(`/formulario-uafe/protocolo/${savedProtocol.id}/persona`, {
              cedula: p.cedula,
              calidad: p.calidad,
              actuaPor: p.actuaPor,
              nombreTemporal: p.nombre || null,
            });
          } catch (err) {
            console.warn(`[UAFE] Error agregando persona ${p.cedula}:`, err.response?.data?.message);
          }
        }
      }

      // Check umbral after save
      try {
        const fecha = new Date(acto.fecha);
        const mes = fecha.getMonth() + 1;
        const anio = fecha.getFullYear();
        const { data: umbralData } = await apiClient.get(`/formulario-uafe/umbral/${mes}/${anio}`);
        if (umbralData.success && umbralData.data?.totalAlertas > 0) {
          // Check if any of our personas are in the alerts
          const cedulas = personas.map(p => p.cedula);
          const alertasRelevantes = umbralData.data.alertas.filter(a => cedulas.includes(a.cedula));
          if (alertasRelevantes.length > 0) {
            setUmbralAlerta(alertasRelevantes);
          }
        }
      } catch (err) {
        console.warn('[UAFE] Error consultando umbral:', err);
      }

      onSaved?.(savedProtocol);

      // If no threshold alert, close immediately
      if (!umbralAlerta) {
        // We don't close yet if there might be an alert — the effect above is async
        // So we set a small delay to allow the alert to render
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el protocolo');
    } finally {
      setSaving(false);
    }
  };

  const calidades = CALIDADES_POR_ACTO[acto.tipoActo] || CALIDADES_COMPARECIENTE;

  return (
    <Dialog
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: '12px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DirectionsCarOutlinedIcon sx={{ color: colors.primary, fontSize: 24 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {isEdit ? 'Editar Vehiculo UAFE' : 'Registrar Vehiculo UAFE'}
          </Typography>
          <Chip
            size="small"
            label="Rec. Firma"
            sx={{ fontSize: '0.65rem', fontWeight: 600, backgroundColor: '#fff3e0', color: '#e65100' }}
          />
        </Box>
        <IconButton size="small" onClick={onClose} disabled={saving}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              minHeight: 40,
              color: colors.textSecondary,
              '&.Mui-selected': { color: colors.primary },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: colors.primary,
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab label="Acto" />
          <Tab label="Vehiculo" />
          <Tab label={`Intervinientes (${personas.length})`} />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ pt: 2, minHeight: 340 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {umbralAlerta && (
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{ mb: 2 }}
            onClose={() => { setUmbralAlerta(null); onClose(); }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Alerta de Umbral UAFE ($10,000)
            </Typography>
            {umbralAlerta.map(a => (
              <Typography key={a.cedula} variant="body2" sx={{ fontSize: '0.82rem' }}>
                {a.nombre} ({a.cedula}) — acumulado mensual: {formatCurrency(a.total)} en {a.actos.length} acto(s)
              </Typography>
            ))}
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
              El oficial de cumplimiento sera notificado. El protocolo fue guardado exitosamente.
            </Typography>
          </Alert>
        )}

        {/* Tab 1: Datos del Acto */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.textPrimary, fontSize: '0.85rem' }}>
              Datos de la Transaccion
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Acto *</InputLabel>
                  <Select
                    value={acto.tipoActo}
                    label="Tipo de Acto *"
                    onChange={(e) => handleTipoActoChange(e.target.value)}
                  >
                    {TIPOS_ACTO_VEHICULO.map(t => (
                      <MenuItem key={t.codigo} value={t.codigo}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {t.codigo} - {t.descripcion}
                        </Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth size="small"
                  label="Fecha del acto *"
                  type="date"
                  value={acto.fecha}
                  onChange={(e) => setActo(prev => ({ ...prev, fecha: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2.5 }}>
                <Tooltip title="Precio de venta del vehiculo segun el contrato" arrow>
                  <TextField
                    fullWidth size="small"
                    label="Cuantia (USD) *"
                    inputProps={{ inputMode: 'decimal' }}
                    value={acto.valorContrato}
                    onChange={(e) => handleDecimal(setActo, 'valorContrato', e.target.value)}
                  />
                </Tooltip>
              </Grid>
              <Grid size={{ xs: 12, sm: 2.5 }}>
                <Tooltip title="Avaluo comercial o valor del CUV (opcional)" arrow>
                  <TextField
                    fullWidth size="small"
                    label="Avaluo (USD)"
                    inputProps={{ inputMode: 'decimal' }}
                    value={acto.avaluoMunicipal}
                    onChange={(e) => handleDecimal(setActo, 'avaluoMunicipal', e.target.value)}
                  />
                </Tooltip>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title="Numero de diligencia del sistema notarial (si ya existe)" arrow>
                  <TextField
                    fullWidth size="small"
                    label="No. Diligencia"
                    placeholder="Ej: D00295"
                    value={acto.numeroDiligencia}
                    onChange={(e) => setActo(prev => ({ ...prev, numeroDiligencia: e.target.value.toUpperCase() }))}
                  />
                </Tooltip>
              </Grid>
            </Grid>

            <Divider sx={{ my: 0.5 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.textPrimary, fontSize: '0.85rem' }}>
              Forma de Pago
            </Typography>
            {acto.formasPago.map((fp, idx) => (
              <Grid container spacing={1.5} key={idx}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo *</InputLabel>
                    <Select
                      value={fp.tipo || ''}
                      label="Tipo *"
                      onChange={(e) => updateFormaPago(idx, 'tipo', e.target.value)}
                    >
                      {FORMAS_PAGO.map(f => (
                        <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth size="small" label="Monto (USD) *"
                    inputProps={{ inputMode: 'decimal' }}
                    value={fp.monto ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (v === '' || /^\d*\.?\d*$/.test(v)) {
                        updateFormaPago(idx, 'monto', v === '' ? null : v);
                      }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth size="small" label="Detalle / Banco"
                    value={fp.detalle || ''}
                    onChange={(e) => updateFormaPago(idx, 'detalle', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 1 }} sx={{ display: 'flex', alignItems: 'center' }}>
                  {acto.formasPago.length > 1 && (
                    <IconButton size="small" onClick={() => removeFormaPago(idx)}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Grid>
              </Grid>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
              onClick={addFormaPago}
              sx={{ textTransform: 'none', fontSize: '0.75rem', alignSelf: 'flex-start' }}
            >
              Agregar forma de pago
            </Button>
          </Box>
        )}

        {/* Tab 2: Datos del Vehículo */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.textPrimary, fontSize: '0.85rem' }}>
              Datos del Vehiculo
            </Typography>
            <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
              Ingrese los datos del vehiculo segun el CUV (Certificado Unico Vehicular) o el contrato.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small"
                  label="Marca *"
                  placeholder="Ej: TOYOTA"
                  value={vehiculo.vehiculoMarca}
                  onChange={(e) => setVehiculo(prev => ({ ...prev, vehiculoMarca: e.target.value.toUpperCase() }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  fullWidth size="small"
                  label="Modelo"
                  placeholder="Ej: LAND CRUISER PRADO VX AC 4.0"
                  value={vehiculo.vehiculoModelo}
                  onChange={(e) => setVehiculo(prev => ({ ...prev, vehiculoModelo: e.target.value.toUpperCase() }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth size="small"
                  label="Año"
                  placeholder="Ej: 2020"
                  inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                  value={vehiculo.vehiculoAnio}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setVehiculo(prev => ({ ...prev, vehiculoAnio: v }));
                  }}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth size="small"
                  label="Placa *"
                  placeholder="Ej: PDJ6228"
                  value={vehiculo.vehiculoPlaca}
                  onChange={(e) => setVehiculo(prev => ({ ...prev, vehiculoPlaca: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  inputProps={{ maxLength: 8 }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth size="small"
                  label="Color"
                  placeholder="Ej: PLATEADO"
                  value={vehiculo.vehiculoColor}
                  onChange={(e) => setVehiculo(prev => ({ ...prev, vehiculoColor: e.target.value.toUpperCase() }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Tooltip title="Ciudad donde se realiza la compraventa del vehiculo" arrow>
                  <TextField
                    fullWidth size="small"
                    label="Ciudad de comercializacion"
                    value={vehiculo.vehiculoCiudadComercializacion}
                    onChange={(e) => setVehiculo(prev => ({ ...prev, vehiculoCiudadComercializacion: e.target.value.toUpperCase() }))}
                  />
                </Tooltip>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Tooltip title="Numero de motor del CUV o contrato" arrow>
                  <TextField
                    fullWidth size="small"
                    label="No. Motor"
                    placeholder="Ej: JBC41552"
                    value={vehiculo.vehiculoMotor}
                    onChange={(e) => setVehiculo(prev => ({ ...prev, vehiculoMotor: e.target.value }))}
                  />
                </Tooltip>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Tooltip title="Numero de chasis o VIN del CUV" arrow>
                  <TextField
                    fullWidth size="small"
                    label="No. Chasis / VIN"
                    placeholder="Ej: 2FMPK3J80JBC41552"
                    value={vehiculo.vehiculoChasis}
                    onChange={(e) => setVehiculo(prev => ({ ...prev, vehiculoChasis: e.target.value }))}
                  />
                </Tooltip>
              </Grid>
            </Grid>

            {/* Preview of generated description */}
            {vehiculo.vehiculoMarca && (
              <Box sx={{ p: 1.5, backgroundColor: colors.surface, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: colors.textMuted, display: 'block', mb: 0.5 }}>
                  Descripcion generada para reporte UAFE:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.82rem', color: colors.textPrimary, fontFamily: 'monospace' }}>
                  VEHICULO COMERCIALIZADO EN {vehiculo.vehiculoCiudadComercializacion || 'QUITO'}
                  {vehiculo.vehiculoMarca ? `, MARCA: ${vehiculo.vehiculoMarca}` : ''}
                  {vehiculo.vehiculoPlaca ? `, Placa: ${vehiculo.vehiculoPlaca}` : ''}
                  {vehiculo.vehiculoMotor ? `, Motor: ${vehiculo.vehiculoMotor}` : ''}
                  {vehiculo.vehiculoChasis ? `, Chasis: ${vehiculo.vehiculoChasis}` : ''}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 3: Intervinientes */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.textPrimary, fontSize: '0.85rem' }}>
                Intervinientes
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                onClick={addPersona}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Agregar
              </Button>
            </Box>
            <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
              Ingrese la cedula de cada compareciente. Si ya existe en el sistema, sus datos KYC se vincularan automaticamente.
            </Alert>

            {personas.map((p, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  backgroundColor: colors.surface,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: colors.textSecondary }}>
                    Compareciente {idx + 1}
                  </Typography>
                  {personas.length > 2 && (
                    <IconButton size="small" onClick={() => removePersona(idx)}>
                      <DeleteOutlineIcon sx={{ fontSize: 16, color: '#c62828' }} />
                    </IconButton>
                  )}
                </Box>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth size="small"
                      label="Cedula / RUC *"
                      value={p.cedula}
                      onChange={(e) => updatePersona(idx, 'cedula', e.target.value.replace(/\D/g, '').slice(0, 13))}
                      inputProps={{ inputMode: 'numeric' }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth size="small"
                      label="Nombre (referencia)"
                      placeholder="Apellidos Nombres"
                      value={p.nombre}
                      onChange={(e) => updatePersona(idx, 'nombre', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Calidad *</InputLabel>
                      <Select
                        value={p.calidad}
                        label="Calidad *"
                        onChange={(e) => updatePersona(idx, 'calidad', e.target.value)}
                      >
                        {(Array.isArray(calidades) ? calidades : CALIDADES_COMPARECIENTE).map(c => (
                          <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Comparece</InputLabel>
                      <Select
                        value={p.actuaPor}
                        label="Comparece"
                        onChange={(e) => updatePersona(idx, 'actuaPor', e.target.value)}
                      >
                        <MenuItem value="PROPIOS_DERECHOS">Por sus propios derechos</MenuItem>
                        <MenuItem value="APODERADO_GENERAL">Apoderado general</MenuItem>
                        <MenuItem value="APODERADO_ESPECIAL">Apoderado especial</MenuItem>
                        <MenuItem value="REPRESENTANTE_LEGAL">Representante legal</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeTab > 0 && (
            <Button
              onClick={() => setActiveTab(prev => prev - 1)}
              sx={{ textTransform: 'none', fontSize: '0.82rem' }}
            >
              Anterior
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          {activeTab < 2 ? (
            <Button
              variant="contained"
              onClick={() => setActiveTab(prev => prev + 1)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: colors.primary,
                '&:hover': { backgroundColor: colors.primaryDark },
              }}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : <SaveOutlinedIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                backgroundColor: '#2e7d32',
                '&:hover': { backgroundColor: '#1b5e20' },
              }}
            >
              {saving ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Protocolo')}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
