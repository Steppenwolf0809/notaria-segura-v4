import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { SEMAFORO, ESTADOS_PERSONA } from './uafe-constants';

/**
 * SemaforoIndicator - Reusable compliance status indicator
 *
 * Variants:
 *   - "dot"    : Small colored circle (for inline/table use)
 *   - "chip"   : MUI Chip with label (for cards/headers)
 *   - "badge"  : Dot + label text (for lists)
 *
 * Props:
 *   - level: 'ROJO' | 'AMARILLO' | 'VERDE'
 *   - variant: 'dot' | 'chip' | 'badge' (default: 'chip')
 *   - missingFields: string[] - shown in tooltip
 *   - size: 'small' | 'medium' (default: 'small')
 *   - showTooltip: boolean (default: true)
 *   - pulsate: boolean - animate red indicators (default: false)
 */
export default function SemaforoIndicator({
  level = 'ROJO',
  variant = 'chip',
  missingFields = [],
  size = 'small',
  showTooltip = true,
  pulsate = false,
  sx = {},
}) {
  const config = SEMAFORO[level] || SEMAFORO.ROJO;

  const tooltipContent = missingFields.length > 0 ? (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {config.description}
      </Typography>
      {missingFields.map((field, i) => (
        <Typography key={i} variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
          &bull; {field}
        </Typography>
      ))}
    </Box>
  ) : config.description;

  const dotSize = size === 'small' ? 10 : 14;

  const pulsateKeyframes = pulsate && level === 'ROJO' ? {
    '@keyframes semaforoPulse': {
      '0%, 100%': { boxShadow: `0 0 0 0 ${config.color}40` },
      '50%': { boxShadow: `0 0 0 4px ${config.color}20` },
    },
    animation: 'semaforoPulse 2s ease-in-out infinite',
  } : {};

  const dot = (
    <Box
      sx={{
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        backgroundColor: config.color,
        flexShrink: 0,
        ...pulsateKeyframes,
        ...sx,
      }}
    />
  );

  if (variant === 'dot') {
    return showTooltip ? (
      <Tooltip title={tooltipContent} arrow placement="top">
        {dot}
      </Tooltip>
    ) : dot;
  }

  if (variant === 'badge') {
    const badge = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ...sx }}>
        {dot}
        <Typography
          variant="caption"
          sx={{
            color: config.color,
            fontWeight: 600,
            fontSize: size === 'small' ? '0.7rem' : '0.8rem',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          {config.label}
        </Typography>
      </Box>
    );

    return showTooltip ? (
      <Tooltip title={tooltipContent} arrow placement="top">
        {badge}
      </Tooltip>
    ) : badge;
  }

  // Default: chip variant
  const chip = (
    <Chip
      size={size}
      label={config.label}
      sx={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
        border: '1px solid',
        fontWeight: 600,
        fontSize: '0.7rem',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        height: size === 'small' ? 24 : 28,
        '& .MuiChip-label': {
          px: 1,
        },
        ...sx,
      }}
    />
  );

  return showTooltip ? (
    <Tooltip title={tooltipContent} arrow placement="top">
      {chip}
    </Tooltip>
  ) : chip;
}

/**
 * SemaforoPersona - Semaphore specifically for person completeness
 */
export function SemaforoPersona({ estadoCompletitud, camposFaltantes = [], ...props }) {
  const estado = ESTADOS_PERSONA[estadoCompletitud] || ESTADOS_PERSONA.pendiente;
  return (
    <SemaforoIndicator
      level={estado.semaforo}
      missingFields={camposFaltantes}
      {...props}
    />
  );
}
