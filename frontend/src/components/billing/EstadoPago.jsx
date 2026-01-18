import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Skeleton,
    Alert,
    Button,
    Tooltip
} from '@mui/material';
import {
    AttachMoney as MoneyIcon,
    CheckCircle as PaidIcon,
    Warning as PartialIcon,
    Error as PendingIcon,
    HelpOutline as NoInvoiceIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';

/**
 * EstadoPago Component
 * Widget informativo que muestra el estado de pago de un documento
 * Solo informativo - NO bloquea entregas
 * 
 * @param {string} documentId - ID del documento para consultar estado de pago
 * @param {Object} paymentStatus - Estado de pago pre-cargado (opcional, evita llamada API)
 * @param {boolean} compact - Modo compacto para usar en listas
 * @param {function} onViewInvoice - Callback para ver detalle de factura
 */
const EstadoPago = ({ documentId, paymentStatus: externalStatus, compact = false, onViewInvoice }) => {
    const [status, setStatus] = useState(externalStatus || null);
    const [loading, setLoading] = useState(!externalStatus && !!documentId);
    const [error, setError] = useState(null);

    // Cargar estado de pago si no se proporciona externamente
    useEffect(() => {
        if (externalStatus) {
            setStatus(externalStatus);
            setLoading(false);
            return;
        }

        if (!documentId) {
            setLoading(false);
            return;
        }

        const loadPaymentStatus = async () => {
            try {
                setLoading(true);
                const response = await billingService.getDocumentPaymentStatus(documentId);
                setStatus(response);
            } catch (err) {
                console.error('Error cargando estado de pago:', err);
                // Si es 404, significa que no hay factura asociada
                if (err.response?.status === 404) {
                    setStatus({ hasInvoice: false, status: 'NO_INVOICE' });
                } else {
                    setError('Error al cargar estado de pago');
                }
            } finally {
                setLoading(false);
            }
        };

        loadPaymentStatus();
    }, [documentId, externalStatus]);

    // Obtener configuración visual según estado
    const getStatusConfig = (paymentStatus) => {
        if (!paymentStatus?.hasInvoice) {
            return {
                color: 'default',
                icon: <NoInvoiceIcon />,
                label: 'Sin factura',
                severity: 'info',
                emoji: '⚪'
            };
        }

        switch (paymentStatus.status) {
            case 'PAID':
                return {
                    color: 'success',
                    icon: <PaidIcon />,
                    label: 'Pagado',
                    severity: 'success',
                    emoji: '🟢'
                };
            case 'PARTIAL':
                return {
                    color: 'warning',
                    icon: <PartialIcon />,
                    label: 'Pago Parcial',
                    severity: 'warning',
                    emoji: '🟡'
                };
            case 'PENDING':
            case 'OVERDUE':
                return {
                    color: 'error',
                    icon: <PendingIcon />,
                    label: paymentStatus.status === 'OVERDUE' ? 'Vencida' : 'Pendiente',
                    severity: 'error',
                    emoji: '🔴'
                };
            default:
                return {
                    color: 'default',
                    icon: <MoneyIcon />,
                    label: 'Desconocido',
                    severity: 'info',
                    emoji: '⚪'
                };
        }
    };

    // Loading state
    if (loading) {
        if (compact) {
            return <Skeleton variant="rounded" width={80} height={24} />;
        }
        return (
            <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                    <Skeleton variant="text" width={150} />
                    <Skeleton variant="text" width={100} />
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        if (compact) return null;
        return (
            <Alert severity="error" sx={{ mt: 1 }}>
                {error}
            </Alert>
        );
    }

    // No status available
    if (!status) {
        return null;
    }

    const config = getStatusConfig(status);

    // Modo compacto - solo chip para usar en tablas
    if (compact) {
        if (!status.hasInvoice) {
            return null; // No mostrar nada si no hay factura en modo compacto
        }

        return (
            <Tooltip
                title={status.totalDebt > 0
                    ? `Saldo: ${billingService.formatCurrency(status.totalDebt)}`
                    : 'Pagado completamente'
                }
            >
                <Chip
                    size="small"
                    label={config.emoji}
                    color={config.color}
                    sx={{
                        minWidth: 32,
                        '& .MuiChip-label': { px: 0.5 }
                    }}
                />
            </Tooltip>
        );
    }

    // Modo completo - card con información detallada
    return (
        <Alert
            severity={config.severity}
            icon={config.icon}
            sx={{ mt: 2 }}
            action={
                status.hasInvoice && status.invoices?.[0] && onViewInvoice && (
                    <Button
                        color="inherit"
                        size="small"
                        onClick={() => onViewInvoice(status.invoices[0].invoiceNumber)}
                    >
                        Ver Factura
                    </Button>
                )
            }
        >
            <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                    {config.emoji} {status.message || config.label}
                </Typography>

                {status.hasInvoice && (
                    <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" component="span">
                            Total: {billingService.formatCurrency(status.totalAmount)}
                        </Typography>
                        {status.totalPaid > 0 && (
                            <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                                Pagado: {billingService.formatCurrency(status.totalPaid)}
                            </Typography>
                        )}
                        {status.totalDebt > 0 && (
                            <Typography
                                variant="body2"
                                component="span"
                                sx={{ ml: 2, fontWeight: 600 }}
                            >
                                Pendiente: {billingService.formatCurrency(status.totalDebt)}
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        </Alert>
    );
};

/**
 * Hook para obtener estado de pago de un documento
 * @param {string} documentId 
 * @returns {Object} { status, loading, error, refresh }
 */
export function usePaymentStatus(documentId) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(!!documentId);
    const [error, setError] = useState(null);

    const loadStatus = async () => {
        if (!documentId) return;

        try {
            setLoading(true);
            const response = await billingService.getDocumentPaymentStatus(documentId);
            setStatus(response);
            setError(null);
        } catch (err) {
            if (err.response?.status === 404) {
                setStatus({ hasInvoice: false, status: 'NO_INVOICE' });
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, [documentId]);

    return { status, loading, error, refresh: loadStatus };
}

export default EstadoPago;
