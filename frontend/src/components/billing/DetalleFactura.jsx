import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Skeleton,
    IconButton,
    Tooltip,
    Alert
} from '@mui/material';
import {
    Receipt as ReceiptIcon,
    ArrowBack as ArrowBackIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    AttachMoney as MoneyIcon,
    Link as LinkIcon,
    AccountBalanceWallet as WalletIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';

// regex: hoisted outside component per js-hoist-regexp
const INVOICE_HASH_RE = /#\/factura-detalle\/([a-f0-9-]+)/i;

/**
 * Convierte de forma segura un valor (string, Decimal, number) a Number.
 * Prisma Decimal llega como string en JSON; esto evita concatenaciones.
 */
function toNum(value) {
    if (value == null) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Formateador de moneda con Intl.NumberFormat (instanciado una sola vez).
 * rerender-lazy-state-init / js-cache-function-results
 */
const currencyFmt = new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
});

/**
 * Parsea el campo formas de pago del invoice.
 * Maneja: Array, string CSV, null/undefined.
 * Retorna array de strings (vacío si no hay datos).
 */
function parseFormasPago(invoice) {
    const LABELS = {
        pagoEfectivo: 'Efectivo',
        pagoCheque: 'Cheque',
        pagoTarjeta: 'Tarjeta',
        pagoDeposito: 'Dep/Transferencia',
        pagoDirecto: 'Pago Directo',
        montoPagadoCxc: 'CxC',
    };

    const formas = [];
    for (const [field, label] of Object.entries(LABELS)) {
        const val = toNum(invoice[field]);
        if (val > 0) {
            formas.push({ label, amount: val });
        }
    }
    return formas;
}

/**
 * DetalleFactura Component
 * Muestra el detalle de una factura con historial de pagos y formas de pago.
 *
 * Vercel best-practices applied:
 * - async-parallel: Promise.all para carga paralela
 * - rerender-functional-setstate: no aplica (estados independientes)
 * - js-hoist-regexp: regex fuera del componente
 * - js-cache-function-results: currencyFmt instanciado una sola vez
 * - rendering-conditional-render: ternarios en lugar de &&
 * - rerender-derived-state-no-effect: cálculos derivados en useMemo
 */
