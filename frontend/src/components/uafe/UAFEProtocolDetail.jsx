import { useState } from 'react';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import SemaforoIndicator, { SemaforoPersona } from './SemaforoIndicator';
import UAFEStatusPipeline from './UAFEStatusPipeline';
import {
  UAFE_COLORS,
  ESTADOS_PROTOCOLO,
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
    <Box role="tabpanel" hidden={value !== index} {...props} sx={{ py: 2.5 }}>
      {value === index && children}
    </Box>
  );
}

function CompletitudSidebar({ protocol }) {
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
          Completitud
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
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
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
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Cuantia (USD)"
              type="number"
              value={protocol.valorContrato ?? ''}
              onChange={(e) => onFieldChange?.('valorContrato', e.target.value)}
              disabled={readOnly}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Avaluo Municipal (USD)"
              type="number"
              value={protocol.avaluoMunicipal ?? ''}
              onChange={(e) => onFieldChange?.('avaluoMunicipal', e.target.value)}
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
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
          Ubicacion del Inmueble
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Descripcion"
              value={protocol.ubicacionDescripcion || ''}
              onChange={(e) => onFieldChange?.('ubicacionDescripcion', e.target.value)}
              disabled={readOnly}
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

      {/* Forma de pago (read-only summary for now) */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
          Forma de Pago
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {FORMAS_PAGO.map((fp) => (
            <Chip
              key={fp.key}
              label={fp.label}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.72rem',
                borderColor: UAFE_COLORS.border,
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function ComparecientesTab({ protocol, onAddPerson, onEditPerson, onSendForm }) {
  const personas = protocol.personas || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
          Comparecientes ({personas.length})
        </Typography>
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
                    {cedula} &middot; {p.calidad || 'Sin calidad'} &middot; {p.porcentajeCompletitud ?? 0}% completo
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
                  <IconButton
                    size="small"
                    onClick={() => onSendForm?.(p)}
                    title="Copiar enlace formulario"
                    sx={{ color: UAFE_COLORS.textMuted, '&:hover': { color: UAFE_COLORS.primary } }}
                  >
                    <LinkOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onEditPerson?.(p)}
                    title="Editar datos"
                    sx={{ color: UAFE_COLORS.textMuted, '&:hover': { color: UAFE_COLORS.primary } }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function MinutaTab({ protocol }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
        Minuta del Acto
      </Typography>

      {protocol.minutaUrl ? (
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
              Minuta cargada
            </Typography>
            <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted }}>
              {protocol.minutaParseada ? 'Datos extraidos automaticamente' : 'Pendiente de extraccion'}
            </Typography>
          </Box>
          {protocol.minutaParseada && (
            <Chip size="small" label="Parseada" sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, fontSize: '0.68rem' }} />
          )}
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: `2px dashed ${UAFE_COLORS.border}`,
            borderRadius: '10px',
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: UAFE_COLORS.primary,
              backgroundColor: UAFE_COLORS.primaryLight + '40',
            },
          }}
        >
          <UploadFileOutlinedIcon sx={{ fontSize: 40, color: UAFE_COLORS.textMuted, mb: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: UAFE_COLORS.textPrimary }}>
            Subir minuta (.docx)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            El sistema extraera datos automaticamente (comparecientes, montos, clausulas)
          </Typography>
        </Paper>
      )}

      <Box sx={{ mt: 3, p: 2, backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ffe082' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <WarningAmberIcon sx={{ fontSize: 16, color: '#f57f17' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Proximamente
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#5d4037' }}>
          La subida y extraccion automatica de minutas se habilitara en OLA 2.
          Por ahora, ingrese los datos manualmente en la pestana &quot;Datos del Acto&quot;.
        </Typography>
      </Box>
    </Box>
  );
}

function TextosTab({ protocol }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: UAFE_COLORS.textPrimary, fontSize: '0.85rem' }}>
        Textos Generados
      </Typography>

      {/* Encabezado */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: UAFE_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.63rem' }}>
          Encabezado
        </Typography>
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
            whiteSpace: 'pre-wrap',
            color: UAFE_COLORS.textPrimary,
            backgroundColor: UAFE_COLORS.surface,
            minHeight: 60,
          }}
        >
          {protocol.textoEncabezadoGenerado || (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'inherit' }}>
              No generado aun. Agregue comparecientes para generar el encabezado.
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Comparecencia */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: UAFE_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.63rem' }}>
          Comparecencia
        </Typography>
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
          }}
        >
          {protocol.textoComparecenciaGenerado ? (
            <span dangerouslySetInnerHTML={{ __html: protocol.textoComparecenciaGenerado }} />
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'inherit' }}>
              No generado aun. Agregue comparecientes para generar la comparecencia.
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
  onSendForm,
  readOnly = false,
}) {
  const [tab, setTab] = useState(0);
  const [editedFields, setEditedFields] = useState({});

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
            {hasChanges && !readOnly && (
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  onSave?.(editedFields);
                  setEditedFields({});
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
            <Tab label="Datos del Acto" />
            <Tab label={`Comparecientes (${(protocol.personas || []).length})`} />
            <Tab label="Minuta" />
            <Tab label="Textos Generados" />
          </Tabs>

          <Box sx={{ px: 3, pb: 2 }}>
            <TabPanel value={tab} index={0}>
              <DatosActoTab
                protocol={mergedProtocol}
                onFieldChange={handleFieldChange}
                readOnly={readOnly}
              />
            </TabPanel>
            <TabPanel value={tab} index={1}>
              <ComparecientesTab
                protocol={protocol}
                onAddPerson={onAddPerson}
                onEditPerson={onEditPerson}
                onSendForm={onSendForm}
              />
            </TabPanel>
            <TabPanel value={tab} index={2}>
              <MinutaTab protocol={protocol} />
            </TabPanel>
            <TabPanel value={tab} index={3}>
              <TextosTab protocol={protocol} />
            </TabPanel>
          </Box>
        </Card>
      </Box>

      {/* Sidebar */}
      <CompletitudSidebar protocol={protocol} />
    </Box>
  );
}
