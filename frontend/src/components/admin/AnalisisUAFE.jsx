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
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar
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
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Edit as EditIcon
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
    const [deleteDialog, setDeleteDialog] = useState({ open: false, persona: null });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    // Estados para edición de persona
    const [editDialog, setEditDialog] = useState({ open: false, persona: null });
    const [editForm, setEditForm] = useState({ nombres: '', apellidos: '', email: '', telefono: '', profesion: '' });

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

    const handleDeletePersona = async (force = false) => {
        if (!deleteDialog.persona) return;

        try {
            setLoading(true);
            const url = `/formulario-uafe/admin/personas-registradas/${deleteDialog.persona.numeroIdentificacion}${force ? '?force=true' : ''}`;
            const response = await apiClient.delete(url);

            if (response.data.success) {
                setSnackbar({ open: true, message: 'Persona eliminada exitosamente', severity: 'success' });
                setDeleteDialog({ open: false, persona: null });
                cargarPersonas(1, false);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Error al eliminar';
            if (err.response?.data?.protocolosCount && !force) {
                // Mostrar confirmación para forzar
                setSnackbar({
                    open: true,
                    message: `${errorMsg} ¿Desea forzar la eliminación?`,
                    severity: 'warning'
                });
            } else {
                setSnackbar({ open: true, message: errorMsg, severity: 'error' });
            }
        } finally {
            setLoading(false);
        }
    };

    // Abrir modal de edición
    const handleOpenEdit = (persona) => {
        setEditForm({
            nombres: persona.nombre?.split(' ').slice(0, 2).join(' ') || '',
            apellidos: persona.nombre?.split(' ').slice(2).join(' ') || '',
            email: persona.email || '',
            telefono: persona.telefono || '',
            profesion: persona.profesion || ''
        });
        setEditDialog({ open: true, persona });
    };

    // Guardar cambios de persona
    const handleSaveEdit = async () => {
        if (!editDialog.persona) return;

        try {
            setLoading(true);
            const response = await apiClient.put(
                `/formulario-uafe/persona/${editDialog.persona.numeroIdentificacion}`,
                {
                    datosPersonales: {
                        nombres: editForm.nombres.trim().toUpperCase(),
                        apellidos: editForm.apellidos.trim().toUpperCase()
                    },
                    contacto: {
                        email: editForm.email.trim(),
                        celular: editForm.telefono.trim()
                    },
                    informacionLaboral: {
                        profesionOficio: editForm.profesion.trim().toUpperCase()
                    }
                }
            );

            if (response.data.success) {
                setSnackbar({ open: true, message: 'Datos actualizados correctamente', severity: 'success' });
                setEditDialog({ open: false, persona: null });
                cargarPersonas(1, false);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Error al actualizar';
            setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        } finally {
            setLoading(false);
        }
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
                        <TableRow sx={{ backgroundColor: 'grey.200' }}>
                            <TableCell sx={{ width: 40 }}></TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Cédula/RUC</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Nombre</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Tipo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }} align="center">Protocolos</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }} align="right">Monto Total</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }} align="right">Ingreso Mensual</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Última Actividad</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }} align="center">Alerta</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }} align="center">Acciones</TableCell>
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
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Tooltip title="Editar datos">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleOpenEdit(persona)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Eliminar persona">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => setDeleteDialog({ open: true, persona })}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>

                                {/* Fila expandida con detalles */}
                                <TableRow>
                                    <TableCell colSpan={10} sx={{ p: 0 }}>
                                        <Collapse in={expandedRow === persona.id} timeout="auto" unmountOnExit>
                                            <Box sx={{ p: 2, backgroundColor: 'action.hover' }}>
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
                                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
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

            {/* Dialog de confirmación de eliminación */}
            <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, persona: null })}>
                <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
                    ⚠️ Confirmar Eliminación
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography>
                        ¿Está seguro que desea eliminar a <strong>{deleteDialog.persona?.nombre}</strong> ({deleteDialog.persona?.numeroIdentificacion})?
                    </Typography>
                    {deleteDialog.persona?.totalProtocolos > 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            Esta persona tiene {deleteDialog.persona?.totalProtocolos} protocolo(s) asociados.
                            La eliminación también removerá las asociaciones.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog({ open: false, persona: null })}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleDeletePersona(deleteDialog.persona?.totalProtocolos > 0)}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog de edición de persona */}
            <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, persona: null })} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    ✏️ Editar Datos de Persona
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Cédula: <strong>{editDialog.persona?.numeroIdentificacion}</strong>
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <TextField
                            label="Nombres"
                            value={editForm.nombres}
                            onChange={(e) => setEditForm({ ...editForm, nombres: e.target.value })}
                            fullWidth
                            size="small"
                            placeholder="Ej: RUBEN DARIO"
                        />
                        <TextField
                            label="Apellidos"
                            value={editForm.apellidos}
                            onChange={(e) => setEditForm({ ...editForm, apellidos: e.target.value })}
                            fullWidth
                            size="small"
                            placeholder="Ej: VILLEGAS VALDIVIESO"
                        />
                        <TextField
                            label="Email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            fullWidth
                            size="small"
                            type="email"
                        />
                        <TextField
                            label="Teléfono"
                            value={editForm.telefono}
                            onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Profesión/Oficio"
                            value={editForm.profesion}
                            onChange={(e) => setEditForm({ ...editForm, profesion: e.target.value })}
                            fullWidth
                            size="small"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog({ open: false, persona: null })}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveEdit}
                        disabled={loading || !editForm.nombres || !editForm.apellidos}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Guardar Cambios'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AnalisisUAFE;
