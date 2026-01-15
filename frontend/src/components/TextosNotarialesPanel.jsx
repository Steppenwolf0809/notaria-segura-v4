/**
 * Panel de Textos Notariales Generados
 * 
 * Componente para visualizar, copiar y regenerar textos notariales
 * (encabezado y comparecencia) generados automáticamente.
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Paper,
    Stack,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Tooltip
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Schedule as ScheduleIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import apiClient from '../services/api-client';

/**
 * Estilos para el texto de encabezado (monoespaciado para mantener columnas)
 */
const encabezadoStyles = {
    fontFamily: '"Courier New", Courier, monospace',
    whiteSpace: 'pre-wrap',
    fontSize: '11px',
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    overflowX: 'auto',
    lineHeight: 1.3,
    maxHeight: '400px',
    overflowY: 'auto'
};

/**
 * Estilos para el texto de comparecencia (serif, justificado)
 */
const comparecenciaStyles = {
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '13px',
    lineHeight: 1.8,
    textAlign: 'justify',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    maxHeight: '400px',
    overflowY: 'auto'
};

const TextosNotarialesPanel = ({
    protocoloId,
    tipoActo,
    participantesCount = 0,
    participantesCompletados = 0,
    onError = () => { },
    onSuccess = () => { }
}) => {
    // Estados
    const [tabActivo, setTabActivo] = useState(0);
    const [textos, setTextos] = useState({
        encabezado: '',
        comparecencia: '',
        comparecenciaHtml: ''
    });
    const [loading, setLoading] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [fechaGeneracion, setFechaGeneracion] = useState(null);
    const [participantesIncompletos, setParticipantesIncompletos] = useState([]);
    const [error, setError] = useState(null);
    const [openConfirmRegenerar, setOpenConfirmRegenerar] = useState(false);
    const [textosDisponibles, setTextosDisponibles] = useState(false);

    // Verificar si es tipo de acto válido para generar textos
    const esActoSinTextos = ['VENTA_VEHICULO', 'RECONOCIMIENTO_VEHICULO'].includes(tipoActo);
    const todosCompletos = participantesCount > 0 && participantesCompletados === participantesCount;

    // Cargar textos al montar si hay participantes completos
    useEffect(() => {
        if (protocoloId && todosCompletos && !esActoSinTextos) {
            cargarTextos();
        }
    }, [protocoloId, todosCompletos]);

    /**
     * Cargar textos del servidor (desde cache si existe)
     */
    const cargarTextos = async (forzar = false) => {
        setLoading(true);
        setError(null);
        setParticipantesIncompletos([]);

        try {
            const response = await apiClient.post(
                `/formulario-uafe/protocolo/${protocoloId}/generar-textos`,
                { forzar }
            );

            if (response.data.success) {
                setTextos({
                    encabezado: response.data.data.encabezado || '',
                    comparecencia: response.data.data.comparecencia || '',
                    comparecenciaHtml: response.data.data.comparecenciaHtml || response.data.data.comparecencia || ''
                });
                setFromCache(response.data.fromCache || false);
                setFechaGeneracion(response.data.fechaGeneracion);
                setTextosDisponibles(true);
                onSuccess(forzar ? 'Textos regenerados exitosamente' : 'Textos cargados');
            } else {
                setError(response.data.message || 'Error al generar textos');
                if (response.data.participantesIncompletos) {
                    setParticipantesIncompletos(response.data.participantesIncompletos);
                }
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Error al conectar con el servidor';
            setError(errorMsg);

            if (err.response?.data?.participantesIncompletos) {
                setParticipantesIncompletos(err.response.data.participantesIncompletos);
            }

            onError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Regenerar textos forzando nueva generación
     */
    const regenerarTextos = async () => {
        setOpenConfirmRegenerar(false);
        await cargarTextos(true);
    };

    /**
     * Copiar texto al portapapeles
     */
    const copiarAlPortapapeles = async (texto, tipo) => {
        try {
            await navigator.clipboard.writeText(texto);
            onSuccess(`${tipo} copiado al portapapeles`);
        } catch (err) {
            onError('Error al copiar al portapapeles');
        }
    };

    /**
     * Formatear fecha para mostrar
     */
    const formatearFecha = (fecha) => {
        if (!fecha) return '';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-EC', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Si es tipo de acto sin textos, mostrar mensaje
    if (esActoSinTextos) {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                    Los actos de vehículos son <strong>actas de reconocimiento</strong> y no requieren generación
                    de encabezado ni comparecencia.
                </Typography>
            </Alert>
        );
    }

    // Si no hay participantes
    if (participantesCount === 0) {
        return (
            <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                    Agrega al menos una persona al protocolo para poder generar los textos notariales.
                </Typography>
            </Alert>
        );
    }

    // Si hay participantes incompletos
    if (!todosCompletos && !textosDisponibles) {
        return (
            <Box sx={{ mt: 2 }}>
                <Alert severity="warning" icon={<WarningIcon />}>
                    <Typography variant="body2" gutterBottom>
                        <strong>No se pueden generar textos.</strong> Hay {participantesCount - participantesCompletados} participante(s)
                        con datos incompletos.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Todos los participantes deben completar su formulario (semáforo verde) antes de poder
                        generar el encabezado y la comparecencia.
                    </Typography>
                </Alert>

                {participantesIncompletos.length > 0 && (
                    <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Participantes con datos faltantes:
                        </Typography>
                        <List dense>
                            {participantesIncompletos.map((p, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon>
                                        <ErrorIcon color="error" fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={p.nombre || p.cedula}
                                        secondary={
                                            <>
                                                {p.porcentaje}% completado
                                                {p.faltantes && p.faltantes.length > 0 && (
                                                    <span> • Falta: {p.faltantes.slice(0, 3).join(', ')}{p.faltantes.length > 3 ? '...' : ''}</span>
                                                )}
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            {/* Header con título y estado */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <DescriptionIcon color="primary" />
                    <Typography variant="h6">Textos Notariales</Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    {fechaGeneracion && (
                        <Tooltip title={fromCache ? 'Recuperado de caché' : 'Generado nuevo'}>
                            <Chip
                                icon={<ScheduleIcon />}
                                label={formatearFecha(fechaGeneracion)}
                                size="small"
                                color={fromCache ? 'default' : 'success'}
                                variant="outlined"
                            />
                        </Tooltip>
                    )}
                </Stack>
            </Stack>

            {/* Mensaje de error */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Loading */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Generando textos...</Typography>
                </Box>
            ) : textosDisponibles ? (
                <>
                    {/* Tabs para encabezado y comparecencia */}
                    <Paper variant="outlined" sx={{ mb: 2 }}>
                        <Tabs
                            value={tabActivo}
                            onChange={(e, newValue) => setTabActivo(newValue)}
                            variant="fullWidth"
                        >
                            <Tab label="Encabezado" icon={<DescriptionIcon />} iconPosition="start" />
                            <Tab label="Comparecencia" icon={<DescriptionIcon />} iconPosition="start" />
                        </Tabs>

                        {/* Panel de Encabezado */}
                        {tabActivo === 0 && (
                            <Box sx={{ p: 2 }}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="caption">
                                        El encabezado es una tabla estructurada con columnas alineadas.
                                        Use una fuente monoespaciada (como Courier) al pegar en Word.
                                    </Typography>
                                </Alert>

                                <Box sx={encabezadoStyles}>
                                    {textos.encabezado || 'No hay encabezado generado'}
                                </Box>

                                <Button
                                    variant="outlined"
                                    startIcon={<CopyIcon />}
                                    onClick={() => copiarAlPortapapeles(textos.encabezado, 'Encabezado')}
                                    sx={{ mt: 2 }}
                                    disabled={!textos.encabezado}
                                >
                                    Copiar Encabezado
                                </Button>
                            </Box>
                        )}

                        {/* Panel de Comparecencia */}
                        {tabActivo === 1 && (
                            <Box sx={{ p: 2 }}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="caption">
                                        Las palabras en <strong>negrita</strong> corresponden a la fecha, la notaria
                                        y los nombres de los comparecientes.
                                    </Typography>
                                </Alert>

                                <Box
                                    sx={comparecenciaStyles}
                                    dangerouslySetInnerHTML={{ __html: textos.comparecenciaHtml }}
                                />

                                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<CopyIcon />}
                                        onClick={() => copiarAlPortapapeles(textos.comparecencia, 'Comparecencia')}
                                        disabled={!textos.comparecencia}
                                    >
                                        Copiar Texto Plano
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<CopyIcon />}
                                        onClick={() => copiarAlPortapapeles(textos.comparecenciaHtml, 'Comparecencia HTML')}
                                        disabled={!textos.comparecenciaHtml}
                                    >
                                        Copiar con Formato HTML
                                    </Button>
                                </Stack>
                            </Box>
                        )}
                    </Paper>

                    {/* Botón de regenerar */}
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<RefreshIcon />}
                        onClick={() => setOpenConfirmRegenerar(true)}
                        disabled={loading}
                    >
                        Regenerar Textos
                    </Button>
                </>
            ) : (
                /* Botón para generar por primera vez */
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Los textos notariales aún no han sido generados para este protocolo.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<DescriptionIcon />}
                        onClick={() => cargarTextos(false)}
                        disabled={loading || !todosCompletos}
                        sx={{ mt: 2 }}
                    >
                        Generar Textos Notariales
                    </Button>
                </Box>
            )}

            {/* Dialog de confirmación para regenerar */}
            <Dialog
                open={openConfirmRegenerar}
                onClose={() => setOpenConfirmRegenerar(false)}
            >
                <DialogTitle>¿Regenerar textos?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Se generarán nuevos textos basados en los datos actuales de los participantes.
                        Los textos anteriores serán reemplazados.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmRegenerar(false)}>Cancelar</Button>
                    <Button onClick={regenerarTextos} color="secondary" variant="contained">
                        Sí, Regenerar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TextosNotarialesPanel;