const DetalleFactura = ({ invoiceId }) => {
    const [invoice, setInvoice] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getInvoiceId = useCallback(() => {
        if (invoiceId) return invoiceId;
        const match = window.location.hash.match(INVOICE_HASH_RE);
        return match ? match[1] : null;
    }, [invoiceId]);

    // async-parallel: carga factura y pagos en paralelo
    const loadInvoiceData = useCallback(async () => {
        const id = getInvoiceId();
        if (!id) {
            setError('ID de factura no valido');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [invoiceResponse, paymentsResponse] = await Promise.all([
                billingService.getInvoiceById(id),
                billingService.getInvoicePayments(id)
            ]);

            setInvoice(invoiceResponse);
            setPayments(paymentsResponse.payments || []);
        } catch (err) {
            console.error('Error cargando factura:', err);
            setError('Error al cargar la factura');
        } finally {
            setLoading(false);
        }
    }, [getInvoiceId]);

    useEffect(() => {
        loadInvoiceData();
    }, [loadInvoiceData]);

    // rerender-derived-state-no-effect: cálculos derivados en render, no en effect
    const { totalAmount, totalPaid, balance, formasPago } = useMemo(() => {
        if (!invoice) return { totalAmount: 0, totalPaid: 0, balance: 0, formasPago: [] };

        const ta = toNum(invoice.totalAmount);

        // El backend ya calcula totalPaid como max(syncedPaidAmount, paymentsSum),
        // pero si hay pagos en la tabla de payments recalculamos por seguridad.
        const paymentsSum = payments.reduce((sum, p) => sum + toNum(p.amount), 0);
        const syncedPaid = toNum(invoice.paidAmount);
        const tp = Math.max(syncedPaid, paymentsSum);

        // Nunca mostrar saldo negativo
        const bal = Math.max(0, ta - tp);

        const fp = parseFormasPago(invoice);

        return { totalAmount: ta, totalPaid: tp, balance: bal, formasPago: fp };
    }, [invoice, payments]);

    // Calcular si la factura esta vencida (derivado, sin state)
    const isOverdue = useMemo(() => {
        if (!invoice?.dueDate || balance <= 0) return false;
        return new Date(invoice.dueDate) < new Date();
    }, [invoice?.dueDate, balance]);

    const handleBack = () => {
        window.location.hash = '#/facturas';
    };

    const handleViewDocument = (documentId) => {
        window.location.hash = `#/documentos/${documentId}`;
    };

    // --- Early returns para loading / error / empty ---

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="text" width={200} height={40} />
                <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
                <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
                    Volver a Facturas
                </Button>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!invoice) {
        return (
            <Box sx={{ p: 3 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
                    Volver a Facturas
                </Button>
                <Alert severity="warning">Factura no encontrada</Alert>
            </Box>
        );
    }

    const { label: statusLabel, color: statusColor, icon: statusIcon } =
        billingService.formatInvoiceStatus(invoice.status);

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Tooltip title="Volver a lista">
                    <IconButton onClick={handleBack}>
                        <ArrowBackIcon />
                    </IconButton>
                </Tooltip>
                <ReceiptIcon color="primary" fontSize="large" />
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5">
                        Factura {invoice.invoiceNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Detalle de factura y pagos
                    </Typography>
                </Box>
                <Chip
                    label={`${statusIcon} ${statusLabel}`}
                    color={statusColor}
                    sx={{ fontWeight: 600, fontSize: '1rem', py: 2, px: 1 }}
                />
            </Box>

            <Grid container spacing={3}>
                {/* Informacion del cliente */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <PersonIcon color="primary" />
                                <Typography variant="h6">Cliente</Typography>
                            </Box>
                            <Typography variant="body1" fontWeight={500}>
                                {invoice.clientName || 'Sin nombre'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {invoice.clientTaxId}
                            </Typography>
                            {invoice.clientEmail ? (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Correo: {invoice.clientEmail}
                                </Typography>
                            ) : null}
                            {invoice.clientPhone ? (
                                <Typography variant="body2" color="text.secondary">
                                    Tel: {invoice.clientPhone}
                                </Typography>
                            ) : null}

                            {/* Formas de Pago - rendering-conditional-render */}
                            {formasPago.length > 0 ? (
                                <Box sx={{ mt: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <WalletIcon fontSize="small" color="primary" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Formas de Pago
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {formasPago.map((fp) => (
                                            <Chip
                                                key={fp.label}
                                                label={`${fp.label}: ${currencyFmt.format(fp.amount)}`}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'primary.50',
                                                    color: 'primary.dark',
                                                    border: '1px solid',
                                                    borderColor: 'primary.200',
                                                    fontWeight: 500,
                                                    fontSize: '0.75rem',
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            ) : null}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Fechas */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <CalendarIcon color="primary" />
                                <Typography variant="h6">Fechas</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Emision</Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {billingService.formatDate(invoice.issueDate)}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Vencimiento
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        fontWeight={500}
                                        color={isOverdue ? 'error.main' : 'text.primary'}
                                    >
                                        {billingService.formatDate(invoice.dueDate)}
                                    </Typography>
                                </Grid>
                            </Grid>
                            {/* Condicion de pago si existe */}
                            {invoice.condicionPago ? (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                                    Condicion: {invoice.condicionPago === 'C' ? 'Credito' : invoice.condicionPago === 'E' ? 'Contado' : invoice.condicionPago}
                                </Typography>
                            ) : null}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Resumen financiero */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ bgcolor: 'background.default' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <MoneyIcon color="primary" />
                                <Typography variant="h6">Resumen Financiero</Typography>
                            </Box>

                            <Grid container spacing={2} alignItems="center">
                                <Grid size={{ xs: 4 }}>
                                    <Box sx={{ textAlign: 'center', p: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Total Factura</Typography>
                                        <Typography variant="h4" color="primary.main">
                                            {currencyFmt.format(totalAmount)}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <Box sx={{ textAlign: 'center', p: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Total Pagado</Typography>
                                        <Typography variant="h4" color="success.main">
                                            -{currencyFmt.format(totalPaid)}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <Box sx={{
                                        textAlign: 'center',
                                        p: 2,
                                        bgcolor: balance > 0 ? 'error.light' : 'success.light',
                                        borderRadius: 2,
                                    }}>
                                        <Typography variant="caption" color="text.secondary">Saldo Pendiente</Typography>
                                        <Typography variant="h4" color={balance > 0 ? 'error.main' : 'success.main'}>
                                            {currencyFmt.format(balance)}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            {/* Nota de credito si existe */}
                            {toNum(invoice.montoNotaCredito) > 0 ? (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    Nota de credito aplicada: {currencyFmt.format(toNum(invoice.montoNotaCredito))}
                                </Alert>
                            ) : null}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Documento vinculado - rendering-conditional-render: ternary */}
                {invoice.documentId ? (
                    <Grid size={{ xs: 12 }}>
                        <Alert
                            severity="info"
                            icon={<LinkIcon />}
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => handleViewDocument(invoice.documentId)}
                                >
                                    Ver Documento
                                </Button>
                            }
                        >
                            Esta factura esta vinculada al documento ID: {invoice.documentId}
                        </Alert>
                    </Grid>
                ) : null}

                {/* Historial de pagos */}
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Historial de Pagos
                        </Typography>

                        <TableContainer>
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
                                    {payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                                    Sin pagos registrados
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        payments.map((payment) => (
                                            <TableRow key={payment.id} hover>
                                                <TableCell>{billingService.formatDate(payment.paymentDate)}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {payment.receiptNumber || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" color="success.main" fontWeight={500}>
                                                        {currencyFmt.format(toNum(payment.amount))}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {payment.concept || '-'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DetalleFactura;
