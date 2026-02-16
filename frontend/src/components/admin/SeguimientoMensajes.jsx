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
    Tooltip,
    Button,
    FormControl,
    Select,
    MenuItem,
    InputLabel,
    Grid,
    CircularProgress,
    Alert,
    LinearProgress,
    Tabs,
    Tab
} from '@mui/material';
import {
    Send as SendIcon,
    Schedule as ScheduleIcon,
    PriorityHigh as PriorityIcon,
    Person as PersonIcon,
    AttachMoney as MoneyIcon,
    Message as MessageIcon,
    Description as DocumentIcon,
    Refresh as RefreshIcon,
    TaskAlt as ResolvedIcon,
    HourglassEmpty as PendingIcon,
    TrendingUp as StatsIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import mensajesInternosService from '../../services/mensajes-internos-service';

/**
 * Vista de seguimiento de mensajes (Admin)
 * Tab 1: Todos los mensajes del sistema (vista global)
 * Tab 2: Solo mensajes enviados por el admin actual
 */
const SeguimientoMensajes = () => {
    // Tab activo
    const [activeTab, setActiveTab] = useState(0); // 0 = Todos, 1 = Mis Enviados

    // Estados de datos
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [estadisticas, setEstadisticas] = useState(null);

    // Paginación y filtros
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroRemitente, setFiltroRemitente] = useState('todos');

    // Lista de remitentes únicos (se construye desde los datos)
    const [remitentes, setRemitentes] = useState([]);

    // Cargar estadísticas según tab
    const loadEstadisticas = useCallback(async () => {
        try {
            const result = activeTab === 0
                ? await mensajesInternosService.obtenerEstadisticasGlobales()
                : await mensajesInternosService.obtenerEstadisticasEnviados();
            if (result.success) {
                setEstadisticas(result.data);
            }
        } catch (err) {
            console.error('Error cargando estadísticas:', err);
        }
    }, [activeTab]);

    // Cargar mensajes según tab
    const loadMensajes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                page: page + 1,
                limit: rowsPerPage,
                estado: filtroEstado !== 'todos' ? filtroEstado : undefined
            };

            let result;
            if (activeTab === 0) {
                // Tab "Todos" — vista global
                if (filtroRemitente !== 'todos') {
                    params.remitenteId = filtroRemitente;
                }
                result = await mensajesInternosService.listarTodosMensajes(params);
            } else {
                // Tab "Mis Enviados" — solo los del admin actual
                result = await mensajesInternosService.listarMensajesEnviados(params);
            }

            if (result.success) {
                const msgs = result.data?.mensajes || [];
                setMensajes(msgs);
                setTotalCount(result.data?.pagination?.total || 0);

                // Extraer remitentes únicos (solo en tab "Todos")
                if (activeTab === 0 && msgs.length > 0) {
                    setRemitentes(prev => {
                        const map = new Map(prev.map(r => [r.id, r]));
                        msgs.forEach(m => {
                            if (m.remitente && !map.has(m.remitente.id)) {
                                map.set(m.remitente.id, m.remitente);
                            }
                        });
                        return Array.from(map.values());
                    });
                }
            }
        } catch (err) {
            console.error('Error cargando mensajes:', err);
            setError('No se pudieron cargar los mensajes. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filtroEstado, filtroRemitente, activeTab]);

    useEffect(() => {
        loadMensajes();
        loadEstadisticas();
    }, [loadMensajes, loadEstadisticas]);

    // Reset de paginación y filtros al cambiar de tab
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        setPage(0);
        setFiltroEstado('todos');
        setFiltroRemitente('todos');
    };

    // Manejadores de paginación
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Helpers de renderizado
    const getTipoInfo = (tipo) => {
        return mensajesInternosService?.formatTipo?.(tipo) || { label: tipo, color: '#757575' };
    };

    const getUrgenciaInfo = (urgencia) => {
        const urgenciaColorMap = {
            'NORMAL': 'default',
            'URGENTE': 'warning',
            'CRITICO': 'error'
        };
        const info = mensajesInternosService?.formatUrgencia?.(urgencia) || { label: urgencia };
        return {
            label: info.label || urgencia,
            color: urgenciaColorMap[urgencia] || 'default'
        };
    };

    const getIconoTipo = (tipo) => {
        switch (tipo) {
            case 'SOLICITUD_ACTUALIZACION': return <ScheduleIcon fontSize="small" />;
            case 'PRIORIZAR': return <PriorityIcon fontSize="small" />;
            case 'CLIENTE_ESPERANDO': return <PersonIcon fontSize="small" />;
            case 'COBRO': return <MoneyIcon fontSize="small" />;
            default: return <MessageIcon fontSize="small" />;
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

    const calcularTiempoRespuesta = (createdAt, resueltoAt) => {
        if (!resueltoAt) return null;
        const diff = new Date(resueltoAt) - new Date(createdAt);
        const horas = Math.floor(diff / (1000 * 60 * 60));
        const dias = Math.floor(horas / 24);

        if (dias > 0) return `${dias} día(s)`;
        if (horas > 0) return `${horas} hora(s)`;
        return 'Menos de 1 hora';
    };

    const getRolLabel = (role) => {
        switch (role) {
            case 'ADMIN': return 'Admin';
            case 'MATRIZADOR': return 'Matrizador';
            case 'ARCHIVADOR': return 'Archivador';
            default: return role;
        }
    };

    // Determinar si se muestra columna "De" (remitente) — solo en tab Todos
    const showRemitente = activeTab === 0;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SendIcon color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h4" component="h1">
                        Seguimiento de Mensajes
                    </Typography>
                </Box>
                <Button
                    startIcon={<RefreshIcon />}
                    onClick={() => { loadMensajes(); loadEstadisticas(); }}
                    variant="contained"
                    size="small"
                >
                    Actualizar
                </Button>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab
                        icon={<VisibilityIcon />}
                        iconPosition="start"
                        label="Todos los Mensajes"
                    />
                    <Tab
                        icon={<SendIcon />}
                        iconPosition="start"
                        label="Mis Enviados"
                    />
                </Tabs>
            </Paper>

            {/* Estadísticas rápidas */}
            {estadisticas && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                            <PendingIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="h4">{estadisticas.pendientes}</Typography>
                            <Typography variant="body2">Pendientes</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                            <ResolvedIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="h4">{estadisticas.resueltos}</Typography>
                            <Typography variant="body2">Resueltos</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.200' }}>
                            <SendIcon sx={{ fontSize: 32, mb: 1, color: 'grey.600' }} />
                            <Typography variant="h4">{estadisticas.total}</Typography>
                            <Typography variant="body2">
                                {activeTab === 0 ? 'Total Sistema' : 'Total Enviados'}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <StatsIcon sx={{ fontSize: 32, mb: 1, color: 'primary.main' }} />
                            <Typography variant="h4">{estadisticas.tasaResolucion}%</Typography>
                            <Typography variant="body2">Tasa Resolución</Typography>
                            <LinearProgress
                                variant="determinate"
                                value={estadisticas.tasaResolucion}
                                color={estadisticas.tasaResolucion > 70 ? 'success' : estadisticas.tasaResolucion > 40 ? 'warning' : 'error'}
                                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                            />
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
                    {showRemitente && (
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Remitente</InputLabel>
                                <Select
                                    value={filtroRemitente}
                                    label="Remitente"
                                    onChange={(e) => { setFiltroRemitente(e.target.value); setPage(0); }}
                                >
                                    <MenuItem value="todos">Todos los remitentes</MenuItem>
                                    {remitentes.map(r => (
                                        <MenuItem key={r.id} value={r.id}>
                                            {r.firstName} {r.lastName} ({getRolLabel(r.role)})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}
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
                                {showRemitente && <TableCell>De</TableCell>}
                                <TableCell>{showRemitente ? 'Para' : 'Destinatario'}</TableCell>
                                <TableCell>Documento</TableCell>
                                <TableCell>Mensaje</TableCell>
                                <TableCell>Enviado</TableCell>
                                <TableCell>Respuesta</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={showRemitente ? 8 : 7} align="center" sx={{ py: 3 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : mensajes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={showRemitente ? 8 : 7} align="center" sx={{ py: 3 }}>
                                        <Typography color="text.secondary">
                                            {activeTab === 0
                                                ? 'No hay mensajes en el sistema'
                                                : 'No has enviado mensajes'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                mensajes.map((mensaje) => {
                                    const tipoInfo = getTipoInfo(mensaje.tipo);
                                    const urgenciaInfo = getUrgenciaInfo(mensaje.urgencia);
                                    const tiempoRespuesta = calcularTiempoRespuesta(mensaje.createdAt, mensaje.resueltoAt);

                                    return (
                                        <TableRow
                                            key={mensaje.id}
                                            sx={{
                                                bgcolor: mensaje.resuelto ? 'action.disabledBackground' : 'inherit',
                                                '&:hover': { bgcolor: 'action.selected' },
                                                borderLeft: mensaje.resuelto ? '4px solid #4caf50' :
                                                    mensaje.urgencia === 'CRITICO' ? '4px solid #d32f2f' :
                                                        mensaje.urgencia === 'URGENTE' ? '4px solid #ed6c02' : '4px solid #1976d2',
                                                opacity: mensaje.resuelto ? 0.8 : 1
                                            }}
                                        >
                                            <TableCell>
                                                {mensaje.resuelto ? (
                                                    <Tooltip title={`Resuelto: ${mensaje.notaResolucion || 'Sin nota'}`}>
                                                        <ResolvedIcon color="success" />
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="Pendiente de resolución">
                                                        <PendingIcon color="warning" />
                                                    </Tooltip>
                                                )}
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
                                                            color={urgenciaInfo.color}
                                                            sx={{ height: 20, fontSize: '0.65rem', alignSelf: 'flex-start' }}
                                                        />
                                                    )}
                                                </Box>
                                            </TableCell>
                                            {showRemitente && (
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <PersonIcon fontSize="small" color="action" />
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                {mensaje.remitente?.firstName} {mensaje.remitente?.lastName}
                                                            </Typography>
                                                            <Chip
                                                                label={getRolLabel(mensaje.remitente?.role)}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ height: 18, fontSize: '0.6rem' }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <PersonIcon fontSize="small" color="action" />
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {mensaje.destinatario?.firstName} {mensaje.destinatario?.lastName}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {getRolLabel(mensaje.destinatario?.role)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {mensaje.documento ? (
                                                    <Chip
                                                        icon={<DocumentIcon />}
                                                        label={mensaje.documento.protocolNumber}
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                    />
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">General</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }} noWrap>
                                                    {mensaje.mensaje || '-'}
                                                </Typography>
                                                {mensaje.resuelto && mensaje.notaResolucion && (
                                                    <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                                                        Resp: {mensaje.notaResolucion}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {formatDate(mensaje.createdAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {mensaje.resuelto ? (
                                                    <Box>
                                                        <Typography variant="caption" color="success.main">
                                                            {formatDate(mensaje.resueltoAt)}
                                                        </Typography>
                                                        {tiempoRespuesta && (
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                                ({tiempoRespuesta})
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                ) : (
                                                    <Chip
                                                        label="Esperando"
                                                        size="small"
                                                        color="warning"
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: '0.65rem' }}
                                                    />
                                                )}
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
        </Box>
    );
};

export default SeguimientoMensajes;
