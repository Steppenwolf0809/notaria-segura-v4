import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Snackbar
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import useDocumentStore from '../store/document-store';
import useDebounce from '../hooks/useDebounce';
import { toast } from 'react-toastify';
import BatchUpload from './BatchUpload';

/**
 * Dashboard donde CAJA sube XMLs, crea documentos y asigna matrizadores
 */
const CajaDashboard = () => {
  const {
    documents,
    matrizadores,
    loading,
    error,
    uploadProgress,
    fetchAllDocuments,
    fetchMatrizadores,
    uploadXmlDocument,
    assignDocument,
    getDocumentStats,
    searchDocuments,
    clearError
  } = useDocumentStore();

  // Estados locales
  // SEPARACIÓN DE ESTADOS: inputValue (inmediato) vs searchTerm (debounced)
  const [inputValue, setInputValue] = useState(''); // Estado local del input
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedMatrizador, setSelectedMatrizador] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // DEBOUNCING: Solo buscar después de que el usuario pause por 400ms
  const debouncedSearchTerm = useDebounce(inputValue, 400);

  /**
   * Cargar datos al montar el componente
   */
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Cargar datos iniciales
   */
  const loadInitialData = async () => {
    await Promise.all([
      fetchAllDocuments(),
      fetchMatrizadores()
    ]);
  };

  /**
   * Configuración de dropzone para upload de XMLs
   */
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Verificar que es un archivo XML
    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Error: Solo se permiten archivos XML');
      return;
    }

    const result = await uploadXmlDocument(file);
    if (result.success) {
      toast.success(`XML procesado exitosamente: ${result.data.document.protocolNumber}`);
      // Recargar documentos para mostrar el nuevo
      await fetchAllDocuments();
    } else {
      toast.error(result.error || 'Ocurrió un error al procesar el XML');
    }
  }, [uploadXmlDocument, fetchAllDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml']
    },
    maxFiles: 1,
    multiple: false
  });

  /**
   * Refrescar datos manualmente
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  /**
   * Abrir diálogo de asignación
   */
  const handleOpenAssignDialog = (document) => {
    setSelectedDocument(document);
    setSelectedMatrizador('');
    setAssignDialogOpen(true);
  };

  /**
   * Cerrar diálogo de asignación
   */
  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setSelectedDocument(null);
    setSelectedMatrizador('');
  };

  /**
   * Asignar documento a matrizador
   */
  const handleAssignDocument = async () => {
    if (!selectedDocument || !selectedMatrizador) return;

    try {
      const success = await assignDocument(selectedDocument.id, selectedMatrizador);
      if (success) {
        toast.success('Documento asignado exitosamente');
        handleCloseAssignDialog();
        // No necesitamos fetchAllDocuments() porque el store ya actualiza localmente
      } else {
        // El error ya está en el store, solo mostramos mensaje genérico
        toast.error('Error al asignar el documento');
      }
    } catch (error) {
      console.error('Error in handleAssignDocument:', error);
      toast.error('Error inesperado al asignar el documento');
    }
  };

  /**
   * Obtener color del tipo de documento
   */
  const getDocumentTypeColor = (type) => {
    const colors = {
      PROTOCOLO: 'primary',
      DILIGENCIA: 'secondary',
      CERTIFICACION: 'info',
      ARRENDAMIENTO: 'warning',
      OTROS: 'default'
    };
    return colors[type] || 'default';
  };

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    const colors = {
      PENDIENTE: 'warning',
      EN_PROCESO: 'info',
      LISTO: 'success',
      ENTREGADO: 'default'
    };
    return colors[status] || 'default';
  };

  /**
   * Formatear valor monetario
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  /**
   * Filtrar documentos según búsqueda - MEJORADO con debouncing
   */
  const filteredDocuments = debouncedSearchTerm && debouncedSearchTerm.length >= 2 
    ? searchDocuments(debouncedSearchTerm) 
    : documents;

  /**
   * Estadísticas de documentos
   */
  const stats = getDocumentStats();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Gestión de Documentos - CAJA
        </Typography>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          startIcon={<RefreshIcon />}
          sx={{ color: 'primary.main', borderColor: 'primary.main' }}
        >
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Upload Zone para XML */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Subir Archivo XML
          </Typography>
          
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'action.hover',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.selected'
              }
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            
            {isDragActive ? (
              <Typography variant="h6" color="primary.main">
                Suelta el archivo XML aquí...
              </Typography>
            ) : (
              <>
                <Typography variant="h6" gutterBottom color="text.primary">
                  Arrastra un archivo XML aquí
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  o haz clic para seleccionar
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ 
                    mt: 2
                  }}
                >
                  Seleccionar XML
                </Button>
              </>
            )}
          </Box>

          {/* Progress Bar */}
          {uploadProgress !== null && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'primary.main'
                  }
                }}
              />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                Procesando XML... {uploadProgress}%
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Carga en Lote de Archivos XML */}
      <BatchUpload />

      {/* Estadísticas */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Estadísticas de Documentos
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                  {stats.PENDIENTE}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pendientes
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                  {stats.EN_PROCESO}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  En Proceso
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                  {stats.LISTO}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Listos
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Barra de búsqueda */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar por cliente, protocolo, tipo o acto principal..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: inputValue && (
              <InputAdornment position="end">
                <IconButton onClick={() => setInputValue('')} size="small">
                  <CloseIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Tabla de documentos */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Documentos Creados ({filteredDocuments.length})
          </Typography>
          
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Protocolo</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Acto Principal</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Matrizador</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {document.clientName}
                        </Typography>
                        {document.clientPhone && (
                          <Typography variant="caption" color="text.secondary">
                            📱 {document.clientPhone}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {document.protocolNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={document.documentType}
                        color={getDocumentTypeColor(document.documentType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {document.actoPrincipalDescripcion}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatCurrency(document.totalFactura)} {/* ⭐ CAMBIO: Usar valor total de factura */}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={document.status}
                        color={getStatusColor(document.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {document.assignedTo ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography variant="body2">
                            {document.assignedTo.firstName} {document.assignedTo.lastName}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Sin asignar
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {!document.assignedTo && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenAssignDialog(document)}
                          startIcon={<AssignmentIcon />}
                          sx={{ 
                            color: 'primary.main', 
                            borderColor: 'primary.main' 
                          }}
                        >
                          Asignar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {debouncedSearchTerm ? 'No se encontraron documentos' : 'No hay documentos creados'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Diálogo de asignación */}
      <Dialog open={assignDialogOpen} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Asignar Documento a Matrizador
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Documento seleccionado:
              </Typography>
              <Typography variant="h6">
                {selectedDocument.clientName} - {selectedDocument.protocolNumber}
              </Typography>
              <Typography variant="body2">
                {selectedDocument.actoPrincipalDescripcion}
              </Typography>
            </Box>
          )}
          
          <FormControl fullWidth>
            <InputLabel>Seleccionar Matrizador</InputLabel>
            <Select
              value={selectedMatrizador}
              onChange={(e) => setSelectedMatrizador(e.target.value)}
              label="Seleccionar Matrizador"
            >
              {matrizadores.map((matrizador) => (
                <MenuItem key={matrizador.id} value={matrizador.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Typography>
                      {matrizador.fullName}
                    </Typography>
                    <Chip
                      label={`${matrizador.activeDocuments} activos`}
                      size="small"
                      color={matrizador.activeDocuments > 5 ? 'warning' : 'default'}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssignDocument}
            variant="contained"
            color="primary"
            disabled={!selectedMatrizador}
          >
            Asignar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CajaDashboard; 