import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Button,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import WhatsAppPreviewModal from '../Documents/WhatsAppPreviewModal';
import notificationsService from '../../services/notifications-service';

/**
 * Componente para mostrar el historial de notificaciones WhatsApp
 * Específico para el rol de Archivo
 */
const NotificationHistory = () => {
  const [notifications, setNotifications] = useState([]);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  /**
   * Cargar historial de notificaciones
   */
  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsService.getNotifications({
        page,
        limit: rowsPerPage,
        search: searchTerm
      });

      if (response.success) {
        // Ordenar por fecha descendente por consistencia visual
        const list = (response.data.notifications || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setNotifications(list);
        setTotalNotifications(response.data.pagination?.total || list.length);
      } else {
        setNotifications([]);
        setTotalNotifications(0);
        setError(response.message || 'Error al cargar el historial de notificaciones');
      }
    } catch (error) {
      setError('Error al cargar el historial de notificaciones');
      setNotifications([]);
      setTotalNotifications(0);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filtrar notificaciones por búsqueda
   */
  const filteredNotifications = notifications.filter(notification => {
    const proto = notification.protocolNumber || notification.document?.protocolNumber || '';
    const phone = notification.clientPhone || '';
    const name = (notification.clientName || '').toLowerCase();
    const term = (searchTerm || '').toLowerCase();
    return !term || name.includes(term) || phone.includes(searchTerm) || proto.toLowerCase().includes(term);
  });

  /**
   * Obtener notificaciones de la página actual
   */
  const paginatedNotifications = filteredNotifications.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  /**
   * Formatear fecha
   */
  const formatDate = (date) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'SENT': return 'success';
      case 'FAILED': return 'error';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  /**
   * Obtener texto del estado
   */
  const getStatusText = (status) => {
    switch (status) {
      case 'SENT': return 'Enviado';
      case 'FAILED': return 'Falló';
      case 'PENDING': return 'Pendiente';
      default: return status;
    }
  };

  /**
   * Obtener icono del estado
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'SENT': return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case 'FAILED': return <ErrorIcon sx={{ fontSize: 16 }} />;
      case 'PENDING': return <ScheduleIcon sx={{ fontSize: 16 }} />;
      default: return null;
    }
  };

  /**
   * Obtener texto del tipo de mensaje
   */
  const getMessageTypeText = (type) => {
    switch (type) {
      case 'DOCUMENT_READY': return 'Documento Listo';
      case 'DOCUMENT_DELIVERED': return 'Documento Entregado';
      case 'GROUP_READY': return 'Grupo Listo';
      case 'REMINDER': return 'Recordatorio';
      default: return type;
    }
  };

  /**
   * Descargar mensaje como archivo de texto
   */
  const downloadMessage = (notification) => {
    const protocol = notification.protocolNumber || notification.document?.protocolNumber || 'N/A';
    const content = `Notificación WhatsApp
========================
Cliente: ${notification.clientName}
Teléfono: ${notification.clientPhone}
Protocolo: ${protocol}
Tipo: ${getMessageTypeText(notification.messageType)}
Estado: ${getStatusText(notification.status)}
Fecha: ${formatDate(notification.createdAt)}
${notification.sentAt ? `Enviado: ${formatDate(notification.sentAt)}` : ''}
${notification.errorMessage ? `Error: ${notification.errorMessage}` : ''}

Mensaje:
${notification.messageBody}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `whatsapp-${notification.clientName}-P${protocol}-${formatDate(notification.createdAt).replace(/[:/]/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Abrir preview de mensaje WhatsApp
   */
  const handlePreview = (notification) => {
    setSelectedNotification(notification);
    setWhatsappModalOpen(true);
  };

  const handleClosePreview = () => {
    setWhatsappModalOpen(false);
    setSelectedNotification(null);
  };

  /**
   * Manejar cambio de página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Manejar cambio de filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Cargar datos al montar y al cambiar filtros/paginación
  useEffect(() => {
    loadNotifications();
  }, [page, rowsPerPage, searchTerm]);

  return (
    <Box>
      {/* Header con controles */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WhatsAppIcon color="success" />
            Historial de Notificaciones WhatsApp
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadNotifications}
            disabled={loading}
          >
            Refrescar
          </Button>
        </Box>

        {/* Buscador */}
        <TextField
          placeholder="Buscar por cliente, teléfono o protocolo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: '100%', maxWidth: 400 }}
          size="small"
        />

        {/* Resumen */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total: {filteredNotifications.length} notificaciones
          </Typography>
          <Chip 
            label={`Enviadas: ${filteredNotifications.filter(n => n.status === 'SENT').length}`} 
            color="success" 
            size="small" 
          />
          <Chip 
            label={`Fallidas: ${filteredNotifications.filter(n => n.status === 'FAILED').length}`} 
            color="error" 
            size="small" 
          />
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabla de notificaciones */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Protocolo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? 'No hay notificaciones que coincidan con la búsqueda' : 'No hay notificaciones registradas'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notification) => (
                  <TableRow key={notification.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {notification.clientName}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {notification.clientPhone}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        #{notification.protocolNumber || notification.document?.protocolNumber || 'N/A'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {getMessageTypeText(notification.messageType)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={getStatusText(notification.status)}
                        color={getStatusColor(notification.status)}
                        size="small"
                        icon={getStatusIcon(notification.status)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(notification.createdAt)}
                      </Typography>
                      {notification.sentAt && (
                        <Typography variant="caption" color="success.main">
                          Enviado: {formatDate(notification.sentAt)}
                        </Typography>
                      )}
                      {notification.errorMessage && (
                        <Typography variant="caption" color="error.main">
                          Error: {notification.errorMessage}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Tooltip title="Ver mensaje">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handlePreview(notification)}
                          sx={{ mr: 0.5 }}
                        >
                          <WhatsAppIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar mensaje">
                        <IconButton
                          size="small"
                          onClick={() => downloadMessage(notification)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          component="div"
          count={totalNotifications}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>
      {/* Modal de preview de WhatsApp */}
      <WhatsAppPreviewModal
        open={whatsappModalOpen}
        onClose={handleClosePreview}
        notification={selectedNotification}
      />

    </Box>
  );
};

export default NotificationHistory;
