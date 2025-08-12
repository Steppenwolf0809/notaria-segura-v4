import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import useThemeStore from './store/theme-store'

/**
 * Componente que envuelve la aplicación con el tema dinámico
 * Escucha cambios en el store de temas y actualiza el ThemeProvider
 * 
 * TEMA ENTERPRISE: Configuración profesional para modo oscuro nivel empresa
 */
function AppWithTheme() {
  const { isDarkMode } = useThemeStore()
  
  // Aplicar atributo data-theme al body para variables CSS
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])
  
  /**
   * CONFIGURACIÓN DE TEMA ENTERPRISE
   * Paleta de colores profesional optimizada para credibilidad y legibilidad
   */
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      
      // COLORES PRIMARIOS ENTERPRISE
      primary: {
        main: isDarkMode ? '#3b82f6' : '#468BE6',     // Azul profesional para modo oscuro
        light: isDarkMode ? '#60a5fa' : '#93BFEF',    // Azul claro elegante
        dark: isDarkMode ? '#1d4ed8' : '#1A5799',     // Azul oscuro corporativo
        contrastText: '#ffffff'
      },
      
      // COLORES SECUNDARIOS ENTERPRISE
      secondary: {
        main: isDarkMode ? '#10b981' : '#22c55e',     // Verde profesional
        light: isDarkMode ? '#34d399' : '#86efac',
        dark: isDarkMode ? '#047857' : '#166534',
        contrastText: '#ffffff'
      },
      
      // FONDOS ENTERPRISE - PALETA SOFISTICADA
      background: {
        default: isDarkMode ? '#0f1419' : '#E9F5FF',  // Fondo principal elegante
        paper: isDarkMode ? '#1e2530' : '#FFFFFF',    // Cards y superficies
      },
      
      // SUPERFICIES ADICIONALES PARA PROFUNDIDAD
      surface: {
        main: isDarkMode ? '#1e2530' : '#FFFFFF',     // Superficie principal
        elevated: isDarkMode ? '#2a3441' : '#F8FAFC', // Superficie elevada
        interactive: isDarkMode ? '#334155' : '#E2E8F0' // Superficie interactiva
      },
      
      // TEXTO ENTERPRISE CON JERARQUÍA CLARA
      text: {
        primary: isDarkMode ? '#f8fafc' : '#1F1F1F',    // Texto principal
        secondary: isDarkMode ? '#cbd5e1' : '#64748b',   // Texto secundario
        tertiary: isDarkMode ? '#94a3b8' : '#94a3b8',    // Texto terciario
        disabled: isDarkMode ? '#64748b' : '#cbd5e1'     // Texto deshabilitado
      },
      
      // ESTADOS DE COLOR ENTERPRISE
      error: {
        main: isDarkMode ? '#ef4444' : '#dc2626',
        light: isDarkMode ? '#f87171' : '#fca5a5',
        dark: isDarkMode ? '#dc2626' : '#991b1b',
        contrastText: '#ffffff'
      },
      warning: {
        main: isDarkMode ? '#f59e0b' : '#d97706',
        light: isDarkMode ? '#fbbf24' : '#fcd34d',
        dark: isDarkMode ? '#d97706' : '#92400e',
        contrastText: '#ffffff'
      },
      info: {
        main: isDarkMode ? '#06b6d4' : '#0891b2',
        light: isDarkMode ? '#22d3ee' : '#67e8f9',
        dark: isDarkMode ? '#0891b2' : '#164e63',
        contrastText: '#ffffff'
      },
      success: {
        main: isDarkMode ? '#10b981' : '#059669',
        light: isDarkMode ? '#34d399' : '#6ee7b7',
        dark: isDarkMode ? '#047857' : '#047857',
        contrastText: '#ffffff'
      },
      
      // DIVISORES Y BORDES ENTERPRISE
      divider: isDarkMode ? '#334155' : '#e2e8f0',
      
      // ACCIONES Y ESTADOS
      action: {
        hover: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)',
        selected: isDarkMode ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
        disabled: isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.5)',
        disabledBackground: isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.12)',
      }
    },
    
    // TIPOGRAFÍA ENTERPRISE
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      
      // ENCABEZADOS CON COLORES APROPIADOS
      h1: { 
        color: isDarkMode ? '#f8fafc' : '#1f2937', 
        fontWeight: 600,
        letterSpacing: '-0.025em'
      },
      h2: { 
        color: isDarkMode ? '#f8fafc' : '#1f2937', 
        fontWeight: 600,
        letterSpacing: '-0.025em'
      },
      h3: { 
        color: isDarkMode ? '#f8fafc' : '#1f2937', 
        fontWeight: 500,
        letterSpacing: '-0.025em'
      },
      h4: { 
        color: isDarkMode ? '#f8fafc' : '#1f2937', 
        fontWeight: 500,
        letterSpacing: '-0.025em'
      },
      h5: { 
        color: isDarkMode ? '#f8fafc' : '#1f2937', 
        fontWeight: 500 
      },
      h6: { 
        color: isDarkMode ? '#f8fafc' : '#1f2937', 
        fontWeight: 500 
      },
      
      // CUERPO DE TEXTO CON JERARQUÍA
      body1: { 
        color: isDarkMode ? '#cbd5e1' : '#374151',
        lineHeight: 1.6
      },
      body2: { 
        color: isDarkMode ? '#94a3b8' : '#6b7280',
        lineHeight: 1.5
      }
    },
    
    // PERSONALIZACIÓN ENTERPRISE DE COMPONENTES
    components: {
      // CARDS ENTERPRISE - ELEGANTES Y PROFESIONALES (FORZADO)
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: isDarkMode ? '#1e2530 !important' : '#ffffff !important',
            borderRadius: 12,
            border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            boxShadow: isDarkMode 
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important'
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important',
            transition: 'all 0.2s ease-in-out',
            
            // FORZAR COLORES ENTERPRISE EN ELEMENTOS HIJO
            '& .MuiCardContent-root': {
              backgroundColor: isDarkMode ? '#1e2530 !important' : '#ffffff !important',
            },
            
            '&:hover': {
              boxShadow: isDarkMode
                ? '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important',
              transform: 'translateY(-2px)',
              borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.2)'
            }
          }
        }
      },
      
      // CHIPS/BADGES ENTERPRISE - SEMITRANSPARENTES ELEGANTES
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            fontSize: '0.75rem',
            borderRadius: 6,
          },
          colorPrimary: {
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            color: isDarkMode ? '#93c5fd' : '#1d4ed8',
            border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)',
          },
          colorSecondary: {
            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
            color: isDarkMode ? '#6ee7b7' : '#047857',
            border: isDarkMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(16, 185, 129, 0.2)',
          },
          colorSuccess: {
            backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
            color: isDarkMode ? '#86efac' : '#166534',
            border: isDarkMode ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(34, 197, 94, 0.2)',
          },
          colorWarning: {
            backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
            color: isDarkMode ? '#fcd34d' : '#92400e',
            border: isDarkMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(245, 158, 11, 0.2)',
          },
          colorError: {
            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
            color: isDarkMode ? '#fca5a5' : '#991b1b',
            border: isDarkMode ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)',
          },
          colorInfo: {
            backgroundColor: isDarkMode ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.1)',
            color: isDarkMode ? '#22d3ee' : '#164e63',
            border: isDarkMode ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(6, 182, 212, 0.2)',
          },
          colorDefault: {
            backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
            color: isDarkMode ? '#cbd5e1' : '#475569',
            border: isDarkMode ? '1px solid rgba(100, 116, 139, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)',
          }
        }
      },
      
      // BOTONES ENTERPRISE CON GRADIENTES SUAVES
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: 'none',
            transition: 'all 0.2s ease-in-out',
            
            '&:hover': {
              boxShadow: isDarkMode 
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                : '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
            }
          },
          containedPrimary: {
            background: isDarkMode 
              ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
              : 'linear-gradient(135deg, #468BE6 0%, #1A5799 100%)',
            color: '#ffffff',
            
            '&:hover': {
              background: isDarkMode
                ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
                : 'linear-gradient(135deg, #1A5799 0%, #1e3a8a 100%)',
            }
          },
          containedSecondary: {
            background: isDarkMode
              ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)'
              : 'linear-gradient(135deg, #22c55e 0%, #166534 100%)',
            color: '#ffffff',
            
            '&:hover': {
              background: isDarkMode
                ? 'linear-gradient(135deg, #047857 0%, #065f46 100%)'
                : 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
            }
          }
        }
      },
      
      // APPBAR ENTERPRISE
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff',
            borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            boxShadow: isDarkMode 
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.3)'
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }
        }
      },
      
      // PAPER ENTERPRISE (FORZADO PARA CARDS)
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: isDarkMode ? '#1e2530 !important' : '#ffffff !important',
            borderRadius: 8,
            border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',

            // FORZAR EN CONTENEDORES DE TABLA
            '&.MuiTableContainer-root': {
              backgroundColor: isDarkMode ? '#1e2530 !important' : '#ffffff !important',
            }
          }
        }
      },

      // ALERT: asegurar buen contraste en mensajes (snackbars/toasts de MUI)
      MuiAlert: {
        styleOverrides: {
          root: {

          },
          filledSuccess: {
            backgroundColor: `${isDarkMode ? '#047857' : '#10b981'} !important`,
            color: '#ffffff',
          },
          filledInfo: {
            backgroundColor: `${isDarkMode ? '#0e7490' : '#0891b2'} !important`,
            color: '#ffffff',
          },
          filledWarning: {
            backgroundColor: `${isDarkMode ? '#b45309' : '#d97706'} !important`,
            color: '#ffffff',
          },
          filledError: {
            backgroundColor: `${isDarkMode ? '#b91c1c' : '#dc2626'} !important`,
            color: '#ffffff',
          },
        },
      },
      
      // TABLE ENTERPRISE
      MuiTableContainer: {
        styleOverrides: {
          root: {
            backgroundColor: isDarkMode ? '#1e2530' : '#ffffff',
            border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            borderRadius: 8,
          }
        }
      },
      
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDarkMode ? '#242b3d' : '#f8fafc',
          }
        }
      },
      
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
          },
          head: {
            backgroundColor: isDarkMode ? '#242b3d' : '#f8fafc',
            color: isDarkMode ? '#f8fafc' : '#1f2937',
            fontWeight: 600,
          }
        }
      },
      
      // TEXTFIELD / BUSCADOR ENTERPRISE
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              // Fondo sutil para contraste, no negro
              backgroundColor: isDarkMode ? '#242b3d' : '#f8fafc', 
              
              '& fieldset': {
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
              },
              // Íconos y placeholder con color correcto
              '& .MuiSvgIcon-root': {
                color: isDarkMode ? '#94a3b8' : '#6b7280',
              },
              '& input::placeholder': {
                color: isDarkMode ? '#94a3b8' : '#6b7280',
                opacity: 1,
              },
            },
          },
        },
      },
    }
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
