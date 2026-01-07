import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    Button,
    Chip,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
    Grid,
    Collapse,
    FormControlLabel,
    Switch,
    Stack
} from '@mui/material';
import {
    Analytics as AnalyticsIcon,
    Search as SearchIcon,
    Warning as WarningIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon
} from '@mui/icons-material';
import apiClient from '../../services/api-client';

/**
 * Componente de Análisis UAFE
 * Muestra todas las personas registradas con estadísticas para detectar actividad inusual
 */
const AnalisisUAFE = () => {
    const [personas, setPersonas] = useState([]);
    const [kpis, setKpis] = useState({ totalPersonas: 0, personasConAlerta: 0, montoTotalProcesado: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [soloAlertas, setSoloAlertas] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        cargarPersonas();
    }, [soloAlertas]);

    const cargarPersonas = async (pageNum = 1, append = false) => {
        try {
            if (!append) setLoading(true);

            const params = new URLSearchParams({
                page: pageNum,
                limit: 20,
                search: search,
                soloAlertas: soloAlertas.toString()
            });

            const response = await apiClient.get(`/formulario-uafe/admin/personas-registradas?${params}`);

            if (response.data.success) {
                if (append) {
                    setPersonas(prev => [...prev, ...response.data.data]);
                } else {
                    setPersonas(response.data.data);
                }
                setKpis(response.data.kpis);
                setHasMore(response.data.pagination.hasMore);
                setPage(pageNum);
            }
            setError(null);
        } catch (err) {
            setError('Error al cargar personas registradas');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        cargarPersonas(1, false);
    };

    const handleLoadMore = () => {
        cargarPersonas(page + 1, true);
    };

    const toggleExpandRow = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const exportCSV = () => {
        const headers = ['Cédula/RUC', 'Nombre', 'Tipo', 'Email', 'Teléfono', 'Profesión', 'Ingreso Mensual', 'Protocolos', 'Monto Total', 'Última Actividad', 'Alerta'];
        const rows = personas.map(p => [
            p.numeroIdentificacion,
            p.nombre,
            p.tipoPersona,
            p.email,
            p.telefono,
            p.profesion,
            p.ingresoMensual,
            p.totalProtocolos,
            p.montoTotal,
            formatDate(p.ultimaActividad),
            p.tieneAlerta ? p.motivoAlerta : 'No'
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analisis_uafe_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading && personas.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AnalyticsIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
                    <Typography variant="h5" fontWeight="bold">Análisis UAFE</Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={exportCSV}
                        disabled={personas.length === 0}
                    >
                        Exportar CSV
                    </Button>
                    <Tooltip title="Actualizar">
                        <IconButton onClick={() => cargarPersonas(1, false)} color="primary">
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* KPIs */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography color="textSecondary" variant="overline">Total Personas</Typography>
                                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                                        {kpis.totalPersonas}
                                    </Typography>
                                </Box>
                                <PeopleIcon sx={{ fontSize: 40, color: 'primary.light' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography color="textSecondary" variant="overline">Con Alerta</Typography>
                                    <Typography variant="h4" fontWeight="bold" color="error.main">
                                        {kpis.personasConAlerta}
                                    </Typography>
                                </Box>
                                <WarningIcon sx={{ fontSize: 40, color: 'error.light' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography color="textSecondary" variant="overline">Monto Total</Typography>
                                    <Typography variant="h4" fontWeight="bold" color="success.main">
                                        {formatCurrency(kpis.montoTotalProcesado)}
                                    </Typography>
                                </Box>
                                <MoneyIcon sx={{ fontSize: 40, color: 'success.light' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filtros */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <TextField
                            size="small"
                            placeholder="Buscar por cédula o nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            sx={{ minWidth: 250 }}
                            InputProps={{
                                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                            }}
                        />
                        <Button variant="contained" onClick={handleSearch}>
                            Buscar
                        </Button>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={soloAlertas}
                                    onChange={(e) => setSoloAlertas(e.target.checked)}
                                    color="error"
                                />
                            }
                            label="Solo con alertas"
                        />
                    </Stack>
                </CardContent>
            </Card>

            {/* Tabla de Personas */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'primary.main' }}>
                            <TableCell sx={{ color: 'white', width: 40 }}></TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cédula/RUC</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tipo</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Protocolos</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Monto Total</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Ingreso Mensual</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Última Actividad</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Alerta</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {personas.map((persona) => (
                            <React.Fragment key={persona.id}>
                                <TableRow hover sx={{ backgroundColor: persona.tieneAlerta ? 'error.light' : 'inherit' }}>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => toggleExpandRow(persona.id)}>
                                            {expandedRow === persona.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{persona.numeroIdentificacion}</TableCell>
                                    <TableCell>{persona.nombre}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={persona.tipoPersona}
                                            size="small"
                                            color={persona.tipoPersona === 'NATURAL' ? 'primary' : 'secondary'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={persona.totalProtocolos}
                                            size="small"
                                            color={persona.totalProtocolos > 3 ? 'error' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(persona.montoTotal)}</TableCell>
                                    <TableCell align="right">{formatCurrency(persona.ingresoMensual)}</TableCell>
                                    <TableCell>{formatDate(persona.ultimaActividad)}</TableCell>
                                    <TableCell align="center">
                                        {persona.tieneAlerta ? (
                                            <Tooltip title={persona.motivoAlerta}>
                                                <Chip
                                                    icon={<WarningIcon />}
                                                    label="ALERTA"
                                                    size="small"
                                                    color="error"
                                                />
                                            </Tooltip>
                                        ) : (
                                            <Chip label="OK" size="small" color="success" variant="outlined" />
                                        )}
                                    </TableCell>
                                </TableRow>

                                {/* Fila expandida con detalles */}
                                <TableRow>
                                    <TableCell colSpan={9} sx={{ p: 0 }}>
                                        <Collapse in={expandedRow === persona.id} timeout="auto" unmountOnExit>
                                            <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} md={4}>
                                                        <Typography variant="subtitle2" fontWeight="bold">Contacto</Typography>
                                                        <Typography variant="body2">Email: {persona.email}</Typography>
                                                        <Typography variant="body2">Teléfono: {persona.telefono}</Typography>
                                                        <Typography variant="body2">Profesión: {persona.profesion}</Typography>
                                                    </Grid>
                                                    <Grid item xs={12} md={8}>
                                                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                                            Protocolos ({persona.totalProtocolos})
                                                        </Typography>
                                                        {persona.protocolosResumen && persona.protocolosResumen.length > 0 ? (
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell>Protocolo</TableCell>
                                                                        <TableCell>Acto</TableCell>
                                                                        <TableCell>Calidad</TableCell>
                                                                        <TableCell align="right">Valor</TableCell>
                                                                        <TableCell>Fecha</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {persona.protocolosResumen.map((proto, idx) => (
                                                                        <TableRow key={idx}>
                                                                            <TableCell>{proto.numeroProtocolo}</TableCell>
                                                                            <TableCell>{proto.actoContrato}</TableCell>
                                                                            <TableCell>{proto.calidad}</TableCell>
                                                                            <TableCell align="right">{formatCurrency(proto.valorContrato)}</TableCell>
                                                                            <TableCell>{formatDate(proto.fecha)}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        ) : (
                                                            <Typography variant="body2" color="textSecondary">
                                                                Sin protocolos registrados
                                                            </Typography>
                                                        )}
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}

                        {personas.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        No se encontraron personas registradas
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Cargar más */}
            {hasMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button variant="outlined" onClick={handleLoadMore} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : 'Cargar más'}
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default AnalisisUAFE;
