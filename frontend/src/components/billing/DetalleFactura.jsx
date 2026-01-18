import React, { useState, useEffect, useCallback } from 'react';
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
    Divider,
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
    Link as LinkIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';

/**
 * DetalleFactura Component
 * Muestra el detalle de una factura específica con historial de pagos
 */
const DetalleFactura = ({ invoiceId }) => {
    const [invoice, setInvoice] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Extraer ID del hash si no se provee como prop
    const getInvoiceId = useCallback(() => {
        if (invoiceId) return invoiceId;
        const hash = window.location.hash;
        // Match UUID format (alphanumeric + dashes) or simple numeric ID
        const match = hash.match(/#\/factura-detalle\/([a-f0-9-]+)/i);
        return match ? match[1] : null;
    }, [invoiceId]);

    // Cargar datos de la factura
    const loadInvoiceData = useCallback(async () => {
        const id = getInvoiceId();
        if (!id) {
            setError('ID de factura no válido');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Cargar factura y pagos en paralelo
            const [invoiceResponse, paymentsResponse] = await Promise.all([
                billingService.getInvoiceById(id),
                billingService.getInvoicePayments(id)
            ]);

            // billing-service ya devuelve response.data, no hay que acceder a .data otra vez
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

    // Volver a lista de facturas
    const handleBack = () => {
        window.location.hash = '#/facturas';
    };

    // Ver documento vinculado
    const handleViewDocument = (documentId) => {
        // Navegar a vista de documento (ajustar según la ruta de tu app)
        window.location.hash = `#/documentos/${documentId}`;
    };

    // Renderizar estado de factura
    const renderStatus = (status) => {
        const { label, color, icon } = billingService.formatInvoiceStatus(status);
        return (
            <Chip
                label={`${icon} ${label}`}
                color={color}
                sx={{ fontWeight: 600, fontSize: '1rem', py: 2, px: 1 }}
            />
        );
    };

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

    // Calcular totales
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balance = Number(invoice.totalAmount || 0) - totalPaid;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header con botón volver */}
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
                {renderStatus(invoice.status)}
            </Box>

            <Grid container spacing={3}>
                {/* Información del cliente */}
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
                            {invoice.clientEmail && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    📧 {invoice.clientEmail}
                                </Typography>
                            )}
                            {invoice.clientPhone && (
                                <Typography variant="body2" color="text.secondary">
                                    📱 {invoice.clientPhone}
                                </Typography>
                            )}
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
                                    <Typography variant="caption" color="text.secondary">Emisión</Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {billingService.formatDate(invoice.issueDate)}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >Vencimiento</Typography>
                                    <Typography
                                        variant="body1"
                                        fontWeight={500}
                                        color={new Date(invoice.dueDate) < new Date() && balance > 0 ? 'error.main' : 'text.primary'}
                                    >
                                        {billingService.formatDate(invoice.dueDate)}
                                    </Typography>
                                </Grid>
                            </Grid>
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
                                            {billingService.formatCurrency(invoice.totalAmount)}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <Box sx={{ textAlign: 'center', p: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Total Pagado</Typography>
                                        <Typography variant="h4" color="success.main">
                                            -{billingService.formatCurrency(totalPaid)}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: balance > 0 ? 'error.light' : 'success.light', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Saldo Pendiente</Typography>
                                        <Typography variant="h4" color={balance > 0 ? 'error.main' : 'success.main'}>
                                            {billingService.formatCurrency(balance)}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Documento vinculado */}
                {invoice.documentId && (
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
                            Esta factura está vinculada al documento ID: {invoice.documentId}
                        </Alert>
                    </Grid>
                )}

                {/* Historial de pagos */}
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            💵 Historial de Pagos
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
                                                        {billingService.formatCurrency(payment.amount)}
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
