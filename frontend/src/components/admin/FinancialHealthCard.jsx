import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Tooltip
} from '@mui/material';
import {
    AttachMoney as MoneyIcon,
    AccountBalanceWallet as WalletIcon
} from '@mui/icons-material';

/**
 * FinancialHealthCard — Inteligencia Financiera
 * Muestra Facturado vs Cobrado con barra de progreso y colores dinámicos.
 * Rojo (<60%), Ámbar (60-85%), Verde (>85%)
 */
const FinancialHealthCard = ({ totalBilled = 0, totalCollected = 0, periodLabel = '', onPeriodClick }) => {
    const ratio = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
    const clampedRatio = Math.min(ratio, 100);

    // Color dinámico según ratio
    const getHealthColor = (pct) => {
        if (pct < 60) return { main: '#be123c', light: 'rgba(190, 18, 60, 0.12)', label: 'Crítico' };
        if (pct < 85) return { main: '#d97706', light: 'rgba(217, 119, 6, 0.12)', label: 'Moderado' };
        return { main: '#047857', light: 'rgba(4, 120, 87, 0.12)', label: 'Saludable' };
    };

    const health = getHealthColor(clampedRatio);

    const formatCurrency = (amount) =>
        '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <Card
            sx={{
                height: '100%',
                borderRadius: 3,
                border: '1px solid rgba(148, 163, 184, 0.12)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%)',
                transition: 'box-shadow 0.3s ease',
                '&:hover': {
                    boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.06), 0 4px 10px -5px rgba(0, 0, 0, 0.02)',
                }
            }}
        >
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                    <Box
                        onClick={onPeriodClick}
                        sx={{ cursor: onPeriodClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                        <Typography
                            variant="overline"
                            sx={{
                                color: 'text.secondary',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                letterSpacing: '0.08em'
                            }}
                        >
                            SALUD FINANCIERA {periodLabel && `(${periodLabel})`}
                        </Typography>
                    </Box>
                    <Tooltip title={health.label}>
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: health.main,
                                boxShadow: `0 0 6px ${health.main}40`,
                                flexShrink: 0
                            }}
                        />
                    </Tooltip>
                </Box>

                {/* Facturado vs Cobrado */}
                <Box sx={{ display: 'flex', gap: 3, mb: 2.5 }}>
                    {/* Facturado */}
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'rgba(100, 116, 139, 0.06)', display: 'flex' }}>
                                <MoneyIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }}>
                                Facturado
                            </Typography>
                        </Box>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 700,
                                color: '#0f172a',
                                fontSize: '1.375rem',
                                letterSpacing: '-0.02em',
                                lineHeight: 1.2
                            }}
                        >
                            {formatCurrency(totalBilled)}
                        </Typography>
                    </Box>

                    {/* Cobrado */}
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: health.light, display: 'flex' }}>
                                <WalletIcon sx={{ fontSize: 16, color: health.main }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }}>
                                Cobrado
                            </Typography>
                        </Box>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 700,
                                color: health.main,
                                fontSize: '1.375rem',
                                letterSpacing: '-0.02em',
                                lineHeight: 1.2
                            }}
                        >
                            {formatCurrency(totalCollected)}
                        </Typography>
                    </Box>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 1 }}>
                    <LinearProgress
                        variant="determinate"
                        value={clampedRatio}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'rgba(148, 163, 184, 0.1)',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                bgcolor: health.main,
                                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                            }
                        }}
                    />
                </Box>

                {/* Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        Tasa de recaudo
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: health.main, fontWeight: 700, fontSize: '0.8125rem' }}
                    >
                        {clampedRatio.toFixed(1)}%
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default FinancialHealthCard;
