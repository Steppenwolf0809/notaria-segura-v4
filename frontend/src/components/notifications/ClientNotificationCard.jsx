import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    Button,
    Divider,
    Alert,
    TextField,
    IconButton,
    Tooltip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    WhatsApp as WhatsAppIcon,
    Notifications as NotificationsIcon,
    Person as PersonIcon,
    Badge as BadgeIcon,
    Phone as PhoneIcon,
    Warning as WarningIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    Error as ErrorIcon,
    NotificationsOff as NotificationsOffIcon
} from '@mui/icons-material';
import { validatePhoneForWhatsApp } from '../../utils/whatsappUtils';
import { toast } from 'react-toastify';
import notificationService from '../../services/notification-service';

/**
 * Calcula días desde una fecha
 */
const daysSince = (date) => {
    if (!date) return 0;
    const now = new Date();
    const then = new Date(date);
    const diffTime = Math.abs(now - then);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Card que muestra un cliente con sus documentos agrupados
 * para notificación WhatsApp
 */
const ClientNotificationCard = ({ group, onNotify, isReminder = false, onPhoneUpdated, onDismiss, clientStats }) => {
    const { cliente, documentos, stats } = group;
    
    // 🔄 Verificar si hay más documentos de los que se muestran
    const totalDocs = clientStats?.totalListo || documentos?.length || 0;
    const showingDocs = documentos?.length || 0;
    const additionalDocs = totalDocs - showingDocs;
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneValue, setPhoneValue] = useState(cliente?.telefono || '');
    const [saving, setSaving] = useState(false);
    const [dismissing, setDismissing] = useState(false);
    const [showDismissDialog, setShowDismissDialog] = useState(false);

    // Validar teléfono actual
    const phoneValidation = validatePhoneForWhatsApp(cliente?.telefono);
    const hasPhone = !!cliente?.telefono;
    const isPhoneValid = phoneValidation.valid;
    const phoneIssue = phoneValidation.reason;
    const issueSeverity = phoneValidation.severity;

    // Determinar si se puede notificar
    const canNotify = hasPhone && (isPhoneValid || issueSeverity === 'warning');

    // Manejar guardado de teléfono
    const handleSavePhone = async () => {
        if (!phoneValue.trim()) {
            toast.error('El teléfono no puede estar vacío');
            return;
        }

        const validation = validatePhoneForWhatsApp(phoneValue);
        if (!validation.valid && validation.severity === 'error') {
            toast.error(`Teléfono inválido: ${validation.reason}`);
            return;
        }

        setSaving(true);
        try {
            const docIds = documentos.map(d => d.id);
            await notificationService.updateClientPhone({
                documentIds: docIds,
                clientPhone: phoneValue.trim()
            });

            toast.success('Teléfono actualizado correctamente');
            setEditingPhone(false);

            // Notificar al padre para refrescar
            if (onPhoneUpdated) {
                onPhoneUpdated(cliente.identificacion, phoneValue.trim());
            }
        } catch (error) {
            console.error('Error actualizando teléfono:', error);
            toast.error('Error al actualizar el teléfono');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setPhoneValue(cliente?.telefono || '');
        setEditingPhone(false);
    };

    // Manejar ignorar notificación
    const handleDismissClick = () => {
        setShowDismissDialog(true);
    };

    const handleDismissConfirm = async () => {
        setShowDismissDialog(false);
        setDismissing(true);
        try {
            const docIds = documentos.map(d => d.id);
            const result = await notificationService.dismissNotifications({
                documentIds: docIds,
                reason: 'Ignorado manualmente desde Centro de Notificaciones'
            });

            if (result.success) {
                toast.success(`Notificación ignorada para ${cliente?.nombre}`);
                // Notificar al padre para refrescar
                if (onDismiss) {
                    onDismiss(cliente.identificacion);
                } else if (onPhoneUpdated) {
                    onPhoneUpdated(); // Fallback para refrescar
                }
            } else {
                toast.error(result.message || 'Error al ignorar notificación');
            }
        } catch (error) {
            console.error('Error ignorando notificación:', error);
            toast.error('Error al ignorar la notificación');
        } finally {
            setDismissing(false);
        }
    };

    return (
        <Card
            variant="outlined"
            sx={{
                transition: 'all 0.2s',
                '&:hover': {
                    boxShadow: 3,
                    borderColor: canNotify ? 'success.main' : 'warning.main'
                },
                borderLeft: !canNotify ? '4px solid' : 'none',
                borderLeftColor: !canNotify ? 'warning.main' : 'transparent'
            }}
        >
            <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="primary" />
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {cliente?.nombre || 'Sin nombre'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Chip
                                    icon={<BadgeIcon />}
                                    label={cliente?.identificacion || 'Sin ID'}
                                    size="small"
                                    variant="outlined"
                                />

                                {/* Teléfono con edición inline */}
                                {editingPhone ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TextField
                                            size="small"
                                            value={phoneValue}
                                            onChange={(e) => setPhoneValue(e.target.value)}
                                            placeholder="0987654321"
                                            sx={{ width: 140 }}
                                            disabled={saving}
                                            autoFocus
                                        />
                                        <IconButton
                                            size="small"
                                            color="success"
                                            onClick={handleSavePhone}
                                            disabled={saving}
                                        >
                                            {saving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={handleCancelEdit}
                                            disabled={saving}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Chip
                                            icon={<PhoneIcon />}
                                            label={cliente?.telefono || 'Sin teléfono'}
                                            size="small"
                                            variant="outlined"
                                            color={!hasPhone ? 'warning' : (isPhoneValid ? 'default' : (issueSeverity === 'error' ? 'error' : 'warning'))}
                                        />
                                        {/* Icono de advertencia si hay problema */}
                                        {hasPhone && !isPhoneValid && (
                                            <Tooltip title={phoneIssue}>
                                                {issueSeverity === 'error' ? (
                                                    <ErrorIcon color="error" fontSize="small" />
                                                ) : (
                                                    <WarningIcon color="warning" fontSize="small" />
                                                )}
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Editar teléfono">
                                            <IconButton
                                                size="small"
                                                onClick={() => setEditingPhone(true)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Chip
                        label={`${documentos?.length || 0} doc${documentos?.length !== 1 ? 's' : ''}`}
                        color={isReminder ? 'warning' : 'primary'}
                        icon={isReminder ? <NotificationsIcon /> : <WhatsAppIcon />}
                    />
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Document List */}
                <Box sx={{ mb: 2 }}>
                    {documentos?.map((doc, index) => {
                        const dias = daysSince(doc.fechaListo || doc.createdAt);
                        return (
                            <Box
                                key={doc.id || index}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    py: 0.75,
                                    borderBottom: index < documentos.length - 1 ? '1px solid' : 'none',
                                    borderColor: 'divider'
                                }}
                            >
                                <Typography variant="body2">
                                    📄 {doc.actoPrincipalDescripcion || doc.documentType} - {doc.protocolNumber}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Hace {dias} día{dias !== 1 ? 's' : ''}
                                    </Typography>
                                    {doc.codigoRetiro && (
                                        <Chip
                                            label={`Código: ${doc.codigoRetiro}`}
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>

                {/* 🔄 Indicador de documentos adicionales */}
                {additionalDocs > 0 && !isReminder && (
                    <Alert severity="info" sx={{ py: 0.5, mb: 1 }}>
                        <Typography variant="caption">
                            <strong>📦 Nota:</strong> Este cliente tiene {totalDocs} documentos listos en total. 
                            {additionalDocs > 0 && ` ${additionalDocs} ya ${additionalDocs === 1 ? 'fue notificado' : 'fueron notificados'} anteriormente. `}
                            Al enviar esta notificación se incluirán todos.
                        </Typography>
                    </Alert>
                )}

                {/* Warnings */}
                {!hasPhone && (
                    <Alert severity="warning" sx={{ py: 0, mb: 1 }}>
                        <Typography variant="caption">
                            <strong>Sin teléfono:</strong> Se generará código pero deberá notificar por otro medio
                        </Typography>
                    </Alert>
                )}

                {hasPhone && !isPhoneValid && issueSeverity === 'error' && (
                    <Alert severity="error" sx={{ py: 0, mb: 1 }}>
                        <Typography variant="caption">
                            <strong>Teléfono inválido:</strong> {phoneIssue}. Edite el número antes de enviar.
                        </Typography>
                    </Alert>
                )}

                {hasPhone && phoneIssue && issueSeverity === 'warning' && (
                    <Alert severity="warning" sx={{ py: 0, mb: 1 }}>
                        <Typography variant="caption">
                            <strong>Advertencia:</strong> {phoneIssue}. Verifique antes de enviar.
                        </Typography>
                    </Alert>
                )}

                {/* Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                    {/* Botón Ignorar - solo en tab pending (no es reminder) */}
                    {!isReminder && (
                        <Tooltip title="Ignorar esta notificación (el documento permanece LISTO)">
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={handleDismissClick}
                                disabled={dismissing}
                                startIcon={dismissing ? <CircularProgress size={16} /> : <NotificationsOffIcon />}
                                size="small"
                                sx={{
                                    minWidth: 100,
                                    color: 'text.secondary',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        borderColor: 'error.main',
                                        color: 'error.main'
                                    }
                                }}
                            >
                                Ignorar
                            </Button>
                        </Tooltip>
                    )}

                    <Button
                        variant="contained"
                        color={canNotify ? (isReminder ? 'warning' : 'success') : 'inherit'}
                        disabled={!canNotify && !hasPhone}
                        onClick={() => onNotify(group)}
                        startIcon={isReminder ? <NotificationsIcon /> : <WhatsAppIcon />}
                        sx={{
                            minWidth: 150
                        }}
                    >
                        {isReminder ? 'RECORDAR' : 'NOTIFICAR'} ({documentos?.length || 0})
                    </Button>
                </Box>
            </CardContent>

            {/* Diálogo de confirmación compacto para Ignorar */}
            <Dialog
                open={showDismissDialog}
                onClose={() => setShowDismissDialog(false)}
                maxWidth="xs"
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ pb: 1, fontSize: '1rem' }}>
                    ¿Ignorar notificación?
                </DialogTitle>
                <DialogContent sx={{ py: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        El documento permanecerá en estado LISTO pero no aparecerá en la cola de notificaciones.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        size="small"
                        onClick={() => setShowDismissDialog(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        color="error"
                        onClick={handleDismissConfirm}
                        startIcon={<NotificationsOffIcon />}
                    >
                        Ignorar
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};

export default ClientNotificationCard;

