import { Box, Card, Typography, Skeleton } from '@mui/material';
import { UAFE_COLORS, SEMAFORO } from './uafe-constants';

const kpiCardStyles = {
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '10px',
    border: `1px solid ${UAFE_COLORS.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    p: 2.5,
    flex: 1,
    minWidth: 160,
    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      transform: 'translateY(-1px)',
    },
  },
};

function KPICard({ label, value, accentColor, subtitle, loading }) {
  return (
    <Card sx={kpiCardStyles.card} elevation={0}>
      {/* Left accent bar */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: accentColor,
          borderRadius: '10px 0 0 10px',
        }}
      />
      <Typography
        variant="overline"
        sx={{
          color: UAFE_COLORS.textSecondary,
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          lineHeight: 1.2,
          display: 'block',
          mb: 0.75,
        }}
      >
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width={60} height={36} />
      ) : (
        <Typography
          sx={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: UAFE_COLORS.textPrimary,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
      )}
      {subtitle && (
        <Typography
          variant="caption"
          sx={{
            color: UAFE_COLORS.textMuted,
            fontSize: '0.68rem',
            mt: 0.5,
            display: 'block',
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Card>
  );
}

/**
 * UAFEKPICards - Summary KPI cards for the UAFE dashboard
 *
 * Props:
 *   - stats: { total, completos, pendientes, criticos, completitud }
 *   - loading: boolean
 */
export default function UAFEKPICards({ stats = {}, loading = false }) {
  const {
    total = 0,
    completos = 0,
    pendientes = 0,
    criticos = 0,
    completitud = 0,
  } = stats;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <KPICard
        label="Protocolos del Mes"
        value={total}
        accentColor={UAFE_COLORS.primary}
        loading={loading}
      />
      <KPICard
        label="Completos"
        value={completos}
        accentColor={SEMAFORO.VERDE.color}
        subtitle="Listos para reporte"
        loading={loading}
      />
      <KPICard
        label="Pendientes"
        value={pendientes}
        accentColor={SEMAFORO.AMARILLO.color}
        subtitle="Datos parciales"
        loading={loading}
      />
      <KPICard
        label="Criticos"
        value={criticos}
        accentColor={SEMAFORO.ROJO.color}
        subtitle="Faltan datos obligatorios"
        loading={loading}
      />
      <KPICard
        label="Completitud"
        value={`${completitud}%`}
        accentColor={completitud >= 80 ? SEMAFORO.VERDE.color : completitud >= 50 ? SEMAFORO.AMARILLO.color : SEMAFORO.ROJO.color}
        loading={loading}
      />
    </Box>
  );
}
