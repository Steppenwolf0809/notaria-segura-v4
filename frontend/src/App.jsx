import React, { useEffect } from 'react';
import useAuth from './hooks/use-auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VerificacionPublica from './pages/VerificacionPublica';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useThemeCtx } from './contexts/theme-ctx';

/**
 * Componente raíz de la aplicación
 * - Centraliza ThemeProvider (antes en main.jsx)
 * - Integra ThemeCtx (light|dark|system) y aplica tema enterprise
 */
function App() {
  const { isAuthenticated, checkAuth, clearAuth } = useAuth();
  const { resolvedIsDark } = useThemeCtx();

  useEffect(() => {
    // 🔧 FIX: Limpiar tokens corruptos/desincronizados al iniciar
    try {
      const zustandData = localStorage.getItem('notaria-auth-storage');
      const directToken = localStorage.getItem('token');
      
      if (zustandData) {
        const parsed = JSON.parse(zustandData);
        const zustandToken = parsed?.state?.token;
        
        // Si hay token en Zustand pero no coincide con localStorage directo, sincronizar
        if (zustandToken && zustandToken !== directToken) {
          console.warn('[AUTH-FIX] Sincronizando tokens desincronizados');
          localStorage.setItem('token', zustandToken);
        }
      } else if (directToken) {
        // Si hay token directo pero no en Zustand, está corrupto - limpiar
        console.warn('[AUTH-FIX] Token corrupto detectado, limpiando...');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        clearAuth();
      }
    } catch (error) {
      console.error('[AUTH-FIX] Error sincronizando tokens:', error);
      // En caso de error, limpiar todo para evitar estados inconsistentes
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('notaria-auth-storage');
        clearAuth();
      } catch {}
    }
    
    // Verificar autenticación al cargar la aplicación
    checkAuth();
  }, [checkAuth, clearAuth]);

  // Configuración de tema (basada en la anterior de main.jsx)
  const theme = createTheme({
    palette: {
      mode: resolvedIsDark ? 'dark' : 'light',

      primary: {
        main: resolvedIsDark ? '#3b82f6' : '#468BE6',
        light: resolvedIsDark ? '#60a5fa' : '#93BFEF',
        dark: resolvedIsDark ? '#1d4ed8' : '#1A5799',
        contrastText: '#ffffff'
      },

      secondary: {
        main: resolvedIsDark ? '#10b981' : '#22c55e',
        light: resolvedIsDark ? '#34d399' : '#86efac',
        dark: resolvedIsDark ? '#047857' : '#166534',
        contrastText: '#ffffff'
      },

      background: {
        default: resolvedIsDark ? '#0f1419' : '#E9F5FF',
        paper: resolvedIsDark ? '#1e2530' : '#FFFFFF',
      },

      surface: {
        main: resolvedIsDark ? '#1e2530' : '#FFFFFF',
        elevated: resolvedIsDark ? '#2a3441' : '#F8FAFC',
        interactive: resolvedIsDark ? '#334155' : '#E2E8F0'
      },

      text: {
        primary: resolvedIsDark ? '#f8fafc' : '#1F1F1F',
        secondary: resolvedIsDark ? '#cbd5e1' : '#64748b',
        tertiary: resolvedIsDark ? '#94a3b8' : '#94a3b8',
        disabled: resolvedIsDark ? '#64748b' : '#cbd5e1'
      },

      error: {
        main: resolvedIsDark ? '#ef4444' : '#dc2626',
        light: resolvedIsDark ? '#f87171' : '#fca5a5',
        dark: resolvedIsDark ? '#dc2626' : '#991b1b',
        contrastText: '#ffffff'
      },
      warning: {
        main: resolvedIsDark ? '#f59e0b' : '#d97706',
        light: resolvedIsDark ? '#fbbf24' : '#fcd34d',
        dark: resolvedIsDark ? '#d97706' : '#92400e',
        contrastText: '#ffffff'
      },
      info: {
        main: resolvedIsDark ? '#06b6d4' : '#0891b2',
        light: resolvedIsDark ? '#22d3ee' : '#67e8f9',
        dark: resolvedIsDark ? '#0891b2' : '#164e63',
        contrastText: '#ffffff'
      },
      success: {
        main: resolvedIsDark ? '#10b981' : '#059669',
        light: resolvedIsDark ? '#34d399' : '#6ee7b7',
        dark: resolvedIsDark ? '#047857' : '#047857',
        contrastText: '#ffffff'
      },

      divider: resolvedIsDark ? '#334155' : '#e2e8f0',

      action: {
        hover: resolvedIsDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)',
        selected: resolvedIsDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
        disabled: resolvedIsDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.5)',
        disabledBackground: 'rgba(148, 163, 184, 0.12)',
      }
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,

      h1: { color: resolvedIsDark ? '#f8fafc' : '#1f2937', fontWeight: 600, letterSpacing: '-0.025em' },
      h2: { color: resolvedIsDark ? '#f8fafc' : '#1f2937', fontWeight: 600, letterSpacing: '-0.025em' },
      h3: { color: resolvedIsDark ? '#f8fafc' : '#1f2937', fontWeight: 500, letterSpacing: '-0.025em' },
      h4: { color: resolvedIsDark ? '#f8fafc' : '#1f2937', fontWeight: 500, letterSpacing: '-0.025em' },
      h5: { color: resolvedIsDark ? '#f8fafc' : '#1f2937', fontWeight: 500 },
      h6: { color: resolvedIsDark ? '#f8fafc' : '#1f2937', fontWeight: 500 },

      body1: { color: resolvedIsDark ? '#cbd5e1' : '#374151', lineHeight: 1.6 },
      body2: { color: resolvedIsDark ? '#94a3b8' : '#6b7280', lineHeight: 1.5 }
    },

    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: resolvedIsDark ? '1px solid #334155' : '1px solid #e2e8f0',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: resolvedIsDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.2)'
            }
          }
        }
      },

      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, fontSize: '0.75rem', borderRadius: 6 },
          colorPrimary: {
            backgroundColor: resolvedIsDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            color: resolvedIsDark ? '#93c5fd' : '#1d4ed8',
            border: resolvedIsDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)',
          },
          colorSecondary: {
            backgroundColor: resolvedIsDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
            color: resolvedIsDark ? '#6ee7b7' : '#047857',
            border: resolvedIsDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(16, 185, 129, 0.2)',
          },
          colorSuccess: {
            backgroundColor: resolvedIsDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
            color: resolvedIsDark ? '#86efac' : '#166534',
            border: resolvedIsDark ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(34, 197, 94, 0.2)',
          },
          colorWarning: {
            backgroundColor: resolvedIsDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
            color: resolvedIsDark ? '#fcd34d' : '#92400e',
            border: resolvedIsDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(245, 158, 11, 0.2)',
          },
          colorError: {
            backgroundColor: resolvedIsDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
            color: resolvedIsDark ? '#fca5a5' : '#991b1b',
            border: resolvedIsDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)',
          },
          colorInfo: {
            backgroundColor: resolvedIsDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.1)',
            color: resolvedIsDark ? '#22d3ee' : '#164e63',
            border: resolvedIsDark ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(6, 182, 212, 0.2)',
          },
          colorDefault: {
            backgroundColor: resolvedIsDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
            color: resolvedIsDark ? '#cbd5e1' : '#475569',
            border: resolvedIsDark ? '1px solid rgba(100, 116, 139, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)',
          }
        }
      },

      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: 'none',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: resolvedIsDark
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                : '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
            }
          },
          containedPrimary: {
            background: resolvedIsDark
              ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
              : 'linear-gradient(135deg, #468BE6 0%, #1A5799 100%)',
            color: '#ffffff',
            '&:hover': {
              background: resolvedIsDark
                ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
                : 'linear-gradient(135deg, #1A5799 0%, #1e3a8a 100%)',
            }
          },
          containedSecondary: {
            background: resolvedIsDark
              ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)'
              : 'linear-gradient(135deg, #22c55e 0%, #166534 100%)',
            color: '#ffffff',
            '&:hover': {
              background: resolvedIsDark
                ? 'linear-gradient(135deg, #047857 0%, #065f46 100%)'
                : 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
            }
          }
        }
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: resolvedIsDark ? '#1a1f2e' : '#ffffff',
            borderBottom: resolvedIsDark ? '1px solid #334155' : '1px solid #e2e8f0',
            boxShadow: resolvedIsDark
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.3)'
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }
        }
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: resolvedIsDark ? '#1e2530 !important' : '#ffffff !important',
            borderRadius: 8,
            border: resolvedIsDark ? '1px solid #334155' : '1px solid #e2e8f0',
            '&.MuiTableContainer-root': {
              backgroundColor: resolvedIsDark ? '#1e2530 !important' : '#ffffff !important',
            }
          }
        }
      },

      MuiTableContainer: {
        styleOverrides: {
          root: {
            backgroundColor: resolvedIsDark ? '#1e2530' : '#ffffff',
            border: resolvedIsDark ? '1px solid #334155' : '1px solid #e2e8f0',
            borderRadius: 8,
          }
        }
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: resolvedIsDark ? '#242b3d' : '#f8fafc',
          }
        }
      },

      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: resolvedIsDark ? '#334155' : '#e2e8f0' },
          head: {
            backgroundColor: resolvedIsDark ? '#242b3d' : '#f8fafc',
            color: resolvedIsDark ? '#f8fafc' : '#1f2937',
            fontWeight: 600,
          }
        }
      },

      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: resolvedIsDark ? '#242b3d' : '#f8fafc',
              '& fieldset': { borderColor: resolvedIsDark ? '#334155' : '#e2e8f0' },
              '& .MuiSvgIcon-root': { color: resolvedIsDark ? '#94a3b8' : '#6b7280' },
              '& input::placeholder': { color: resolvedIsDark ? '#94a3b8' : '#6b7280', opacity: 1 },
            },
          },
        },
      },
    }
  });

  // Detectar si es una ruta de verificación pública
  const currentPath = window.location.pathname;
  const isVerificationRoute = currentPath.startsWith('/verify/');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{ zIndex: 20000 }}
      />
      
      {/* Ruta pública de verificación */}
      {isVerificationRoute ? (
        <VerificacionPublica />
      ) : (
        /* Rutas normales del sistema */
        isAuthenticated ? (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ) : (
          <LoginPage />
        )
      )}
    </ThemeProvider>
  );
}

export default App;
