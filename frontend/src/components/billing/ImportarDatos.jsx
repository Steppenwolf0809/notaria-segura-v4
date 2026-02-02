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
    Tooltip,
    Tabs,
    Tab
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    InsertDriveFile as FileIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Receipt as ReceiptIcon,
    Assessment as AssessmentIcon,
    PointOfSale as PointOfSaleIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import billingService from '../../services/billing-service';

/**
 * ImportarDatos Component
 * Permite importar archivos Excel/CSV/XML de Koinor al sistema de facturación
 * - Pestaña MOV: XML de Movimientos de Caja (facturas + pagos efectivo)
 * - Pestaña PAGOS: XML de Estado de Cuenta (pagos posteriores)
 * - Pestaña CXC: XLS/CSV de Cartera por Cobrar (saldos pendientes)
 */
const ImportarDatos = () => {
    // Pestaña activa
    const [activeTab, setActiveTab] = useState(0);

    // Estado del archivo
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState(''); // Estado de procesamiento
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Filtro de fechas
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Historial de importaciones
    const [importLogs, setImportLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

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

    // Configurar formatos aceptados según la pestaña activa
    const getAcceptedFormats = () => {
        if (activeTab === 0 || activeTab === 1) {
            // Pestaña MOV y PAGOS: solo XML
            return {
                'text/xml': ['.xml'],
                'application/xml': ['.xml']
            };
        } else {
            // Pestaña CXC: XLS, XLSX, CSV
            return {
                'application/vnd.ms-excel': ['.xls'],
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                'text/csv': ['.csv']
            };
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: getAcceptedFormats(),
        maxFiles: 1,
        multiple: false
    });

    // Procesar archivo
    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setUploadProgress(0);
        setProcessingStatus('Subiendo archivo...');
        setError(null);
        setResult(null);

        try {
            let response;
            
            if (activeTab === 0) {
                // Pestaña MOV: importar XML de movimientos (facturas + pagos efectivo)
                setProcessingStatus('Procesando XML de Movimientos de Caja...');
                response = await billingService.importMovFile(
                    selectedFile,
                    (progress) => {
                        setUploadProgress(progress);
                        if (progress >= 100) {
                            setProcessingStatus('Analizando facturas y pagos en efectivo...');
                        }
                    }
                );
            } else if (activeTab === 1) {
                // Pestaña PAGOS: importar XML de pagos posteriores
                setProcessingStatus('Procesando XML de Estado de Cuenta...');
                response = await billingService.importXmlFile(
                    selectedFile,
                    (progress) => {
                        setUploadProgress(progress);
                        if (progress >= 100) {
                            setProcessingStatus('Aplicando pagos a facturas...');
                        }
                    }
                );
            } else {
                // Pestaña CXC: importar XLS/CSV de cartera por cobrar
                setProcessingStatus('Procesando archivo de Cartera por Cobrar...');
                response = await billingService.importCxcXls(
                    selectedFile,
                    (progress) => {
                        setUploadProgress(progress);
                        if (progress >= 100) {
                            setProcessingStatus('Actualizando saldos pendientes...');
                        }
                    }
                );
            }

            setProcessingStatus('¡Importación completada!');
            setResult(response.data || response);
            setSelectedFile(null);
            loadImportLogs();
        } catch (err) {
            console.error('Error importando archivo:', err);
            setProcessingStatus('');
            setError(err.response?.data?.message || err.response?.data?.error || 'Error al procesar el archivo. Verifique el formato.');
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

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudUploadIcon color="primary" />
                Importar Datos de Koinor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Importa datos de facturación desde archivos exportados del sistema Koinor.
            </Typography>

            {/* Pestañas */}
            <Paper sx={{ mb: 3 }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(e, newValue) => {
                        setActiveTab(newValue);
                        setSelectedFile(null);
                        setResult(null);
                        setError(null);
                    }}
                    variant="fullWidth"
                >
                    <Tab 
                        icon={<PointOfSaleIcon />} 
                        label="MOV - FACTURAS (XML)" 
                        iconPosition="start"
                    />
                    <Tab 
                        icon={<ReceiptIcon />} 
                        label="PAGOS POSTERIORES (XML)" 
                        iconPosition="start"
                    />
                    <Tab 
                        icon={<AssessmentIcon />} 
                        label="CXC - CARTERA (XLS/CSV)" 
                        iconPosition="start"
                    />
                </Tabs>
            </Paper>

            {/* Descripción según pestaña */}
            <Alert severity="info" sx={{ mb: 3 }}>
                {activeTab === 0 ? (
                    <>
                        <strong>� MOVIMIENTOS DE CAJA:</strong> Importa el archivo XML de "Diario de Caja" desde Koinor.
                        Este archivo contiene las facturas del día y marca automáticamente como PAGADAS las que
                        fueron pagadas en efectivo (conpag=E).
                    </>
                ) : activeTab === 1 ? (
                    <>
                        <strong>📄 PAGOS POSTERIORES:</strong> Importa el archivo XML de "Estado de Cuenta" desde Koinor.
                        Este archivo contiene los pagos por transferencia/cheque y actualiza automáticamente
                        el estado de las facturas existentes.
                    </>
                ) : (
                    <>
                        <strong>📊 CARTERA POR COBRAR:</strong> Importa el reporte XLS/CSV de saldos pendientes.
                        Este archivo es una "fotografía" de la cartera en un momento dado y se guarda en una tabla
                        separada para análisis y reportes.
                    </>
                )}
            </Alert>

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
                                    {activeTab === 0 || activeTab === 1
                                        ? 'Formato aceptado: .xml' 
                                        : 'Formatos aceptados: .xls, .xlsx, .csv'
                                    }
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {/* Barra de progreso y estado */}
                    {uploading && (
                        <Box sx={{ mt: 2 }}>
                            <LinearProgress 
                                variant={uploadProgress >= 100 ? "indeterminate" : "determinate"} 
                                value={uploadProgress} 
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <Typography variant="body2" color="primary.main" fontWeight="medium">
                                    {processingStatus || `Subiendo... ${uploadProgress}%`}
                                </Typography>
                            </Box>
                            {uploadProgress >= 100 && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Esto puede tomar varios minutos para archivos grandes...
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Mensaje de error */}
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }} icon={<ErrorIcon />}>
                            <Typography variant="subtitle2" fontWeight="bold">
                                Error en la importación
                            </Typography>
                            <Typography variant="body2">
                                {error}
                            </Typography>
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
                                {activeTab === 0 ? (
                                    // Resultado de importación de MOV (Movimientos)
                                    <>
                                        <Typography variant="body2">
                                            • Facturas procesadas: {result.stats?.totalProcesados || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            • Facturas nuevas: {result.stats?.facturasNuevas || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            • Pagos efectivo aplicados: {result.stats?.pagosEfectivoAplicados || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            • Facturas a crédito: {result.stats?.facturasCredito || 0}
                                        </Typography>
                                    </>
                                ) : activeTab === 1 ? (
                                    // Resultado de importación de PAGOS
                                    <>
                                        <Typography variant="body2">
                                            • Pagos procesados: {result.stats?.paymentsCreated || 0} nuevos
                                        </Typography>
                                        <Typography variant="body2">
                                            • Facturas actualizadas: {result.stats?.invoicesUpdated || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            • Documentos actualizados: {result.stats?.documentsUpdated || 0}
                                        </Typography>
                                        {result.stats?.invoicesCreatedLegacy > 0 && (
                                            <Typography variant="body2" color="info.main">
                                                • Facturas legacy creadas: {result.stats.invoicesCreatedLegacy}
                                            </Typography>
                                        )}
                                    </>
                                ) : (
                                    // Resultado de importación de CXC
                                    <>
                                        <Typography variant="body2">
                                            • Registros procesados: {result.stats?.totalRecords || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            • Nuevos: {result.stats?.created || 0} | Actualizados: {result.stats?.updated || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            • Saldo total: ${result.stats?.totalBalance?.toFixed(2) || '0.00'}
                                        </Typography>
                                        <Typography variant="body2">
                                            • Clientes: {result.stats?.clientsCount || 0}
                                        </Typography>
                                        {result.stats?.totalOverdue > 0 && (
                                            <Typography variant="body2" color="warning.main">
                                                • Saldo vencido: ${result.stats.totalOverdue.toFixed(2)}
                                            </Typography>
                                        )}
                                    </>
                                )}
                                {result.stats?.errors > 0 && (
                                    <Typography variant="body2" color="warning.main">
                                        • Errores: {result.stats.errors}
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
                            {(activeTab === 0 || activeTab === 1) && (
                                <>
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
                                </>
                            )}

                            {activeTab === 2 && (
                                <>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Información
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                                        El archivo debe contener las columnas: CODCLI, NOMCLI, NUMTRA, SALDO.
                                        La fecha del reporte se detecta automáticamente del nombre del archivo.
                                    </Typography>
                                </>
                            )}

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
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

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
                                            {billingService.formatDate(log.createdAt)}
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
