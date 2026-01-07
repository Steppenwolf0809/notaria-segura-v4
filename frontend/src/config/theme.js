import { createTheme } from '@mui/material/styles';

/**
 * Genera el tema de la aplicación basado en el modo (light/dark)
 * @param {boolean} isDark - Si el modo oscuro está activo
 * @returns {Theme} Objeto de tema MUI
 */
export const getAppTheme = (isDark) => {
    return createTheme({
        palette: {
            mode: isDark ? 'dark' : 'light',

            primary: {
                main: isDark ? '#3b82f6' : '#468BE6',
                light: isDark ? '#60a5fa' : '#93BFEF',
                dark: isDark ? '#1d4ed8' : '#1A5799',
                contrastText: '#ffffff'
            },

            secondary: {
                main: isDark ? '#10b981' : '#22c55e',
                light: isDark ? '#34d399' : '#86efac',
                dark: isDark ? '#047857' : '#166534',
                contrastText: '#ffffff'
            },

            background: {
                default: isDark ? '#0f1419' : '#E9F5FF',
                paper: isDark ? '#1e2530' : '#FFFFFF',
            },

            surface: {
                main: isDark ? '#1e2530' : '#FFFFFF',
                elevated: isDark ? '#2a3441' : '#F8FAFC',
                interactive: isDark ? '#334155' : '#E2E8F0'
            },

            text: {
                primary: isDark ? '#f8fafc' : '#1F1F1F',
                secondary: isDark ? '#cbd5e1' : '#64748b',
                tertiary: isDark ? '#94a3b8' : '#94a3b8',
                disabled: isDark ? '#64748b' : '#cbd5e1'
            },

            error: {
                main: isDark ? '#ef4444' : '#dc2626',
                light: isDark ? '#f87171' : '#fca5a5',
                dark: isDark ? '#dc2626' : '#991b1b',
                contrastText: '#ffffff'
            },
            warning: {
                main: isDark ? '#f59e0b' : '#d97706',
                light: isDark ? '#fbbf24' : '#fcd34d',
                dark: isDark ? '#d97706' : '#92400e',
                contrastText: '#ffffff'
            },
            info: {
                main: isDark ? '#06b6d4' : '#0891b2',
                light: isDark ? '#22d3ee' : '#67e8f9',
                dark: isDark ? '#0891b2' : '#164e63',
                contrastText: '#ffffff'
            },
            success: {
                main: isDark ? '#10b981' : '#059669',
                light: isDark ? '#34d399' : '#6ee7b7',
                dark: isDark ? '#047857' : '#047857',
                contrastText: '#ffffff'
            },

            divider: isDark ? '#334155' : '#e2e8f0',

            action: {
                hover: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)',
                selected: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
                disabled: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.5)',
                disabledBackground: 'rgba(148, 163, 184, 0.12)',
            }
        },

        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            fontWeightLight: 300,
            fontWeightRegular: 400,
            fontWeightMedium: 500,
            fontWeightBold: 600,

            h1: { color: isDark ? '#f8fafc' : '#1f2937', fontWeight: 600, letterSpacing: '-0.025em' },
            h2: { color: isDark ? '#f8fafc' : '#1f2937', fontWeight: 600, letterSpacing: '-0.025em' },
            h3: { color: isDark ? '#f8fafc' : '#1f2937', fontWeight: 500, letterSpacing: '-0.025em' },
            h4: { color: isDark ? '#f8fafc' : '#1f2937', fontWeight: 500, letterSpacing: '-0.025em' },
            h5: { color: isDark ? '#f8fafc' : '#1f2937', fontWeight: 500 },
            h6: { color: isDark ? '#f8fafc' : '#1f2937', fontWeight: 500 },

            body1: { color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.6 },
            body2: { color: isDark ? '#94a3b8' : '#6b7280', lineHeight: 1.5 }
        },

        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.2)'
                        }
                    }
                }
            },

            MuiChip: {
                styleOverrides: {
                    root: { fontWeight: 500, fontSize: '0.75rem', borderRadius: 6 },
                    colorPrimary: {
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDark ? '#93c5fd' : '#1d4ed8',
                        border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)',
                    },
                    colorSecondary: {
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                        color: isDark ? '#6ee7b7' : '#047857',
                        border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(16, 185, 129, 0.2)',
                    },
                    colorSuccess: {
                        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                        color: isDark ? '#86efac' : '#166534',
                        border: isDark ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(34, 197, 94, 0.2)',
                    },
                    colorWarning: {
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                        color: isDark ? '#fcd34d' : '#92400e',
                        border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(245, 158, 11, 0.2)',
                    },
                    colorError: {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                        color: isDark ? '#fca5a5' : '#991b1b',
                        border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)',
                    },
                    colorInfo: {
                        backgroundColor: isDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.1)',
                        color: isDark ? '#22d3ee' : '#164e63',
                        border: isDark ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(6, 182, 212, 0.2)',
                    },
                    colorDefault: {
                        backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
                        color: isDark ? '#cbd5e1' : '#475569',
                        border: isDark ? '1px solid rgba(100, 116, 139, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)',
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
                            boxShadow: isDark
                                ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                                : '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                        }
                    },
                    containedPrimary: {
                        background: isDark
                            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                            : 'linear-gradient(135deg, #468BE6 0%, #1A5799 100%)',
                        color: '#ffffff',
                        '&:hover': {
                            background: isDark
                                ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
                                : 'linear-gradient(135deg, #1A5799 0%, #1e3a8a 100%)',
                        }
                    },
                    containedSecondary: {
                        background: isDark
                            ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)'
                            : 'linear-gradient(135deg, #22c55e 0%, #166534 100%)',
                        color: '#ffffff',
                        '&:hover': {
                            background: isDark
                                ? 'linear-gradient(135deg, #047857 0%, #065f46 100%)'
                                : 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
                        }
                    }
                }
            },

            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? '#1a1f2e' : '#ffffff',
                        borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                        boxShadow: isDark
                            ? '0 1px 3px 0 rgba(0, 0, 0, 0.3)'
                            : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    }
                }
            },

            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? '#1e2530' : '#ffffff',
                        borderRadius: 8,
                        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                        '&.MuiTableContainer-root': {
                            backgroundColor: isDark ? '#1e2530' : '#ffffff',
                        }
                    }
                }
            },

            MuiTableContainer: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? '#1e2530' : '#ffffff',
                        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                        borderRadius: 8,
                    }
                }
            },

            MuiTableHead: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? '#242b3d' : '#f8fafc',
                    }
                }
            },

            MuiTableCell: {
                styleOverrides: {
                    root: { borderBottomColor: isDark ? '#334155' : '#e2e8f0' },
                    head: {
                        backgroundColor: isDark ? '#242b3d' : '#f8fafc',
                        color: isDark ? '#f8fafc' : '#1f2937',
                        fontWeight: 600,
                    }
                }
            },

            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: isDark ? '#242b3d' : '#f8fafc',
                            '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
                            '& .MuiSvgIcon-root': { color: isDark ? '#94a3b8' : '#6b7280' },
                            '& input::placeholder': { color: isDark ? '#94a3b8' : '#6b7280', opacity: 1 },
                        },
                    },
                },
            },

            MuiAlert: {
                styleOverrides: {
                    filledSuccess: { color: '#fff' },
                    filledError: { color: '#fff' },
                    filledInfo: { color: '#fff' },
                    filledWarning: { color: '#fff' },
                    standardSuccess: { color: isDark ? '#86efac' : '#166534' },
                    standardError: { color: isDark ? '#fca5a5' : '#991b1b' },
                    standardWarning: { color: isDark ? '#fcd34d' : '#92400e' },
                    standardInfo: { color: isDark ? '#67e8f9' : '#164e63' },
                },
            },
        }
    });
};
