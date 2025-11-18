import React from 'react'
import { Box, Switch, Tooltip, Typography } from '@mui/material'
import { Brightness4, Brightness7, BrightnessAuto } from '@mui/icons-material'
import { useThemeCtx } from '../contexts/theme-ctx'

/**
 * Toggle de tema con soporte para:
 * - Modo normal: light | dark | system (ciclo system→light→dark)
 * - Modo sin "system": solo light | dark (para CAJA)
 *
 * Props:
 * - noSystem?: boolean → si true, se limita a alternar light/dark
 */
function ThemeToggle({ noSystem = false }) {
  const { mode, resolvedIsDark, setMode, cycleMode } = useThemeCtx()

  const label = noSystem
    ? (resolvedIsDark ? 'Oscuro' : 'Claro')
    : (mode === 'system' ? 'Sistema' : (resolvedIsDark ? 'Oscuro' : 'Claro'))

  const LeftIcon = noSystem
    ? Brightness7
    : (mode === 'system' ? BrightnessAuto : Brightness7)

  const RightIcon = Brightness4

  const handleClick = (event) => {
    event.preventDefault()
    if (noSystem) {
      // Alternar solo entre light y dark (sin pasar por system)
      setMode(resolvedIsDark ? 'light' : 'dark')
    } else {
      cycleMode()
    }
  }

  return (
    <Tooltip title="Cambiar tema" placement="bottom">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'action.hover',
          borderRadius: 3,
          padding: '4px 8px',
          border: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'action.selected',
            borderColor: 'primary.main',
            transform: 'scale(1.02)'
          }
        }}
        onClick={handleClick}
        aria-label="Cambiar tema"
        role="button"
      >
        {/* Icono izquierdo (light o system) */}
        <LeftIcon
          sx={{
            fontSize: 16,
            color: resolvedIsDark ? 'text.secondary' : 'warning.main',
            transition: 'color 0.2s ease-in-out'
          }}
        />
        
        {/* Switch visual (refleja el modo resuelto) */}
        <Switch
          checked={resolvedIsDark}
          onChange={() => {
            // Evitar doble toggle; el Box maneja el click
          }}
          size="small"
          sx={{
            width: 42,
            height: 26,
            padding: 0,
            '& .MuiSwitch-switchBase': {
              padding: 0,
              margin: '2px',
              transitionDuration: '300ms',
              '&.Mui-checked': {
                transform: 'translateX(16px)',
                color: '#fff',
                '& + .MuiSwitch-track': {
                  backgroundColor: 'primary.main',
                  opacity: 1,
                  border: 0,
                },
              },
            },
            '& .MuiSwitch-thumb': {
              boxSizing: 'border-box',
              width: 22,
              height: 22,
              pointerEvents: 'none',
            },
            '& .MuiSwitch-track': {
              borderRadius: 26 / 2,
              backgroundColor: 'action.disabled',
              opacity: 1,
              transition: 'background-color 300ms ease',
              pointerEvents: 'none',
            },
          }}
        />
        
        {/* Icono modo oscuro */}
        <RightIcon
          sx={{
            fontSize: 16,
            color: resolvedIsDark ? 'primary.main' : 'text.secondary',
            transition: 'color 0.2s ease-in-out'
          }}
        />
        
        {/* Texto opcional (oculto en pantallas pequeñas) */}
        <Typography
          variant="caption"
          sx={{
            display: { xs: 'none', md: 'block' },
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 500,
            minWidth: 'fit-content'
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  )
}

export default ThemeToggle