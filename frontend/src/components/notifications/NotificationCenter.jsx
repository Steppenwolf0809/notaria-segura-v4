import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    TextField,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Paper,
    IconButton,
    Tooltip,
    Badge
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    WhatsApp as WhatsAppIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Warning as WarningIcon,
    AccessTime as AccessTimeIcon,
    Send as SendIcon
} from '@mui/icons-material';
import ClientNotificationCard from './ClientNotificationCard';
import WhatsAppNotificationModal from './WhatsAppNotificationModal';
import notificationService from '../../services/notification-service';
import { groupDocumentsByClient } from '../../utils/whatsappUtils';
import useAuth from '../../hooks/use-auth';

/**
 * Centro de Notificaciones WhatsApp
 * Vista centralizada para gestionar notificaciones a clientes
 * - Tab "Por Notificar": Documentos LISTO sin notificar
 * - Tab "Para Recordar": Documentos notificados hace +X días
 */
const NotificationCenter = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(0); // 0: Por Notificar, 1: Para Recordar, 2: Enviados
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [reminderDays, setReminderDays] = useState(3);

    // Modal state
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Load data based on active tab
    useEffect(() => {
        loadQueue();
    }, [activeTab, reminderDays]);

    const loadQueue = async () => {
        setLoading(true);
        setError(null);
        try {
            const tab = activeTab === 0 ? 'pending' : activeTab === 1 ? 'reminders' : 'sent';
            const result = await notificationService.getQueue(tab, reminderDays);

            if (result.success) {
                setDocuments(result.data || []);
            } else {
                setError(result.message || 'Error cargando cola de notificaciones');
            }
        } catch (err) {
            console.error('Error loading notification queue:', err);
            setError('Error de conexión al cargar notificaciones');
        } finally {
            setLoading(false);
        }
    };

    // Group documents by client
    const groupedClients = useMemo(() => {
        if (!documents.length) return [];

        const grouped = groupDocumentsByClient(documents);

        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            return grouped.filter(group =>
                group.cliente.nombre?.toLowerCase().includes(term) ||
                group.cliente.identificacion?.toLowerCase().includes(term) ||
                group.cliente.telefono?.includes(term)
            );
        }

        return grouped;
    }, [documents, searchTerm]);

    // Stats
    const stats = useMemo(() => {
        const total = groupedClients.length;
        const withPhone = groupedClients.filter(g => g.cliente.telefono).length;
        const withoutPhone = total - withPhone;
        const totalDocs = documents.length;

        return { total, withPhone, withoutPhone, totalDocs };
    }, [groupedClients, documents]);

    const handleTabChange = (_, newValue) => {
        setActiveTab(newValue);
        setSearchTerm('');
    };

    const handleNotify = (group) => {
        setSelectedGroup(group);
        setShowNotifyModal(true);
    };

    const handleNotifyConfirm = async (result) => {
        // Refresh the queue after successful notification
        await loadQueue();
        setShowNotifyModal(false);
        setSelectedGroup(null);
    };

    const handleCloseModal = () => {
        setShowNotifyModal(false);
        setSelectedGroup(null);
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <NotificationsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h5" fontWeight="bold">
                            Centro de Notificaciones
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {user?.role === 'MATRIZADOR' || user?.role === 'ARCHIVO'
                                ? 'Mis documentos pendientes de notificación'
                                : 'Gestión centralizada de notificaciones WhatsApp'}
                        </Typography>
                    </Box>
                </Box>

                <Tooltip title="Actualizar">
                    <IconButton onClick={loadQueue} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab
                        icon={<Badge badgeContent={activeTab === 0 ? stats.totalDocs : 0} color="primary"><WhatsAppIcon /></Badge>}
                        label="Por Notificar"
                        iconPosition="start"
                    />
                    <Tab
                        icon={<Badge badgeContent={activeTab === 1 ? stats.totalDocs : 0} color="warning"><AccessTimeIcon /></Badge>}
                        label="Para Recordar"
                        iconPosition="start"
                    />
                    <Tab
                        icon={<Badge badgeContent={activeTab === 2 ? stats.totalDocs : 0} color="info"><SendIcon /></Badge>}
                        label="Enviados"
                        iconPosition="start"
                    />
                </Tabs>
            </Paper>

            {/* Stats Bar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Chip
                    icon={<WhatsAppIcon />}
                    label={`${stats.total} clientes`}
                    color="primary"
                    variant="outlined"
                />
                <Chip
                    label={`${stats.totalDocs} documentos`}
                    variant="outlined"
                />
                {stats.withoutPhone > 0 && (
                    <Chip
                        icon={<WarningIcon />}
                        label={`${stats.withoutPhone} sin teléfono`}
                        color="warning"
                        variant="outlined"
                    />
                )}

                {/* Search */}
                <TextField
                    size="small"
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                    }}
                    sx={{ ml: 'auto', minWidth: 250 }}
                />
            </Box>

            {/* Content */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                    <Button size="small" onClick={loadQueue} sx={{ ml: 2 }}>
                        Reintentar
                    </Button>
                </Alert>
            ) : groupedClients.length === 0 ? (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <NotificationsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            {activeTab === 0
                                ? 'No hay documentos pendientes de notificación'
                                : activeTab === 1
                                    ? 'No hay recordatorios pendientes'
                                    : 'No hay notificaciones enviadas'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {activeTab === 0
                                ? 'Los documentos aparecerán aquí cuando estén listos para notificar'
                                : activeTab === 1
                                    ? `Los clientes notificados hace más de ${reminderDays} días aparecerán aquí`
                                    : 'Las notificaciones enviadas aparecerán aquí para poder reenviar'}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {groupedClients.map((group, index) => (
                        <ClientNotificationCard
                            key={group.cliente.identificacion || `group-${index}`}
                            group={group}
                            onNotify={handleNotify}
                            isReminder={activeTab === 1 || activeTab === 2}
                            onPhoneUpdated={() => loadQueue()}
                            onDismiss={() => loadQueue()}
                        />
                    ))}
                </Box>
            )}

            {/* Notification Modal */}
            <WhatsAppNotificationModal
                open={showNotifyModal}
                onClose={handleCloseModal}
                group={selectedGroup}
                onConfirm={handleNotifyConfirm}
                isReminder={activeTab === 1}
            />
        </Box>
    );
};

export default NotificationCenter;
