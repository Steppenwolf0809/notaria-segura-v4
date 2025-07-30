import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import useThemeStore from './store/theme-store'

/**
 * Componente que envuelve la aplicación con el tema dinámico
 * Escucha cambios en el store de temas y actualiza el ThemeProvider
 */
function AppWithTheme() {
  const { isDarkMode } = useThemeStore()
  
  // Configuración del tema con soporte para modo claro y oscuro
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#6B9EEA' : '#468BE6', // Azul más suave en modo oscuro
        light: isDarkMode ? '#93BFEF' : '#93BFEF', // Azul secundario
        dark: isDarkMode ? '#4A7BC8' : '#1A5799', // Azul oscuro secundario
      },
      background: {
        default: isDarkMode ? '#121212' : '#E9F5FF', // Fondo oscuro Material vs claro
        paper: isDarkMode ? '#1E1E1E' : '#FFFFFF', // Superficies (cards, papers)
      },
      text: {
        primary: isDarkMode ? '#FFFFFF' : '#1F1F1F', // Texto claro vs oscuro
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
    },
  })
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithTheme />
  </React.StrictMode>,
)
