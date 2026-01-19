import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Grid,
    TextField,
    IconButton,
    Tooltip,
    Chip
} from '@mui/material';
import {
    Assessment as ReportIcon,
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    AccountBalance as CarteraIcon,
    Payment as PaymentIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';
import * as XLSX from 'xlsx';

/**
 * Reportes Component
 * Permite generar y descargar reportes de facturación
 * 
 * Reportes disponibles:
 * 1. Cartera por Cobrar - Clientes con saldo pendiente
 * 2. Pagos del Período - Pagos en un rango de fechas
 * 3. Facturas Vencidas - Facturas con días de mora
 */
const Reportes = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reportData, setReportData] = useState(null);

    // Date filters for "Pagos del Período"
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [dateFrom, setDateFrom] = useState(firstDayOfMonth.toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);

    const reportTypes = [
        { id: 'cartera', label: 'Cartera por Cobrar', icon: <CarteraIcon /> },
        { id: 'pagos', label: 'Pagos del Período', icon: <PaymentIcon /> },
        { id: 'vencidas', label: 'Facturas Vencidas', icon: <WarningIcon /> }
    ];

    const loadReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        setReportData(null);

        try {
            let data;
            switch (activeTab) {
                case 0:
                    data = await billingService.getReporteCarteraPorCobrar();
                    break;
                case 1:
                    data = await billingService.getReportePagosDelPeriodo(dateFrom, dateTo);
                    break;
                case 2:
                    data = await billingService.getReporteFacturasVencidas();
                    break;
                default:
                    data = null;
            }
            setReportData(data);
        } catch (err) {
            console.error('Error loading report:', err);
            setError('Error al cargar el reporte');
        } finally {
            setLoading(false);
        }
    }, [activeTab, dateFrom, dateTo]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

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

    const exportToExcel = () => {
        if (!reportData?.data || reportData.data.length === 0) return;

        let sheetData;
        let fileName;

        switch (activeTab) {
            case 0: // Cartera por Cobrar
                sheetData = reportData.data.map(row => ({
                    'Cédula/RUC': row.clientTaxId,
                    'Cliente': row.clientName,
                    'Facturas': row.invoiceCount,
                    'Total Facturado': row.totalInvoiced,
                    'Total Pagado': row.totalPaid,
                    'Saldo': row.balance,
                    'Matrizador': row.matrizador
                }));
                fileName = `Cartera_Por_Cobrar_${new Date().toISOString().split('T')[0]}.xlsx`;
                break;
            case 1: // Pagos del Período
                sheetData = reportData.data.map(row => ({
                    'Fecha': formatDate(row.fecha),
                    'Recibo': row.recibo,
                    'Cliente': row.cliente,
                    'Cédula/RUC': row.cedula,
                    'Factura': row.factura,
                    'Monto': row.monto,
                    'Concepto': row.concepto
                }));
                fileName = `Pagos_${dateFrom}_a_${dateTo}.xlsx`;
                break;
            case 2: // Facturas Vencidas
                sheetData = reportData.data.map(row => ({
                    'Factura': row.factura,
                    'Cliente': row.cliente,
                    'Cédula/RUC': row.cedula,
                    'Teléfono': row.telefono,
                    'Emisión': formatDate(row.emision),
                    'Vencimiento': formatDate(row.vencimiento),
                    'Días Vencido': row.diasVencido,
                    'Total Factura': row.totalFactura,
                    'Pagado': row.pagado,
                    'Saldo': row.saldo,
                    'Matrizador': row.matrizador
                }));
                fileName = `Facturas_Vencidas_${new Date().toISOString().split('T')[0]}.xlsx`;
                break;
            default:
                return;
        }

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sheetData);

        // Auto-width columns
        const colWidths = Object.keys(sheetData[0] || {}).map(key => ({
            wch: Math.max(key.length, 15)
        }));
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        XLSX.writeFile(wb, fileName);
    };

    const renderTotalsCard = () => {
        if (!reportData?.totals) return null;

        switch (activeTab) {
            case 0: // Cartera por Cobrar
                return (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="overline" color="text.secondary">
                                        Clientes
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        {reportData.totals.clientCount}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="overline" color="text.secondary">
                                        Total Facturado
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        {formatCurrency(reportData.totals.totalInvoiced)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="overline" color="text.secondary">
                                        Total Pagado
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="success.main">
                                        {formatCurrency(reportData.totals.totalPaid)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card sx={{ bgcolor: 'error.light' }}>
                                <CardContent>
                                    <Typography variant="overline" color="error.contrastText">
                                        Saldo Pendiente
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="error.contrastText">
                                        {formatCurrency(reportData.totals.totalBalance)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                );
            case 1: // Pagos del Período
                return (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="overline" color="text.secondary">
                                        Cantidad de Pagos
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        {reportData.totals.count}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={4}>
                            <Card sx={{ bgcolor: 'success.light' }}>
                                <CardContent>
                                    <Typography variant="overline" color="success.contrastText">
                                        Total Recaudado
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="success.contrastText">
                                        {formatCurrency(reportData.totals.totalMonto)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                );
            case 2: // Facturas Vencidas
                return (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={3}>
                            <Card sx={{ bgcolor: 'error.light' }}>
                                <CardContent>
                                    <Typography variant="overline" color="error.contrastText">
                                        Facturas Vencidas
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="error.contrastText">
                                        {reportData.totals.count}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="overline" color="text.secondary">
                                        Total Facturado
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        {formatCurrency(reportData.totals.totalFacturado)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="overline" color="text.secondary">
                                        Total Pagado
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="success.main">
                                        {formatCurrency(reportData.totals.totalPagado)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="overline" color="text.secondary">
                                        Saldo Pendiente
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="error.main">
                                        {formatCurrency(reportData.totals.totalSaldo)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                );
            default:
                return null;
        }
    };

    const renderTable = () => {
        if (!reportData?.data || reportData.data.length === 0) {
            return (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        No hay datos para mostrar
                    </Typography>
                </Paper>
            );
        }

        switch (activeTab) {
            case 0: // Cartera por Cobrar
                return (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'primary.main' }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cédula/RUC</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cliente</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Facturas</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Facturado</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Pagado</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Saldo</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Matrizador</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.data.map((row, idx) => (
                                    <TableRow key={idx} hover>
                                        <TableCell>{row.clientTaxId}</TableCell>
                                        <TableCell>{row.clientName}</TableCell>
                                        <TableCell align="center">{row.invoiceCount}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.totalInvoiced)}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.totalPaid)}</TableCell>
                                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                            {formatCurrency(row.balance)}
                                        </TableCell>
                                        <TableCell>{row.matrizador}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 1: // Pagos del Período
                return (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'success.main' }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Recibo</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cliente</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cédula/RUC</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Factura</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Monto</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Concepto</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.data.map((row, idx) => (
                                    <TableRow key={idx} hover>
                                        <TableCell>{formatDate(row.fecha)}</TableCell>
                                        <TableCell>{row.recibo}</TableCell>
                                        <TableCell>{row.cliente}</TableCell>
                                        <TableCell>{row.cedula}</TableCell>
                                        <TableCell>{row.factura}</TableCell>
                                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                            {formatCurrency(row.monto)}
                                        </TableCell>
                                        <TableCell>{row.concepto}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 2: // Facturas Vencidas
                return (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'error.main' }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Factura</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cliente</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vencimiento</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Días</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Total</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Saldo</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Matrizador</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.data.map((row, idx) => (
                                    <TableRow key={idx} hover>
                                        <TableCell>{row.factura}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{row.cliente}</Typography>
                                            <Typography variant="caption" color="text.secondary">{row.cedula}</Typography>
                                        </TableCell>
                                        <TableCell>{formatDate(row.vencimiento)}</TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={`${row.diasVencido}d`}
                                                size="small"
                                                color={row.diasVencido > 30 ? 'error' : 'warning'}
                                            />
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(row.totalFactura)}</TableCell>
                                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                            {formatCurrency(row.saldo)}
                                        </TableCell>
                                        <TableCell>{row.matrizador}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            default:
                return null;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <ReportIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Typography variant="h4" fontWeight="bold">
                        Reportes de Facturación
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Tooltip title="Actualizar">
                        <IconButton onClick={loadReport} color="primary" disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<DownloadIcon />}
                        onClick={exportToExcel}
                        disabled={loading || !reportData?.data?.length}
                    >
                        Exportar Excel
                    </Button>
                </Box>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    variant="fullWidth"
                >
                    {reportTypes.map((report, index) => (
                        <Tab
                            key={report.id}
                            icon={report.icon}
                            label={report.label}
                            iconPosition="start"
                        />
                    ))}
                </Tabs>
            </Paper>

            {/* Date Filters for Pagos del Período */}
            {activeTab === 1 && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Box display="flex" gap={2} alignItems="center">
                        <Typography variant="subtitle2" color="text.secondary">
                            Período:
                        </Typography>
                        <TextField
                            type="date"
                            label="Desde"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            type="date"
                            label="Hasta"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                        />
                        <Button variant="outlined" onClick={loadReport} disabled={loading}>
                            Aplicar
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Error */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                    <Button onClick={loadReport} sx={{ ml: 2 }}>Reintentar</Button>
                </Alert>
            )}

            {/* Loading */}
            {loading && (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            )}

            {/* Content */}
            {!loading && !error && (
                <>
                    {/* Totals Cards */}
                    {renderTotalsCard()}

                    {/* Generated timestamp */}
                    {reportData?.generatedAt && (
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                            Generado: {new Date(reportData.generatedAt).toLocaleString('es-EC')}
                        </Typography>
                    )}

                    {/* Data Table */}
                    {renderTable()}
                </>
            )}
        </Box>
    );
};

export default Reportes;
