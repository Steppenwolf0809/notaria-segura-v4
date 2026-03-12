import { useState, useCallback } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useTheme } from '@mui/material/styles';
import { getUAFEColors, TIPOS_ACTO_UAFE, formatCurrency, MESES } from './uafe-constants';
import apiClient from '../../services/api-client';

function getLabelActo(codigo) {
  const found = TIPOS_ACTO_UAFE.find(t => t.codigo === codigo);
  return found ? `${codigo} - ${found.descripcion}` : codigo || 'Sin clasificar';
}

function formatParticipantes(otorga = [], aFavorDe = []) {
  const parts = [];
  otorga.forEach(p => parts.push(`${p.nombre || 'S/N'} (${p.cedula || '?'})`));
  aFavorDe.forEach(p => parts.push(`${p.nombre || 'S/N'} (${p.cedula || '?'})`));
  return parts.join(', ') || 'Sin comparecientes';
}

export default function UAFEIndiceCruce() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const UAFE_COLORS = getUAFEColors(isDark);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResultado(null);
      setError(null);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('indice', file);
      const { data } = await apiClient.post('/formulario-uafe/indice/cruce', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.success) {
        setResultado(data.data);
      } else {
        setError(data.error || 'Error al procesar');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al subir archivo');
    } finally {
      setLoading(false);
    }
  }, [file]);

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${UAFE_COLORS.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${UAFE_COLORS.borderLight}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CompareArrowsIcon sx={{ color: UAFE_COLORS.primary }} />
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: UAFE_COLORS.textPrimary }}>
              Cruce Indice del Consejo
            </Typography>
            <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted }}>
              Sube el indice mensual del Consejo de la Judicatura para verificar que todos los actos reportables esten en el sistema
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>
        {/* Upload zone */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileOutlinedIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: UAFE_COLORS.primary,
              color: UAFE_COLORS.primary,
              borderRadius: '8px',
            }}
          >
            {file ? file.name : 'Seleccionar archivo Excel'}
            <input type="file" hidden accept=".xlsx,.xls" onChange={handleFileChange} />
          </Button>

          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CompareArrowsIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: UAFE_COLORS.primary,
              borderRadius: '8px',
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 2px 12px rgba(30,90,142,0.3)' },
            }}
          >
            {loading ? 'Procesando...' : 'Ejecutar Cruce'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
            {error}
          </Alert>
        )}

        {/* Results */}
        {resultado && (
          <Box>
            {/* Summary */}
            <Alert
              severity="info"
              sx={{ mb: 2, borderRadius: '8px', '& .MuiAlert-message': { fontSize: '0.85rem' } }}
            >
              <AlertTitle sx={{ fontWeight: 700 }}>
                Resultado del cruce - {MESES[(resultado.mes || 1) - 1]} {resultado.anio}
              </AlertTitle>
              Del indice: <strong>{resultado.totalEscrituras}</strong> escrituras con actos reportables,{' '}
              <strong>{resultado.totalActosReportables}</strong> actos UAFE detectados
            </Alert>

            {/* Summary chips */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircleOutlineIcon />}
                label={`${resultado.coincidencias.length} Coincidencias`}
                color="success"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                icon={<ErrorOutlineIcon />}
                label={`${resultado.faltantes.length} Faltantes en UAFE`}
                color="error"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                icon={<WarningAmberIcon />}
                label={`${resultado.extras.length} Extras en UAFE`}
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            {/* Faltantes - most important, show first */}
            {resultado.faltantes.length > 0 && (
              <Accordion defaultExpanded sx={{ mb: 1, borderRadius: '8px !important', border: `1px solid ${UAFE_COLORS.border}`, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorOutlineIcon sx={{ color: '#d32f2f', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: UAFE_COLORS.textPrimary }}>
                      Faltantes en UAFE ({resultado.faltantes.length})
                    </Typography>
                    <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted }}>
                      Actos en el indice que no estan en el sistema
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <ResultTable rows={resultado.faltantes} type="faltante" UAFE_COLORS={UAFE_COLORS} />
                </AccordionDetails>
              </Accordion>
            )}

            {/* Coincidencias */}
            {resultado.coincidencias.length > 0 && (
              <Accordion sx={{ mb: 1, borderRadius: '8px !important', border: `1px solid ${UAFE_COLORS.border}`, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlineIcon sx={{ color: '#2e7d32', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: UAFE_COLORS.textPrimary }}>
                      Coincidencias ({resultado.coincidencias.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <ResultTable rows={resultado.coincidencias} type="coincidencia" UAFE_COLORS={UAFE_COLORS} />
                </AccordionDetails>
              </Accordion>
            )}

            {/* Extras */}
            {resultado.extras.length > 0 && (
              <Accordion sx={{ mb: 1, borderRadius: '8px !important', border: `1px solid ${UAFE_COLORS.border}`, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmberIcon sx={{ color: '#ed6c02', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: UAFE_COLORS.textPrimary }}>
                      Extras en UAFE ({resultado.extras.length})
                    </Typography>
                    <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted }}>
                      Protocolos en el sistema sin correspondencia en el indice
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <ExtrasTable rows={resultado.extras} UAFE_COLORS={UAFE_COLORS} />
                </AccordionDetails>
              </Accordion>
            )}

            {resultado.faltantes.length === 0 && resultado.extras.length === 0 && (
              <Alert severity="success" sx={{ borderRadius: '8px', mt: 1 }}>
                Todos los actos reportables del indice coinciden con los protocolos UAFE. No hay faltantes ni extras.
              </Alert>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
}

function ResultTable({ rows, type, UAFE_COLORS }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.72rem', color: UAFE_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
            <TableCell>Escritura</TableCell>
            <TableCell>Tipo Acto</TableCell>
            <TableCell>Comparecientes</TableCell>
            <TableCell align="right">Cuantia</TableCell>
            {type === 'coincidencia' && <TableCell>Match</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx} sx={{ '&:last-child td': { borderBottom: 0 } }}>
              <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace' }}>
                {row.numeroEscritura}
              </TableCell>
              <TableCell sx={{ fontSize: '0.78rem' }}>
                <Tooltip title={row.descripcionActo} arrow>
                  <Chip
                    label={getLabelActo(row.codigoUAFE)}
                    size="small"
                    sx={{ fontSize: '0.68rem', fontWeight: 600, maxWidth: 280 }}
                  />
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem', maxWidth: 300 }}>
                {formatParticipantes(row.otorga, row.aFavorDe)}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {row.cuantia != null ? formatCurrency(row.cuantia) : '-'}
              </TableCell>
              {type === 'coincidencia' && (
                <TableCell>
                  <Chip
                    label={row.matchTipo === 'numero_escritura' ? 'No. escritura' : 'Cedula + tipo'}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem' }}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ExtrasTable({ rows, UAFE_COLORS }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.72rem', color: UAFE_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
            <TableCell>No. Protocolo</TableCell>
            <TableCell>Tipo Acto</TableCell>
            <TableCell>Comparecientes</TableCell>
            <TableCell align="right">Cuantia</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx} sx={{ '&:last-child td': { borderBottom: 0 } }}>
              <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace' }}>
                {row.numeroProtocolo || '-'}
              </TableCell>
              <TableCell sx={{ fontSize: '0.78rem' }}>
                <Chip
                  label={getLabelActo(row.tipoActo)}
                  size="small"
                  sx={{ fontSize: '0.68rem', fontWeight: 600 }}
                />
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem', maxWidth: 300 }}>
                {row.personas?.map(p => `${p.nombre} (${p.cedula})`).join(', ') || '-'}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {row.valorContrato != null ? formatCurrency(row.valorContrato) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
