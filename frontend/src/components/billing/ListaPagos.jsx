import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    Grid,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    Skeleton
} from '@mui/material';
import {
    Payments as PaymentsIcon,
    Refresh as RefreshIcon,
    Receipt as ReceiptIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';

/**
 * ListaPagos Component
 * Muestra todos los pagos registrados con filtros
 */
const ListaPagos = () => {
    // Estado de datos
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Paginación
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);

    // Filtros
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Estadísticas
    const [stats, setStats] = useState(null);

    // Cargar estadísticas
    const loadStats = useCallback(async () => {
        try {
            const params = {
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined
            };
            const response = await billingService.getSummary(params);
            setStats(response.data);
        } catch (err) {
            console.error('Error cargando estadísticas:', err);
        }
    }, [dateFrom, dateTo]);

    // Cargar pagos
    const loadPayments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: page + 1,
                limit: rowsPerPage,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined
            };

            const response = await billingService.getPayments(params);
            setPayments(response.data || []);
            setTotalCount(response.pagination?.total || 0);
        } catch (err) {
            console.error('Error cargando pagos:', err);
            setError('Error al cargar los pagos');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, dateFrom, dateTo]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        loadPayments();
    }, [loadPayments]);

    // Handlers de paginación
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentsIcon color="primary" />
                Pagos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Historial de todos los pagos registrados en el sistema.
            </Typography>

            {/* Cards de estadísticas */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Total Pagos</Typography>
                            <Typography variant="h5" color="primary">
                                {stats?.totalPayments || totalCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Monto Total Cobrado</Typography>
                            <Typography variant="h5" color="success.main">
                                {billingService.formatCurrency(stats?.totalCollected || 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Pagos Hoy</Typography>
                            <Typography variant="h5" color="info.main">
                                {stats?.paymentsToday || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Monto Hoy</Typography>
                            <Typography variant="h5" color="info.main">
                                {billingService.formatCurrency(stats?.collectedToday || 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filtros */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Desde"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Hasta"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{ textAlign: 'right' }}>
                        <Tooltip title="Actualizar">
                            <IconButton onClick={loadPayments}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabla de pagos */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Fecha</strong></TableCell>
                            <TableCell><strong>Recibo</strong></TableCell>
                            <TableCell><strong>Cliente</strong></TableCell>
                            <TableCell><strong>Factura</strong></TableCell>
                            <TableCell align="right"><strong>Monto</strong></TableCell>
                            <TableCell><strong>Concepto</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            // Skeleton de carga
                            [...Array(5)].map((_, index) => (
                                <TableRow key={index}>
                                    {[...Array(6)].map((_, cellIndex) => (
                                        <TableCell key={cellIndex}>
                                            <Skeleton variant="text" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography color="error" sx={{ py: 2 }}>{error}</Typography>
                                </TableCell>
                            </TableRow>
                        ) : payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography color="text.secondary" sx={{ py: 2 }}>
                                        No se encontraron pagos
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map((payment) => (
                                <TableRow key={payment.id} hover>
                                    <TableCell>
                                        {billingService.formatDate(payment.paymentDate)}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {payment.receiptNumber || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {payment.invoice?.clientName || payment.clientName || '-'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {payment.invoice?.clientTaxId || payment.clientTaxId || ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {payment.invoiceId ? (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5
                                                }}
                                            >
                                                <ReceiptIcon fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {payment.invoice?.invoiceNumber || `#${payment.invoiceId}`}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">-</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="success.main" fontWeight={500}>
                                            {billingService.formatCurrency(payment.amount)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                maxWidth: 200,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {payment.concept || '-'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Filas por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                />
            </TableContainer>
        </Box>
    );
};

export default ListaPagos;
