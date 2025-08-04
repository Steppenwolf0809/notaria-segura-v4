import React from 'react'
import { Box, Switch, Tooltip, Typography } from '@mui/material'
import { Brightness4, Brightness7 } from '@mui/icons-material'
import useThemeStore from '../store/theme-store'

/**
 * Componente toggle moderno para alternar entre modo claro y oscuro
 * Toggle switch con iconos y estado visual claro
 */
function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useThemeStore()
  
  return (
    <Tooltip 
      title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      placement="bottom"
    >
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
        onClick={(event) => {
          console.log('Box clicked'); // Debug
          // Prevenir propagación para evitar doble click
          event.preventDefault();
          toggleTheme();
        }}
      >
        {/* Icono modo claro */}
        <Brightness7 
          sx={{ 
            fontSize: 16, 
            color: isDarkMode ? 'text.secondary' : 'warning.main',
            transition: 'color 0.2s ease-in-out'
          }} 
        />
        
        {/* Switch toggle */}
        <Switch
          checked={isDarkMode}
          onChange={(event, checked) => {
            console.log('Switch clicked:', checked); // Debug
            // Permitir que el evento se propague al contenedor padre
            // No llamamos toggleTheme aquí para evitar doble toggle
          }}
          size="small"
          sx={{
            width: 42,
            height: 26,
            padding: 0,
            // Hacer que el switch sea completamente clickeable
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
              pointerEvents: 'none', // Permitir que el click pase al contenedor
            },
            '& .MuiSwitch-track': {
              borderRadius: 26 / 2,
              backgroundColor: 'action.disabled',
              opacity: 1,
              transition: 'background-color 300ms ease',
              pointerEvents: 'none', // Permitir que el click pase al contenedor
            },
          }}
        />
        
        {/* Icono modo oscuro */}
        <Brightness4 
          sx={{ 
            fontSize: 16, 
            color: isDarkMode ? 'primary.main' : 'text.secondary',
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
          {isDarkMode ? 'Oscuro' : 'Claro'}
        </Typography>
      </Box>
    </Tooltip>
  )
}

export default ThemeToggle 