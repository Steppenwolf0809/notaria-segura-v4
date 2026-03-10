import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Button,
  Divider,
  Chip,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import SemaforoIndicator, { SemaforoPersona } from './SemaforoIndicator';
import UAFEStatusPipeline from './UAFEStatusPipeline';
import UAFEMinutaUpload from './UAFEMinutaUpload';
import {
  UAFE_COLORS,
  ESTADOS_PROTOCOLO,
  ESTADOS_PROTOCOLO_FLOW,
  TIPOS_ACTO_UAFE,
  TIPOS_BIEN,
  FORMAS_PAGO,
  CALIDADES_COMPARECIENTE,
  getSemaforoFromProtocol,
  getMissingFields,
  formatCurrency,
  formatDate,
} from './uafe-constants';

function TabPanel({ children, value, index, ...props }) {
  return (
    <Box
      role="tabpanel"
      {...props}
      sx={{ py: 2.5, display: value === index ? 'block' : 'none' }}
    >
      {children}
    </Box>
  );
}

function ProgresoSidebar({ protocol }) {
  const missingFields = getMissingFields(protocol);
  const semaforo = getSemaforoFromProtocol(protocol);
  const personas = protocol.personas || [];
  const totalPersonas = personas.length;
  const completasPersonas = personas.filter((p) => p.estadoCompletitud === 'completo').length;

  const checks = [
    { label: 'Tipo de acto asignado', done: !!protocol.tipoActo },
    { label: 'Cuantia registrada', done: protocol.valorContrato != null },
    { label: 'Al menos 1 compareciente', done: personas.length > 0 },
    { label: 'No. protocolo asignado', done: !!protocol.numeroProtocolo },
    { label: 'Todos los formularios completos', done: totalPersonas > 0 && completasPersonas === totalPersonas },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const pct = Math.round((completedCount / checks.length) * 100);

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${UAFE_COLORS.border}`,
        borderRadius: '10px',
        p: 2.5,
        minWidth: 260,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant="overline"
          sx={{
            fontSize: '0.63rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: UAFE_COLORS.textSecondary,
          }}
        >
          Progreso
        </Typography>
        <SemaforoIndicator level={semaforo.key} variant="chip" missingFields={missingFields} />
      </Box>

      {/* Progress bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted, fontSize: '0.68rem' }}>
            Progreso
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: UAFE_COLORS.textPrimary }}>
            {pct}%
          </Typography>
        </Box>
        <Box sx={{ height: 4, borderRadius: 2, backgroundColor: UAFE_COLORS.borderLight, overflow: 'hidden' }}>
          <Box
            sx={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 2,
              backgroundColor: pct === 100 ? '#2e7d32' : pct >= 60 ? '#e65100' : '#c62828',
              transition: 'width 0.4s ease',
            }}
          />
        </Box>
      </Box>

      {/* Checklist */}
      <List dense disablePadding>
        {checks.map((check, idx) => (
          <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              {check.done ? (
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#2e7d32' }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: UAFE_COLORS.textMuted }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={check.label}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: '0.75rem',
                    color: check.done ? UAFE_COLORS.textSecondary : UAFE_COLORS.textPrimary,
                    textDecoration: check.done ? 'line-through' : 'none',
                  },
                },
              }}
            />
          </ListItem>
        ))}
      </List>

      {/* Personas summary */}
      {totalPersonas > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${UAFE_COLORS.borderLight}` }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, fontSize: '0.68rem', color: UAFE_COLORS.textSecondary, display: 'block', mb: 1 }}
          >
            Comparecientes: {completasPersonas}/{totalPersonas}
          </Typography>
          {personas.map((p, idx) => {
            const nombre = p.nombre || p.nombreTemporal || 'Sin nombre';
            return (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <SemaforoPersona
                  estadoCompletitud={p.estadoCompletitud}
                  camposFaltantes={p.camposFaltantes || []}
                  variant="dot"
                  size="small"
                />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: UAFE_COLORS.textSecondary }}>
                  {nombre}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Card>
  );
}

