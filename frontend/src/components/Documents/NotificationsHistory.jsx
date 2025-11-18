import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  Paper,
  Button,
  Grid,
  CircularProgress,
  TableSortLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Phone as PhoneIcon,
  WhatsApp as WhatsAppIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import notificationsService from '../../services/notifications-service';
import WhatsAppPreviewModal from './WhatsAppPreviewModal';
import useAuthStore from '../../store/auth-store';

/**
 * Componente NotificationsHistory - Tabla de auditoría de notificaciones
 * Muestra historial completo de notificaciones enviadas con estados
 */
const NotificationsHistory = () => {
  // Obtener usuario actual del store de autenticación
  const { user } = useAuthStore();
  
  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(false);
  // Ordenamiento
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Estados para datos reales
  const [notifications, setNotifications] = useState([]);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    simulated: 0,
    pending: 0
  });

  // Estados para modales
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  /**
   * Cargar notificaciones desde el backend
   */
  const loadNotifications = async () => {
    setLoading(true);

    try {
      // Calcular rango de fechas para el backend según dateFilter
      let dateFrom = '';
      let dateTo = '';
      if (dateFilter) {
        const now = new Date();
        switch (dateFilter) {
          case 'today':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            break;
          case 'week':
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'month':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            break;
          default:
            dateFrom = '';
        }
        // dateTo puede omitirse (hasta ahora)
      }

      const response = await notificationsService.getNotifications({
        page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      });


      if (response.success) {
        setNotifications(response.data.notifications || []);
        setTotalNotifications(response.data.pagination?.total || 0);
        setStats(response.data.stats || stats);
          notificationsCount: response.data.notifications?.length || 0,
          total: response.data.pagination?.total || 0,
          stats: response.data.stats
        });
      } else {
        setNotifications([]);
      }
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente y cuando cambien los filtros o el usuario
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, dateFilter, sortBy, sortOrder, user?.id]);

  // Usar las notificaciones reales en lugar del array vacío
  const realNotifications = notifications;

  /**
   * Obtener icono del estado
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'SENT':
        return <CheckCircleIcon />;
      case 'FAILED':
        return <ErrorIcon />;
      case 'PENDING':
        return <ScheduleIcon />;
      case 'SIMULATED':
        return <CodeIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'SENT':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      case 'SIMULATED':
        return 'info';
      default:
        return 'default';
    }
  };

  /**
   * Obtener texto del estado
   */
  const getStatusText = (status) => {
    switch (status) {
      case 'SENT':
        return 'Enviado';
      case 'FAILED':
        return 'Fallido';
      case 'PENDING':
        return 'Pendiente';
      case 'SIMULATED':
        return 'Simulado';
      default:
        return status;
    }
  };

  /**
   * Filtrar notificaciones
   */
  const filteredNotifications = useMemo(() => {
    let filtered = [...realNotifications];

    // Búsqueda por texto (coincide con el esquema real del backend)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((n) =>
        (n.clientName || '').toLowerCase().includes(searchLower) ||
        (n.document?.protocolNumber || '').toLowerCase().includes(searchLower) ||
        (n.clientPhone || '').includes(searchTerm) ||
        (n.messageBody || '').toLowerCase().includes(searchLower)
      );
    }

    // Filtro por estado (valores: SENT | FAILED | PENDING | SIMULATED)
    if (statusFilter) {
      filtered = filtered.filter((n) => n.status === statusFilter);
    }

    // Nota: el filtrado por fecha se realiza en el backend para mantener paginación y totales coherentes

    return filtered;
  }, [realNotifications, searchTerm, statusFilter, dateFilter]);

  /**
   * Notificaciones paginadas
   */
  const paginatedNotifications = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredNotifications.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredNotifications, page, rowsPerPage]);





  /**
   * Formatear fecha
   */
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  /**
   * Limpiar filtros
   */
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setDateFilter('');
    setPage(0);
  };

  /**
   * Refrescar datos
   */
  const handleRefresh = async () => {
    await loadNotifications();
  };

  /**
   * Manejar cambio de página
   */
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Manejar cambio de filas por página
   */
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Cambiar campo/dirección de orden
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(0);
  };

  /**
   * Abrir modal de preview de WhatsApp
   */
  const handleWhatsAppPreview = (notification) => {
    setSelectedNotification(notification);
    setWhatsappModalOpen(true);
  };

  /**
   * Cerrar modal de WhatsApp
   */
  const handleCloseWhatsAppModal = () => {
    setWhatsappModalOpen(false);
    setSelectedNotification(null);
  };

  /**
   * Descargar mensaje como archivo de texto
   */
  const handleDownloadMessage = (notification) => {
    const content = `Notificación WhatsApp - ${notification.clientName}\n\n` +
                   `Fecha: ${formatDate(notification.createdAt)}\n` +
                   `Cliente: ${notification.clientName}\n` +
                   `Teléfono: ${notification.clientPhone}\n` +
                   `Estado: ${getStatusText(notification.status)}\n` +
                   `Documento: ${notification.document?.protocolNumber || 'Sin documento'}\n\n` +
                   `Mensaje:\n${notification.messageBody}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `whatsapp-${notification.clientName}-${formatDate(notification.createdAt).replace(/[:/]/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Historial de Notificaciones
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Auditoría completa de notificaciones enviadas
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </Box>
      </Box>

      {/* Estadísticas rápidas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Enviadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                {stats.sent}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Exitosas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                {stats.failed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fallidas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pendientes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                {stats.simulated}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Simuladas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
            {/* Búsqueda */}
            <TextField
              fullWidth
              placeholder="Buscar por cliente, documento o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 300 }}
            />

            {/* Filtro por estado */}
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Estado"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="SENT">Exitosa</MenuItem>
                <MenuItem value="FAILED">Fallida</MenuItem>
                <MenuItem value="PENDING">Pendiente</MenuItem>
                <MenuItem value="SIMULATED">Simulada</MenuItem>
              </Select>
            </FormControl>

            {/* Filtro por fecha */}
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                label="Período"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="today">Hoy</MenuItem>
                <MenuItem value="week">Esta semana</MenuItem>
                <MenuItem value="month">Este mes</MenuItem>
              </Select>
            </FormControl>

            {/* Botón limpiar */}
            <Button
              variant="outlined"
              onClick={clearFilters}
              sx={{ minWidth: 120 }}
            >
              Limpiar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabla de notificaciones */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortBy === 'createdAt'}
                    direction={sortBy === 'createdAt' ? sortOrder : 'asc'}
                    onClick={() => handleSort('createdAt')}
                  >
                    Fecha y Hora
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortBy === 'clientName'}
                    direction={sortBy === 'clientName' ? sortOrder : 'asc'}
                    onClick={() => handleSort('clientName')}
                  >
                    Cliente
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Documento</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Detalles</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedNotifications.length > 0 ? (
                paginatedNotifications.map((notification) => (
                  <TableRow
                    key={notification.id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    {/* Fecha y Hora */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                        <Typography variant="body2">
                          {formatDate(notification.createdAt)}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Cliente */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                          {notification.clientName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {notification.clientName}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Documento */}
                    <TableCell>
                      {notification.document ? (
                        <>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {notification.document.documentType}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {notification.document.protocolNumber}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {notification.groupId ? 'Grupo de documentos' : 'Sin documento'}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Teléfono */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                        <Typography variant="body2">
                          {notification.clientPhone}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Estado */}
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(notification.status)}
                        label={getStatusText(notification.status)}
                        color={getStatusColor(notification.status)}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>

                    {/* Detalles */}
                    <TableCell>
                      <Box>
                        <Typography variant="caption" display="block" sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                          {notification.messageBody.substring(0, 100)}
                          {notification.messageBody.length > 100 && '...'}
                        </Typography>
                        {notification.messageId && (
                          <Typography variant="caption" color="success.main" display="block">
                            ID: {notification.messageId}
                          </Typography>
                        )}
                        {notification.errorMessage && (
                          <Typography variant="caption" color="error.main" display="block">
                            Error: {notification.errorMessage}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Ver preview del mensaje">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleWhatsAppPreview(notification)}
                          >
                            <WhatsAppIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Descargar mensaje">
                          <IconButton 
                            size="small"
                            onClick={() => handleDownloadMessage(notification)}
                          >
                            <DownloadIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <WhatsAppIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="text.secondary">
                          ✅ Historial de Notificaciones Limpio
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          La base de datos fue resetada exitosamente.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Las notificaciones aparecerán aquí cuando se procesen documentos reales.
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalNotifications}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>

      {/* Modal de preview de WhatsApp */}
      <WhatsAppPreviewModal
        open={whatsappModalOpen}
        onClose={handleCloseWhatsAppModal}
        notification={selectedNotification}
      />
    </Box>
  );
};

export default NotificationsHistory;
