/**
 * Componente GeneradorQR
 * Página principal del módulo de generación de códigos QR para escrituras
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Backdrop,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  QrCode as QrCodeIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

// Componentes del módulo
import PDFUploader from './PDFUploader';
import ExtractedDataForm from './ExtractedDataForm';
import QRDisplay from './QRDisplay';
import ManualEscrituraForm from './ManualEscrituraForm';

// Servicios
import {
  uploadEscritura,
  createEscrituraManual,
  getEscrituras,
  deleteEscritura,
  hardDeleteEscritura,
  getEstadoInfo,
  ESTADOS_ESCRITURA
} from '../../services/escrituras-qr-service';

const GeneradorQR = () => {
  // Estados principales
  const [escrituras, setEscrituras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEscritura, setSelectedEscritura] = useState(null);

  // Estados de UI
  const [showMethodDialog, setShowMethodDialog] = useState(false); // Dialog para elegir método
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false); // Dialog para ingreso manual
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false); // Dialog para confirmación de eliminación permanente
  const [uploadLoading, setUploadLoading] = useState(false);

  // Estados de filtros y paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  /**
   * Carga la lista de escrituras
   */
  const loadEscrituras = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(estadoFilter && { estado: estadoFilter })
      };

      const response = await getEscrituras(params);
      
      if (response.success) {
        setEscrituras(response.data.escrituras);
        setTotalCount(response.data.pagination.total);
      }
    } catch (err) {
      setError(err.message);
      toast.error('Error al cargar las escrituras');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Efecto para cargar datos iniciales
   */
  useEffect(() => {
    loadEscrituras();
  }, [page, rowsPerPage, searchTerm, estadoFilter]);

  /**
   * Maneja el upload de PDF y foto opcional
   */
  const handleUpload = async (pdfFile, photoFile = null) => {
    setUploadLoading(true);

    try {
      const response = await uploadEscritura(pdfFile, photoFile);
      
      if (response.success) {
        // Mensaje personalizado si hay foto
        if (response.data.fotoURL) {
          toast.success('PDF y fotografía procesados exitosamente');
        } else if (photoFile) {
          toast.warning('PDF procesado exitosamente, pero la foto no se pudo subir');
        } else {
          toast.success('PDF procesado exitosamente');
        }
        
        setShowUploadDialog(false);
        loadEscrituras(); // Recargar lista
        
        // Mostrar detalles de la escritura creada
        setSelectedEscritura(response.data);
        setShowDetailsDialog(true);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  /**
   * Maneja la creación manual de escritura (con foto opcional)
   */
  const handleManualSubmit = async (datosEscritura, photoFile = null) => {
    setUploadLoading(true);

    try {
      const response = await createEscrituraManual(datosEscritura, photoFile);
      
      if (response.success) {
        // Mensaje personalizado si hay foto
        if (response.data.fotoURL) {
          toast.success('Escritura y fotografía creadas exitosamente');
        } else if (photoFile) {
          toast.warning('Escritura creada exitosamente, pero la foto no se pudo subir');
        } else {
          toast.success('Escritura creada exitosamente');
        }
        
        setShowManualDialog(false);
        loadEscrituras(); // Recargar lista
        
        // Mostrar detalles de la escritura creada
        setSelectedEscritura(response.data);
        setShowDetailsDialog(true);
      }
    } catch (err) {
      toast.error(err.message);
      throw err; // Re-lanzar para que el formulario lo maneje
    } finally {
      setUploadLoading(false);
    }
  };

  /**
   * Maneja la eliminación de escritura (soft delete)
   */
  const handleDelete = async (escrituraId) => {
    if (!window.confirm('¿Estás seguro de que quieres desactivar esta escritura?')) {
      return;
    }

    try {
      const response = await deleteEscritura(escrituraId);
      
      if (response.success) {
        toast.success('Escritura desactivada');
        loadEscrituras();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  /**
   * Maneja la eliminación permanente de escritura (hard delete)
   */
  const handleHardDelete = async () => {
    if (!selectedEscritura) return;

    try {
      setUploadLoading(true);
      const response = await hardDeleteEscritura(selectedEscritura.id);
      
      if (response.success) {
        toast.success('✅ Escritura eliminada permanentemente');
        setShowHardDeleteDialog(false);
        setShowDetailsDialog(false);
        setSelectedEscritura(null);
        loadEscrituras();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

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
   * Abre el diálogo de detalles
   */
  const handleViewDetails = (escritura) => {
    setSelectedEscritura(escritura);
    setShowDetailsDialog(true);
  };

  /**
   * Actualiza una escritura en la lista
   */
  const handleEscrituraUpdate = (updatedEscritura) => {
    setEscrituras(prev => 
      prev.map(e => e.id === updatedEscritura.id ? updatedEscritura : e)
    );
    setSelectedEscritura(updatedEscritura);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Generador QR de Escrituras
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Genera códigos QR para verificación pública de escrituras notariales
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowMethodDialog(true)}
          size="large"
        >
          Nueva Escritura
        </Button>
      </Box>

      {/* Filtros y búsqueda */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Buscar por número de escritura o archivo..."
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
          
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadEscrituras}
              disabled={loading}
            >
              Actualizar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error global */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabla de escrituras */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Escritura</TableCell>
                <TableCell>Archivo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Token</TableCell>
                <TableCell>Creado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : escrituras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No hay escrituras registradas
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                escrituras.map((escritura) => {
                  const estadoInfo = getEstadoInfo(escritura.estado);
                  
                  return (
                    <TableRow key={escritura.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {escritura.numeroEscritura || 'N/A'}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {escritura.archivoOriginal}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={estadoInfo.label}
                          color={estadoInfo.color}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {escritura.token}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(escritura.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(escritura.createdAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Ver detalles">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(escritura)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          
                          {escritura.estado === 'activo' && (
                            <Tooltip title="Ver QR">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(escritura)}
                                color="primary"
                              >
                                <QrCodeIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          <Tooltip title="Desactivar">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(escritura.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
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
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>

      {/* FAB para agregar nueva escritura */}
      <Fab
        color="primary"
        aria-label="Nueva Escritura"
        onClick={() => setShowMethodDialog(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
      >
        <AddIcon />
      </Fab>

      {/* Diálogo de selección de método */}
      <Dialog
        open={showMethodDialog}
        onClose={() => setShowMethodDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Crear Nueva Escritura
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<QrCodeIcon />}
              onClick={() => {
                setShowMethodDialog(false);
                setShowUploadDialog(true);
              }}
              sx={{ py: 3 }}
            >
              <Box>
                <Typography variant="h6">Subir PDF y Extraer</Typography>
                <Typography variant="caption" color="text.secondary">
                  Sube un extracto de escritura en PDF para extraer automáticamente los datos
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<EditIcon />}
              onClick={() => {
                setShowMethodDialog(false);
                setShowManualDialog(true);
              }}
              sx={{ py: 3 }}
            >
              <Box>
                <Typography variant="h6">Ingresar Manualmente</Typography>
                <Typography variant="caption" color="text.secondary">
                  Ingresa los datos de la escritura de forma manual
                </Typography>
              </Box>
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMethodDialog(false)}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de upload */}
      <Dialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Subir Extracto de Escritura
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <PDFUploader
              onUpload={handleUpload}
              loading={uploadLoading}
              maxFiles={1}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowUploadDialog(false)}
            disabled={uploadLoading}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de ingreso manual */}
      <Dialog
        open={showManualDialog}
        onClose={() => !uploadLoading && setShowManualDialog(false)}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={uploadLoading}
      >
        <DialogTitle>
          Ingresar Escritura Manualmente
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <ManualEscrituraForm
              onSubmit={handleManualSubmit}
              onCancel={() => setShowManualDialog(false)}
              loading={uploadLoading}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalles */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Detalles de Escritura
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedEscritura?.numeroEscritura || `Token: ${selectedEscritura?.token}`}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedEscritura && (
            <Grid container spacing={3}>
              {/* Formulario de datos extraídos */}
              <Grid item xs={12} lg={8}>
                <ExtractedDataForm
                  escritura={selectedEscritura}
                  onUpdate={handleEscrituraUpdate}
                  onStateChange={handleEscrituraUpdate}
                />
              </Grid>

              {/* Display del QR */}
              <Grid item xs={12} lg={4}>
                {selectedEscritura.estado === 'activo' ? (
                  <QRDisplay
                    escrituraId={selectedEscritura.id}
                    escritura={selectedEscritura}
                    onRefresh={() => {
                      // Recargar datos de la escritura
                      loadEscrituras();
                    }}
                  />
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <QrCodeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      QR No Disponible
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      La escritura debe estar en estado "Activo" para generar el código QR
                    </Typography>
                  </Paper>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (selectedEscritura) {
                  handleDelete(selectedEscritura.id);
                  setShowDetailsDialog(false);
                }
              }}
            >
              Desactivar
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowHardDeleteDialog(true)}
            >
              Eliminar Permanentemente
            </Button>
          </Box>
          <Button onClick={() => setShowDetailsDialog(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para eliminación permanente */}
      <Dialog
        open={showHardDeleteDialog}
        onClose={() => !uploadLoading && setShowHardDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon />
            <Typography variant="h6">
              ⚠️ Confirmación de Eliminación Permanente
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom sx={{ fontWeight: 'bold' }}>
              ¡ATENCIÓN! Esta acción es IRREVERSIBLE
            </Typography>
            <Typography variant="body2">
              Se eliminará permanentemente de la base de datos:
            </Typography>
          </Alert>

          {selectedEscritura && (
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" gutterBottom>
                <strong>Escritura:</strong> {selectedEscritura.numeroEscritura || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Token:</strong> {selectedEscritura.token}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Archivo:</strong> {selectedEscritura.archivoOriginal || 'Ingreso manual'}
              </Typography>
              <Typography variant="body2">
                <strong>Creado:</strong> {new Date(selectedEscritura.createdAt).toLocaleString()}
              </Typography>
            </Box>
          )}

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              • El código QR dejará de funcionar inmediatamente<br />
              • Los datos no se podrán recuperar<br />
              • Esta acción no se puede deshacer
            </Typography>
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setShowHardDeleteDialog(false)}
            disabled={uploadLoading}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleHardDelete}
            disabled={uploadLoading}
            variant="contained"
            color="error"
            startIcon={uploadLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {uploadLoading ? 'Eliminando...' : 'Confirmar Eliminación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backdrop de carga */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={uploadLoading}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Procesando PDF...
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Esto puede tomar unos segundos
          </Typography>
        </Box>
      </Backdrop>

      {/* Información de ayuda */}
      {escrituras.length === 0 && !loading && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="info">
            <Typography variant="body1" gutterBottom>
              <strong>¡Bienvenido al Generador QR de Escrituras!</strong>
            </Typography>
            <Typography variant="body2">
              Para comenzar, sube un extracto de escritura en formato PDF. 
              El sistema extraerá automáticamente los datos y generará un código QR 
              para verificación pública.
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default GeneradorQR;