function DatosActoTab({ protocol, onFieldChange, readOnly }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Datos principales */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
          Datos de la Transaccion
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="No. Protocolo"
              value={protocol.numeroProtocolo || ''}
              onChange={(e) => onFieldChange?.('numeroProtocolo', e.target.value)}
              disabled={readOnly}
              placeholder="Ej: 2026-0001"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={protocol.estado || 'BORRADOR'}
                label="Estado"
                onChange={(e) => onFieldChange?.('estado', e.target.value)}
                disabled={readOnly}
              >
                {ESTADOS_PROTOCOLO_FLOW.map((key) => (
                  <MenuItem key={key} value={key}>
                    <Chip
                      size="small"
                      label={ESTADOS_PROTOCOLO[key].label}
                      sx={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        backgroundColor: ESTADOS_PROTOCOLO[key].bg,
                        color: ESTADOS_PROTOCOLO[key].color,
                      }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Acto</InputLabel>
              <Select
                value={protocol.tipoActo || ''}
                label="Tipo de Acto"
                onChange={(e) => onFieldChange?.('tipoActo', e.target.value)}
                disabled={readOnly}
              >
                {TIPOS_ACTO_UAFE.map((t) => (
                  <MenuItem key={t.codigo} value={t.codigo}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {t.codigo} - {t.descripcion}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Fecha del acto"
              type="date"
              value={protocol.fecha ? new Date(protocol.fecha).toISOString().split('T')[0] : ''}
              onChange={(e) => onFieldChange?.('fecha', e.target.value)}
              disabled={readOnly}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2.5 }}>
            <TextField
              fullWidth
              size="small"
              label="Cuantia (USD)"
              inputProps={{ inputMode: 'decimal' }}
              value={protocol.valorContrato ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(',', '.');
                if (v === '' || /^\d*\.?\d*$/.test(v)) onFieldChange?.('valorContrato', v);
              }}
              disabled={readOnly}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2.5 }}>
            <TextField
              fullWidth
              size="small"
              label="Avaluo Municipal (USD)"
              inputProps={{ inputMode: 'decimal' }}
              value={protocol.avaluoMunicipal ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(',', '.');
                if (v === '' || /^\d*\.?\d*$/.test(v)) onFieldChange?.('avaluoMunicipal', v);
              }}
              disabled={readOnly}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Bien */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
          Datos del Bien
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Bien</InputLabel>
              <Select
                value={protocol.tipoBien || ''}
                label="Tipo de Bien"
                onChange={(e) => onFieldChange?.('tipoBien', e.target.value)}
                disabled={readOnly}
              >
                {TIPOS_BIEN.map((t) => (
                  <MenuItem key={t.codigo} value={t.codigo}>
                    {t.codigo} - {t.descripcion}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              size="small"
              label="Descripcion del Bien"
              value={protocol.descripcionBien || ''}
              onChange={(e) => onFieldChange?.('descripcionBien', e.target.value)}
              disabled={readOnly}
              multiline
              maxRows={2}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Ubicacion */}
      <Box>
        <Tooltip title="Se incluye en el reporte UAFE. Ej: DEPARTAMENTO No. 411, EDIFICIO PRAGA, MARIANO PAREDES Y RODRIGO DE VILLALOBOS, BARRIO MARISOL" arrow>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem', cursor: 'help' }}>
            Ubicacion del Inmueble
          </Typography>
        </Tooltip>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Dirección"
              placeholder="Ej: DEPTO No. 411, ED. PRAGA, MARIANO PAREDES Y R. VILLALOBOS"
              value={protocol.ubicacionDescripcion || ''}
              onChange={(e) => {
                if (e.target.value.length <= 150) onFieldChange?.('ubicacionDescripcion', e.target.value);
              }}
              disabled={readOnly}
              inputProps={{ maxLength: 150 }}
              helperText={`${(protocol.ubicacionDescripcion || '').length}/150`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Parroquia"
              value={protocol.ubicacionParroquia || ''}
              onChange={(e) => onFieldChange?.('ubicacionParroquia', e.target.value)}
              disabled={readOnly}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Canton"
              value={protocol.ubicacionCanton || ''}
              onChange={(e) => onFieldChange?.('ubicacionCanton', e.target.value)}
              disabled={readOnly}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Provincia"
              value={protocol.ubicacionProvincia || ''}
              onChange={(e) => onFieldChange?.('ubicacionProvincia', e.target.value)}
              disabled={readOnly}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Forma de pago */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
          Forma de Pago
        </Typography>
        {(protocol.formasPago || []).map((fp, idx) => (
          <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={fp.tipo || ''}
                  label="Tipo"
                  disabled={readOnly}
                  onChange={(e) => {
                    const arr = [...(protocol.formasPago || [])];
                    arr[idx] = { ...arr[idx], tipo: e.target.value };
                    onFieldChange?.('formasPago', arr);
                  }}
                >
                  {FORMAS_PAGO.map(f => (
                    <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth size="small" label="Monto (USD)"
                inputProps={{ inputMode: 'decimal' }}
                value={fp.monto ?? ''}
                disabled={readOnly}
                onChange={(e) => {
                  const v = e.target.value.replace(',', '.');
                  if (v === '' || /^\d*\.?\d*$/.test(v)) {
                    const arr = [...(protocol.formasPago || [])];
                    arr[idx] = { ...arr[idx], monto: v === '' ? null : v };
                    onFieldChange?.('formasPago', arr);
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Detalle / Banco"
                value={fp.detalle || ''}
                disabled={readOnly}
                onChange={(e) => {
                  const arr = [...(protocol.formasPago || [])];
                  arr[idx] = { ...arr[idx], detalle: e.target.value };
                  onFieldChange?.('formasPago', arr);
                }}
              />
            </Grid>
            {!readOnly && (
              <Grid size={{ xs: 12, sm: 1 }} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton size="small" onClick={() => {
                  const arr = (protocol.formasPago || []).filter((_, i) => i !== idx);
                  onFieldChange?.('formasPago', arr);
                }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Grid>
            )}
          </Grid>
        ))}
        {!readOnly && (
          <Button
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            onClick={() => {
              const arr = [...(protocol.formasPago || []), { tipo: '', monto: null, detalle: '' }];
              onFieldChange?.('formasPago', arr);
            }}
            sx={{ textTransform: 'none', fontSize: '0.75rem', mt: 0.5 }}
          >
            Agregar forma de pago
          </Button>
        )}
      </Box>
    </Box>
  );
}

function ComparecientesTab({ protocol, onAddPerson, onEditPerson, onSendForm, onGenerateWordPersona, onDeletePerson }) {
  const personas = protocol.personas || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
          Comparecientes ({personas.length})
        </Typography>
        <Tooltip title="Agregue a las personas que intervienen en el acto (vendedor, comprador, etc.). Necesita al menos la cedula para registrarlos." arrow>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PersonAddOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={onAddPerson}
            sx={{
              textTransform: 'none',
              fontSize: '0.78rem',
              borderColor: UAFE_COLORS.border,
              color: UAFE_COLORS.textPrimary,
              '&:hover': {
                borderColor: UAFE_COLORS.primary,
                backgroundColor: UAFE_COLORS.primaryLight,
            },
          }}
        >
            Agregar Compareciente
          </Button>
        </Tooltip>
      </Box>

      {personas.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            border: `2px dashed ${UAFE_COLORS.border}`,
            borderRadius: '10px',
            p: 4,
            textAlign: 'center',
          }}
        >
          <PersonOutlineIcon sx={{ fontSize: 40, color: UAFE_COLORS.textMuted, mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No hay comparecientes registrados
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Agregue los comparecientes del acto notarial
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {personas.map((p, idx) => {
            const nombre = p.nombre || p.nombreTemporal || 'Sin nombre';
            const cedula = p.personaCedula || '-';

            return (
              <Paper
                key={idx}
                elevation={0}
                sx={{
                  border: `1px solid ${UAFE_COLORS.border}`,
                  borderRadius: '8px',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'border-color 0.15s ease',
                  '&:hover': {
                    borderColor: UAFE_COLORS.primary,
                  },
                }}
              >
                <SemaforoPersona
                  estadoCompletitud={p.estadoCompletitud}
                  camposFaltantes={p.camposFaltantes || []}
                  variant="dot"
                  size="medium"
                  pulsate={p.estadoCompletitud === 'pendiente'}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: UAFE_COLORS.textPrimary }}>
                    {nombre}
                  </Typography>
                  <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted }}>
                    {cedula} &middot; {p.calidad || 'Sin calidad'}
                    {p.actuaPor && p.actuaPor !== 'PROPIOS_DERECHOS' && ` · Representado/a`}
                    {' '}&middot; {p.porcentajeCompletitud ?? 0}% completo
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={p.calidad || 'SIN CALIDAD'}
                  sx={{
                    fontSize: '0.63rem',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    backgroundColor: UAFE_COLORS.surface,
                    color: UAFE_COLORS.textSecondary,
                    border: `1px solid ${UAFE_COLORS.borderLight}`,
                  }}
                />

                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Descargar formulario Word individual de este compareciente" arrow>
                    <IconButton
                      size="small"
                      onClick={() => onGenerateWordPersona?.(protocol.id, p.id || p.persona?.id)}
                      sx={{ color: UAFE_COLORS.textMuted, '&:hover': { color: UAFE_COLORS.info || '#1976d2' } }}
                    >
                      <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Copia el enlace del formulario publico UAFE para que los comparecientes completen sus datos personales (direccion, laboral, PEP)" arrow>
                    <IconButton
                      size="small"
                      onClick={() => onSendForm?.(p)}
                      sx={{ color: UAFE_COLORS.textMuted, '&:hover': { color: UAFE_COLORS.primary } }}
                    >
                      <LinkOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar manualmente los datos de este compareciente. Use esta opcion si el compareciente no puede llenar el formulario en linea." arrow>
                    <IconButton
                      size="small"
                      onClick={() => onEditPerson?.(p)}
                      sx={{ color: UAFE_COLORS.textMuted, '&:hover': { color: UAFE_COLORS.primary } }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar este compareciente del protocolo" arrow>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar a ${nombre} de este protocolo?`)) {
                          onDeletePerson?.(p);
                        }
                      }}
                      sx={{ color: UAFE_COLORS.textMuted, '&:hover': { color: '#d32f2f' } }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function MinutaTab({ protocol, onMinutaProcessed }) {
  if (protocol.minutaParseada && protocol.minutaUrl) {
    return (
      <Box>
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${UAFE_COLORS.border}`,
            borderRadius: '8px',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <UploadFileOutlinedIcon sx={{ color: UAFE_COLORS.primary }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
              Minuta cargada y procesada
            </Typography>
            <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted }}>
              Datos extraidos automaticamente y confirmados por el matrizador
            </Typography>
          </Box>
          <Chip size="small" label="Procesada" sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, fontSize: '0.68rem' }} />
        </Paper>
      </Box>
    );
  }

  return (
    <UAFEMinutaUpload
      protocoloId={protocol.id}
      onComplete={(data) => onMinutaProcessed?.(data)}
    />
  );
}

function TextosTab({ protocol, onGenerateTexts }) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(null); // 'encabezado' | 'comparecencia' | null

  const yaGenerado = !!(protocol.textoEncabezadoGenerado || protocol.textoComparecenciaGenerado);

  const handleGenerar = async (forzar = false) => {
    setLoading(true);
    try {
      const data = await onGenerateTexts?.(protocol.id, forzar);
      if (data) setResultado(data);
    } finally {
      setLoading(false);
    }
  };

  const encabezado = resultado?.data?.encabezado || protocol.textoEncabezadoGenerado;
  const comparecenciaCache = protocol.textoComparecenciaGenerado;
  const comparecenciaHtml = resultado?.data?.comparecenciaHtml || comparecenciaCache;

  // Auto-regenerar si el cache no tiene formato HTML (legacy sin negritas)
  useEffect(() => {
    if (comparecenciaCache && !comparecenciaCache.includes('<b ') && !comparecenciaCache.includes('<b>') && !resultado && !loading) {
      handleGenerar(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparecenciaCache]);

  const copiarTexto = async (texto, tipo) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 2000);
    } catch { /* ignore */ }
  };

  const copiarHtmlConFormato = async (html, tipo) => {
    try {
      const htmlCompleto = `<html><body style="font-family:'Times New Roman',serif;font-size:12pt">${html}</body></html>`;
      const blobHtml = new Blob([htmlCompleto], { type: 'text/html' });
      const textoPlano = html.replace(/<[^>]*>/g, '');
      const blobText = new Blob([textoPlano], { type: 'text/plain' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Fallback: copiar texto plano
      copiarTexto(html.replace(/<[^>]*>/g, ''), tipo);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
          Textos Generados
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {yaGenerado && (
            <Tooltip title="Regenerar textos con los datos actuales de los comparecientes" arrow>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshOutlinedIcon sx={{ fontSize: 14 }} />}
                onClick={() => handleGenerar(true)}
                disabled={loading}
                sx={{ fontSize: '0.7rem', textTransform: 'none', borderColor: UAFE_COLORS.border }}
              >
                Regenerar
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Generar encabezado y texto de comparecencia a partir de los datos del protocolo y comparecientes" arrow>
            <Button
              size="small"
              variant="contained"
              onClick={() => handleGenerar(false)}
              disabled={loading || (protocol.personas || []).length === 0}
              sx={{ fontSize: '0.7rem', textTransform: 'none' }}
            >
              {loading ? 'Generando...' : yaGenerado ? 'Ver textos' : 'Generar textos'}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {resultado?.tieneIncompletos && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px' }}>
          <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600, fontSize: '0.7rem' }}>
            Algunos comparecientes tienen datos incompletos. Los campos faltantes aparecen como [PENDIENTE].
          </Typography>
        </Paper>
      )}

      {/* Encabezado */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: UAFE_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.63rem' }}>
            Encabezado
          </Typography>
          {encabezado && (
            <Button
              size="small"
              startIcon={<ContentCopyIcon sx={{ fontSize: 13 }} />}
              onClick={() => copiarTexto(encabezado, 'encabezado')}
              sx={{ fontSize: '0.68rem', textTransform: 'none', color: copiado === 'encabezado' ? '#2e7d32' : UAFE_COLORS.textSecondary }}
            >
              {copiado === 'encabezado' ? 'Copiado!' : 'Copiar'}
            </Button>
          )}
        </Box>
        <Paper
          elevation={0}
          sx={{
            mt: 0.75,
            p: 2,
            border: `1px solid ${UAFE_COLORS.border}`,
            borderRadius: '6px',
            fontFamily: '"Courier New", monospace',
            fontSize: '0.72rem',
            lineHeight: 1.6,
            fontWeight: 'bold',
            whiteSpace: 'pre-wrap',
            color: UAFE_COLORS.textPrimary,
            backgroundColor: UAFE_COLORS.surface,
            minHeight: 60,
          }}
        >
          {encabezado || (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'inherit' }}>
              No generado aun. Presione &quot;Generar textos&quot; para crear el encabezado.
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Comparecencia */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: UAFE_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.63rem' }}>
            Comparecencia
          </Typography>
          {comparecenciaHtml && (
            <Button
              size="small"
              startIcon={<ContentCopyIcon sx={{ fontSize: 13 }} />}
              onClick={() => copiarHtmlConFormato(comparecenciaHtml, 'comparecencia')}
              sx={{ fontSize: '0.68rem', textTransform: 'none', color: copiado === 'comparecencia' ? '#2e7d32' : UAFE_COLORS.textSecondary }}
            >
              {copiado === 'comparecencia' ? 'Copiado!' : 'Copiar con formato'}
            </Button>
          )}
        </Box>
        <Paper
          elevation={0}
          sx={{
            mt: 0.75,
            p: 2,
            border: `1px solid ${UAFE_COLORS.border}`,
            borderRadius: '6px',
            fontFamily: '"Times New Roman", serif',
            fontSize: '0.82rem',
            lineHeight: 1.8,
            textAlign: 'justify',
            color: UAFE_COLORS.textPrimary,
            backgroundColor: UAFE_COLORS.surface,
            minHeight: 60,
            '& b': { fontWeight: 'bold' },
          }}
        >
          {comparecenciaHtml ? (
            <span dangerouslySetInnerHTML={{ __html: comparecenciaHtml }} />
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'inherit' }}>
              No generado aun. Presione &quot;Generar textos&quot; para crear la comparecencia.
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

/**
 * UAFEProtocolDetail - Full detail view for a single protocol
 *
 * Props:
 *   - protocol: ProtocoloUAFE object with personas
 *   - onBack: () => void
 *   - onSave: (updatedFields) => void
 *   - onAddPerson: () => void
 *   - onEditPerson: (persona) => void
 *   - onSendForm: (persona) => void
 *   - readOnly: boolean
 */
export default function UAFEProtocolDetail({
  protocol,
  onBack,
  onSave,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onSendForm,
  onRefresh,
  onGenerateTexts,
  onGenerateWord,
  onGenerateWordPersona,
  readOnly = false,
}) {
  const [tab, setTab] = useState(0);
  const [editedFields, setEditedFields] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  if (!protocol) return null;

  const estadoConfig = ESTADOS_PROTOCOLO[protocol.estado] || ESTADOS_PROTOCOLO.BORRADOR;
  const semaforo = getSemaforoFromProtocol(protocol);
  const mergedProtocol = { ...protocol, ...editedFields };

  const handleFieldChange = (field, value) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }));
  };

  const hasChanges = Object.keys(editedFields).length > 0;

  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
      {/* Main content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <IconButton size="small" onClick={onBack} sx={{ color: UAFE_COLORS.textMuted }}>
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Typography
              sx={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: UAFE_COLORS.textPrimary,
                letterSpacing: '-0.01em',
              }}
            >
              {protocol.numeroProtocolo
                ? `Protocolo #${protocol.numeroProtocolo}`
                : 'Protocolo sin numero'}
            </Typography>
            <SemaforoIndicator
              level={semaforo.key}
              variant="chip"
              missingFields={getMissingFields(protocol)}
            />
            <Chip
              size="small"
              label={estadoConfig.label}
              sx={{
                fontSize: '0.63rem',
                fontWeight: 600,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                backgroundColor: estadoConfig.bg,
                color: estadoConfig.color,
              }}
            />
            <Box sx={{ flex: 1 }} />
            {onRefresh && (
              <Tooltip title="Actualizar datos">
                <IconButton
                  size="small"
                  disabled={refreshing}
                  onClick={async () => {
                    setRefreshing(true);
                    await onRefresh();
                    setRefreshing(false);
                  }}
                  sx={{ color: UAFE_COLORS.textMuted }}
                >
                  <RefreshOutlinedIcon sx={{ fontSize: 20, animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Tooltip>
            )}
            {onGenerateWord && (protocol.personas || []).length > 0 && (
              <Tooltip title="Descargar todos los formularios de conocimiento del cliente en un ZIP (Word .docx)" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<UploadFileOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={() => onGenerateWord?.(protocol.id)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderColor: UAFE_COLORS.border,
                    color: UAFE_COLORS.textPrimary,
                  }}
                >
                  Descargar Todos
                </Button>
              </Tooltip>
            )}
            {hasChanges && !readOnly && (
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={async () => {
                  try {
                    await onSave?.(editedFields);
                    setEditedFields({});
                  } catch {
                    // Error se maneja en el Dashboard (snackbar)
                  }
                }}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: UAFE_COLORS.primary,
                  boxShadow: 'none',
                  '&:hover': { boxShadow: '0 2px 8px rgba(30,90,142,0.3)' },
                }}
              >
                Guardar Cambios
              </Button>
            )}
          </Box>

          {/* Pipeline indicator */}
          <UAFEStatusPipeline mode="indicator" currentState={protocol.estado || 'BORRADOR'} />
        </Box>

        {/* Tabs */}
        <Card
          elevation={0}
          sx={{
            border: `1px solid ${UAFE_COLORS.border}`,
            borderRadius: '10px',
            overflow: 'visible',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderBottom: `1px solid ${UAFE_COLORS.borderLight}`,
              px: 1,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                minHeight: 48,
                color: UAFE_COLORS.textSecondary,
                '&.Mui-selected': {
                  color: UAFE_COLORS.primary,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: UAFE_COLORS.primary,
                height: 2.5,
                borderRadius: '2px 2px 0 0',
              },
            }}
          >
            <Tooltip title="Suba la minuta Word (.docx) para extraer automaticamente comparecientes, cuantia y tipo de acto" arrow>
              <Tab label="Minuta" />
            </Tooltip>
            <Tooltip title="Tipo de acto, cuantia, avaluo, datos del bien y ubicacion del inmueble" arrow>
              <Tab label="Datos del Acto" />
            </Tooltip>
            <Tooltip title="Personas que intervienen en el acto. Desde aqui puede enviar el formulario publico para que completen sus datos." arrow>
              <Tab label={`Comparecientes (${(protocol.personas || []).length})`} />
            </Tooltip>
            <Tooltip title="Encabezado y texto de comparecencia generados automaticamente a partir de los datos del protocolo" arrow>
              <Tab label="Textos Generados" />
            </Tooltip>
          </Tabs>

          <Box sx={{ px: 3, pb: 2 }}>
            <TabPanel value={tab} index={0}>
              <MinutaTab protocol={protocol} onMinutaProcessed={onSave} />
            </TabPanel>
            <TabPanel value={tab} index={1}>
              <DatosActoTab
                protocol={mergedProtocol}
                onFieldChange={handleFieldChange}
                readOnly={readOnly}
              />
            </TabPanel>
            <TabPanel value={tab} index={2}>
              <ComparecientesTab
                protocol={protocol}
                onAddPerson={onAddPerson}
                onEditPerson={onEditPerson}
                onDeletePerson={onDeletePerson}
                onSendForm={onSendForm}
                onGenerateWordPersona={onGenerateWordPersona}
              />
            </TabPanel>
            <TabPanel value={tab} index={3}>
              <TextosTab protocol={protocol} onGenerateTexts={onGenerateTexts} />
            </TabPanel>
          </Box>
        </Card>
      </Box>

      {/* Sidebar */}
      <ProgresoSidebar protocol={protocol} />
    </Box>
  );
}
