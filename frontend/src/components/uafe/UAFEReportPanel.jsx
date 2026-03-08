import { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Chip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

import SemaforoIndicator from './SemaforoIndicator';
import {
  UAFE_COLORS,
  SEMAFORO,
  MESES,
  formatCurrency,
} from './uafe-constants';

/**
 * UAFEReportPanel - Monthly UAFE report generation dashboard
 *
 * Props:
 *   - stats: { total, completos, pendientes, criticos, errors, warnings }
 *   - onGenerate: (type: 'TRANSACCION' | 'INTERVINIENTE', mes, anio) => void
 *   - loading: boolean
 *   - disabled: boolean
 */
export default function UAFEReportPanel({
  stats = {},
  onGenerate,
  loading = false,
  disabled = false,
}) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth()); // 0-indexed
  const [anio, setAnio] = useState(now.getFullYear());

  const {
    total = 0,
    completos = 0,
    pendientes = 0,
    criticos = 0,
    errors = [],
    warnings = [],
  } = stats;

  const canGenerate = !disabled && completos > 0;

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
      <Box
        sx={{
          p: 2.5,
          borderBottom: `1px solid ${UAFE_COLORS.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 800,
              color: UAFE_COLORS.textPrimary,
              letterSpacing: '-0.01em',
            }}
          >
            Generacion de Reportes UAFE
          </Typography>
          <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted }}>
            TRANSACCION.xlsx + INTERVINIENTE.xlsx
          </Typography>
        </Box>

        {/* Period selector */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel sx={{ fontSize: '0.82rem' }}>Mes</InputLabel>
            <Select
              value={mes}
              label="Mes"
              onChange={(e) => setMes(e.target.value)}
              sx={{ fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '8px' }}
            >
              {MESES.map((m, idx) => (
                <MenuItem key={idx} value={idx}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel sx={{ fontSize: '0.82rem' }}>Ano</InputLabel>
            <Select
              value={anio}
              label="Ano"
              onChange={(e) => setAnio(e.target.value)}
              sx={{ fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '8px' }}
            >
              {[2025, 2026, 2027].map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>
        {/* Summary cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <SummaryBox
            label="Total Protocolos"
            value={total}
            color={UAFE_COLORS.primary}
          />
          <SummaryBox
            label="Completos"
            value={completos}
            color={SEMAFORO.VERDE.color}
            subtitle="Incluidos en reporte"
          />
          <SummaryBox
            label="Pendientes"
            value={pendientes}
            color={SEMAFORO.AMARILLO.color}
            subtitle="Datos parciales"
          />
          <SummaryBox
            label="Criticos"
            value={criticos}
            color={SEMAFORO.ROJO.color}
            subtitle="No incluidos"
          />
        </Box>

        {/* Validation results */}
        {disabled ? (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              borderRadius: '8px',
              '& .MuiAlert-message': { fontSize: '0.82rem' },
            }}
          >
            <AlertTitle sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
              Proximamente - OLA 4
            </AlertTitle>
            La generacion automatica de reportes UAFE se habilitara en la OLA 4 del desarrollo.
            Por ahora, puede revisar el progreso de los protocolos en el dashboard.
          </Alert>
        ) : (
          <>
            {/* Errors */}
            {errors.length > 0 && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: '8px',
                  '& .MuiAlert-message': { fontSize: '0.82rem', width: '100%' },
                }}
              >
                <AlertTitle sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Errores que impiden la generacion ({errors.length})
                </AlertTitle>
                <List dense disablePadding>
                  {errors.map((err, idx) => (
                    <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <ErrorOutlineIcon sx={{ fontSize: 14, color: '#c62828' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={err}
                        slotProps={{ primary: { sx: { fontSize: '0.78rem' } } }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <Alert
                severity="warning"
                sx={{
                  mb: 2,
                  borderRadius: '8px',
                  '& .MuiAlert-message': { fontSize: '0.82rem', width: '100%' },
                }}
              >
                <AlertTitle sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Advertencias ({warnings.length})
                </AlertTitle>
                <List dense disablePadding>
                  {warnings.slice(0, 5).map((warn, idx) => (
                    <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <WarningAmberIcon sx={{ fontSize: 14, color: '#e65100' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={warn}
                        slotProps={{ primary: { sx: { fontSize: '0.78rem' } } }}
                      />
                    </ListItem>
                  ))}
                  {warnings.length > 5 && (
                    <Typography variant="caption" sx={{ color: '#e65100', pl: 3 }}>
                      +{warnings.length - 5} advertencias mas
                    </Typography>
                  )}
                </List>
              </Alert>
            )}
          </>
        )}

        {/* Generate buttons */}
        <Divider sx={{ mb: 2.5 }} />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<TableChartOutlinedIcon />}
            disabled={!canGenerate || loading}
            onClick={() => onGenerate?.('TRANSACCION', mes + 1, anio)}
            sx={{
              flex: 1,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              py: 1.25,
              backgroundColor: UAFE_COLORS.primary,
              borderRadius: '8px',
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 2px 12px rgba(30,90,142,0.3)' },
              '&.Mui-disabled': {
                backgroundColor: UAFE_COLORS.borderLight,
                color: UAFE_COLORS.textMuted,
              },
            }}
          >
            <Box sx={{ textAlign: 'left' }}>
              Generar TRANSACCION.xlsx
              <Typography component="span" sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 400, opacity: 0.8 }}>
                {MESES[mes]} {anio} &middot; {completos} protocolos
              </Typography>
            </Box>
          </Button>

          <Button
            variant="contained"
            startIcon={<DescriptionOutlinedIcon />}
            disabled={!canGenerate || loading}
            onClick={() => onGenerate?.('INTERVINIENTE', mes + 1, anio)}
            sx={{
              flex: 1,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              py: 1.25,
              backgroundColor: '#2e7d32',
              borderRadius: '8px',
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 2px 12px rgba(46,125,50,0.3)' },
              '&.Mui-disabled': {
                backgroundColor: UAFE_COLORS.borderLight,
                color: UAFE_COLORS.textMuted,
              },
            }}
          >
            <Box sx={{ textAlign: 'left' }}>
              Generar INTERVINIENTE.xlsx
              <Typography component="span" sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 400, opacity: 0.8 }}>
                {MESES[mes]} {anio} &middot; Comparecientes
              </Typography>
            </Box>
          </Button>
        </Box>
      </Box>
    </Card>
  );
}

function SummaryBox({ label, value, color, subtitle }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        p: 2,
        borderRadius: '8px',
        border: `1px solid ${UAFE_COLORS.borderLight}`,
        textAlign: 'center',
      }}
    >
      <Typography
        sx={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          fontSize: '0.65rem',
          color: UAFE_COLORS.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          display: 'block',
          mt: 0.5,
        }}
      >
        {label}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: UAFE_COLORS.textMuted }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}
