import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Paper,
    Chip,
    IconButton,
    Tooltip,
    Button,
    FormControl,
    Select,
    MenuItem,
    InputLabel,
    Grid,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField
} from '@mui/material';
import {
    CheckCircle as MarkReadIcon,
    Schedule as ScheduleIcon,
    PriorityHigh as PriorityIcon,
    Person as PersonIcon,
    AttachMoney as MoneyIcon,
    Message as MessageIcon,
    Description as DocumentIcon,
    Refresh as RefreshIcon,
    DoneAll as MarkAllReadIcon,
    TaskAlt as ResolvedIcon,
    CheckCircleOutline as ResolveIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import mensajesInternosService from '../services/mensajes-internos-service';
import useAuth from '../hooks/use-auth';

/**
 * Vista completa de mis mensajes internos
 * Permite ver historial, filtrar y gestionar mensajes recibidos
 * @param {Function} onNavigateToDocument - Callback para navegar a un documento
 */
const MisMensajes = ({ onNavigateToDocument }) => {
    const { user } = useAuth();

    // Estados de datos
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [estadisticas, setEstadisticas] = useState(null);

    // Paginación y filtros
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [filtroEstado, setFiltroEstado] = useState('pendientes'); // 'todos', 'pendientes', 'resueltos'

    // Modal de resolución
    const [resolverModal, setResolverModal] = useState({ open: false, mensaje: null });
    const [notaResolucion, setNotaResolucion] = useState('');
    const [resolving, setResolving] = useState(false);

    // Cargar estadísticas
    const loadEstadisticas = useCallback(async () => {
        try {
            const result = await mensajesInternosService.obtenerEstadisticas();
            if (result.success) {
                setEstadisticas(result.data);
            }
        } catch (err) {
            console.error('Error cargando estadísticas:', err);
        }
    }, []);

    // Cargar mensajes
    const loadMensajes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                page: page + 1,
                limit: rowsPerPage,
                estado: filtroEstado !== 'todos' ? filtroEstado : undefined
            };

            const result = await mensajesInternosService.listarMensajes(params);

            if (result.success) {
                setMensajes(result.data?.mensajes || []);
                setTotalCount(result.data?.pagination?.total || 0);
            }
        } catch (err) {
            console.error('Error cargando mensajes:', err);
            setError('No se pudieron cargar los mensajes. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filtroEstado]);

    useEffect(() => {
        loadMensajes();
        loadEstadisticas();
    }, [loadMensajes, loadEstadisticas]);

    // Manejadores de paginación
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Acciones
    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await mensajesInternosService.marcarLeido(id);
            setMensajes(prev => prev.map(m =>
                m.id === id ? { ...m, leido: true, leidoAt: new Date().toISOString() } : m
            ));
            toast.success('Mensaje marcado como leído');
        } catch (err) {
            toast.error('Error al marcar como leído');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const result = await mensajesInternosService.marcarTodosLeidos();
            if (result.success) {
                toast.success(`${result.data?.actualizados || 0} mensajes marcados como leídos`);
                loadMensajes();
            }
        } catch (err) {
            toast.error('Error al marcar todos como leídos');
        }
    };

    const handleOpenResolverModal = (mensaje, e) => {
        e.stopPropagation();
        setResolverModal({ open: true, mensaje });
        setNotaResolucion('');
    };

    const handleCloseResolverModal = () => {
        setResolverModal({ open: false, mensaje: null });
        setNotaResolucion('');
    };

    const handleResolver = async () => {
        if (!resolverModal.mensaje) return;

        setResolving(true);
        try {
            const result = await mensajesInternosService.marcarResuelto(
                resolverModal.mensaje.id,
                notaResolucion || null
            );

            if (result.success) {
                toast.success('Mensaje marcado como resuelto');
                handleCloseResolverModal();
                loadMensajes();
                loadEstadisticas();
            }
        } catch (err) {
            toast.error('Error al marcar como resuelto');
        } finally {
            setResolving(false);
        }
    };

    const handleNavigateToDocument = (documento, e) => {
        e.stopPropagation();
        if (documento && onNavigateToDocument) {
            mensajesInternosService.marcarLeido(documento.mensajeId).catch(() => { });
            onNavigateToDocument({
                id: documento.id,
                protocolNumber: documento.protocolNumber,
                autoSearch: true
            });
        } else if (documento) {
            toast.info(`Documento: ${documento.protocolNumber} - Use la vista de documentos para buscarlo`);
        }
    };

    // Helpers de renderizado
    const getTipoInfo = (tipo) => {
        return mensajesInternosService?.formatTipo?.(tipo) || { label: tipo, color: 'default' };
    };

    const getUrgenciaInfo = (urgencia) => {
        const urgenciaColorMap = {
            'NORMAL': 'default',
            'URGENTE': 'warning',
            'CRITICO': 'error'
        };
        const info = mensajesInternosService?.formatUrgencia?.(urgencia) || { label: urgencia, value: urgencia };
        return {
            label: info.label || urgencia,
            color: urgenciaColorMap[urgencia] || 'default'
        };
    };

    const getIconoTipo = (tipo) => {
        switch (tipo) {
            case 'SOLICITUD_ACTUALIZACION': return <ScheduleIcon />;
            case 'PRIORIZAR': return <PriorityIcon />;
            case 'CLIENTE_ESPERANDO': return <PersonIcon />;
            case 'COBRO': return <MoneyIcon />;
            default: return <MessageIcon />;
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-EC', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <MessageIcon color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h4" component="h1">
                        Mis Mensajes
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                        startIcon={<MarkAllReadIcon />}
                        onClick={handleMarkAllRead}
                        variant="outlined"
                        size="small"
                    >
                        Marcar todo leído
                    </Button>
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={() => { loadMensajes(); loadEstadisticas(); }}
                        variant="contained"
                        size="small"
                    >
                        Actualizar
                    </Button>
                </Box>
            </Box>

            {/* Estadísticas rápidas */}
            {estadisticas && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                            <Typography variant="h4">{estadisticas.pendientes}</Typography>
                            <Typography variant="body2">Pendientes</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                            <Typography variant="h4">{estadisticas.resueltos}</Typography>
                            <Typography variant="body2">Resueltos</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                            <Typography variant="h4">{estadisticas.noLeidos}</Typography>
                            <Typography variant="body2">Sin leer</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.200' }}>
                            <Typography variant="h4">{estadisticas.total}</Typography>
                            <Typography variant="body2">Total</Typography>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Filtros */}
            <Paper sx={{ mb: 3, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Estado</InputLabel>
                            <Select
                                value={filtroEstado}
                                label="Estado"
                                onChange={(e) => { setFiltroEstado(e.target.value); setPage(0); }}
                            >
                                <MenuItem value="todos">Todos los mensajes</MenuItem>
                                <MenuItem value="pendientes">Pendientes de resolver</MenuItem>
                                <MenuItem value="resueltos">Ya resueltos</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabla */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 500 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell width="60">Estado</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Mensaje</TableCell>
                                <TableCell>Documento</TableCell>
                                <TableCell>Remitente</TableCell>
                                <TableCell>Fecha</TableCell>
                                <TableCell align="center" width="120">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : mensajes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        <Typography color="text.secondary">No tienes mensajes que mostrar</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                mensajes.map((mensaje) => {
                                    const tipoInfo = getTipoInfo(mensaje.tipo);
                                    const urgenciaInfo = getUrgenciaInfo(mensaje.urgencia);

                                    return (
                                        <TableRow
                                            key={mensaje.id}
                                            sx={{
                                                bgcolor: mensaje.resuelto ? 'action.disabledBackground' :
                                                    !mensaje.leido ? 'action.hover' : 'inherit',
                                                '&:hover': { bgcolor: 'action.selected' },
                                                borderLeft: mensaje.resuelto ? '4px solid #4caf50' :
                                                    mensaje.urgencia === 'CRITICO' ? '4px solid #d32f2f' :
                                                        mensaje.urgencia === 'URGENTE' ? '4px solid #ed6c02' : 'none',
                                                opacity: mensaje.resuelto ? 0.7 : 1
                                            }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    {mensaje.resuelto ? (
                                                        <Tooltip title={`Resuelto: ${mensaje.notaResolucion || 'Sin nota'}`}>
                                                            <ResolvedIcon color="success" fontSize="small" />
                                                        </Tooltip>
                                                    ) : !mensaje.leido ? (
                                                        <Tooltip title="No leído">
                                                            <Box sx={{
                                                                width: 10,
                                                                height: 10,
                                                                borderRadius: '50%',
                                                                bgcolor: 'primary.main'
                                                            }} />
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title="Leído - Pendiente">
                                                            <Box sx={{
                                                                width: 8,
                                                                height: 8,
                                                                borderRadius: '50%',
                                                                border: '2px solid #ed6c02'
                                                            }} />
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Chip
                                                        icon={getIconoTipo(mensaje.tipo)}
                                                        label={tipoInfo.label}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderColor: tipoInfo.color, color: tipoInfo.color }}
                                                    />
                                                    {mensaje.urgencia !== 'NORMAL' && (
                                                        <Chip
                                                            label={urgenciaInfo.label}
                                                            size="small"
                                                            color={urgenciaInfo.color === 'default' ? 'default' : urgenciaInfo.color}
                                                            sx={{ height: 20, fontSize: '0.65rem', alignSelf: 'flex-start' }}
                                                        />
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 250 }}>
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                                    {mensaje.mensaje || '-'}
                                                </Typography>
                                                {mensaje.resuelto && mensaje.notaResolucion && (
                                                    <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                                                        Nota: {mensaje.notaResolucion}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {mensaje.documento ? (
                                                    <Button
                                                        startIcon={<DocumentIcon />}
                                                        size="small"
                                                        onClick={(e) => handleNavigateToDocument({
                                                            id: mensaje.documento.id,
                                                            protocolNumber: mensaje.documento.protocolNumber,
                                                            mensajeId: mensaje.id
                                                        }, e)}
                                                        sx={{ textTransform: 'none' }}
                                                        color="primary"
                                                    >
                                                        {mensaje.documento.protocolNumber}
                                                    </Button>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">General</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {mensaje.remitente?.firstName} {mensaje.remitente?.lastName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {formatDate(mensaje.createdAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                    {!mensaje.leido && (
                                                        <Tooltip title="Marcar como leído">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={(e) => handleMarkAsRead(mensaje.id, e)}
                                                            >
                                                                <MarkReadIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {!mensaje.resuelto && (
                                                        <Tooltip title="Marcar como resuelto">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={(e) => handleOpenResolverModal(mensaje, e)}
                                                            >
                                                                <ResolveIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Filas por página"
                />
            </Paper>

            {/* Modal de resolución */}
            <Dialog open={resolverModal.open} onClose={handleCloseResolverModal} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Marcar mensaje como resuelto
                </DialogTitle>
                <DialogContent>
                    {resolverModal.mensaje && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Tipo: {getTipoInfo(resolverModal.mensaje.tipo).label}
                            </Typography>
                            {resolverModal.mensaje.documento && (
                                <Typography variant="body2" color="text.secondary">
                                    Documento: {resolverModal.mensaje.documento.protocolNumber}
                                </Typography>
                            )}
                        </Box>
                    )}
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Nota de resolución (opcional)"
                        placeholder="Describe brevemente qué acción tomaste..."
                        value={notaResolucion}
                        onChange={(e) => setNotaResolucion(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseResolverModal} disabled={resolving}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleResolver}
                        variant="contained"
                        color="success"
                        disabled={resolving}
                        startIcon={resolving ? <CircularProgress size={16} /> : <ResolvedIcon />}
                    >
                        {resolving ? 'Guardando...' : 'Marcar resuelto'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MisMensajes;
