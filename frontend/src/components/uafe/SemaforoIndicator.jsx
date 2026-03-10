import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { SEMAFORO, ESTADOS_PERSONA, getUAFEColors } from './uafe-constants';

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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const config = SEMAFORO[level] || SEMAFORO.ROJO;

  const tooltipProps = {
    slotProps: {
      tooltip: {
        sx: {
          maxWidth: 380,
          maxHeight: 400,
          overflowY: 'auto',
          backgroundColor: 'rgba(33, 33, 33, 0.96)',
          color: '#fff',
          p: 1.5,
        },
      },
    },
  };

  const tooltipContent = missingFields.length > 0 ? (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: '#fff' }}>
        {config.description}
      </Typography>
      {missingFields.map((field, i) => (
        <Typography key={i} variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>
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
      <Tooltip title={tooltipContent} arrow placement="top" {...tooltipProps}>
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
      <Tooltip title={tooltipContent} arrow placement="top" {...tooltipProps}>
        {badge}
      </Tooltip>
    ) : badge;
  }

  // Default: chip variant
  const chipBg = isDark ? `${config.color}22` : config.bg;
  const chipBorder = isDark ? `${config.color}44` : config.border;
  const chip = (
    <Chip
      size={size}
      label={config.label}
      sx={{
        backgroundColor: chipBg,
        color: config.color,
        borderColor: chipBorder,
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
    <Tooltip title={tooltipContent} arrow placement="top" {...tooltipProps}>
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
