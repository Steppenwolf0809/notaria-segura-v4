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
    Tooltip
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    Refresh as RefreshIcon,
    Warning as WarningIcon,
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
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #444',
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
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
    border: '1px solid #444',
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
    const [tieneIncompletos, setTieneIncompletos] = useState(false);
    const [error, setError] = useState(null);
    const [openConfirmRegenerar, setOpenConfirmRegenerar] = useState(false);
    const [textosDisponibles, setTextosDisponibles] = useState(false);

    // Verificar si es tipo de acto válido para generar textos
    const esActoSinTextos = ['VENTA_VEHICULO', 'RECONOCIMIENTO_VEHICULO'].includes(tipoActo);

    /**
     * Cargar textos del servidor
     */
    const cargarTextos = async (forzar = false) => {
        setLoading(true);
        setError(null);

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
                setTieneIncompletos(response.data.tieneIncompletos || false);
                setTextosDisponibles(true);
                onSuccess(forzar ? 'Textos regenerados exitosamente' : 'Textos cargados');
            } else {
                setError(response.data.message || 'Error al generar textos');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Error al conectar con el servidor';
            setError(errorMsg);
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
     * Copiar texto al portapapeles (texto plano)
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
     * Copiar HTML con formato rico (para Word)
     * Esto preserva las negritas al pegar en Word/Google Docs
     */
    const copiarHtmlConFormato = async (html, tipo) => {
        try {
            // Crear un blob con el HTML
            const blob = new Blob([html], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({
                'text/html': blob,
                'text/plain': new Blob([html.replace(/<[^>]*>/g, '')], { type: 'text/plain' })
            });
            await navigator.clipboard.write([clipboardItem]);
            onSuccess(`${tipo} copiado al portapapeles (con formato)`);
        } catch (err) {
            // Fallback: copiar como texto plano si falla el HTML
            console.warn('No se pudo copiar con formato, usando texto plano:', err);
            try {
                await navigator.clipboard.writeText(html.replace(/<[^>]*>/g, ''));
                onSuccess(`${tipo} copiado al portapapeles (texto plano)`);
            } catch (err2) {
                onError('Error al copiar al portapapeles');
            }
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

    // Calcular si hay incompletos
    const hayIncompletos = participantesCompletados < participantesCount;

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

            {/* Advertencia si hay incompletos (no bloqueante) */}
            {hayIncompletos && !textosDisponibles && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                        <strong>Advertencia:</strong> Hay {participantesCount - participantesCompletados} participante(s)
                        con datos incompletos.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Los textos se generarán con marcadores [PENDIENTE] para los datos faltantes.
                        Podrás regenerar cuando todos los participantes completen su información.
                    </Typography>
                </Alert>
            )}

            {/* Mensaje de error */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Advertencia si se generó con incompletos */}
            {tieneIncompletos && textosDisponibles && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        Estos textos fueron generados con datos incompletos.
                        Busca los marcadores [PENDIENTE] y regenera cuando todos los participantes completen su información.
                    </Typography>
                </Alert>
            )}

            {/* Loading */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
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
                                        y los nombres de los comparecientes. Al copiar, se preservará el formato.
                                    </Typography>
                                </Alert>

                                <Box
                                    sx={comparecenciaStyles}
                                    dangerouslySetInnerHTML={{ __html: textos.comparecenciaHtml }}
                                />

                                <Button
                                    variant="outlined"
                                    startIcon={<CopyIcon />}
                                    onClick={() => copiarHtmlConFormato(textos.comparecenciaHtml, 'Comparecencia')}
                                    disabled={!textos.comparecenciaHtml}
                                    sx={{ mt: 2 }}
                                >
                                    Copiar al Portapapeles
                                </Button>
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
                        disabled={loading}
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
