import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
    Collapse
} from '@mui/material';
import {
    Assessment as ReportIcon,
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    AccountBalance as CarteraIcon,
    Payment as PaymentIcon,
    Warning as WarningIcon,
    LocalShipping as DeliveryIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Sort as SortIcon,
    ArrowUpward as AscIcon,
    ArrowDownward as DescIcon,
    Clear as ClearIcon,
    KeyboardArrowDown as ExpandIcon,
    KeyboardArrowUp as CollapseIcon,
    Send as SendIcon
} from '@mui/icons-material';
import billingService from '../../services/billing-service';
import * as XLSX from 'xlsx';
import MensajeCobroModal from './MensajeCobroModal';

/**
 * Reportes Component - Enhanced with Admin Filters
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
    const [showFilters, setShowFilters] = useState(true);

    // Date filters for "Pagos del Período"
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [dateFrom, setDateFrom] = useState(firstDayOfMonth.toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
    
    // Estado para filas expandidas en Cartera por Cobrar
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Estado para modal de mensaje de cobro
    const [mensajeModal, setMensajeModal] = useState({ open: false, clientData: null });

    // Enhanced filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMatrizador, setSelectedMatrizador] = useState('');
    const [minBalance, setMinBalance] = useState('');
    const [sortField, setSortField] = useState('balance');
    const [sortDirection, setSortDirection] = useState('desc');

    const reportTypes = [
        { id: 'cartera', label: 'Cartera por Cobrar', icon: <CarteraIcon /> },
        { id: 'pagos', label: 'Pagos del Período', icon: <PaymentIcon /> },
        { id: 'vencidas', label: 'Facturas Vencidas', icon: <WarningIcon /> },
        { id: 'entregas', label: 'Entregas con Saldo', icon: <DeliveryIcon /> }
    ];

    // Extract unique matrizadores from data
    const uniqueMatrizadores = useMemo(() => {
        if (!reportData?.data) return [];
        const matrizadores = new Set();
        reportData.data.forEach(row => {
            const mat = row.matrizador || row.matrizador_name;
            if (mat && mat !== 'Sin asignar') {
                matrizadores.add(mat);
            }
        });
        return Array.from(matrizadores).sort();
    }, [reportData]);

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
                case 3:
                    data = await billingService.getReporteEntregasConSaldo();
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
        // Reset filters when changing tabs
        setSearchTerm('');
        setSelectedMatrizador('');
        setMinBalance('');
    }, [loadReport]);

    // Apply filters and sorting
    const filteredData = useMemo(() => {
        if (!reportData?.data) return [];

        let filtered = [...reportData.data];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(row => {
                const searchFields = [
                    row.clientName, row.clientTaxId, row.cliente, row.cedula, row.factura
                ].filter(Boolean);
                return searchFields.some(field => field.toLowerCase().includes(term));
            });
        }

        // Matrizador filter
        if (selectedMatrizador) {
            filtered = filtered.filter(row => {
                const mat = row.matrizador || row.matrizador_name;
                return mat === selectedMatrizador;
            });
        }

        // Minimum balance filter
        if (minBalance && !isNaN(parseFloat(minBalance))) {
            const min = parseFloat(minBalance);
            filtered = filtered.filter(row => {
                const balance = row.balance || row.saldo || row.monto || 0;
                return balance >= min;
            });
        }

        // Sorting
        filtered.sort((a, b) => {
            let aVal, bVal;

            switch (sortField) {
                case 'balance':
                    aVal = a.balance || a.saldo || 0;
                    bVal = b.balance || b.saldo || 0;
                    break;
                case 'monto':
                    aVal = a.monto || a.totalInvoiced || 0;
                    bVal = b.monto || b.totalInvoiced || 0;
                    break;
                case 'diasVencido':
                    aVal = a.diasVencido || 0;
                    bVal = b.diasVencido || 0;
                    break;
                case 'cliente':
                    aVal = (a.clientName || a.cliente || '').toLowerCase();
                    bVal = (b.clientName || b.cliente || '').toLowerCase();
                    break;
                case 'fecha':
                    aVal = new Date(a.fecha || a.issueDate || 0).getTime();
                    bVal = new Date(b.fecha || b.issueDate || 0).getTime();
                    break;
                case 'oldestInvoice':
                    aVal = a.invoices?.length
                        ? Math.min(...a.invoices.map(inv => new Date(inv.issueDate || 0).getTime()))
                        : Date.now();
                    bVal = b.invoices?.length
                        ? Math.min(...b.invoices.map(inv => new Date(inv.issueDate || 0).getTime()))
                        : Date.now();
                    break;
                default:
                    aVal = a.balance || a.saldo || 0;
                    bVal = b.balance || b.saldo || 0;
            }

            if (typeof aVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return filtered;
    }, [reportData, searchTerm, selectedMatrizador, minBalance, sortField, sortDirection]);

    // Recalculate totals based on filtered data
    const filteredTotals = useMemo(() => {
        if (filteredData.length === 0) return null;

        switch (activeTab) {
            case 0: // Cartera
                return filteredData.reduce((acc, row) => ({
                    clientCount: acc.clientCount + 1,
                    totalInvoiced: acc.totalInvoiced + (row.totalInvoiced || 0),
                    totalPaid: acc.totalPaid + (row.totalPaid || 0),
                    totalBalance: acc.totalBalance + (row.balance || 0)
                }), { clientCount: 0, totalInvoiced: 0, totalPaid: 0, totalBalance: 0 });
            case 1: // Pagos
                return {
                    count: filteredData.length,
                    totalMonto: filteredData.reduce((sum, row) => sum + (row.monto || 0), 0)
                };
            case 2: // Vencidas
                return filteredData.reduce((acc, row) => ({
                    count: acc.count + 1,
                    totalFacturado: acc.totalFacturado + (row.totalFactura || 0),
                    totalPagado: acc.totalPagado + (row.pagado || 0),
                    totalSaldo: acc.totalSaldo + (row.saldo || 0)
                }), { count: 0, totalFacturado: 0, totalPagado: 0, totalSaldo: 0 });
            case 3: // Entregas con Saldo
                return filteredData.reduce((acc, row) => ({
                    count: acc.count + 1,
                    totalFacturado: acc.totalFacturado + (row.totalFacturado || 0),
                    totalPagado: acc.totalPagado + (row.totalPagado || 0),
                    totalSaldo: acc.totalSaldo + (row.saldoPendiente || 0)
                }), { count: 0, totalFacturado: 0, totalPagado: 0, totalSaldo: 0 });
            default:
                return null;
        }
    }, [filteredData, activeTab]);

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

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedMatrizador('');
        setMinBalance('');
        setSortField('balance');
        setSortDirection('desc');
    };

    const hasActiveFilters = searchTerm || selectedMatrizador || minBalance;

    const getHeaderCellSx = (paletteColor, extraSx = {}) => ({
        backgroundColor: `${paletteColor}.main`,
        color: `${paletteColor}.contrastText`,
        fontWeight: 'bold',
        ...extraSx
    });

    const exportToExcel = () => {
        if (filteredData.length === 0) return;

        let sheetData;
        let fileName;

        switch (activeTab) {
            case 0:
                sheetData = filteredData.map(row => ({
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
            case 1:
                sheetData = filteredData.map(row => ({
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
            case 2:
                sheetData = filteredData.map(row => ({
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
            case 3:
                sheetData = filteredData.map(row => ({
                    'Protocolo': row.protocolo,
                    'Cliente': row.cliente,
                    'Cédula/RUC': row.cedula,
                    'Teléfono': row.telefono,
                    'Fecha Entrega': formatDate(row.fechaEntrega),
                    'Días desde Entrega': row.diasDesdeEntrega,
                    'Facturas': row.facturas,
                    'Total Facturado': row.totalFacturado,
                    'Total Pagado': row.totalPagado,
                    'Saldo Pendiente': row.saldoPendiente,
                    'Matrizador': row.matrizador
                }));
                fileName = `Entregas_Con_Saldo_${new Date().toISOString().split('T')[0]}.xlsx`;
                break;
            default:
                return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sheetData);
        const colWidths = Object.keys(sheetData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        XLSX.writeFile(wb, fileName);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortableHeader = ({ field, children, ...props }) => (
        <TableCell
            {...props}
            onClick={() => handleSort(field)}
            sx={{
                ...props.sx,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
        >
            <Box display="flex" alignItems="center" gap={0.5}>
                {children}
                {sortField === field && (
                    sortDirection === 'asc' ? <AscIcon fontSize="small" /> : <DescIcon fontSize="small" />
                )}
            </Box>
        </TableCell>
    );

    const renderFiltersBar = () => (
        <Collapse in={showFilters}>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    {/* Search */}
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Buscar cliente"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>

                    {/* Matrizador filter */}
                    {(activeTab === 0 || activeTab === 2) && uniqueMatrizadores.length > 0 && (
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Matrizador</InputLabel>
                                <Select
                                    value={selectedMatrizador}
                                    label="Matrizador"
                                    onChange={(e) => setSelectedMatrizador(e.target.value)}
                                >
                                    <MenuItem value="">Todos</MenuItem>
                                    {uniqueMatrizadores.map(mat => (
                                        <MenuItem key={mat} value={mat}>{mat}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}

                    {/* Minimum balance filter */}
                    {(activeTab === 0 || activeTab === 2) && (
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Saldo mínimo"
                                value={minBalance}
                                onChange={(e) => setMinBalance(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                                }}
                            />
                        </Grid>
                    )}

                    {/* Sort options */}
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Ordenar por</InputLabel>
                            <Select
                                value={sortField}
                                label="Ordenar por"
                                onChange={(e) => setSortField(e.target.value)}
                            >
                                {activeTab === 0 && <MenuItem value="balance">Saldo</MenuItem>}
                                {activeTab === 0 && <MenuItem value="monto">Total Facturado</MenuItem>}
                                {activeTab === 0 && <MenuItem value="oldestInvoice">Mas Antiguo</MenuItem>}
                                {activeTab === 1 && <MenuItem value="monto">Monto</MenuItem>}
                                {activeTab === 1 && <MenuItem value="fecha">Fecha</MenuItem>}
                                {activeTab === 2 && <MenuItem value="saldo">Saldo</MenuItem>}
                                {activeTab === 2 && <MenuItem value="diasVencido">Días Vencido</MenuItem>}
                                <MenuItem value="cliente">Cliente</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Sort direction */}
                    <Grid item xs={6} md={1}>
                        <Tooltip title={sortDirection === 'desc' ? 'Mayor a menor' : 'Menor a mayor'}>
                            <IconButton onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}>
                                {sortDirection === 'desc' ? <DescIcon /> : <AscIcon />}
                            </IconButton>
                        </Tooltip>
                    </Grid>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <Grid item xs={6} md={2}>
                            <Button
                                startIcon={<ClearIcon />}
                                onClick={clearFilters}
                                color="secondary"
                                size="small"
                            >
                                Limpiar filtros
                            </Button>
                        </Grid>
                    )}

                    {/* Date filters for Pagos */}
                    {activeTab === 1 && (
                        <>
                            <Grid item xs={12}>
                                <Box display="flex" gap={2} alignItems="center" mt={1}>
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
                            </Grid>
                        </>
                    )}
                </Grid>

                {/* Filter status */}
                {hasActiveFilters && (
                    <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary">
                            Mostrando {filteredData.length} de {reportData?.data?.length || 0} registros
                        </Typography>
                        {searchTerm && <Chip size="small" label={`Búsqueda: ${searchTerm}`} onDelete={() => setSearchTerm('')} />}
                        {selectedMatrizador && <Chip size="small" label={`Matrizador: ${selectedMatrizador}`} onDelete={() => setSelectedMatrizador('')} />}
                        {minBalance && <Chip size="small" label={`Saldo ≥ $${minBalance}`} onDelete={() => setMinBalance('')} />}
                    </Box>
                )}
            </Paper>
        </Collapse>
    );

    const renderTotalsCard = () => {
        const totals = filteredTotals || reportData?.totals;
        if (!totals) return null;

        switch (activeTab) {
            case 0:
                return (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={3}>
                            <Card><CardContent>
                                <Typography variant="overline" color="text.secondary">Clientes</Typography>
                                <Typography variant="h5" fontWeight="bold">{totals.clientCount}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card><CardContent>
                                <Typography variant="overline" color="text.secondary">Total Facturado</Typography>
                                <Typography variant="h5" fontWeight="bold">{formatCurrency(totals.totalInvoiced)}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card><CardContent>
                                <Typography variant="overline" color="text.secondary">Total Pagado</Typography>
                                <Typography variant="h5" fontWeight="bold" color="success.main">{formatCurrency(totals.totalPaid)}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card sx={{ bgcolor: 'error.light' }}><CardContent>
                                <Typography variant="overline" color="error.contrastText">Saldo Pendiente</Typography>
                                <Typography variant="h5" fontWeight="bold" color="error.contrastText">{formatCurrency(totals.totalBalance)}</Typography>
                            </CardContent></Card>
                        </Grid>
                    </Grid>
                );
            case 1:
                return (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={4}>
                            <Card><CardContent>
                                <Typography variant="overline" color="text.secondary">Cantidad de Pagos</Typography>
                                <Typography variant="h5" fontWeight="bold">{totals.count}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={4}>
                            <Card sx={{ bgcolor: 'success.light' }}><CardContent>
                                <Typography variant="overline" color="success.contrastText">Total Recaudado</Typography>
                                <Typography variant="h5" fontWeight="bold" color="success.contrastText">{formatCurrency(totals.totalMonto)}</Typography>
                            </CardContent></Card>
                        </Grid>
                    </Grid>
                );
            case 2:
                return (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={3}>
                            <Card sx={{ bgcolor: 'error.light' }}><CardContent>
                                <Typography variant="overline" color="error.contrastText">Facturas Vencidas</Typography>
                                <Typography variant="h5" fontWeight="bold" color="error.contrastText">{totals.count}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card><CardContent>
                                <Typography variant="overline" color="text.secondary">Total Facturado</Typography>
                                <Typography variant="h5" fontWeight="bold">{formatCurrency(totals.totalFacturado)}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card><CardContent>
                                <Typography variant="overline" color="text.secondary">Total Pagado</Typography>
                                <Typography variant="h5" fontWeight="bold" color="success.main">{formatCurrency(totals.totalPagado)}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card><CardContent>
                                <Typography variant="overline" color="text.secondary">Saldo Pendiente</Typography>
                                <Typography variant="h5" fontWeight="bold" color="error.main">{formatCurrency(totals.totalSaldo)}</Typography>
                            </CardContent></Card>
                        </Grid>
                    </Grid>
                );
            case 3: // Entregas con Saldo
                return (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={3}>
                            <Card sx={{ bgcolor: 'warning.light' }}><CardContent>
                                <Typography variant="overline" color="warning.contrastText">Entregas con Saldo</Typography>
                                <Typography variant="h5" fontWeight="bold" color="warning.contrastText">{totals.count}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card><CardContent>
                                <Typography variant="overline" color="text.secondary">Total Facturado</Typography>
                                <Typography variant="h5" fontWeight="bold">{formatCurrency(totals.totalFacturado)}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card><CardContent>
                                <Typography variant="overline" color="text.secondary">Total Pagado</Typography>
                                <Typography variant="h5" fontWeight="bold" color="success.main">{formatCurrency(totals.totalPagado)}</Typography>
                            </CardContent></Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card sx={{ bgcolor: 'error.light' }}><CardContent>
                                <Typography variant="overline" color="error.contrastText">Saldo Pendiente</Typography>
                                <Typography variant="h5" fontWeight="bold" color="error.contrastText">{formatCurrency(totals.totalSaldo)}</Typography>
                            </CardContent></Card>
                        </Grid>
                    </Grid>
                );
            default:
                return null;
        }
    };

    const renderTable = () => {
        if (filteredData.length === 0) {
            return (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        {hasActiveFilters ? 'No hay datos que coincidan con los filtros' : 'No hay datos para mostrar'}
                    </Typography>
                </Paper>
            );
        }

        // Función para toggle de fila expandida
        const toggleRow = (clientTaxId) => {
            setExpandedRows(prev => {
                const newSet = new Set(prev);
                if (newSet.has(clientTaxId)) {
                    newSet.delete(clientTaxId);
                } else {
                    newSet.add(clientTaxId);
                }
                return newSet;
            });
        };

        switch (activeTab) {
            case 0:
                return (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'primary.main' }}>
                                    <TableCell sx={getHeaderCellSx('primary', { width: 50 })}></TableCell>
                                    <TableCell sx={getHeaderCellSx('primary')}>Cédula/RUC</TableCell>
                                    <SortableHeader field="cliente" sx={getHeaderCellSx('primary')}>Cliente</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('primary')} align="center">Facturas</TableCell>
                                    <SortableHeader field="monto" sx={getHeaderCellSx('primary')} align="right">Facturado</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('primary')} align="right">Pagado</TableCell>
                                    <SortableHeader field="balance" sx={getHeaderCellSx('primary')} align="right">Saldo</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('primary')}>Matrizador</TableCell>
                                    <TableCell sx={getHeaderCellSx('primary')} align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData.map((row, idx) => (
                                    <React.Fragment key={idx}>
                                        <TableRow 
                                            hover 
                                            onClick={() => toggleRow(row.clientTaxId)}
                                            sx={{ cursor: 'pointer', '& > *': { borderBottom: expandedRows.has(row.clientTaxId) ? 'none' : undefined } }}
                                        >
                                            <TableCell>
                                                <IconButton size="small">
                                                    {expandedRows.has(row.clientTaxId) ? <CollapseIcon /> : <ExpandIcon />}
                                                </IconButton>
                                            </TableCell>
                                            <TableCell>{row.clientTaxId}</TableCell>
                                            <TableCell>{row.clientName}</TableCell>
                                            <TableCell align="center">{row.invoiceCount}</TableCell>
                                            <TableCell align="right">{formatCurrency(row.totalInvoiced)}</TableCell>
                                            <TableCell align="right">{formatCurrency(row.totalPaid)}</TableCell>
                                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                                {formatCurrency(row.balance)}
                                            </TableCell>
                                            <TableCell>
                                                <Chip size="small" label={row.matrizador} variant="outlined" />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Enviar mensaje de cobro al matrizador">
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMensajeModal({ open: true, clientData: row });
                                                        }}
                                                    >
                                                        <SendIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                        {/* Fila expandible con detalle de facturas */}
                                        {expandedRows.has(row.clientTaxId) && row.invoices && (
                                            <TableRow>
                                                <TableCell colSpan={9} sx={{ py: 0, bgcolor: 'grey.50' }}>
                                                    <Collapse in={expandedRows.has(row.clientTaxId)} timeout="auto" unmountOnExit>
                                                        <Box sx={{ py: 2, px: 4 }}>
                                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                                                                Detalle de Facturas
                                                            </Typography>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow sx={{ bgcolor: 'grey.200' }}>
                                                                        <TableCell sx={{ fontWeight: 'bold' }}>Factura</TableCell>
                                                                        <TableCell sx={{ fontWeight: 'bold' }}>Fecha Emisión</TableCell>
                                                                        <TableCell sx={{ fontWeight: 'bold' }}>Fecha Vencimiento</TableCell>
                                                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
                                                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Pagado</TableCell>
                                                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Saldo</TableCell>
                                                                        <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {row.invoices.map((inv, invIdx) => (
                                                                        <TableRow key={invIdx}>
                                                                            <TableCell>{inv.invoiceNumber}</TableCell>
                                                                            <TableCell>{formatDate(inv.issueDate)}</TableCell>
                                                                            <TableCell>{formatDate(inv.dueDate)}</TableCell>
                                                                            <TableCell align="right">{formatCurrency(inv.totalAmount)}</TableCell>
                                                                            <TableCell align="right">{formatCurrency(inv.paidAmount)}</TableCell>
                                                                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                                                                {formatCurrency(inv.balance)}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Chip 
                                                                                    size="small" 
                                                                                    label={inv.status}
                                                                                    color={inv.status === 'PENDING' ? 'warning' : inv.status === 'PARTIAL' ? 'info' : 'error'}
                                                                                />
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 1:
                return (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'success.main' }}>
                                    <SortableHeader field="fecha" sx={getHeaderCellSx('success')}>Fecha</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('success')}>Recibo</TableCell>
                                    <SortableHeader field="cliente" sx={getHeaderCellSx('success')}>Cliente</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('success')}>Cédula/RUC</TableCell>
                                    <TableCell sx={getHeaderCellSx('success')}>Factura</TableCell>
                                    <SortableHeader field="monto" sx={getHeaderCellSx('success')} align="right">Monto</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('success')}>Concepto</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData.map((row, idx) => (
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
            case 2:
                return (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'error.main' }}>
                                    <TableCell sx={getHeaderCellSx('error')}>Factura</TableCell>
                                    <SortableHeader field="cliente" sx={getHeaderCellSx('error')}>Cliente</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('error')}>Vencimiento</TableCell>
                                    <SortableHeader field="diasVencido" sx={getHeaderCellSx('error')} align="center">Días</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('error')} align="right">Total</TableCell>
                                    <SortableHeader field="saldo" sx={getHeaderCellSx('error')} align="right">Saldo</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('error')}>Matrizador</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData.map((row, idx) => (
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
                                                color={row.diasVencido > 60 ? 'error' : row.diasVencido > 30 ? 'warning' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(row.totalFactura)}</TableCell>
                                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                            {formatCurrency(row.saldo)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" label={row.matrizador} variant="outlined" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 3: // Entregas con Saldo
                return (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'warning.main' }}>
                                    <TableCell sx={getHeaderCellSx('warning')}>Protocolo</TableCell>
                                    <SortableHeader field="cliente" sx={getHeaderCellSx('warning')}>Cliente</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('warning')}>Entrega</TableCell>
                                    <TableCell sx={getHeaderCellSx('warning')} align="center">Días</TableCell>
                                    <TableCell sx={getHeaderCellSx('warning')} align="center">Facturas</TableCell>
                                    <TableCell sx={getHeaderCellSx('warning')} align="right">Facturado</TableCell>
                                    <SortableHeader field="saldo" sx={getHeaderCellSx('warning')} align="right">Saldo</SortableHeader>
                                    <TableCell sx={getHeaderCellSx('warning')}>Matrizador</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData.map((row, idx) => (
                                    <TableRow key={idx} hover>
                                        <TableCell sx={{ fontWeight: 'bold' }}>{row.protocolo}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{row.cliente}</Typography>
                                            <Typography variant="caption" color="text.secondary">{row.cedula}</Typography>
                                        </TableCell>
                                        <TableCell>{formatDate(row.fechaEntrega)}</TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={`${row.diasDesdeEntrega}d`}
                                                size="small"
                                                color={row.diasDesdeEntrega > 30 ? 'error' : row.diasDesdeEntrega > 15 ? 'warning' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell align="center">{row.facturas}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.totalFacturado)}</TableCell>
                                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                            {formatCurrency(row.saldoPendiente)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" label={row.matrizador} variant="outlined" />
                                        </TableCell>
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
                    <Tooltip title={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}>
                        <IconButton onClick={() => setShowFilters(!showFilters)} color={showFilters ? 'primary' : 'default'}>
                            <FilterIcon />
                        </IconButton>
                    </Tooltip>
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
                        disabled={loading || filteredData.length === 0}
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
                    {reportTypes.map((report) => (
                        <Tab
                            key={report.id}
                            icon={report.icon}
                            label={report.label}
                            iconPosition="start"
                        />
                    ))}
                </Tabs>
            </Paper>

            {/* Filters Bar */}
            {renderFiltersBar()}

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
                    {renderTotalsCard()}

                    {reportData?.generatedAt && (
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                            Generado: {new Date(reportData.generatedAt).toLocaleString('es-EC')}
                            {hasActiveFilters && ` • Filtrado: ${filteredData.length} registros`}
                        </Typography>
                    )}

                    {renderTable()}
                </>
            )}

            {/* Modal de mensaje de cobro */}
            <MensajeCobroModal
                open={mensajeModal.open}
                onClose={() => setMensajeModal({ open: false, clientData: null })}
                clientData={mensajeModal.clientData}
                onSuccess={() => setMensajeModal({ open: false, clientData: null })}
            />
        </Box>
    );
};

export default Reportes;

