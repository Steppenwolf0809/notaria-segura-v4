import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Divider,
    IconButton,
    Tooltip,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField
} from '@mui/material';
import {
    AccountBalance as BillingIcon,
    ExpandMore as ExpandMoreIcon,
    Warning as WarningIcon,
    WhatsApp as WhatsAppIcon,
    Refresh as RefreshIcon,
    AttachMoney as MoneyIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';

/**
 * CarteraCobros Component
 * Permite a los matrizadores ver las facturas pendientes de sus documentos
 * y enviar recordatorios de cobro por WhatsApp
 */
const CarteraCobros = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [portfolio, setPortfolio] = useState(null);
    const [expandedClient, setExpandedClient] = useState(null);
    const [sendingReminder, setSendingReminder] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Estado para modal de edición de teléfono
    const [phoneModalOpen, setPhoneModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [editPhone, setEditPhone] = useState('');

    const loadPortfolio = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await billingService.getMyPortfolio();
            setPortfolio(response);
        } catch (err) {
            console.error('Error loading portfolio:', err);
            setError('Error al cargar la cartera de cobros');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPortfolio();
    }, [loadPortfolio]);

    // Abrir modal de teléfono antes de enviar recordatorio
    const handleOpenPhoneModal = (client) => {
        setSelectedClient(client);
        setEditPhone(client.clientPhone || '');
        setPhoneModalOpen(true);
    };

    // Enviar recordatorio con teléfono editado
    const handleConfirmSendReminder = async () => {
        if (!selectedClient) return;

        const phoneToUse = editPhone.trim();
        if (!phoneToUse) {
            setSnackbar({
                open: true,
                message: 'Debe ingresar un número de teléfono',
                severity: 'warning'
            });
            return;
        }

        setPhoneModalOpen(false);
        setSendingReminder(selectedClient.clientTaxId);

        try {
            const response = await billingService.generateCollectionReminder(
                selectedClient.clientTaxId,
                phoneToUse
            );
            if (response.waUrl) {
                window.open(response.waUrl, '_blank');
                setSnackbar({
                    open: true,
                    message: `Recordatorio generado para ${response.clientName}`,
                    severity: 'success'
                });
            }
        } catch (err) {
            console.error('Error sending reminder:', err);
            setSnackbar({
                open: true,
                message: 'Error al generar recordatorio',
                severity: 'error'
            });
        } finally {
            setSendingReminder(null);
            setSelectedClient(null);
        }
    };


    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-EC');
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {error}
                <Button onClick={loadPortfolio} sx={{ ml: 2 }}>Reintentar</Button>
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BillingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Typography variant="h4" fontWeight="bold">
                        Mi Cartera de Cobros
                    </Typography>
                </Box>
                <Tooltip title="Actualizar">
                    <IconButton onClick={loadPortfolio} color="primary">
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Summary Cards */}
            {portfolio?.summary && (
                <Grid container spacing={3} mb={4}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                            <CardContent>
                                <Typography variant="overline">Total Deuda</Typography>
                                <Typography variant="h4" fontWeight="bold">
                                    {formatCurrency(portfolio.summary.totalDebt)}
                                </Typography>
                                <Typography variant="caption">
                                    {portfolio.summary.totalClients} clientes
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                            <CardContent>
                                <Typography variant="overline">Vencido</Typography>
                                <Typography variant="h4" fontWeight="bold">
                                    {formatCurrency(portfolio.summary.totalOverdue)}
                                </Typography>
                                <Chip
                                    label="Urgente"
                                    size="small"
                                    color="error"
                                    sx={{ mt: 1 }}
                                />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                            <CardContent>
                                <Typography variant="overline">Por Vencer</Typography>
                                <Typography variant="h4" fontWeight="bold">
                                    {formatCurrency(portfolio.summary.totalCurrent)}
                                </Typography>
                                <Typography variant="caption">
                                    Requiere seguimiento
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                            <CardContent>
                                <Typography variant="overline">Facturas Pendientes</Typography>
                                <Typography variant="h4" fontWeight="bold">
                                    {portfolio.data?.reduce((sum, c) => sum + c.invoices.length, 0) || 0}
                                </Typography>
                                <Typography variant="caption">
                                    En seguimiento
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Client List */}
            {portfolio?.data?.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <MoneyIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" color="success.main">
                        ¡Excelente! No tienes facturas pendientes de cobro
                    </Typography>
                    <Typography color="text.secondary">
                        Todos los documentos asignados a ti tienen sus pagos al día
                    </Typography>
                </Paper>
            ) : (
                <Paper>
                    {portfolio?.data?.map((client) => (
                        <Accordion
                            key={client.clientTaxId}
                            expanded={expandedClient === client.clientTaxId}
                            onChange={() => setExpandedClient(
                                expandedClient === client.clientTaxId ? null : client.clientTaxId
                            )}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box display="flex" alignItems="center" width="100%" gap={2}>
                                    <PersonIcon color="primary" />
                                    <Box flex={1}>
                                        <Typography fontWeight="bold">
                                            {client.clientName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {client.clientTaxId} • {client.clientPhone || 'Sin teléfono'}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" gap={2} alignItems="center">
                                        {client.overdueDebt > 0 && (
                                            <Chip
                                                icon={<WarningIcon />}
                                                label={`Vencido: ${formatCurrency(client.overdueDebt)}`}
                                                color="error"
                                                size="small"
                                            />
                                        )}
                                        <Typography variant="h6" color="error.main" fontWeight="bold">
                                            {formatCurrency(client.totalDebt)}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            size="small"
                                            startIcon={sendingReminder === client.clientTaxId
                                                ? <CircularProgress size={16} color="inherit" />
                                                : <WhatsAppIcon />
                                            }
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenPhoneModal(client);
                                            }}
                                            disabled={sendingReminder === client.clientTaxId}
                                        >
                                            Recordatorio
                                        </Button>
                                    </Box>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Divider sx={{ mb: 2 }} />
                                <Typography variant="subtitle2" gutterBottom>
                                    Facturas Pendientes ({client.invoices.length})
                                </Typography>
                                <Table size="small">
                                    <TableBody>
                                        {client.invoices.map((invoice) => (
                                            <TableRow key={invoice.id}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {invoice.invoiceNumber}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {invoice.protocolNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {invoice.documentType}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        Total: {formatCurrency(invoice.totalAmount)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Pagado: {formatCurrency(invoice.totalPaid)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight="bold"
                                                        color={invoice.isOverdue ? 'error.main' : 'warning.main'}
                                                    >
                                                        Saldo: {formatCurrency(invoice.balance)}
                                                    </Typography>
                                                    {invoice.isOverdue && (
                                                        <Chip
                                                            label={`${invoice.daysOverdue} días vencido`}
                                                            size="small"
                                                            color="error"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <ScheduleIcon fontSize="small" color="action" />
                                                        <Typography variant="caption">
                                                            Emisión: {formatDate(invoice.issueDate)}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Paper>
            )}

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Modal de edición de teléfono */}
            <Dialog open={phoneModalOpen} onClose={() => setPhoneModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WhatsAppIcon color="success" />
                    Enviar Recordatorio de Cobro
                </DialogTitle>
                <DialogContent>
                    {selectedClient && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Cliente: <strong>{selectedClient.clientName}</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Deuda total: <strong>{formatCurrency(selectedClient.totalDebt)}</strong>
                            </Typography>

                            <TextField
                                fullWidth
                                label="Número de Teléfono"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="Ej: 0991234567"
                                helperText="Puede modificar el número si el recordatorio va a otra persona"
                                sx={{ mt: 2 }}
                                InputProps={{
                                    startAdornment: <EditIcon color="action" sx={{ mr: 1 }} />
                                }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPhoneModalOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<WhatsAppIcon />}
                        onClick={handleConfirmSendReminder}
                        disabled={!editPhone.trim()}
                    >
                        Enviar por WhatsApp
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CarteraCobros;
