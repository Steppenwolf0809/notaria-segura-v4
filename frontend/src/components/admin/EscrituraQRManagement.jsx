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
  TextField,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  QrCode as QrCodeIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import escriturasQrService from '../../services/escrituras-qr-service';

/**
 * 🎯 Gestión de Escrituras QR - Panel de Administrador
 * Permite administrar, editar y ver estadísticas de las escrituras QR registradas
 */
const EscrituraQRManagement = () => {
  const [escrituras, setEscrituras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [stats, setStats] = useState(null);

  /**
   * Cargar escrituras QR al montar el componente
   */
  useEffect(() => {
    fetchEscrituras();
  }, []);

  /**
   * Obtener lista de escrituras QR
   */
  const fetchEscrituras = async () => {
    try {
      setLoading(true);
      setError(null);
      // Aquí iría la llamada al servicio para obtener escrituras
      // const result = await escriturasQrService.getAll();
      // setEscrituras(result);
      setEscrituras([]);
    } catch (err) {
      setError('Error al cargar las escrituras QR');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Confirmar y ejecutar eliminación de escritura
   */
  const handleDeleteConfirm = async () => {
    try {
      const { id } = deleteDialog;
      // Aquí iría la llamada al servicio para eliminar
      // await escriturasQrService.delete(id);
      setEscrituras(escrituras.filter(e => e.id !== id));
      setDeleteDialog({ open: false, id: null });
    } catch (err) {
      setError('Error al eliminar la escritura QR');
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <QrCodeIcon sx={{ fontSize: 28, mr: 2, color: 'primary.main' }} />
        <Typography variant="h5" sx={{ flex: 1 }}>
          Gestión de Escrituras QR
        </Typography>
        <Button
          variant="contained"
          color="primary"
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

      {/* Tarjeta de estadísticas */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estadísticas
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography color="textSecondary" gutterBottom>
                Total de Escrituras
              </Typography>
              <Typography variant="h6">
                {escrituras.length}
              </Typography>
            </Box>
            <Box>
              <Typography color="textSecondary" gutterBottom>
                Escrituras Activas
              </Typography>
              <Typography variant="h6">
                {escrituras.filter(e => e.activo).length}
              </Typography>
            </Box>
            <Box>
              <Typography color="textSecondary" gutterBottom>
                Visualizaciones Totales
              </Typography>
              <Typography variant="h6">
                {escrituras.reduce((sum, e) => sum + (e.pdfViewCount || 0), 0)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

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
                <TableCell>Número de Escritura</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell align="center">Visualizaciones</TableCell>
                <TableCell>Creado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {escrituras.map((escritura) => (
                <TableRow key={escritura.id} hover>
                  <TableCell>
                    <code style={{ fontSize: '0.85rem' }}>
                      {escritura.token}
                    </code>
                  </TableCell>
                  <TableCell>
                    {escritura.numeroEscritura || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={escritura.estado || 'activo'}
                      size="small"
                      color={escritura.activo ? 'success' : 'default'}
                      variant={escritura.activo ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {escritura.origenDatos || 'PDF'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {escritura.pdfViewCount || 0}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {escritura.createdAt ? new Date(escritura.createdAt).toLocaleDateString('es-ES') : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver QR">
                      <IconButton size="small" color="primary">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" color="info">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialog({ open: true, id: escritura.id })}
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

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar esta escritura QR? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EscrituraQRManagement;
