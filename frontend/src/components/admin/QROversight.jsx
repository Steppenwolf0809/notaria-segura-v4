import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    CircularProgress,
    Alert,
    Chip,
    TextField,
    InputAdornment,
    FormControl,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider
} from '@mui/material';
import {
    QrCode as QrCodeIcon,
    EmojiEvents as TrophyIcon,
    Timeline as TimelineIcon,
    History as HistoryIcon,
    Search as SearchIcon,
    Visibility as VisibilityIcon,
    Refresh as RefreshIcon,
    Close as CloseIcon,
    FilterList as FilterIcon,
    OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { getSupervisionStats } from '../../services/admin-supervision-service';
import { getEscrituras } from '../../services/escrituras-qr-service';

const QROversight = () => {
    // Estados de datos
    const [stats, setStats] = useState(null);
    const [escrituras, setEscrituras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Estados de filtros
    const [search, setSearch] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Estado de modal de detalles
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedQR, setSelectedQR] = useState(null);

    // Cargar estadísticas
    const loadStats = useCallback(async () => {
        try {
            const dashData = await getSupervisionStats({ limit: 1 });
            setStats(dashData.kpis?.qrStats || { totalMonthly: 0, limit: 50, byMatrixer: [] });
        } catch (err) {
            console.error('Error cargando estadísticas de QR:', err);
        }
    }, []);

    // Cargar escrituras con filtros
    const loadEscrituras = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: page + 1,
                limit: rowsPerPage,
            };

            if (search) params.search = search;
            if (estadoFilter) params.estado = estadoFilter;

            const response = await getEscrituras(params);

            // La respuesta del backend es: { success: true, data: { escrituras: [...], pagination: {...} } }
            const escriturasData = response.data?.escrituras || response.escrituras || [];
            const pagination = response.data?.pagination || response.pagination || {};

            setEscrituras(escriturasData);
            setTotalCount(pagination.total || escriturasData.length);
            setError(null);
        } catch (err) {
            console.error('Error cargando escrituras:', err);
            setError('No se pudieron cargar las escrituras QR.');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, search, estadoFilter]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        loadEscrituras();
    }, [loadEscrituras]);

    // Handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearch = (event) => {
        setSearch(event.target.value);
        setPage(0);
    };

    const handleEstadoFilter = (event) => {
        setEstadoFilter(event.target.value);
        setPage(0);
    };

    const handleViewDetails = (qr) => {
        setSelectedQR(qr);
        setDetailsOpen(true);
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setSelectedQR(null);
    };

    // Parsear datos completos del QR
    const parseQRData = (qr) => {
        try {
            if (qr.datosCompletos) {
                return typeof qr.datosCompletos === 'string'
                    ? JSON.parse(qr.datosCompletos)
                    : qr.datosCompletos;
            }
            return null;
        } catch {
            return null;
        }
    };

    // Obtener tipo de acto del QR
    const getTipoActo = (qr) => {
        const datos = parseQRData(qr);
        return datos?.acto || datos?.tipoActo || 'N/A';
    };

    // Obtener otorgantes del QR
    const getOtorgantes = (qr) => {
        const datos = parseQRData(qr);
        if (datos?.otorgantes?.otorgado_por) {
            const otorgantes = datos.otorgantes.otorgado_por;
            if (Array.isArray(otorgantes) && otorgantes.length > 0) {
                return otorgantes.slice(0, 2).map(o => o.nombre || o).join(', ');
            }
        }
        return 'N/A';
    };

    if (loading && escrituras.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error && escrituras.length === 0) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    const { totalMonthly = 0, limit = 50, byMatrixer = [] } = stats || {};
    const progress = Math.min((totalMonthly / limit) * 100, 100);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <QrCodeIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
                    <Typography variant="h5" fontWeight="bold">Gestión de Códigos QR</Typography>
                </Box>
                <Tooltip title="Actualizar">
                    <IconButton onClick={() => { loadStats(); loadEscrituras(); }} color="primary">
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Grid container spacing={3}>
                {/* Cuota Mensual */}
                <Grid item xs={12} md={6}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} /> Uso Mensual (Cuota)
                            </Typography>
                            <Box sx={{ mt: 3, mb: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="h4" fontWeight="bold">{totalMonthly}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'flex-end' }}>
                                        Límite: {limit} / mes
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={progress}
                                    sx={{ height: 10, borderRadius: 5 }}
                                    color={progress > 90 ? 'error' : progress > 70 ? 'warning' : 'primary'}
                                />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Se han generado {totalMonthly} códigos QR de los {limit} permitidos para este mes.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Top Matrizadores QR */}
                <Grid item xs={12} md={6}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <TrophyIcon sx={{ mr: 1, color: 'warning.main' }} /> QR por Matrizador (Mes)
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                {byMatrixer.length > 0 ? (
                                    byMatrixer.sort((a, b) => b.count - a.count).map((m, index) => (
                                        <Box key={m.matrixerId} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                            <Typography variant="body2" sx={{ width: 30, fontWeight: 'bold', color: 'text.secondary' }}>
                                                #{index + 1}
                                            </Typography>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2">{m.name}</Typography>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={(m.count / Math.max(...byMatrixer.map(x => x.count))) * 100}
                                                    sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                                                />
                                            </Box>
                                            <Typography variant="body2" fontWeight="bold" sx={{ ml: 2 }}>
                                                {m.count}
                                            </Typography>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                        No hay QRs generados este mes.
                                    </Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Tabla de Escrituras con Filtros */}
                <Grid item xs={12}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <HistoryIcon sx={{ mr: 1, color: 'info.main' }} /> Escrituras QR
                            </Typography>

                            {/* Filtros */}
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                                <TextField
                                    placeholder="Buscar por token o escritura..."
                                    value={search}
                                    onChange={handleSearch}
                                    size="small"
                                    sx={{ minWidth: 250 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                    data-testid="qr-search"
                                />
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <Select
                                        value={estadoFilter}
                                        onChange={handleEstadoFilter}
                                        displayEmpty
                                        data-testid="filtro-estado-qr"
                                    >
                                        <MenuItem value="">Todos los estados</MenuItem>
                                        <MenuItem value="activo">Activo</MenuItem>
                                        <MenuItem value="revision_requerida">Revisión Requerida</MenuItem>
                                        <MenuItem value="inactivo">Inactivo</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
                                <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 850 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: 90 }}>Token</TableCell>
                                            <TableCell sx={{ width: 150 }}>N° Escritura</TableCell>
                                            <TableCell sx={{ width: 160 }}>Tipo de Acto</TableCell>
                                            <TableCell sx={{ width: 90 }}>Fecha</TableCell>
                                            <TableCell sx={{ width: 120 }}>Matrizador</TableCell>
                                            <TableCell sx={{ width: 80 }}>Estado</TableCell>
                                            <TableCell align="center" sx={{ width: 45 }}>
                                                <Tooltip title="Verificaciones"><VisibilityIcon fontSize="small" color="action" /></Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ width: 45 }}>
                                                <Tooltip title="Vistas PDF"><Box component="span" sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>PDF</Box></Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ width: 70 }}>Acciones</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={9} align="center">
                                                    <CircularProgress size={24} />
                                                </TableCell>
                                            </TableRow>
                                        ) : escrituras.length > 0 ? (
                                            escrituras.map((qr) => (
                                                <TableRow key={qr.id} hover>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {qr.token}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{qr.numeroEscritura || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={getTipoActo(qr)}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(qr.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {qr.creador ? `${qr.creador.firstName} ${qr.creador.lastName}` : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={qr.estado?.toUpperCase()}
                                                            size="small"
                                                            color={qr.estado === 'activo' ? 'success' : qr.estado === 'revision_requerida' ? 'warning' : 'default'}
                                                            variant="outlined"
                                                            data-testid="qr-estado"
                                                            sx={{ '& .MuiChip-label': { fontSize: 11, px: 1 } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ fontSize: 13 }}>{qr.verifyViewCount || 0}</TableCell>
                                                    <TableCell align="center" sx={{ fontSize: 13 }}>{qr.pdfViewCount || 0}</TableCell>
                                                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                                        <Tooltip title="Ver Detalles">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleViewDetails(qr)}
                                                                data-testid="btn-ver-qr"
                                                            >
                                                                <VisibilityIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Ver Verificación Pública">
                                                            <IconButton
                                                                size="small"
                                                                component="a"
                                                                href={`https://www.notaria18quito.com.ec/verificar.html?token=${qr.token}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                data-testid="btn-ver-verificacion"
                                                            >
                                                                <OpenInNewIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={9} align="center">No hay registros.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Paginación */}
                            <TablePagination
                                component="div"
                                count={totalCount}
                                page={page}
                                onPageChange={handleChangePage}
                                rowsPerPage={rowsPerPage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                                labelRowsPerPage="Filas por página:"
                                labelDisplayedRows={({ from, to, count }) =>
                                    `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                                }
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Modal de Detalles del QR */}
            <Dialog
                open={detailsOpen}
                onClose={handleCloseDetails}
                maxWidth="md"
                fullWidth
                data-testid="modal-detalles-qr"
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <QrCodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="h6">
                                Detalles de Escritura QR
                            </Typography>
                        </Box>
                        <IconButton onClick={handleCloseDetails} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedQR && (() => {
                        const datosCompletos = parseQRData(selectedQR);
                        return (
                            <Grid container spacing={2}>
                                {/* Información Básica */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="overline" color="textSecondary">Token</Typography>
                                    <Typography variant="body1" fontWeight="bold" sx={{ fontFamily: 'monospace' }} data-testid="qr-token">
                                        {selectedQR.token}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="overline" color="textSecondary">N° Escritura</Typography>
                                    <Typography variant="body1" fontWeight="bold" data-testid="qr-escritura">
                                        {selectedQR.numeroEscritura || 'N/A'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="overline" color="textSecondary">Estado</Typography>
                                    <Box>
                                        <Chip
                                            label={selectedQR.estado?.toUpperCase()}
                                            size="small"
                                            color={selectedQR.estado === 'activo' ? 'success' : 'default'}
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="overline" color="textSecondary">Vistas del PDF</Typography>
                                    <Typography variant="body1">{selectedQR.pdfViewCount || 0}</Typography>
                                </Grid>

                                <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                                {/* Datos del documento */}
                                {datosCompletos && (
                                    <>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="overline" color="textSecondary">Tipo de Acto</Typography>
                                            <Typography variant="body1">{datosCompletos.acto || 'N/A'}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="overline" color="textSecondary">Fecha Otorgamiento</Typography>
                                            <Typography variant="body1">{datosCompletos.fecha_otorgamiento || 'N/A'}</Typography>
                                        </Grid>
                                        {datosCompletos.notario && (
                                            <Grid item xs={12}>
                                                <Typography variant="overline" color="textSecondary">Notario</Typography>
                                                <Typography variant="body1">{datosCompletos.notario}</Typography>
                                            </Grid>
                                        )}
                                        {datosCompletos.otorgantes?.otorgado_por && (
                                            <Grid item xs={12}>
                                                <Typography variant="overline" color="textSecondary">Otorgantes</Typography>
                                                <Box sx={{ mt: 0.5 }}>
                                                    {datosCompletos.otorgantes.otorgado_por.map((o, i) => (
                                                        <Chip key={i} label={o.nombre || o} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                                                    ))}
                                                </Box>
                                            </Grid>
                                        )}
                                        {datosCompletos.otorgantes?.a_favor_de && (
                                            <Grid item xs={12}>
                                                <Typography variant="overline" color="textSecondary">A Favor De</Typography>
                                                <Box sx={{ mt: 0.5 }}>
                                                    {datosCompletos.otorgantes.a_favor_de.map((o, i) => (
                                                        <Chip key={i} label={o.nombre || o} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                                                    ))}
                                                </Box>
                                            </Grid>
                                        )}
                                        {datosCompletos.cuantia && (
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="overline" color="textSecondary">Cuantía</Typography>
                                                <Typography variant="body1">{datosCompletos.cuantia}</Typography>
                                            </Grid>
                                        )}
                                    </>
                                )}

                                <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                                {/* Metadatos */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="overline" color="textSecondary">Creado Por</Typography>
                                    <Typography variant="body1">
                                        {selectedQR.creador ? `${selectedQR.creador.firstName} ${selectedQR.creador.lastName}` : 'N/A'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="overline" color="textSecondary">Fecha Creación</Typography>
                                    <Typography variant="body1">
                                        {new Date(selectedQR.createdAt).toLocaleString()}
                                    </Typography>
                                </Grid>
                            </Grid>
                        );
                    })()}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                    <Button
                        component="a"
                        href={selectedQR ? `https://www.notaria18quito.com.ec/verificar.html?token=${selectedQR.token}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        startIcon={<OpenInNewIcon />}
                        size="small"
                    >
                        Ver Verificación Pública
                    </Button>
                    <Button onClick={handleCloseDetails} variant="outlined" startIcon={<CloseIcon />}>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default QROversight;
