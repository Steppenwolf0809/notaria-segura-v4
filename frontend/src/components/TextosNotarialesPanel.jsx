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
 * Estilos para el texto de encabezado (monoespaciado para mantener columnas) - MODO CLARO
 */
const encabezadoStyles = {
    fontFamily: '"Courier New", Courier, monospace',
    whiteSpace: 'pre-wrap',
    fontSize: '11px',
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    overflowX: 'auto',
    lineHeight: 1.3,
    maxHeight: '400px',
    overflowY: 'auto'
};

/**
 * Estilos para el texto de comparecencia (serif, justificado) - MODO CLARO
 */
const comparecenciaStyles = {
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '13px',
    lineHeight: 1.8,
    textAlign: 'justify',
    padding: '16px',
    backgroundColor: '#ffffff',
    color: '#000000',
    border: '1px solid #ccc',
    borderRadius: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
    // Selectores anidados para negritas
    '& strong': {
        fontWeight: 'bold !important',
        color: '#000000'
    },
    '& b': {
        fontWeight: 'bold !important',
        color: '#000000'
    }
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
     * Copiar HTML con formato rico (para Word) - SOLUCIÓN ROBUSTA CON FALLBACK
     * Intenta primero con Clipboard API, si falla usa execCommand como fallback.
     */
    const copiarHtmlConFormato = async (html, tipo) => {
        // Construir HTML completo para Word
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000000; }
                strong, b { font-weight: bold; }
            </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `.trim();

        // MÉTODO 1: Intentar Clipboard API moderna
        try {
            const blobHtml = new Blob([htmlContent], { type: "text/html" });
            const textoPlano = html.replace(/<[^>]*>/g, '');
            const blobText = new Blob([textoPlano], { type: "text/plain" });

            const data = [
                new ClipboardItem({
                    "text/html": blobHtml,
                    "text/plain": blobText,
                }),
            ];

            await navigator.clipboard.write(data);
            onSuccess(`${tipo} copiado exitosamente (con formato)`);
            return;
        } catch (clipboardErr) {
            console.warn("Clipboard API falló, usando fallback:", clipboardErr);
        }

        // MÉTODO 2: Fallback con execCommand (máxima compatibilidad)
        try {
            // Crear contenedor temporal invisible
            const container = document.createElement('div');
            container.innerHTML = html;
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.whiteSpace = 'pre-wrap';
            document.body.appendChild(container);

            // Seleccionar el contenido
            const range = document.createRange();
            range.selectNodeContents(container);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            // Ejecutar copia
            const success = document.execCommand('copy');

            // Limpiar
            selection.removeAllRanges();
            document.body.removeChild(container);

            if (success) {
                onSuccess(`${tipo} copiado exitosamente`);
            } else {
                throw new Error('execCommand falló');
            }
        } catch (execErr) {
            console.error("Error en fallback:", execErr);
            onError('Error al copiar. Por favor seleccione el texto manualmente y use Ctrl+C.');
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
