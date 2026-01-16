import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    Chip
} from '@mui/material';
import {
    WhatsApp as WhatsAppIcon,
    Check as CheckIcon,
    ContentCopy as CopyIcon
} from '@mui/icons-material';
import notificationService from '../../services/notification-service';
import { formatPhoneForWhatsApp, generateDocumentListText } from '../../utils/whatsappUtils';
import { toast } from 'react-toastify';

/**
 * Modal para confirmar y ejecutar notificación WhatsApp
 */
const WhatsAppNotificationModal = ({
    open,
    onClose,
    group,
    onConfirm,
    isReminder = false
}) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const cliente = group?.cliente;
    const documentos = group?.documentos || [];
    const hasPhone = !!cliente?.telefono;

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!open) {
            setResult(null);
            setLoading(false);
        }
    }, [open]);

    const handleConfirm = async () => {
        if (!group) return;

        setLoading(true);
        try {
            const response = await notificationService.bulkNotify({
                documentIds: documentos.map(d => d.id),
                clientId: cliente.identificacion,
                clientPhone: cliente.telefono,
                clientName: cliente.nombre
            });

            if (response.success) {
                setResult(response.data);

                // Auto-open WhatsApp if URL is available
                const notificado = response.data?.notificados?.[0];
                if (notificado?.waUrl) {
                    window.open(notificado.waUrl, '_blank');
                    toast.success('WhatsApp abierto - Envíe el mensaje al cliente');
                } else if (hasPhone) {
                    toast.info('Código generado pero no se pudo abrir WhatsApp');
                } else {
                    toast.warning('Código generado internamente. Notifique al cliente por otro medio.');
                }

                onConfirm?.(response.data);
            } else {
                toast.error(response.message || 'Error al procesar notificación');
            }
        } catch (error) {
            console.error('Error en notificación:', error);
            toast.error('Error de conexión al enviar notificación');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCodigo = () => {
        const codigo = result?.notificados?.[0]?.codigoRetiro || result?.sinTelefono?.[0]?.codigoRetiro;
        if (codigo) {
            navigator.clipboard.writeText(codigo);
            toast.success('Código copiado al portapapeles');
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {result ? (
                    <>
                        <CheckIcon color="success" />
                        Notificación Generada
                    </>
                ) : (
                    <>
                        <WhatsAppIcon color={hasPhone ? 'success' : 'action'} />
                        {isReminder ? 'Enviar Recordatorio' : 'Confirmar Notificación'}
                    </>
                )}
            </DialogTitle>

            <DialogContent dividers>
                {!result ? (
                    <>
                        {/* Client Info */}
                        <Box sx={{ mb: 3 }}>
                            <Typography><strong>👤 Cliente:</strong> {cliente?.nombre}</Typography>
                            <Typography><strong>🆔 Identificación:</strong> {cliente?.identificacion}</Typography>
                            <Typography>
                                <strong>📱 Teléfono:</strong> {cliente?.telefono || 'Sin teléfono'}
                                {cliente?.telefono && ` → ${formatPhoneForWhatsApp(cliente.telefono)}`}
                            </Typography>
                        </Box>

                        {/* Document List */}
                        <Typography variant="subtitle2" gutterBottom>
                            📄 Documentos a notificar ({documentos.length}):
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
                            {documentos.map((doc, i) => (
                                <Typography key={doc.id} variant="body2">
                                    {i + 1}. {doc.actoPrincipalDescripcion || doc.documentType} - {doc.protocolNumber}
                                </Typography>
                            ))}
                        </Paper>

                        {/* Warnings */}
                        {!hasPhone && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <strong>Sin teléfono:</strong> Se generará el código de retiro pero deberá
                                notificar al cliente por otro medio (email, llamada, presencial).
                            </Alert>
                        )}

                        <Alert severity="info">
                            Al confirmar:
                            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                                <li>Se generará un código de retiro único</li>
                                <li>Los documentos cambiarán a estado "CLIENTE_NOTIFICADO"</li>
                                {hasPhone && <li>Se abrirá WhatsApp con el mensaje prellenado</li>}
                                <li>Se registrará en el historial de auditoría</li>
                            </ul>
                        </Alert>
                    </>
                ) : (
                    /* Success Result */
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main" gutterBottom>
                            ✅ Listo
                        </Typography>

                        {/* Display the code prominently */}
                        <Paper
                            sx={{
                                p: 3,
                                bgcolor: 'success.light',
                                mb: 3,
                                cursor: 'pointer'
                            }}
                            onClick={handleCopyCodigo}
                        >
                            <Typography variant="overline" color="text.secondary">
                                Código de Retiro
                            </Typography>
                            <Typography
                                variant="h3"
                                fontWeight="bold"
                                fontFamily="monospace"
                                sx={{ letterSpacing: '0.2em' }}
                            >
                                {result?.notificados?.[0]?.codigoRetiro ||
                                    result?.sinTelefono?.[0]?.codigoRetiro ||
                                    'N/A'}
                            </Typography>
                            <Chip
                                icon={<CopyIcon />}
                                label="Clic para copiar"
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </Paper>

                        <Typography variant="body1" gutterBottom>
                            {result?.notificados?.length || result?.sinTelefono?.length || 0} documento(s) actualizados
                        </Typography>

                        {!hasPhone && (
                            <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                                Recuerda notificar al cliente por otro medio (email, llamada, etc.)
                            </Alert>
                        )}

                        {hasPhone && result?.notificados?.[0]?.waUrl && (
                            <Button
                                variant="outlined"
                                color="success"
                                startIcon={<WhatsAppIcon />}
                                href={result.notificados[0].waUrl}
                                target="_blank"
                                sx={{ mt: 2 }}
                            >
                                Abrir WhatsApp nuevamente
                            </Button>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                {!result ? (
                    <>
                        <Button onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            variant="contained"
                            color={hasPhone ? 'success' : 'primary'}
                            onClick={handleConfirm}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : (hasPhone ? <WhatsAppIcon /> : <CheckIcon />)}
                        >
                            {loading ? 'Procesando...' : (hasPhone ? 'ABRIR WHATSAPP Y ENVIAR' : 'GENERAR CÓDIGO')}
                        </Button>
                    </>
                ) : (
                    <Button variant="contained" onClick={onClose}>
                        Cerrar
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default WhatsAppNotificationModal;
