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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  LinearProgress,
  TextField,
  InputAdornment,
  TablePagination
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  QrCode as QrCodeIcon,
  Search as SearchIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/auth-store';

/**
 * 🎯 Gestión de QR - Panel de Administrador
 * Permite administrar la suscripción de 100 QRs mensuales y gestionar los QRs creados por usuarios
 */
const EscrituraQRManagement = () => {
  const { token } = useAuthStore();

  // Estado de datos
  const [escrituras, setEscrituras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Estado de paginación y filtros
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');

  // Estado de dialogs
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, numero: null });
  const [viewDialog, setViewDialog] = useState({ open: false, qr: null });

  // Cargar escrituras QR al montar el componente
  useEffect(() => {
    fetchEscrituras();
  }, [page, rowsPerPage, search]);

  /**
   * Obtener lista de escrituras QR
   */
  const fetchEscrituras = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage
      });

      if (search) params.append('search', search);

      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/admin/escrituras?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar las escrituras QR');
      }

      const data = await response.json();

      if (data.success) {
        setEscrituras(data.data.escrituras || []);
        setTotalCount(data.data.totalCount || 0);
        setStats(data.data.stats);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar las escrituras QR');
      console.error(err);
      toast.error('Error al cargar las escrituras QR');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cambiar página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Cambiar filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Abrir dialog de confirmación para eliminar
   */
  const handleOpenDeleteDialog = (id, numero) => {
    setDeleteDialog({ open: true, id, numero });
  };

  /**
   * Confirmar y ejecutar eliminación
   */
  const handleConfirmDelete = async () => {
    try {
      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/escrituras/${deleteDialog.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la escritura');
      }

      setDeleteDialog({ open: false, id: null, numero: null });
      toast.success(`QR "${deleteDialog.numero}" eliminado correctamente`);
      fetchEscrituras();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar la escritura');
    }
  };

  /**
   * Calcular porcentaje de uso
   */
  const getUsagePercentage = () => {
    if (!stats) return 0;
    return Math.round((stats.usedQRs / 100) * 100);
  };

  /**
   * Obtener color según porcentaje
   */
  const getProgressColor = () => {
    const percentage = getUsagePercentage();
    if (percentage < 50) return 'success';
    if (percentage < 80) return 'warning';
    return 'error';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <QrCodeIcon sx={{ fontSize: 28, mr: 2, color: 'primary.main' }} />
          <Typography variant="h5">
            Gestión de QR
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchEscrituras}
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

      {/* Tarjeta de suscripción */}
      {stats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              📊 Suscripción Mensual de QRs
            </Typography>

            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Uso de QRs */}
              <Grid item xs={12} sm={6}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      QRs Utilizados
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {stats.usedQRs || 0} / 100
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage()}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getProgressColor() === 'success' ? '#22c55e' : getProgressColor() === 'warning' ? '#f59e0b' : '#ef4444'
                      }
                    }}
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    {100 - (stats.usedQRs || 0)} QRs disponibles
                  </Typography>
                </Box>
              </Grid>

              {/* Estadísticas */}
              <Grid item xs={12} sm={6}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="caption" color="textSecondary" gutterBottom>
                        QRs Este Mes
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {stats.thisMonthQRs || 0}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="caption" color="textSecondary" gutterBottom>
                        Usuarios Activos
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {stats.activeUsers || 0}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {getUsagePercentage() > 80 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ Has utilizado más del 80% de tu cuota mensual de QRs. Considera actualizar tu plan.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Búsqueda */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Buscar por número de escritura, usuario o estado..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          variant="outlined"
        />
      </Box>

      {/* Tabla de escrituras */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : escrituras.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No hay escrituras QR registradas aún
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Visualizaciones</TableCell>
                <TableCell>Creado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {escrituras.map((qr) => (
                <TableRow key={qr.id} hover>
                  <TableCell>
                    <code style={{ fontSize: '0.8rem', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
                      {qr.token}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {qr.numeroEscritura || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {qr.creador?.firstName} {qr.creador?.lastName || 'Usuario Desconocido'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={qr.estado || 'activo'}
                      size="small"
                      color={qr.activo ? 'success' : 'default'}
                      variant={qr.activo ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <VisibilityIcon fontSize="small" sx={{ color: 'action.active' }} />
                      <Typography variant="body2">
                        {qr.pdfViewCount || 0}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {qr.createdAt ? new Date(qr.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }) : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {qr.pdfFileName && (
                      <Tooltip title="Descargar PDF">
                        <IconButton size="small" color="primary">
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Ver detalles">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => setViewDialog({ open: true, qr })}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar QR">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(qr.id, qr.numeroEscritura)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Paginación */}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="QRs por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
        }
      />

      {/* Dialog de confirmación para eliminar */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, numero: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          ⚠️ Eliminar QR
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography gutterBottom>
            ¿Estás seguro de que deseas eliminar el QR con número:
          </Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, my: 2 }}>
            <code style={{ fontSize: '1.1rem' }}>
              {deleteDialog.numero}
            </code>
          </Box>
          <Alert severity="error">
            <strong>Advertencia:</strong> Esta acción es irreversible. El QR será eliminado permanentemente.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, id: null, numero: null })}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Sí, Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de visualización de detalles */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, qr: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Detalles del QR
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {viewDialog.qr && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Token
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                  {viewDialog.qr.token}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  Número de Escritura
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {viewDialog.qr.numeroEscritura || 'No especificado'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  Usuario Creador
                </Typography>
                <Typography variant="body2">
                  {viewDialog.qr.creador?.firstName} {viewDialog.qr.creador?.lastName || 'Desconocido'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  Origen de Datos
                </Typography>
                <Chip
                  label={viewDialog.qr.origenDatos || 'PDF'}
                  size="small"
                  variant="outlined"
                />
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  Visualizaciones
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {viewDialog.qr.pdfViewCount || 0}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  Creado
                </Typography>
                <Typography variant="body2">
                  {viewDialog.qr.createdAt ? new Date(viewDialog.qr.createdAt).toLocaleString('es-ES') : 'N/A'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  Estado
                </Typography>
                <Chip
                  label={viewDialog.qr.estado || 'activo'}
                  size="small"
                  color={viewDialog.qr.activo ? 'success' : 'default'}
                  variant={viewDialog.qr.activo ? 'filled' : 'outlined'}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, qr: null })}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EscrituraQRManagement;
