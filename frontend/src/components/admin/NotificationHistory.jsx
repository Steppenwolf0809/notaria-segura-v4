import React, { useState, useEffect, useMemo } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  InputAdornment
} from '@mui/material';
import {
  History as HistoryIcon,
  CheckCircle as SentIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Refresh as RefreshIcon,
  WhatsApp as WhatsAppIcon,
  Close as CloseIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/auth-store';

/**
 * Vista simple de notificaciones WhatsApp reales del sistema
 */
const NotificationHistory = () => {
  const { token } = useAuthStore();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNotification, setPreviewNotification] = useState(null);

  // Filtros locales
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/admin/notificaciones`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data.notifications);
        } else {
          throw new Error('Error en respuesta');
        }
      } else {
        throw new Error('Error al cargar notificaciones');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('No se pudieron cargar las notificaciones. Verifique que el backend esté funcionando.');
      // Mostrar datos vacíos en lugar de error
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [token]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch = (() => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (n.cliente || '').toLowerCase().includes(q) ||
          (n.telefono || '').toLowerCase().includes(q) ||
          (n.mensaje || '').toLowerCase().includes(q)
        );
      })();

      const matchesStatus = statusFilter ? n.estado === statusFilter : true;
      const matchesType = typeFilter ? n.tipo === typeFilter : true;

      const matchesDate = (() => {
        if (!dateFrom && !dateTo) return true;
        const ts = new Date(n.fecha).getTime();
        if (Number.isNaN(ts)) return false;
        if (dateFrom) {
          const fromTs = new Date(dateFrom + 'T00:00:00').getTime();
          if (ts < fromTs) return false;
        }
        if (dateTo) {
          const toTs = new Date(dateTo + 'T23:59:59').getTime();
          if (ts > toTs) return false;
        }
        return true;
      })();

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [notifications, search, statusFilter, typeFilter, dateFrom, dateTo]);

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

  const getTypeLabel = (type) => {
    switch (type) {
      case 'DOCUMENT_READY':
        return 'Documento Listo';
      case 'GROUP_READY':
        return 'Grupo Listo';
      case 'DOCUMENT_DELIVERED':
        return 'Documento Entregado';
      case 'REMINDER':
        return 'Recordatorio';
      default:
        return type;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePreview = (notification) => {
    setPreviewNotification(notification);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewNotification(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <HistoryIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" component="h1">
            Notificaciones WhatsApp
          </Typography>
        </Box>
        <Tooltip title="Recargar">
          <IconButton onClick={loadNotifications} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por cliente, teléfono o texto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  label="Estado"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value=""><em>Todos</em></MenuItem>
                  <MenuItem value="SENT">Enviado</MenuItem>
                  <MenuItem value="FAILED">Fallido</MenuItem>
                  <MenuItem value="PENDING">Pendiente</MenuItem>
                  <MenuItem value="SIMULATED">Simulado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  label="Tipo"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value=""><em>Todos</em></MenuItem>
                  <MenuItem value="DOCUMENT_READY">Documento Listo</MenuItem>
                  <MenuItem value="GROUP_READY">Grupo Listo</MenuItem>
                  <MenuItem value="DOCUMENT_DELIVERED">Documento Entregado</MenuItem>
                  <MenuItem value="REMINDER">Recordatorio</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Desde"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Hasta"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={clearFilters}>Limpiar</Button>
                <Tooltip title="Recargar desde servidor">
                  <span>
                    <Button 
                      size="small" 
                      onClick={loadNotifications} 
                      disabled={loading}
                      startIcon={<RefreshIcon />}
                    >
                      Actualizar
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="60px" align="center">Estado</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell width="140px">Teléfono</TableCell>
                  <TableCell width="120px">Tipo</TableCell>
                  <TableCell width="130px">Fecha</TableCell>
                  <TableCell width="60px" align="center">Ver</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredNotifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No hay notificaciones registradas
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotifications.map((notification) => (
                    <TableRow key={notification.id} hover>
                      <TableCell align="center">
                        <Tooltip title={notification.estado}>
                          {getStatusIcon(notification.estado)}
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {notification.cliente}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {notification.telefono}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getTypeLabel(notification.tipo)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(notification.fecha)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver mensaje completo">
                          <IconButton
                            onClick={() => handlePreview(notification)}
                            color="success"
                            size="small"
                          >
                            <WhatsAppIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Modal de Vista Previa */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WhatsAppIcon color="success" />
            <Typography variant="h6">Vista Previa WhatsApp</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewNotification && (
            <Box>
              {/* Información del mensaje */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Para: {previewNotification.cliente}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Teléfono: {previewNotification.telefono}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tipo: {getTypeLabel(previewNotification.tipo)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Estado:
                  </Typography>
                  <Chip 
                    label={previewNotification.estado} 
                    size="small" 
                    color={getStatusColor(previewNotification.estado)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Fecha: {formatDate(previewNotification.fecha)}
                </Typography>
              </Box>

              {/* Simulación de chat WhatsApp */}
              <Box 
                sx={{ 
                  bgcolor: '#e5ddd5',
                  backgroundImage: 'url("data:image/svg+xml,%3csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cdefs%3e%3cpattern id=\'a\' patternUnits=\'userSpaceOnUse\' width=\'40\' height=\'40\' patternTransform=\'scale(0.5) rotate(0)\'%3e%3crect x=\'0\' y=\'0\' width=\'100%25\' height=\'100%25\' fill=\'%23ffffff00\'/%3e%3cpath d=\'M0 20h40v20H0V20zm20 20h20v20H20V40z\' stroke-width=\'0\' stroke=\'%23ffffff\' fill=\'%2300000008\'/%3e%3c/pattern%3e%3c/defs%3e%3crect width=\'100%25\' height=\'100%25\' fill=\'url(%23a)\'/%3e%3c/svg%3e")',
                  p: 2,
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end'
                }}
              >
                {/* Burbuja del mensaje */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Box
                    sx={{
                      bgcolor: '#dcf8c6',
                      p: 2,
                      borderRadius: '18px',
                      maxWidth: '70%',
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        right: '-8px',
                        bottom: '2px',
                        width: 0,
                        height: 0,
                        borderLeft: '8px solid #dcf8c6',
                        borderTop: '8px solid transparent'
                      }
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.4
                      }}
                    >
                      {previewNotification.mensaje}
                    </Typography>
                    
                    {/* Timestamp y estado */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'flex-end', 
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 1
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(previewNotification.fecha).split(' ')[1]}
                      </Typography>
                      {previewNotification.estado === 'SENT' && (
                        <Box sx={{ display: 'flex' }}>
                          <Typography variant="caption" sx={{ color: '#4fc3f7', fontSize: '12px' }}>
                            ✓✓
                          </Typography>
                        </Box>
                      )}
                      {previewNotification.estado === 'FAILED' && (
                        <Typography variant="caption" sx={{ color: 'error.main', fontSize: '12px' }}>
                          ✗
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Mostrar error si existe */}
                {previewNotification.error && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="error" size="small">
                      <Typography variant="caption">
                        Error: {previewNotification.error}
                      </Typography>
                    </Alert>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview} startIcon={<CloseIcon />}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationHistory;