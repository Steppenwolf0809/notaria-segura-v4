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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    IconButton,
    Tooltip,
    InputAdornment,
    Grid,
    Card,
    CardContent,
    Skeleton
} from '@mui/material';
import {
    Receipt as ReceiptIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';

/**
 * ListaFacturas Component
 * Muestra todas las facturas con filtros y paginación
 */
const ListaFacturas = () => {
    // Estado de datos
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Paginación
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);

    // Filtros
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Estadísticas
    const [stats, setStats] = useState(null);

    // Cargar estadísticas
    const loadStats = useCallback(async () => {
        try {
            const response = await billingService.getStats();
            setStats(response.data);
        } catch (err) {
            console.error('Error cargando estadísticas:', err);
        }
    }, []);

    // Cargar facturas
    const loadInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: page + 1,
                limit: rowsPerPage,
                search: search || undefined,
                status: statusFilter || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined
            };

            const response = await billingService.getInvoices(params);
            setInvoices(response.data || []);
            setTotalCount(response.pagination?.total || 0);
        } catch (err) {
            console.error('Error cargando facturas:', err);
            setError('Error al cargar las facturas');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, search, statusFilter, dateFrom, dateTo]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    // Handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearchChange = (event) => {
        setSearch(event.target.value);
        setPage(0);
    };

    const handleStatusChange = (event) => {
        setStatusFilter(event.target.value);
        setPage(0);
    };

    // Navegar a detalle de factura
    const handleViewInvoice = (invoiceId) => {
        window.location.hash = `#/factura-detalle/${invoiceId}`;
    };

    // Formatear estado de factura
    const renderStatus = (status) => {
        const { label, color, icon } = billingService.formatInvoiceStatus(status);
        return (
            <Chip
                label={`${icon} ${label}`}
                color={color}
                size="small"
                sx={{ fontWeight: 500 }}
            />
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon color="primary" />
                Facturas
            </Typography>

            {/* Cards de estadísticas */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Total Facturas</Typography>
                            <Typography variant="h5" color="primary">
                                {stats?.totalInvoices || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Pendientes</Typography>
                            <Typography variant="h5" color="error.main">
                                {stats?.pendingInvoices || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Pagadas</Typography>
                            <Typography variant="h5" color="success.main">
                                {stats?.paidInvoices || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Saldo Total</Typography>
                            <Typography variant="h5" color="warning.main">
                                {billingService.formatCurrency(stats?.totalPendingAmount || 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filtros */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Buscar por número o cliente..."
                            value={search}
                            onChange={handleSearchChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Estado</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Estado"
                                onChange={handleStatusChange}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="PAID">🟢 Pagada</MenuItem>
                                <MenuItem value="PARTIAL">🟡 Parcial</MenuItem>
                                <MenuItem value="PENDING">🔴 Pendiente</MenuItem>
                                <MenuItem value="OVERDUE">⚫ Vencida</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 2 }}>
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
                    <Grid size={{ xs: 6, sm: 2 }}>
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
                    <Grid size={{ xs: 6, sm: 2 }} sx={{ textAlign: 'right' }}>
                        <Tooltip title="Actualizar">
                            <IconButton onClick={loadInvoices}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabla de facturas */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Nº Factura</strong></TableCell>
                            <TableCell><strong>Cliente</strong></TableCell>
                            <TableCell><strong>Fecha Emisión</strong></TableCell>
                            <TableCell align="right"><strong>Total</strong></TableCell>
                            <TableCell align="right"><strong>Saldo</strong></TableCell>
                            <TableCell align="center"><strong>Estado</strong></TableCell>
                            <TableCell align="center"><strong>Acciones</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            // Skeleton de carga
                            [...Array(5)].map((_, index) => (
                                <TableRow key={index}>
                                    {[...Array(7)].map((_, cellIndex) => (
                                        <TableCell key={cellIndex}>
                                            <Skeleton variant="text" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography color="error" sx={{ py: 2 }}>{error}</Typography>
                                </TableCell>
                            </TableRow>
                        ) : invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography color="text.secondary" sx={{ py: 2 }}>
                                        No se encontraron facturas
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((invoice) => (
                                <TableRow
                                    key={invoice.id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleViewInvoice(invoice.id)}
                                >
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {invoice.invoiceNumber}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{invoice.clientName || '-'}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {invoice.clientTaxId}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {billingService.formatDate(invoice.issueDate)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {billingService.formatCurrency(invoice.totalAmount)}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography
                                            variant="body2"
                                            color={invoice.balance > 0 ? 'error.main' : 'success.main'}
                                            fontWeight={500}
                                        >
                                            {billingService.formatCurrency(invoice.balance)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        {renderStatus(invoice.status)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Ver detalle">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewInvoice(invoice.id);
                                                }}
                                            >
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
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

export default ListaFacturas;
