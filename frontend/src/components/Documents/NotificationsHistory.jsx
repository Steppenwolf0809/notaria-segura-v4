import React, { useState, useMemo } from 'react';
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
  Grid
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
  Download as DownloadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Componente NotificationsHistory - Tabla de auditoría de notificaciones
 * Muestra historial completo de notificaciones enviadas con estados
 */
const NotificationsHistory = () => {
  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(false);

  /**
   * Datos simulados de notificaciones
   * En implementación real vendría del backend
   */
  const simulatedNotifications = useMemo(() => {
    const notifications = [];
    const now = new Date();
    
    // Generar datos de ejemplo
    for (let i = 0; i < 150; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
      
      const statuses = ['enviado', 'fallido', 'pendiente'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const clients = [
        'Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez',
        'Luis Rodriguez', 'Carmen Silva', 'Pedro Morales', 'Lucía Fernández'
      ];
      
      const documentTypes = ['PROTOCOLO', 'CERTIFICACIÓN', 'DILIGENCIA', 'ARRENDAMIENTO'];
      
      notifications.push({
        id: i + 1,
        fechaHora: date,
        cliente: clients[Math.floor(Math.random() * clients.length)],
        documento: `${documentTypes[Math.floor(Math.random() * documentTypes.length)]} - ${2024000 + i}`,
        telefono: `+593${Math.floor(Math.random() * 900000000) + 100000000}`,
        estadoEnvio: status,
        tipoNotificacion: 'WhatsApp',
        mensaje: status === 'enviado' ? 'Documento listo para retiro' : 
                 status === 'fallido' ? 'Error en entrega' : 'En cola de envío',
        intentos: status === 'fallido' ? Math.floor(Math.random() * 3) + 1 : 1,
        codigoRespuesta: status === 'enviado' ? '200' : 
                        status === 'fallido' ? '400' : null
      });
    }
    
    return notifications.sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
  }, []);

  /**
   * Filtrar notificaciones
   */
  const filteredNotifications = useMemo(() => {
    let filtered = [...simulatedNotifications];

    // Búsqueda por texto
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(notification =>
        notification.cliente.toLowerCase().includes(searchLower) ||
        notification.documento.toLowerCase().includes(searchLower) ||
        notification.telefono.includes(searchTerm)
      );
    }

    // Filtro por estado
    if (statusFilter) {
      filtered = filtered.filter(notification => notification.estadoEnvio === statusFilter);
    }

    // Filtro por fecha
    if (dateFilter) {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        filtered = filtered.filter(notification => new Date(notification.fechaHora) >= startDate);
      }
    }

    return filtered;
  }, [simulatedNotifications, searchTerm, statusFilter, dateFilter]);

  /**
   * Notificaciones paginadas
   */
  const paginatedNotifications = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredNotifications.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredNotifications, page, rowsPerPage]);

  /**
   * Estadísticas rápidas
   */
  const stats = useMemo(() => {
    const total = filteredNotifications.length;
    const enviados = filteredNotifications.filter(n => n.estadoEnvio === 'enviado').length;
    const fallidos = filteredNotifications.filter(n => n.estadoEnvio === 'fallido').length;
    const pendientes = filteredNotifications.filter(n => n.estadoEnvio === 'pendiente').length;
    
    return {
      total,
      enviados,
      fallidos,
      pendientes,
      tasaExito: total > 0 ? Math.round((enviados / total) * 100) : 0
    };
  }, [filteredNotifications]);

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    const colors = {
      enviado: 'success',
      fallido: 'error',
      pendiente: 'warning'
    };
    return colors[status] || 'default';
  };

  /**
   * Obtener icono del estado
   */
  const getStatusIcon = (status) => {
    const icons = {
      enviado: <CheckCircleIcon />,
      fallido: <ErrorIcon />,
      pendiente: <ScheduleIcon />
    };
    return icons[status] || <ScheduleIcon />;
  };

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
    setLoading(true);
    // Simular carga
    setTimeout(() => {
      setLoading(false);
    }, 1000);
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
                {stats.enviados}
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
                {stats.fallidos}
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
                {stats.pendientes}
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
                {stats.tasaExito}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tasa de Éxito
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
                <MenuItem value="enviado">Exitosa</MenuItem>
                <MenuItem value="fallido">Fallida</MenuItem>
                <MenuItem value="pendiente">Pendiente</MenuItem>
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
                <TableCell sx={{ fontWeight: 'bold' }}>Fecha y Hora</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Documento</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Detalles</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedNotifications.map((notification) => (
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
                        {formatDate(notification.fechaHora)}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Cliente */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                        {notification.cliente.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {notification.cliente}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Documento */}
                  <TableCell>
                    <Typography variant="body2">
                      {notification.documento}
                    </Typography>
                  </TableCell>

                  {/* Teléfono */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                      <Typography variant="body2">
                        {notification.telefono}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(notification.estadoEnvio)}
                      label={notification.estadoEnvio.charAt(0).toUpperCase() + notification.estadoEnvio.slice(1)}
                      color={getStatusColor(notification.estadoEnvio)}
                      size="small"
                      variant="filled"
                    />
                  </TableCell>

                  {/* Detalles */}
                  <TableCell>
                    <Box>
                      <Typography variant="caption" display="block">
                        {notification.mensaje}
                      </Typography>
                      {notification.intentos > 1 && (
                        <Typography variant="caption" color="warning.main">
                          {notification.intentos} intentos
                        </Typography>
                      )}
                      {notification.codigoRespuesta && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Código: {notification.codigoRespuesta}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Ver en WhatsApp">
                        <IconButton size="small" color="success">
                          <WhatsAppIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Exportar">
                        <IconButton size="small">
                          <DownloadIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredNotifications.length}
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
    </Box>
  );
};

export default NotificationsHistory;