import React from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    Button,
    Divider,
    Alert
} from '@mui/material';
import {
    WhatsApp as WhatsAppIcon,
    Notifications as NotificationsIcon,
    Person as PersonIcon,
    Badge as BadgeIcon,
    Phone as PhoneIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

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
const ClientNotificationCard = ({ group, onNotify, isReminder = false }) => {
    const { cliente, documentos, stats } = group;
    const hasPhone = !!cliente?.telefono;

    return (
        <Card
            variant="outlined"
            sx={{
                transition: 'all 0.2s',
                '&:hover': {
                    boxShadow: 3,
                    borderColor: hasPhone ? 'success.main' : 'warning.main'
                }
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
                                <Chip
                                    icon={<PhoneIcon />}
                                    label={cliente?.telefono || 'Sin teléfono'}
                                    size="small"
                                    variant="outlined"
                                    color={hasPhone ? 'default' : 'warning'}
                                />
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

                {/* Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {!hasPhone && (
                        <Alert severity="warning" sx={{ py: 0, flex: 1, mr: 2 }}>
                            <Typography variant="caption">
                                Sin teléfono: Se generará código pero deberá notificar por otro medio
                            </Typography>
                        </Alert>
                    )}

                    <Button
                        variant="contained"
                        color={hasPhone ? (isReminder ? 'warning' : 'success') : 'inherit'}
                        disabled={!hasPhone && !isReminder}
                        onClick={() => onNotify(group)}
                        startIcon={isReminder ? <NotificationsIcon /> : <WhatsAppIcon />}
                        sx={{
                            ml: 'auto',
                            minWidth: 150
                        }}
                    >
                        {isReminder ? 'RECORDAR' : 'NOTIFICAR'} ({documentos?.length || 0})
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default ClientNotificationCard;
