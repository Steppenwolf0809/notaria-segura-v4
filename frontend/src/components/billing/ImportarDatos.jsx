import React, { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    LinearProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    TextField,
    Grid,
    Card,
    CardContent,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    InsertDriveFile as FileIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Link as LinkIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Divider
} from '@mui/material';
import billingService from '../../services/billing-service';

/**
 * ImportarDatos Component
 * Permite importar archivos Excel/CSV de Koinor al sistema de facturación
 */
const ImportarDatos = () => {
    // Estado del archivo
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Filtro de fechas
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Historial de importaciones
    const [importLogs, setImportLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Auto-Link State
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkCandidates, setLinkCandidates] = useState([]);
    const [processingLink, setProcessingLink] = useState(false);
    const [linkResult, setLinkResult] = useState(null);

    // Cargar historial de importaciones
    const loadImportLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const response = await billingService.getImportLogs({ limit: 10 });
            setImportLogs(response.data || []);
        } catch (err) {
            console.error('Error cargando historial:', err);
        } finally {
            setLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        loadImportLogs();
    }, [loadImportLogs]);

    // Configuración del dropzone
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setSelectedFile(acceptedFiles[0]);
            setResult(null);
            setError(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv']
        },
        maxFiles: 1,
        multiple: false
    });

    // Procesar archivo
    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setUploadProgress(0);
        setError(null);
        setResult(null);

        try {
            const response = await billingService.importFile(
                selectedFile,
                dateFrom || null,
                dateTo || null,
                (progress) => setUploadProgress(progress)
            );

            setResult(response.data);
            setSelectedFile(null);
            loadImportLogs(); // Recargar historial
        } catch (err) {
            console.error('Error importando archivo:', err);
            setError(err.response?.data?.message || 'Error al procesar el archivo');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    // Formatear tamaño de archivo
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Obtener color del estado del log
    const getStatusColor = (status) => {
        switch (status) {
            case 'SUCCESS': return 'success';
            case 'PARTIAL': return 'warning';
            case 'ERROR': return 'error';
            default: return 'default';
        }
    };

    // Obtener icono del estado
    const getStatusIcon = (status) => {
        switch (status) {
            case 'SUCCESS': return <CheckCircleIcon fontSize="small" />;
            case 'PARTIAL': return <WarningIcon fontSize="small" />;
            case 'ERROR': return <ErrorIcon fontSize="small" />;
            default: return null;
        }
    };

    // Auto-Link Handlers
    const handleAutoLinkDryRun = async () => {
        setProcessingLink(true);
        setError(null);
        setLinkResult(null);
        try {
            const response = await billingService.autoLinkInvoices({ dryRun: true });
            if (response.success && response.stats) {
                setLinkCandidates(response.stats.candidates || []);
                setLinkDialogOpen(true);
            }
        } catch (err) {
            console.error('Error auto-linking:', err);
            setError('Error al buscar vinculaciones automáticas');
        } finally {
            setProcessingLink(false);
        }
    };

    const handleConfirmLink = async () => {
        setProcessingLink(true);
        try {
            const response = await billingService.autoLinkInvoices({ dryRun: false });
            if (response.success) {
                setLinkResult(response.stats);
                setLinkDialogOpen(false);
                // Mostrar éxito
                setResult({
                    ...result,
                    message: `Se vincularon ${response.stats.linked} facturas correctamente`
                });
                loadImportLogs();
            }
        } catch (err) {
            console.error('Error confirming auto-link:', err);
            setError('Error al aplicar vinculaciones');
        } finally {
            setProcessingLink(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudUploadIcon color="primary" />
                Importar Datos de Koinor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Carga archivos Excel (.xls, .xlsx) o CSV con datos de facturación del sistema Koinor.
            </Typography>

            <Grid container spacing={3}>
                {/* Zona de Drop */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper
                        {...getRootProps()}
                        sx={{
                            p: 4,
                            border: '2px dashed',
                            borderColor: isDragActive ? 'primary.main' : 'divider',
                            borderRadius: 2,
                            bgcolor: isDragActive ? 'action.hover' : 'background.default',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: 'action.hover'
                            }
                        }}
                    >
                        <input {...getInputProps()} />
                        <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />

                        {selectedFile ? (
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                                    <FileIcon color="primary" />
                                    <Typography variant="h6">{selectedFile.name}</Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    {formatFileSize(selectedFile.size)}
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                <Typography variant="h6" color="text.primary">
                                    {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra el archivo aquí'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    o haz clic para seleccionar
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Formatos aceptados: .xls, .xlsx, .csv
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {/* Barra de progreso */}
                    {uploading && (
                        <Box sx={{ mt: 2 }}>
                            <LinearProgress variant="determinate" value={uploadProgress} />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                Procesando... {uploadProgress}%
                            </Typography>
                        </Box>
                    )}

                    {/* Mensaje de error */}
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Resultado de importación */}
                    {result && (
                        <Alert
                            severity="success"
                            sx={{ mt: 2 }}
                            icon={<CheckCircleIcon />}
                        >
                            <Typography variant="subtitle2">
                                Importación completada exitosamente
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="body2">
                                    • Facturas procesadas: {result.invoicesCreated || 0} nuevas, {result.invoicesUpdated || 0} actualizadas
                                </Typography>
                                <Typography variant="body2">
                                    • Pagos procesados: {result.paymentsCreated || 0} nuevos, {result.paymentsUpdated || 0} actualizados
                                </Typography>
                                {result.errors > 0 && (
                                    <Typography variant="body2" color="warning.main">
                                        • Errores: {result.errors}
                                    </Typography>
                                )}
                            </Box>
                        </Alert>
                    )}
                </Grid>

                {/* Panel lateral - Filtros y acciones */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                                Filtro de Fechas (Opcional)
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                Filtra los registros a importar por rango de fechas
                            </Typography>

                            <TextField
                                label="Desde"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                fullWidth
                                size="small"
                                sx={{ mb: 2 }}
                                InputLabelProps={{ shrink: true }}
                            />

                            <TextField
                                label="Hasta"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                fullWidth
                                size="small"
                                sx={{ mb: 3 }}
                                InputLabelProps={{ shrink: true }}
                            />

                            <Button
                                variant="contained"
                                fullWidth
                                size="large"
                                startIcon={<CloudUploadIcon />}
                                onClick={handleUpload}
                                disabled={!selectedFile || uploading}
                            >
                                {uploading ? 'Procesando...' : 'Procesar Archivo'}
                            </Button>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinkIcon color="secondary" />
                                Vinculación Automática
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                Busca facturas huérfanas y trata de vincularlas a documentos por nombre y monto.
                            </Typography>

                            <Button
                                variant="outlined"
                                color="secondary"
                                fullWidth
                                size="large"
                                startIcon={<LinkIcon />}
                                onClick={handleAutoLinkDryRun}
                                disabled={processingLink || uploading}
                            >
                                {processingLink ? 'Analizando...' : 'Buscar Vinculaciones'}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Dialogo de Confirmación de Vinculación */}
            <Dialog
                open={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Vinculaciones Encontradas</DialogTitle>
                <DialogContent dividers>
                    {linkCandidates.length === 0 ? (
                        <Alert severity="info">No se encontraron nuevas vinculaciones posibles.</Alert>
                    ) : (
                        <>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Se han encontrado <strong>{linkCandidates.length}</strong> posibles vinculaciones.
                                Revise la lista y confirme si desea aplicarlas.
                            </Alert>
                            <TableContainer sx={{ maxHeight: 400 }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Factura</TableCell>
                                            <TableCell>Cliente</TableCell>
                                            <TableCell>Monto</TableCell>
                                            <TableCell>Documento</TableCell>
                                            <TableCell>Score</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {linkCandidates.map((cand, index) => (
                                            <TableRow key={index} hover>
                                                <TableCell><strong>{cand.invoiceNumber}</strong></TableCell>
                                                <TableCell>
                                                    <Box sx={{ fontSize: '0.85rem' }}>
                                                        <div>Fac: {cand.clientNameInvoice}</div>
                                                        <div style={{ color: 'green' }}>Doc: {cand.clientNameDocument}</div>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>${cand.amountInvoice.toFixed(2)}</TableCell>
                                                <TableCell>{cand.documentProtocol}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={cand.matchScore}
                                                        size="small"
                                                        color={parseInt(cand.matchScore) > 80 ? "success" : "warning"}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLinkDialogOpen(false)} color="inherit">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirmLink}
                        color="secondary"
                        variant="contained"
                        disabled={linkCandidates.length === 0 || processingLink}
                    >
                        {processingLink ? 'Vinculando...' : `Vincular ${linkCandidates.length} Facturas`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Historial de Importaciones */}
            <Box sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                        📜 Historial de Importaciones
                    </Typography>
                    <Tooltip title="Actualizar">
                        <span>
                            <IconButton onClick={loadImportLogs} disabled={loadingLogs}>
                                <RefreshIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>

                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Fecha</TableCell>
                                <TableCell>Archivo</TableCell>
                                <TableCell>Facturas</TableCell>
                                <TableCell>Pagos</TableCell>
                                <TableCell>Estado</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {importLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                            No hay importaciones registradas
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                importLogs.map((log) => (
                                    <TableRow key={log.id} hover>
                                        <TableCell>
                                            {billingService.formatDate(log.startedAt)}
                                        </TableCell>
                                        <TableCell>{log.fileName || '-'}</TableCell>
                                        <TableCell>
                                            {log.invoicesCreated || 0} / {log.invoicesUpdated || 0}
                                        </TableCell>
                                        <TableCell>
                                            {log.paymentsCreated || 0} / {log.paymentsUpdated || 0}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getStatusIcon(log.status)}
                                                label={log.status}
                                                color={getStatusColor(log.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default ImportarDatos;
