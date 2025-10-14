/**
 * Dashboard de QR para Administradores
 * Muestra estadísticas, contador de plan y lista completa de todos los QR generados
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  LinearProgress,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
  Stack
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Today as TodayIcon,
  CalendarMonth as MonthIcon,
  Groups as GroupsIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getAllQRForAdmin,
  getQRStats,
  getEstadoInfo,
  ESTADOS_ESCRITURA
} from '../../services/escrituras-qr-admin-service';

const QRDashboard = () => {
  // Estados principales
  const [stats, setStats] = useState(null);
  const [escrituras, setEscrituras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados de filtros y paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [usuarioFilter, setUsuarioFilter] = useState('');

  /**
   * Carga las estadísticas del dashboard
   */
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const response = await getQRStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      toast.error('Error al cargar las estadísticas');
    } finally {
      setStatsLoading(false);
    }
  };

  /**
   * Carga la lista de escrituras QR
   */
  const loadEscrituras = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(estadoFilter && { estado: estadoFilter }),
        ...(usuarioFilter && { createdBy: parseInt(usuarioFilter) })
      };

      const response = await getAllQRForAdmin(params);
      
      if (response.success) {
        setEscrituras(response.data.escrituras);
        setTotalCount(response.data.pagination.total);
      }
    } catch (err) {
      setError(err.message);
      toast.error('Error al cargar los QR');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Efecto para cargar estadísticas al iniciar
   */
  useEffect(() => {
    loadStats();
  }, []);

  /**
   * Efecto para cargar escrituras con filtros
   */
  useEffect(() => {
    loadEscrituras();
  }, [page, rowsPerPage, searchTerm, estadoFilter, usuarioFilter]);

  /**
   * Maneja el cambio de página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Maneja el cambio de filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Maneja la búsqueda
   */
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  /**
   * Maneja el filtro por estado
   */
  const handleEstadoFilter = (event) => {
    setEstadoFilter(event.target.value);
    setPage(0);
  };

  /**
   * Maneja el filtro por usuario
   */
  const handleUsuarioFilter = (event) => {
    setUsuarioFilter(event.target.value);
    setPage(0);
  };

  /**
   * Refresca todos los datos
   */
  const handleRefresh = () => {
    loadStats();
    loadEscrituras();
  };

  /**
   * Obtiene el color y mensaje de la alerta del plan
   */
  const getPlanAlertInfo = () => {
    if (!stats) return null;

    const { porcentajeUsado } = stats.plan;

    if (porcentajeUsado >= 95) {
      return {
        severity: 'error',
        icon: <WarningIcon />,
        message: '¡CRÍTICO! Has alcanzado el 95% del límite del plan. Considera ampliar tu plan pronto.'
      };
    } else if (porcentajeUsado >= 80) {
      return {
        severity: 'warning',
        icon: <WarningIcon />,
        message: 'Has utilizado más del 80% del límite del plan. Es recomendable planificar una ampliación.'
      };
    } else if (porcentajeUsado >= 50) {
      return {
        severity: 'info',
        icon: <CheckCircleIcon />,
        message: 'Vas por buen camino. Aún tienes suficiente espacio en tu plan.'
      };
    } else {
      return {
        severity: 'success',
        icon: <CheckCircleIcon />,
        message: 'Tu plan está en perfecto estado.'
      };
    }
  };

  if (statsLoading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const planAlert = getPlanAlertInfo();

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Dashboard de Códigos QR
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Control y supervisión de todos los QR generados en el sistema
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading || statsLoading}
        >
          Actualizar
        </Button>
      </Box>

      {/* Alerta del plan */}
      {stats && planAlert && (
        <Alert severity={planAlert.severity} icon={planAlert.icon} sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="medium">
            {planAlert.message}
          </Typography>
        </Alert>
      )}

      {/* Cards de estadísticas */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Total QR */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <QrCodeIcon />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary">
                    Total QR
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold">
                  {stats.resumenGeneral.totalQR}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {stats.plan.restantes} restantes del plan
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* QR Hoy */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <TodayIcon />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary">
                    Hoy
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold">
                  {stats.resumenGeneral.qrHoy}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  QR generados hoy
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* QR Esta Semana */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                    <TrendingUpIcon />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary">
                    Esta Semana
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold">
                  {stats.resumenGeneral.qrEstaSemana}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  QR esta semana
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* QR Este Mes */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <MonthIcon />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary">
                    Este Mes
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold">
                  {stats.resumenGeneral.qrEsteMes}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  QR este mes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Información del Plan */}
      {stats && (
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Estado del Plan
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Uso del Plan
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.plan.usado} / {stats.plan.limite} ({stats.plan.porcentajeUsado}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.plan.porcentajeUsado} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: stats.plan.porcentajeUsado >= 80 ? 'error.main' : 
                               stats.plan.porcentajeUsado >= 50 ? 'warning.main' : 'success.main'
                    }
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Precio por paquete:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ${stats.plan.precio}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Costo actual:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">
                    ${stats.plan.costoActual}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Filtros y búsqueda */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Buscar por número, token o archivo..."
              value={searchTerm}
              onChange={handleSearch}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={estadoFilter}
                onChange={handleEstadoFilter}
                label="Estado"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value={ESTADOS_ESCRITURA.ACTIVO}>Activo</MenuItem>
                <MenuItem value={ESTADOS_ESCRITURA.REVISION_REQUERIDA}>Revisión Requerida</MenuItem>
                <MenuItem value={ESTADOS_ESCRITURA.INACTIVO}>Inactivo</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            {stats && stats.estadisticas.porUsuario.length > 0 && (
              <FormControl fullWidth size="small">
                <InputLabel>Usuario</InputLabel>
                <Select
                  value={usuarioFilter}
                  onChange={handleUsuarioFilter}
                  label="Usuario"
                >
                  <MenuItem value="">Todos los usuarios</MenuItem>
                  {stats.estadisticas.porUsuario.map((u) => (
                    <MenuItem key={u.usuarioId} value={u.usuarioId}>
                      {u.usuario?.nombre || 'Usuario desconocido'} ({u.cantidad})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Error global */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabla de QR */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell>Escritura</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Creado Por</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : escrituras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No hay QR registrados
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                escrituras.map((escritura) => {
                  const estadoInfo = getEstadoInfo(escritura.estado);
                  
                  return (
                    <TableRow key={escritura.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontWeight="medium">
                          {escritura.token}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {escritura.numeroEscritura || 'N/A'}
                        </Typography>
                        {escritura.archivoOriginal && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {escritura.archivoOriginal}
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={estadoInfo.label}
                          color={estadoInfo.color}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        {escritura.creador ? (
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {escritura.creador.firstName} {escritura.creador.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {escritura.creador.role}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Usuario desconocido
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(escritura.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(escritura.createdAt).toLocaleTimeString('es-EC', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={escritura.origenDatos === 'PDF' ? 'PDF' : 'Manual'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        <Tooltip title="Ver detalles">
                          <IconButton
                            size="small"
                            onClick={() => {
                              // TODO: Implementar vista de detalles
                              toast.info('Función en desarrollo');
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>
    </Box>
  );
};

export default QRDashboard;

