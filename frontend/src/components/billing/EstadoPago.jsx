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
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Divider,
    CircularProgress
} from '@mui/material';
import {
    AttachMoney as MoneyIcon,
    CheckCircle as PaidIcon,
    Warning as PartialIcon,
    Error as PendingIcon,
    HelpOutline as NoInvoiceIcon,
    Close as CloseIcon,
    Receipt as ReceiptIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';

/**
 * EstadoPago Component
 * Widget informativo que muestra el estado de pago de un documento
 * Solo informativo - NO bloquea entregas
 * Incluye modal de detalle de factura con historial de pagos
 * 
 * @param {string} documentId - ID del documento para consultar estado de pago
 * @param {Object} paymentStatus - Estado de pago pre-cargado (opcional, evita llamada API)
 * @param {boolean} compact - Modo compacto para usar en listas
 * @param {function} onViewInvoice - Callback opcional (si no se provee, usa modal interno)
 */
const EstadoPago = ({ documentId, paymentStatus: externalStatus, compact = false, onViewInvoice }) => {
    const [status, setStatus] = useState(externalStatus || null);
    const [loading, setLoading] = useState(!externalStatus && !!documentId);
    const [error, setError] = useState(null);

    // Estado para modal de factura
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceDetail, setInvoiceDetail] = useState(null);
    const [invoicePayments, setInvoicePayments] = useState([]);
    const [loadingInvoice, setLoadingInvoice] = useState(false);

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

    // Abrir modal con detalle de factura
    const handleOpenInvoiceModal = async (invoiceId) => {
        if (onViewInvoice) {
            // Si hay callback externo, usarlo
            onViewInvoice(status.invoices?.[0]?.invoiceNumber);
            return;
        }

        // Cargar factura y pagos para mostrar en modal
        setLoadingInvoice(true);
        setShowInvoiceModal(true);
        try {
            const [invoiceData, paymentsData] = await Promise.all([
                billingService.getInvoiceById(invoiceId),
                billingService.getInvoicePayments(invoiceId)
            ]);
            setInvoiceDetail(invoiceData);
            setInvoicePayments(paymentsData.payments || []);
        } catch (err) {
            console.error('Error cargando factura:', err);
            setInvoiceDetail(null);
        } finally {
            setLoadingInvoice(false);
        }
    };

    // Cerrar modal
    const handleCloseModal = () => {
        setShowInvoiceModal(false);
        setInvoiceDetail(null);
        setInvoicePayments([]);
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
        <>
            <Alert
                severity={config.severity}
                icon={config.icon}
                sx={{ mt: 2 }}
                action={
                    status.hasInvoice && status.invoices?.[0] && (
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => handleOpenInvoiceModal(status.invoices[0].id)}
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

            {/* Modal de Detalle de Factura */}
            <Dialog
                open={showInvoiceModal}
                onClose={handleCloseModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ReceiptIcon color="primary" />
                    <Typography component="span" variant="h6" sx={{ flex: 1 }}>
                        {loadingInvoice ? 'Cargando...' : `Factura ${invoiceDetail?.invoiceNumber || ''}`}
                    </Typography>
                    <IconButton onClick={handleCloseModal} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {loadingInvoice ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : invoiceDetail ? (
                        <Box>
                            {/* Información del Cliente */}
                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <PersonIcon color="primary" fontSize="small" />
                                    <Typography variant="subtitle2">Cliente</Typography>
                                </Box>
                                <Typography variant="body1" fontWeight={500}>
                                    {invoiceDetail.clientName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {invoiceDetail.clientTaxId}
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            {/* Fechas */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <CalendarIcon fontSize="small" color="action" />
                                        <Typography variant="caption" color="text.secondary">Emisión</Typography>
                                    </Box>
                                    <Typography variant="body1" fontWeight={500}>
                                        {billingService.formatDate(invoiceDetail.issueDate)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <CalendarIcon fontSize="small" color="action" />
                                        <Typography variant="caption" color="text.secondary">Vencimiento</Typography>
                                    </Box>
                                    <Typography
                                        variant="body1"
                                        fontWeight={500}
                                        color={new Date(invoiceDetail.dueDate) < new Date() ? 'error.main' : 'text.primary'}
                                    >
                                        {billingService.formatDate(invoiceDetail.dueDate)}
                                    </Typography>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            {/* Resumen Financiero */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={4}>
                                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'primary.soft', borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Total</Typography>
                                        <Typography variant="h6" color="primary.main">
                                            {billingService.formatCurrency(invoiceDetail.totalAmount)}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'success.soft', borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Pagado</Typography>
                                        <Typography variant="h6" color="success.main">
                                            {billingService.formatCurrency(
                                                invoicePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                                            )}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Box sx={{
                                        textAlign: 'center',
                                        p: 1.5,
                                        bgcolor: status.totalDebt > 0 ? 'error.soft' : 'success.soft',
                                        borderRadius: 1
                                    }}>
                                        <Typography variant="caption" color="text.secondary">Pendiente</Typography>
                                        <Typography
                                            variant="h6"
                                            color={status.totalDebt > 0 ? 'error.main' : 'success.main'}
                                        >
                                            {billingService.formatCurrency(status.totalDebt)}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            {/* Historial de Pagos */}
                            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <MoneyIcon color="primary" fontSize="small" /> Historial de Pagos
                            </Typography>

                            {invoicePayments.length === 0 ? (
                                <Alert severity="info" sx={{ mt: 1 }}>
                                    Sin pagos registrados
                                </Alert>
                            ) : (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell><strong>Fecha</strong></TableCell>
                                            <TableCell><strong>Recibo</strong></TableCell>
                                            <TableCell align="right"><strong>Monto</strong></TableCell>
                                            <TableCell><strong>Concepto</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {invoicePayments.map((payment) => (
                                            <TableRow key={payment.id} hover>
                                                <TableCell>{billingService.formatDate(payment.paymentDate)}</TableCell>
                                                <TableCell>{payment.receiptNumber || '-'}</TableCell>
                                                <TableCell align="right">
                                                    <Typography color="success.main" fontWeight={500}>
                                                        {billingService.formatCurrency(payment.amount)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{payment.concept || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Box>
                    ) : (
                        <Alert severity="warning">No se pudo cargar la información de la factura</Alert>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleCloseModal}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </>
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
