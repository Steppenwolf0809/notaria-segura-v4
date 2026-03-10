import { Box, Typography, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ESTADOS_PROTOCOLO, ESTADOS_PROTOCOLO_FLOW, UAFE_COLORS as UAFE_COLORS_STATIC, getUAFEColors } from './uafe-constants';

/**
 * UAFEStatusPipeline - Visual state flow indicator
 *
 * Shows: BORRADOR -> EN_PROCESO -> PEND. PROTOCOLO -> COMPLETO -> REPORTADO
 *
 * Two modes:
 *   - summary: Shows counts per state (dashboard header)
 *   - indicator: Highlights current state for a single protocol
 *
 * Props:
 *   - mode: 'summary' | 'indicator'
 *   - counts: { BORRADOR: n, EN_PROCESO: n, ... } (for summary mode)
 *   - currentState: string (for indicator mode)
 */
export default function UAFEStatusPipeline({
  mode = 'summary',
  counts = {},
  currentState = null,
}) {
  const theme = useTheme();
  const UAFE_COLORS = getUAFEColors(theme.palette.mode === 'dark');
  const states = ESTADOS_PROTOCOLO_FLOW.map((key) => ESTADOS_PROTOCOLO[key]);

  if (mode === 'indicator') {
    const currentIdx = ESTADOS_PROTOCOLO_FLOW.indexOf(currentState);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {states.map((state, idx) => {
          const isActive = idx === currentIdx;
          const isPast = idx < currentIdx;

          return (
            <Box key={state.key} sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Step node */}
              <Tooltip title={state.description} arrow>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '6px',
                    backgroundColor: isActive ? state.bg : isPast ? `${state.color}10` : 'transparent',
                    border: isActive ? `1.5px solid ${state.color}` : '1.5px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isActive || isPast ? state.color : UAFE_COLORS.border,
                      transition: 'background-color 0.2s ease',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? state.color : isPast ? state.color : UAFE_COLORS.textMuted,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {state.label}
                  </Typography>
                </Box>
              </Tooltip>

              {/* Connector arrow */}
              {idx < states.length - 1 && (
                <Box
                  sx={{
                    width: 20,
                    height: 1,
                    backgroundColor: isPast ? state.color : UAFE_COLORS.border,
                    position: 'relative',
                    mx: 0.25,
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      right: 0,
                      top: -3,
                      border: `3px solid transparent`,
                      borderLeftColor: isPast ? state.color : UAFE_COLORS.border,
                    },
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  // Summary mode: horizontal bar with counts
  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <Box>
      {/* Bar segments */}
      <Box
        sx={{
          display: 'flex',
          height: 6,
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: UAFE_COLORS.borderLight,
          mb: 1.5,
        }}
      >
        {states.map((state) => {
          const count = counts[state.key] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <Tooltip key={state.key} title={`${state.label}: ${count}`} arrow>
              <Box
                sx={{
                  width: `${pct}%`,
                  backgroundColor: state.color,
                  transition: 'width 0.5s ease',
                  minWidth: count > 0 ? 4 : 0,
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      {/* Labels */}
      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
        {states.map((state) => {
          const count = counts[state.key] || 0;
          return (
            <Box key={state.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: state.color,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.68rem',
                  color: UAFE_COLORS.textSecondary,
                  fontWeight: 500,
                }}
              >
                {state.label}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: UAFE_COLORS.textPrimary,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
