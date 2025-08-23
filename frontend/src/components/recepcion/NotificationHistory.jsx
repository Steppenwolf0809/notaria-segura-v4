import React, { useState, useEffect } from 'react';
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
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import {
  CheckCircle as SentIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Refresh as RefreshIcon,
  WhatsApp as WhatsAppIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import receptionService from '../../services/reception-service';

/**
 * Historial de notificaciones WhatsApp para el rol Recepción
 */
const NotificationHistory = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de paginación y filtros
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    messageType: ''
  });

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1, // Backend espera página basada en 1
        limit: rowsPerPage,
        search: filters.search,
        status: filters.status,
        type: filters.messageType
      };

      console.log('📱 Cargando historial con parámetros:', params);
      
      const response = await receptionService.getNotificationHistory(params);
      
      if (response.success) {
        setNotifications(response.data.notifications || []);
        setTotalCount(response.data.pagination?.total || 0);
        console.log('✅ Historial cargado:', {
          count: response.data.notifications?.length || 0,
          total: response.data.pagination?.total || 0
        });
      } else {
        throw new Error(response.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
      setError('No se pudieron cargar las notificaciones: ' + error.message);
      setNotifications([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [page, rowsPerPage, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SENT':
        return <SentIcon color="success" />;
      case 'FAILED':
        return <ErrorIcon color="error" />;
      case 'PENDING':
        return <PendingIcon color="warning" />;
      case 'SIMULATED':
        return <WhatsAppIcon color="info" />;
      default:
        return <PendingIcon />;
    }
  };

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

  const getStatusLabel = (status) => {
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

  const getMessageTypeLabel = (type) => {
    switch (type) {
      case 'DOCUMENT_READY':
        return 'Documento Listo';
      case 'DOCUMENT_DELIVERED':
        return 'Documento Entregado';
      case 'GROUP_READY':
        return 'Grupo Listo';
      case 'TEST':
        return 'Prueba';
      default:
        return type;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return '-';
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h1">
              📱 Historial de Notificaciones WhatsApp
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadNotifications()}
              disabled={loading}
            >
              Actualizar
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Filtros */}
          <Box display="flex" gap={2} mb={3} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Buscar cliente, teléfono..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 200 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.status}
                label="Estado"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="SENT">Enviado</MenuItem>
                <MenuItem value="FAILED">Fallido</MenuItem>
                <MenuItem value="PENDING">Pendiente</MenuItem>
                <MenuItem value="SIMULATED">Simulado</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.messageType}
                label="Tipo"
                onChange={(e) => handleFilterChange('messageType', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="DOCUMENT_READY">Documento Listo</MenuItem>
                <MenuItem value="DOCUMENT_DELIVERED">Documento Entregado</MenuItem>
                <MenuItem value="GROUP_READY">Grupo Listo</MenuItem>
                <MenuItem value="TEST">Prueba</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Tabla de notificaciones */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Estado</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Mensaje</TableCell>
                  <TableCell>Enviado</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {loading ? 'Cargando...' : 'No hay notificaciones para mostrar'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notification) => (
                    <TableRow key={notification.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getStatusIcon(notification.status)}
                          <Chip
                            size="small"
                            label={getStatusLabel(notification.status)}
                            color={getStatusColor(notification.status)}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {notification.clientName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {notification.clientPhone}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getMessageTypeLabel(notification.messageType)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Tooltip title={notification.messageBody}>
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {notification.messageBody}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(notification.sentAt || notification.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 150 }}>
                        {notification.errorMessage && (
                          <Tooltip title={notification.errorMessage}>
                            <Typography
                              variant="body2"
                              color="error"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {notification.errorMessage}
                            </Typography>
                          </Tooltip>
                        )}
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
            count={totalCount}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationHistory;