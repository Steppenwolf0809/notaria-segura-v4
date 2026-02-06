import { createTheme } from '@mui/material/styles';

/**
 * Tema refinado de Notaría Segura
 * Estilo: Elegancia institucional con toques modernos
 * Paleta: Tonos neutros cálidos con acentos en azul marino y verde bosque
 */

export const getAppTheme = (isDark) => {
    // Paleta de colores refinada
    const colors = {
        // Neutros elegantes
        charcoal: '#2d3748',
        slate: '#64748b',
        warmGray: '#f5f5f4',
        stone: '#e7e5e4',
        
        // Acentos sofisticados
        navy: '#1e3a5f',
        navyLight: '#2c5282',
        forest: '#2f5233',
        forestLight: '#3d6b42',
        
        // Estados sutiles
        amber: '#d97706',
        ruby: '#be123c',
        emerald: '#047857',
        
        // Fondos
        cream: '#fafaf9',
        ivory: '#ffffff',
        darkBg: '#1a1d23',
        darkSurface: '#242830',
    };

    return createTheme({
        palette: {
            mode: isDark ? 'dark' : 'light',

            primary: {
                main: isDark ? colors.navyLight : colors.navy,
                light: isDark ? '#3d6b9c' : colors.navyLight,
                dark: isDark ? colors.navy : '#152a45',
                contrastText: '#ffffff'
            },

            secondary: {
                main: isDark ? colors.forestLight : colors.forest,
                light: isDark ? '#4a7a4f' : colors.forestLight,
                dark: isDark ? colors.forest : '#1f3d22',
                contrastText: '#ffffff'
            },

            background: {
                default: isDark ? colors.darkBg : colors.cream,
                paper: isDark ? colors.darkSurface : colors.ivory,
            },

            surface: {
                main: isDark ? colors.darkSurface : colors.ivory,
                elevated: isDark ? '#2d333c' : colors.warmGray,
                interactive: isDark ? '#3d4450' : colors.stone
            },

            text: {
                primary: isDark ? '#f1f5f9' : '#1e293b',
                secondary: isDark ? '#94a3b8' : colors.slate,
                tertiary: isDark ? '#64748b' : '#94a3b8',
                disabled: isDark ? '#475569' : '#cbd5e1'
            },

            error: {
                main: colors.ruby,
                light: isDark ? '#fb7185' : '#fecdd3',
                dark: '#9f1239',
                contrastText: '#ffffff'
            },
            warning: {
                main: colors.amber,
                light: isDark ? '#fbbf24' : '#fde68a',
                dark: '#92400e',
                contrastText: '#ffffff'
            },
            info: {
                main: isDark ? '#38bdf8' : '#0284c7',
                light: isDark ? '#7dd3fc' : '#bae6fd',
                dark: '#0369a1',
                contrastText: '#ffffff'
            },
            success: {
                main: colors.emerald,
                light: isDark ? '#34d399' : '#a7f3d0',
                dark: '#065f46',
                contrastText: '#ffffff'
            },

            divider: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.2)',

            action: {
                hover: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(30, 58, 95, 0.04)',
                selected: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(30, 58, 95, 0.08)',
                disabled: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.5)',
                disabledBackground: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)',
            }
        },

        typography: {
            fontFamily: '"Plus Jakarta Sans", "Inter", "Helvetica", "Arial", sans-serif',
            fontWeightLight: 300,
            fontWeightRegular: 400,
            fontWeightMedium: 500,
            fontWeightBold: 600,

            h1: { 
                color: isDark ? '#f8fafc' : '#0f172a', 
                fontWeight: 600, 
                letterSpacing: '-0.02em',
                lineHeight: 1.2
            },
            h2: { 
                color: isDark ? '#f8fafc' : '#0f172a', 
                fontWeight: 600, 
                letterSpacing: '-0.02em',
                lineHeight: 1.25
            },
            h3: { 
                color: isDark ? '#f8fafc' : '#0f172a', 
                fontWeight: 600, 
                letterSpacing: '-0.01em',
                lineHeight: 1.3
            },
            h4: { 
                color: isDark ? '#f8fafc' : '#1e293b', 
                fontWeight: 600, 
                letterSpacing: '-0.01em',
                lineHeight: 1.35
            },
            h5: { 
                color: isDark ? '#f8fafc' : '#1e293b', 
                fontWeight: 600,
                lineHeight: 1.4
            },
            h6: { 
                color: isDark ? '#f8fafc' : '#334155', 
                fontWeight: 600,
                lineHeight: 1.4
            },

            body1: { 
                color: isDark ? '#cbd5e1' : '#475569', 
                lineHeight: 1.7,
                fontSize: '0.9375rem'
            },
            body2: { 
                color: isDark ? '#94a3b8' : '#64748b', 
                lineHeight: 1.6,
                fontSize: '0.875rem'
            },
            caption: {
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: '0.75rem',
                letterSpacing: '0.025em'
            },
            overline: {
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
            }
        },

        shape: {
            borderRadius: 10
        },

        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(148, 163, 184, 0.2)',
                        backgroundColor: isDark ? colors.darkSurface : colors.ivory,
                        boxShadow: isDark 
                            ? '0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.15)'
                            : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: isDark 
                                ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
                                : '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
                        }
                    }
                }
            },

            MuiChip: {
                styleOverrides: {
                    root: { 
                        fontWeight: 500, 
                        fontSize: '0.75rem', 
                        borderRadius: 6,
                        height: 26,
                    },
                    colorPrimary: {
                        backgroundColor: isDark ? 'rgba(30, 58, 95, 0.25)' : 'rgba(30, 58, 95, 0.08)',
                        color: isDark ? '#93c5fd' : colors.navy,
                        border: isDark ? '1px solid rgba(30, 58, 95, 0.4)' : '1px solid rgba(30, 58, 95, 0.15)',
                    },
                    colorSecondary: {
                        backgroundColor: isDark ? 'rgba(47, 82, 51, 0.25)' : 'rgba(47, 82, 51, 0.08)',
                        color: isDark ? '#86efac' : colors.forest,
                        border: isDark ? '1px solid rgba(47, 82, 51, 0.4)' : '1px solid rgba(47, 82, 51, 0.15)',
                    },
                    colorSuccess: {
                        backgroundColor: isDark ? 'rgba(4, 120, 87, 0.2)' : 'rgba(4, 120, 87, 0.08)',
                        color: isDark ? '#6ee7b7' : colors.emerald,
                        border: isDark ? '1px solid rgba(4, 120, 87, 0.3)' : '1px solid rgba(4, 120, 87, 0.15)',
                    },
                    colorWarning: {
                        backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.08)',
                        color: isDark ? '#fcd34d' : colors.amber,
                        border: isDark ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid rgba(217, 119, 6, 0.15)',
                    },
                    colorError: {
                        backgroundColor: isDark ? 'rgba(190, 18, 60, 0.2)' : 'rgba(190, 18, 60, 0.08)',
                        color: isDark ? '#fda4af' : colors.ruby,
                        border: isDark ? '1px solid rgba(190, 18, 60, 0.3)' : '1px solid rgba(190, 18, 60, 0.15)',
                    },
                    colorDefault: {
                        backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.08)',
                        color: isDark ? '#cbd5e1' : colors.slate,
                        border: isDark ? '1px solid rgba(100, 116, 139, 0.25)' : '1px solid rgba(100, 116, 139, 0.15)',
                    }
                }
            },

            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        boxShadow: 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            boxShadow: isDark
                                ? '0 2px 4px -1px rgba(0, 0, 0, 0.3)'
                                : '0 2px 4px -1px rgba(0, 0, 0, 0.08)',
                            transform: 'translateY(-0.5px)'
                        },
                        '&:active': {
                            transform: 'translateY(0)'
                        }
                    },
                    containedPrimary: {
                        background: isDark
                            ? `linear-gradient(135deg, ${colors.navyLight} 0%, ${colors.navy} 100%)`
                            : `linear-gradient(135deg, ${colors.navy} 0%, #152a45 100%)`,
                        color: '#ffffff',
                        '&:hover': {
                            background: isDark
                                ? `linear-gradient(135deg, ${colors.navy} 0%, #152a45 100%)`
                                : `linear-gradient(135deg, #152a45 0%, #0f1f33 100%)`,
                        }
                    },
                    containedSecondary: {
                        background: isDark
                            ? `linear-gradient(135deg, ${colors.forestLight} 0%, ${colors.forest} 100%)`
                            : `linear-gradient(135deg, ${colors.forest} 0%, #1f3d22 100%)`,
                        color: '#ffffff',
                        '&:hover': {
                            background: isDark
                                ? `linear-gradient(135deg, ${colors.forest} 0%, #1f3d22 100%)`
                                : `linear-gradient(135deg, #1f3d22 0%, #152e18 100%)`,
                        }
                    },
                    outlined: {
                        borderWidth: '1.5px',
                        '&:hover': {
                            borderWidth: '1.5px',
                        }
                    }
                }
            },

            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? colors.darkSurface : colors.ivory,
                        borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(148, 163, 184, 0.2)',
                        boxShadow: 'none',
                    }
                }
            },

            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? colors.darkSurface : colors.ivory,
                        borderRadius: 10,
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(148, 163, 184, 0.15)',
                        '&.MuiTableContainer-root': {
                            backgroundColor: isDark ? colors.darkSurface : colors.ivory,
                        }
                    }
                }
            },

            MuiTableContainer: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? colors.darkSurface : colors.ivory,
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(148, 163, 184, 0.15)',
                        borderRadius: 10,
                        boxShadow: isDark 
                            ? '0 1px 3px rgba(0, 0, 0, 0.15)'
                            : '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }
                }
            },

            MuiTableHead: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : colors.warmGray,
                    }
                }
            },

            MuiTableCell: {
                styleOverrides: {
                    root: { 
                        borderBottomColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)',
                        padding: '14px 16px',
                    },
                    head: {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : colors.warmGray,
                        color: isDark ? '#f1f5f9' : '#1e293b',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        letterSpacing: '0.025em',
                        textTransform: 'uppercase',
                    }
                }
            },

            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
                            borderRadius: 8,
                            '& fieldset': { 
                                borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)',
                                borderWidth: '1.5px',
                            },
                            '&:hover fieldset': {
                                borderColor: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(30, 58, 95, 0.4)',
                            },
                            '&.Mui-focused fieldset': {
                                borderWidth: '1.5px',
                            },
                            '& .MuiSvgIcon-root': { color: isDark ? '#94a3b8' : colors.slate },
                            '& input::placeholder': { color: isDark ? '#64748b' : '#94a3b8', opacity: 1 },
                        },
                    },
                },
            },

            MuiAlert: {
                styleOverrides: {
                    root: {
                        borderRadius: 10,
                    },
                    filledSuccess: { color: '#fff' },
                    filledError: { color: '#fff' },
                    filledInfo: { color: '#fff' },
                    filledWarning: { color: '#fff' },
                    standardSuccess: { 
                        color: isDark ? '#86efac' : colors.emerald,
                        backgroundColor: isDark ? 'rgba(4, 120, 87, 0.15)' : 'rgba(4, 120, 87, 0.08)',
                    },
                    standardError: { 
                        color: isDark ? '#fda4af' : colors.ruby,
                        backgroundColor: isDark ? 'rgba(190, 18, 60, 0.15)' : 'rgba(190, 18, 60, 0.08)',
                    },
                    standardWarning: { 
                        color: isDark ? '#fcd34d' : colors.amber,
                        backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.08)',
                    },
                    standardInfo: { 
                        color: isDark ? '#7dd3fc' : '#0369a1',
                        backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.08)',
                    },
                },
            },

            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        transition: 'all 0.2s ease',
                    }
                }
            },

            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        borderRight: isDark ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(148, 163, 184, 0.15)',
                    }
                }
            },

            MuiBadge: {
                styleOverrides: {
                    badge: {
                        fontWeight: 600,
                        fontSize: '0.6875rem',
                    }
                }
            },

            MuiIconButton: {
                styleOverrides: {
                    root: {
                        transition: 'all 0.2s ease',
                    }
                }
            },

            MuiAvatar: {
                styleOverrides: {
                    root: {
                        fontWeight: 500,
                    }
                }
            }
        }
    });
};
