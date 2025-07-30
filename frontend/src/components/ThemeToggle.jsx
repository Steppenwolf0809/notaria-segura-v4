import React from 'react'
import { IconButton, Tooltip } from '@mui/material'
import { Brightness4, Brightness7 } from '@mui/icons-material'
import useThemeStore from '../store/theme-store'

/**
 * Componente para alternar entre modo claro y oscuro
 * Muestra iconos diferentes según el modo actual
 */
function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useThemeStore()
  
  return (
    <Tooltip 
      title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      placement="bottom"
    >
      <IconButton 
        onClick={toggleTheme} 
        color="inherit"
        sx={{
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)'
          }
        }}
      >
        {isDarkMode ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  )
}

export default ThemeToggle 