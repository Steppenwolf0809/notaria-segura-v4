import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import apiClient from '../../services/api-client';
import {
  UAFE_COLORS,
  TIPOS_ACTO_UAFE,
  TIPOS_BIEN,
  CALIDADES_COMPARECIENTE,
  formatCurrency,
} from './uafe-constants';

/**
 * UAFEMinutaUpload - Upload minuta Word, preview extracted data, confirm
 *
 * Flow: Upload .docx -> Parse (regex+Gemini) -> Preview -> Edit -> Confirm
 */
export default function UAFEMinutaUpload({ protocoloId, onComplete, onCancel }) {
  const [step, setStep] = useState('upload'); // upload | parsing | preview | confirming | done
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [minutaUrl, setMinutaUrl] = useState(null);
  const [fuente, setFuente] = useState(null);
  const [editingField, setEditingField] = useState(null);

  // ── Upload & Parse ─────────────────────────────────────────────
  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.docx')) {
      setError('Solo se permiten archivos Word (.docx)');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10MB');
      return;
    }

    setFile(selected);
    setError(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setStep('parsing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('minuta', file);

      const { data } = await apiClient.post(
        `/formulario-uafe/protocolo/${protocoloId}/upload-minuta`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }
      );

      if (data.success) {
        setExtractedData(data.data.datosExtraidos);
        setMinutaUrl(data.data.minutaUrl);
        setFuente(data.data.fuente);
        setStep('preview');
      } else {
        throw new Error(data.error || 'Error al procesar');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Error al subir la minuta');
      setStep('upload');
    }
  }, [file, protocoloId]);

  // ── Confirm ────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    setStep('confirming');
    setError(null);

    try {
      const { data } = await apiClient.post(
        `/formulario-uafe/protocolo/${protocoloId}/confirmar-minuta`,
        { minutaUrl, datosConfirmados: extractedData }
      );

      if (data.success) {
        setStep('done');
        onComplete?.(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Confirm error:', err);
      setError(err.response?.data?.error || err.message || 'Error al confirmar');
      setStep('preview');
    }
  }, [protocoloId, minutaUrl, extractedData, onComplete]);

  // ── Edit helpers ───────────────────────────────────────────────
  const updateField = (field, value) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  const updateCompareciente = (index, field, value) => {
    setExtractedData(prev => {
      const comps = [...(prev.comparecientes || [])];
      comps[index] = { ...comps[index], [field]: value };
      return { ...prev, comparecientes: comps };
    });
  };

  const removeCompareciente = (index) => {
    setExtractedData(prev => ({
      ...prev,
      comparecientes: prev.comparecientes.filter((_, i) => i !== index),
    }));
  };

  // ── Render: Upload Step ────────────────────────────────────────
  if (step === 'upload') {
    return (
      <Paper
        sx={{
          p: 4,
          border: `2px dashed ${UAFE_COLORS.border}`,
          borderRadius: '12px',
          textAlign: 'center',
          backgroundColor: UAFE_COLORS.surface,
        }}
      >
        <CloudUploadOutlinedIcon
          sx={{ fontSize: 48, color: UAFE_COLORS.primary, mb: 2 }}
        />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: UAFE_COLORS.textPrimary }}>
          Subir Minuta Word
        </Typography>
        <Typography variant="body2" sx={{ color: UAFE_COLORS.textSecondary, mb: 3 }}>
          Seleccione el archivo .docx de la minuta. El sistema extraera automaticamente
          los datos de comparecientes, cuantia y tipo de acto.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<DescriptionOutlinedIcon />}
            sx={{ textTransform: 'none' }}
          >
            {file ? file.name : 'Seleccionar archivo'}
            <input
              type="file"
              hidden
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
            />
          </Button>

          {file && (
            <Button
              variant="contained"
              onClick={handleUpload}
              startIcon={<CloudUploadOutlinedIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                backgroundColor: UAFE_COLORS.primary,
                '&:hover': { backgroundColor: UAFE_COLORS.primaryDark },
              }}
            >
              Procesar Minuta
            </Button>
          )}
        </Box>

        {file && (
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: UAFE_COLORS.textMuted }}>
            {(file.size / 1024).toFixed(0)} KB
          </Typography>
        )}

        {onCancel && (
          <Button
            onClick={onCancel}
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 2, textTransform: 'none', color: UAFE_COLORS.textSecondary }}
          >
            Cancelar
          </Button>
        )}
      </Paper>
    );
  }

  // ── Render: Parsing Step ───────────────────────────────────────
  if (step === 'parsing') {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
        <CircularProgress size={48} sx={{ color: UAFE_COLORS.primary, mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Procesando minuta...
        </Typography>
        <Typography variant="body2" sx={{ color: UAFE_COLORS.textSecondary }}>
          Extrayendo datos del documento. Esto puede tomar unos segundos.
        </Typography>
      </Paper>
    );
  }

  // ── Render: Confirming Step ────────────────────────────────────
  if (step === 'confirming') {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
        <CircularProgress size={48} sx={{ color: UAFE_COLORS.primary, mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Guardando datos...
        </Typography>
      </Paper>
    );
  }

  // ── Render: Done Step ──────────────────────────────────────────
  if (step === 'done') {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#2e7d32', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Datos guardados exitosamente
        </Typography>
        <Typography variant="body2" sx={{ color: UAFE_COLORS.textSecondary }}>
          Los comparecientes y datos del acto han sido registrados en el protocolo.
        </Typography>
      </Paper>
    );
  }

  // ── Render: Preview Step ───────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: UAFE_COLORS.textPrimary }}>
            Datos Extraidos de la Minuta
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
            <Chip
              label="Extraccion automatica"
              size="small"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
              }}
            />
            <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted }}>
              Revise y corrija los datos antes de confirmar
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={() => { setStep('upload'); setFile(null); setExtractedData(null); }}
            startIcon={<ArrowBackIcon />}
            sx={{ textTransform: 'none', color: UAFE_COLORS.textSecondary }}
          >
            Volver
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            startIcon={<CheckCircleOutlineIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#2e7d32',
              '&:hover': { backgroundColor: '#1b5e20' },
            }}
          >
            Confirmar y Guardar
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Datos del Acto */}
      <Paper sx={{ p: 2.5, borderRadius: '10px', border: `1px solid ${UAFE_COLORS.border}` }}>
        <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: UAFE_COLORS.textMuted }}>
          Datos del Acto
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mt: 1.5 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Tipo de Acto</InputLabel>
            <Select
              value={extractedData?.codigoActo || ''}
              label="Tipo de Acto"
              onChange={(e) => {
                const acto = TIPOS_ACTO_UAFE.find(a => a.codigo === e.target.value);
                updateField('codigoActo', e.target.value);
                if (acto) updateField('tipoActo', acto.descripcion);
              }}
            >
              {TIPOS_ACTO_UAFE.map(a => (
                <MenuItem key={a.codigo} value={a.codigo}>{a.codigo} - {a.descripcion}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Cuantia (USD)"
            type="number"
            value={extractedData?.cuantia ?? ''}
            onChange={(e) => updateField('cuantia', parseFloat(e.target.value) || null)}
          />

          <TextField
            size="small"
            label="Avaluo Municipal (USD)"
            type="number"
            value={extractedData?.avaluoMunicipal ?? ''}
            onChange={(e) => updateField('avaluoMunicipal', parseFloat(e.target.value) || null)}
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Tipo de Bien</InputLabel>
            <Select
              value={extractedData?.tipoBien || ''}
              label="Tipo de Bien"
              onChange={(e) => updateField('tipoBien', e.target.value)}
            >
              {TIPOS_BIEN.map(b => (
                <MenuItem key={b.codigo} value={b.codigo}>{b.codigo} - {b.descripcion}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Descripcion del Bien"
            value={extractedData?.descripcionBien || ''}
            onChange={(e) => updateField('descripcionBien', e.target.value)}
            sx={{ gridColumn: 'span 2' }}
          />
        </Box>
      </Paper>

      {/* Comparecientes */}
      <Paper sx={{ p: 2.5, borderRadius: '10px', border: `1px solid ${UAFE_COLORS.border}` }}>
        <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: UAFE_COLORS.textMuted }}>
          Comparecientes ({extractedData?.comparecientes?.length || 0})
        </Typography>

        {(!extractedData?.comparecientes || extractedData.comparecientes.length === 0) ? (
          <Alert severity="warning" sx={{ mt: 1 }}>
            No se encontraron comparecientes. Puede agregarlos manualmente desde el detalle del protocolo.
          </Alert>
        ) : (
          <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Cedula</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Nombres</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Apellidos</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Calidad</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Actua Por</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Estado Civil</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Telefono</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="center">Acc.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {extractedData.comparecientes.map((comp, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      <TextField
                        size="small"
                        variant="standard"
                        value={comp.cedula || ''}
                        onChange={(e) => updateCompareciente(idx, 'cedula', e.target.value)}
                        sx={{ width: 110 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        variant="standard"
                        value={comp.nombres || ''}
                        onChange={(e) => updateCompareciente(idx, 'nombres', e.target.value)}
                        sx={{ width: 140 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        variant="standard"
                        value={comp.apellidos || ''}
                        onChange={(e) => updateCompareciente(idx, 'apellidos', e.target.value)}
                        sx={{ width: 140 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        variant="standard"
                        value={comp.calidad || 'OTRO'}
                        onChange={(e) => updateCompareciente(idx, 'calidad', e.target.value)}
                        sx={{ fontSize: '0.8rem', minWidth: 100 }}
                      >
                        {CALIDADES_COMPARECIENTE.map(c => (
                          <MenuItem key={c} value={c} sx={{ fontSize: '0.8rem' }}>{c}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        variant="standard"
                        value={comp.actuaPor || 'PROPIOS_DERECHOS'}
                        onChange={(e) => updateCompareciente(idx, 'actuaPor', e.target.value)}
                        sx={{ fontSize: '0.8rem', minWidth: 120 }}
                      >
                        <MenuItem value="PROPIOS_DERECHOS" sx={{ fontSize: '0.8rem' }}>Propios Derechos</MenuItem>
                        <MenuItem value="APODERADO_GENERAL" sx={{ fontSize: '0.8rem' }}>Apoderado General</MenuItem>
                        <MenuItem value="APODERADO_ESPECIAL" sx={{ fontSize: '0.8rem' }}>Apoderado Especial</MenuItem>
                        <MenuItem value="REPRESENTANTE_LEGAL" sx={{ fontSize: '0.8rem' }}>Representante Legal</MenuItem>
                        <MenuItem value="REPRESENTANTE_MENOR" sx={{ fontSize: '0.8rem' }}>Representante Menor</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        variant="standard"
                        value={comp.estadoCivil || ''}
                        onChange={(e) => updateCompareciente(idx, 'estadoCivil', e.target.value)}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        variant="standard"
                        value={comp.telefono || ''}
                        onChange={(e) => updateCompareciente(idx, 'telefono', e.target.value)}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Eliminar compareciente">
                        <IconButton size="small" onClick={() => removeCompareciente(idx)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Forma de Pago */}
      {extractedData?.formaPago && extractedData.formaPago.length > 0 && (
        <Paper sx={{ p: 2.5, borderRadius: '10px', border: `1px solid ${UAFE_COLORS.border}` }}>
          <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: UAFE_COLORS.textMuted }}>
            Forma de Pago
          </Typography>
          <Box sx={{ mt: 1 }}>
            {extractedData.formaPago.map((fp, idx) => (
              <Chip
                key={idx}
                label={`${fp.tipo}: ${formatCurrency(fp.monto)} ${fp.detalle ? `(${fp.detalle})` : ''}`}
                sx={{ mr: 1, mb: 1, fontSize: '0.78rem' }}
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
