import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Grid,
    Divider,
    Button,
    Chip,
    Alert,
    Paper,
    IconButton,
    Tooltip,
    CircularProgress,
    TextField,
    Snackbar
} from '@mui/material';
import {
    CheckCircle as CompleteIcon,
    Warning as WarningIcon,
    Error as MissingIcon,
    Refresh as RefreshIcon,
    ContentCopy as CopyIcon,
    PictureAsPdf as PdfIcon,
    Close as CloseIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import apiClient from '../services/api-client';

/**
 * VistaPreviewFormulario
 * 
 * Componente para mostrar una vista previa del formulario UAFE antes de generar PDF.
 * Muestra indicadores de completitud de datos.
 */
const VistaPreviewFormulario = ({
    open,
    onClose,
    protocolo,
    persona,
    onRefresh,
    onGeneratePDF,
    loading: externalLoading = false
}) => {
    const [copied, setCopied] = React.useState(false);
    const [editMode, setEditMode] = React.useState(false);
    const [formData, setFormData] = React.useState({});
    const [saving, setSaving] = React.useState(false);
    const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });

    // URL del registro de usuarios
    const REGISTRO_URL = 'https://notaria18quito.com.ec/registro-personal/';

    // Cargar datos en formData al abrir o cambiar persona
    React.useEffect(() => {
        if (persona) {
            const data = persona.tipoPersona === 'NATURAL'
                ? persona.datosPersonaNatural
                : persona.datosPersonaJuridica;
            // Clonar para evitar mutar prop
            setFormData(data ? JSON.parse(JSON.stringify(data)) : {});
        }
    }, [persona, open]);

    /**
     * Manejar cambios en inputs (soporta path 'seccion.campo')
     */
    const handleInputChange = (path, value) => {
        const parts = path.split('.');
        setFormData(prev => {
            const newData = { ...prev };
            let current = newData;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) current[parts[i]] = {};
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
            return newData;
        });
    };

    /**
     * Guardar cambios en el backend
     */
    const handleSave = async () => {
        setSaving(true);
        try {
            // Identificador para la ruta: usamos persona.cedula (número de identificación)
            const id = persona.cedula || persona.numeroIdentificacion;
            const response = await apiClient.put(`/formulario-uafe/persona/${id}`, formData);

            if (response.data.success) {
                setSnackbar({ open: true, message: 'Datos actualizados correctamente', severity: 'success' });
                setEditMode(false);
                if (onRefresh) onRefresh(); // Recargar datos del padre
            } else {
                setSnackbar({ open: true, message: 'Error al actualizar datos', severity: 'error' });
            }
        } catch (error) {
            console.error('Error guardando:', error);
            setSnackbar({ open: true, message: 'Error de conexión al guardar', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    /**
     * Obtener datos (para visualización read-only usamos props, para edit formData)
     * Pero para consistencia visual, en read-only también podríamos usar formData si quisiéramos ver lo editado antes de guardar?
     * No, mejor usar props en read-only para asegurar que vemos lo confirmado.
     * EXCEPTO si acabamos de guardar, onRefresh actualizará props.
     */
    const getDatosPersona = () => {
        if (!persona) return null;
        return persona.tipoPersona === 'NATURAL'
            ? persona.datosPersonaNatural
            : persona.datosPersonaJuridica;
    };

    const datos = getDatosPersona();

    /**
     * Evaluar si un campo tiene datos
     */
    const hasValue = (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
    };

    const resolveValue = (obj, path) => {
        if (!path) return undefined;
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            current = current?.[part];
        }
        return current;
    };

    /**
     * Renderizar indicador de completitud
     */
    const renderIndicator = (value, required = false) => {
        if (hasValue(value)) {
            return <CompleteIcon fontSize="small" color="success" />;
        }
        if (required) {
            return <MissingIcon fontSize="small" color="error" />;
        }
        return <WarningIcon fontSize="small" color="warning" />;
    };

    /**
     * Renderizar campo con indicador o Input de edición
     */
    const renderField = (label, value, required = false, editPath = null) => {
        // Modo Edición
        if (editMode && editPath) {
            const editValue = resolveValue(formData, editPath) || '';
            return (
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label={label}
                        value={editValue}
                        onChange={(e) => handleInputChange(editPath, e.target.value)}
                        error={required && !hasValue(editValue)}
                        helperText={required && !hasValue(editValue) ? 'Requerido' : ''}
                    />
                </Box>
            );
        }

        // Modo Visualización
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {renderIndicator(value, required)}
                <Typography variant="body2" color="text.secondary" sx={{ width: 140 }}>
                    {label}:
                </Typography>
                <Typography variant="body2" fontWeight={hasValue(value) ? 'medium' : 'normal'} color={hasValue(value) ? 'text.primary' : 'text.disabled'}>
                    {hasValue(value) ? value : '(sin datos)'}
                </Typography>
            </Box>
        );
    };

    /**
     * Copiar link de registro al portapapeles
     */
    const handleCopyLink = async () => {
        const mensaje = `Para actualizar sus datos UAFE, por favor ingrese a: ${REGISTRO_URL}`;
        try {
            await navigator.clipboard.writeText(mensaje);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
        }
    };

    /**
     * Calcular estadísticas de completitud
     */
    const getCompletionStats = () => {
        if (!datos) return { complete: 0, warning: 0, missing: 0, total: 0 };

        const requiredFields = [
            datos?.datosPersonales?.apellidos,
            datos?.datosPersonales?.nombres,
            datos?.identificacion?.numero,
            datos?.identificacion?.nacionalidad
        ];

        const optionalFields = [
            datos?.contacto?.email,
            datos?.contacto?.celular,
            datos?.direccion?.callePrincipal,
            datos?.informacionLaboral?.situacion,
            datos?.informacionLaboral?.profesionOcupacion
        ];

        const complete = [...requiredFields, ...optionalFields].filter(hasValue).length;
        const missing = requiredFields.filter(f => !hasValue(f)).length;
        const warning = optionalFields.filter(f => !hasValue(f)).length;
        const total = requiredFields.length + optionalFields.length;

        return { complete, warning, missing, total };
    };

    const stats = getCompletionStats();
    const isReadyForPDF = stats.missing === 0;

    if (!persona || !protocolo) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { maxHeight: '90vh' } }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
                <Box>
                    <Typography variant="h6">
                        {editMode ? 'Editar Formulario UAFE' : 'Vista Previa del Formulario UAFE'}
                    </Typography>
                    <Typography variant="caption">
                        Protocolo: {protocolo.numeroProtocolo || 'Temporal'}
                    </Typography>
                </Box>
                <Box>
                    {!editMode && (
                        <Button
                            color="inherit"
                            startIcon={<EditIcon />}
                            onClick={() => setEditMode(true)}
                            sx={{ mr: 1, borderColor: 'white' }}
                            variant="outlined"
                        >
                            Editar
                        </Button>
                    )}
                    <IconButton onClick={onClose} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3 }}>
                {/* Barra de estado de completitud (Solo en modo vista) */}
                {!editMode && (
                    <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: isReadyForPDF ? '#e8f5e9' : '#fff3e0', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {isReadyForPDF ? (
                                    <CompleteIcon color="success" fontSize="large" />
                                ) : (
                                    <WarningIcon color="warning" fontSize="large" />
                                )}
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {isReadyForPDF ? '✅ Datos completos' : '⚠️ Datos incompletos'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {stats.complete}/{stats.total} campos completados
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip
                                    icon={<CompleteIcon fontSize="small" />}
                                    label={stats.complete}
                                    color="success"
                                    size="small"
                                    variant="outlined"
                                />
                                <Chip
                                    icon={<WarningIcon fontSize="small" />}
                                    label={stats.warning}
                                    color="warning"
                                    size="small"
                                    variant="outlined"
                                />
                                {stats.missing > 0 && (
                                    <Chip
                                        icon={<MissingIcon fontSize="small" />}
                                        label={stats.missing}
                                        color="error"
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </Box>
                    </Paper>
                )}

                {/* Alerta si faltan datos */}
                {!isReadyForPDF && !editMode && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                            Si el usuario necesita actualizar sus datos, puede hacerlo en la siguiente dirección:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ wordBreak: 'break-all' }}>
                                {REGISTRO_URL}
                            </Typography>
                            <Tooltip title={copied ? '¡Copiado!' : 'Copiar mensaje completo'}>
                                <IconButton size="small" onClick={handleCopyLink} color={copied ? 'success' : 'primary'}>
                                    <CopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Alert>
                )}

                {/* Información del protocolo (Read Only) */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                        📋 INFORMACIÓN DEL PROTOCOLO
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            {renderField('Número', protocolo.numeroProtocolo, true)}
                        </Grid>
                        <Grid item xs={6}>
                            {renderField('Fecha', protocolo.fecha?.split('T')[0], true)}
                        </Grid>
                        <Grid item xs={6}>
                            {renderField('Acto/Contrato', protocolo.actoContrato, true)}
                        </Grid>
                        <Grid item xs={6}>
                            {renderField('Valor Contrato', `$${parseFloat(protocolo.valorContrato || 0).toFixed(2)}`, true)}
                        </Grid>
                    </Grid>
                </Paper>

                {/* Información de la persona */}
                {persona.tipoPersona === 'NATURAL' && (
                    <>
                        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                👤 IDENTIFICACIÓN (Obligatorio)
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    {renderField('Apellidos', datos?.datosPersonales?.apellidos, true, 'datosPersonales.apellidos')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Nombres', datos?.datosPersonales?.nombres, true, 'datosPersonales.nombres')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Tipo ID', datos?.identificacion?.tipo, true, 'identificacion.tipo')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Número ID', datos?.identificacion?.numero || persona.cedula, true, 'identificacion.numero')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Nacionalidad', datos?.identificacion?.nacionalidad, true, 'identificacion.nacionalidad')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Estado Civil', datos?.datosPersonales?.estadoCivil, false, 'datosPersonales.estadoCivil')}
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                📧 CONTACTO
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    {renderField('Email', datos?.contacto?.email, false, 'contacto.email')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Teléfono', datos?.contacto?.telefono, false, 'contacto.telefono')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Celular', datos?.contacto?.celular, false, 'contacto.celular')}
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                🏠 DIRECCIÓN
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    {renderField('Calle Principal', datos?.direccion?.callePrincipal, false, 'direccion.callePrincipal')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Calle Secundaria', datos?.direccion?.calleSecundaria, false, 'direccion.calleSecundaria')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Provincia', datos?.direccion?.provincia, false, 'direccion.provincia')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Cantón', datos?.direccion?.canton, false, 'direccion.canton')}
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                💼 INFORMACIÓN LABORAL
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    {renderField('Situación', datos?.informacionLaboral?.situacion, false, 'informacionLaboral.situacion')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Profesión', datos?.informacionLaboral?.profesionOcupacion, false, 'informacionLaboral.profesionOcupacion')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Entidad', datos?.informacionLaboral?.nombreEntidad, false, 'informacionLaboral.nombreEntidad')}
                                </Grid>
                                <Grid item xs={6}>
                                    {renderField('Cargo', datos?.informacionLaboral?.cargo, false, 'informacionLaboral.cargo')}
                                </Grid>
                            </Grid>
                        </Paper>
                    </>
                )}

                {/* Persona jurídica */}
                {persona.tipoPersona === 'JURIDICA' && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                            🏢 INFORMACIÓN EMPRESA
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                {renderField('Razón Social', datos?.compania?.razonSocial, true, 'compania.razonSocial')}
                            </Grid>
                            <Grid item xs={6}>
                                {renderField('RUC', persona.cedula, true, 'identificacion.numero')}
                            </Grid>
                            <Grid item xs={6}>
                                {renderField('País Constitución', datos?.compania?.paisConstitucion, false, 'compania.paisConstitucion')}
                            </Grid>
                        </Grid>
                    </Paper>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Box>
                    {editMode ? (
                        <Button
                            variant="text"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => { setEditMode(false); setFormData(JSON.parse(JSON.stringify(datos))); }}
                        >
                            Cancelar
                        </Button>
                    ) : (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                startIcon={<CopyIcon />}
                                onClick={handleCopyLink}
                                color={copied ? 'success' : 'primary'}
                            >
                                {copied ? 'Copiado!' : 'Copiar Link Registro'}
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={externalLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                                onClick={onRefresh}
                                disabled={externalLoading}
                            >
                                Refrescar
                            </Button>
                        </Box>
                    )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    {editMode ? (
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    ) : (
                        <>
                            <Button onClick={onClose}>
                                Cerrar
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<PdfIcon />}
                                onClick={onGeneratePDF}
                                disabled={externalLoading}
                            >
                                Generar PDF
                            </Button>
                        </>
                    )}
                </Box>
            </DialogActions>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                message={snackbar.message}
            />
        </Dialog>
    );
};

export default VistaPreviewFormulario;
