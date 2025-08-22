import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  TablePagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  AlertTitle
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Groups as GroupsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import receptionService from '../../services/reception-service';

/**
 * Componente para mostrar documentos EN_PROCESO y marcarlos como listos
 * Estos son documentos que han sido procesados por el matrizador y 
 * han pasado por copiadora, listos para que Recepción los marque como "LISTO"
 */
function DocumentosEnProceso({ onEstadisticasChange }) {
  const [documentos, setDocumentos] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matrizadores, setMatrizadores] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    matrizador: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Estados para modal de confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState(''); // 'individual' | 'grupal'
  const [documentoIndividual, setDocumentoIndividual] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(false); // Prevenir doble click
  
  // Estados para feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Cargar documentos al montar el componente
  useEffect(() => {
    cargarDocumentos();
  }, [page, filters]);

  // Cargar matrizadores para filtros
  useEffect(() => {
    cargarMatrizadores();
  }, []);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.matrizador && { matrizador: filters.matrizador })
      };

      const result = await receptionService.getDocumentosEnProceso(params);

      if (result.success) {
        console.log('📋 Documentos recibidos:', result.data.documents?.length || 0);
        console.log('📄 Primer documento:', result.data.documents?.[0]);
        
        setDocumentos(result.data.documents || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setError(null);
      } else {
        console.error('❌ Error en resultado:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error cargando documentos en proceso');
    } finally {
      setLoading(false);
    }
  };

  const cargarMatrizadores = async () => {
    try {
      const result = await receptionService.getMatrizadores();
      
      if (result.success) {
        setMatrizadores(result.data.matrizadores || []);
      }
    } catch (error) {
      console.error('Error cargando matrizadores:', error);
    }
  };

  const handleBusqueda = (valor) => {
    setFilters(prev => ({ ...prev, search: valor }));
    setPage(0);
  };

  const handleSelectDocument = (documentId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedDocuments(documentos.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const abrirConfirmacionIndividual = (documento) => {
    setDocumentoIndividual(documento);
    setActionType('individual');
    setShowConfirmDialog(true);
  };

  const abrirConfirmacionGrupal = () => {
    setActionType('grupal');
    setShowConfirmDialog(true);
  };

  const cerrarConfirmacion = () => {
    setShowConfirmDialog(false);
    setDocumentoIndividual(null);
    setActionType('');
  };

  const ejecutarMarcarListo = async () => {
    if (processingRequest) {
      console.log('🚫 Solicitud ya en proceso, ignorando...');
      return;
    }
    
    try {
      setProcessingRequest(true);
      let result;
      
      console.log('🎯 Iniciando marcar como listo:', {
        actionType,
        documentoIndividual: documentoIndividual?.id,
        selectedDocuments: selectedDocuments.length,
        timestamp: new Date().toISOString()
      });
      
      if (actionType === 'individual' && documentoIndividual) {
        console.log('📄 Marcando documento individual:', documentoIndividual.id);
        result = await receptionService.marcarComoListo(documentoIndividual.id);
      } else if (actionType === 'grupal' && selectedDocuments.length > 0) {
        console.log('📁 Marcando grupo de documentos:', selectedDocuments);
        result = await receptionService.marcarGrupoListo(selectedDocuments);
      }

      console.log('✅ Resultado del servidor:', result);

      if (result?.success) {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'success'
        });
        
        console.log('🔄 Recargando documentos...');
        // Recargar documentos y actualizar estadísticas
        await cargarDocumentos();
        console.log('📊 Actualizando estadísticas...');
        onEstadisticasChange?.();
        setSelectedDocuments([]);
        console.log('✅ Proceso completado exitosamente');
      } else {
        console.error('❌ Error en resultado del servidor:', result);
        throw new Error(result?.error || 'Error inesperado');
      }
    } catch (error) {
      console.error('💥 Error marcando como listo:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error al marcar documento(s) como listo(s)',
        severity: 'error'
      });
    } finally {
      setProcessingRequest(false);
      cerrarConfirmacion();
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const cerrarSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Verificar si los documentos seleccionados son del mismo cliente
  const documentosSeleccionadosMismoCliente = () => {
    if (selectedDocuments.length <= 1) return true;
    
    const docsSeleccionados = documentos.filter(doc => selectedDocuments.includes(doc.id));
    const clienteNames = [...new Set(docsSeleccionados.map(doc => doc.clientName))];
    const clienteIds = [...new Set(docsSeleccionados.map(doc => doc.clientId).filter(Boolean))];
    
    // Validar por nombre Y identificación (criterio correcto para agrupación)
    return clienteNames.length === 1 && (clienteIds.length === 0 || clienteIds.length === 1);
  };

  // Detectar automáticamente documentos agrupables del mismo cliente
  const getDocumentosAgrupablesPorCliente = (documento) => {
    const candidatos = documentos.filter(doc => 
      doc.id !== documento.id && 
      doc.clientName === documento.clientName &&
      // Si ambos tienen clientId, deben coincidir. Si uno no tiene, agrupar solo por nombre
      (!documento.clientId || !doc.clientId || doc.clientId === documento.clientId) &&
      doc.status === 'EN_PROCESO'
    );
    // ✅ Deduplicar por protocolo
    const seen = new Set();
    return candidatos.filter(d => {
      const key = d.protocolNumber || d.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Sugerir agrupación automática al seleccionar un documento
  const handleSmartGroupSelection = (documento) => {
    const agrupables = getDocumentosAgrupablesPorCliente(documento);
    if (agrupables.length > 0) {
      // Auto-seleccionar documentos del mismo cliente
      const idsToSelect = [documento.id, ...agrupables.map(doc => doc.id)];
      setSelectedDocuments(idsToSelect);
      
      // Mostrar mensaje informativo
      setSnackbar({
        open: true,
        message: `✨ Se seleccionaron automáticamente ${idsToSelect.length} documentos del mismo cliente: ${documento.clientName}${documento.clientId ? ` (ID: ${documento.clientId})` : ''}`,
        severity: 'info'
      });
    } else {
      // Seleccionar solo el documento individual
      setSelectedDocuments([documento.id]);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando documentos en proceso...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={cargarDocumentos}>
            Reintentar
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
          📋 Documentos en Proceso
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Documentos recibidos de la copiadora, listos para marcar como "LISTO" y generar código de retiro
        </Typography>
        
        {/* Filtros y búsqueda */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              {/* Búsqueda */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Buscar por cliente, teléfono o protocolo..."
                  value={filters.search}
                  onChange={(e) => handleBusqueda(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                  }}
                />
              </Grid>
              
              {/* Filtro por matrizador */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Matrizador</InputLabel>
                  <Select
                    value={filters.matrizador}
                    onChange={(e) => setFilters(prev => ({ ...prev, matrizador: e.target.value }))}
                    label="Matrizador"
                  >
                    <MenuItem value="">Todos los matrizadores</MenuItem>
                    {matrizadores.map(mat => (
                      <MenuItem key={mat.id} value={mat.id}>
                        {mat.nombre || `${mat.firstName} ${mat.lastName}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Botones de acción */}
              <Grid item xs={12} md={5}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<GroupsIcon />}
                    onClick={abrirConfirmacionGrupal}
                    disabled={selectedDocuments.length === 0 || !documentosSeleccionadosMismoCliente()}
                    sx={{ minWidth: 180 }}
                  >
                    Marcar Grupo Listo ({selectedDocuments.length})
                  </Button>
                  
                  {selectedDocuments.length > 0 && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => setSelectedDocuments([])}
                      sx={{ minWidth: 120 }}
                    >
                      Limpiar Selección
                    </Button>
                  )}
                  
                  <Tooltip title="Refrescar">
                    <IconButton onClick={cargarDocumentos} color="primary">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
            </Grid>
            
            {/* Advertencia si documentos seleccionados no son del mismo cliente */}
            {selectedDocuments.length > 1 && !documentosSeleccionadosMismoCliente() && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <AlertTitle>Documentos de diferentes clientes</AlertTitle>
                Solo se pueden marcar como grupo documentos del mismo cliente y con la misma identificación. 
                Seleccione documentos que tengan <strong>el mismo nombre de cliente</strong> y <strong>la misma identificación (RUC/Cédula)</strong> para usar "Marcar Grupo Listo".
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Tabla de documentos */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedDocuments.length > 0 && selectedDocuments.length < documentos.length}
                    checked={documentos.length > 0 && selectedDocuments.length === documentos.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Documento</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Matrizador</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentos.map((documento) => (
                <TableRow 
                  key={documento.id}
                  selected={selectedDocuments.includes(documento.id)}
                  hover
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedDocuments.includes(documento.id)}
                      onChange={() => handleSelectDocument(documento.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {documento.clientName}
                        </Typography>
                        {documento.clientPhone && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            📞 {documento.clientPhone}
                          </Typography>
                        )}
                        {documento.clientId && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', fontWeight: 500 }}>
                            🆔 {documento.clientId}
                          </Typography>
                        )}
                      </Box>
                      {getDocumentosAgrupablesPorCliente(documento).length > 0 && (
                        <Tooltip title={`${getDocumentosAgrupablesPorCliente(documento).length + 1} documentos del mismo cliente`}>
                          <Chip 
                            label={`+${getDocumentosAgrupablesPorCliente(documento).length}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem', height: '20px' }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="primary">
                      {documento.protocolNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={documento.documentType} 
                      size="small" 
                      color="info"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.875rem',
                      color: 'success.main'
                    }}>
                      {documento.clientPhone}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {documento.matrizador}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label="EN PROCESO" 
                      size="small" 
                      color="info"
                      icon={<AssignmentIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => abrirConfirmacionIndividual(documento)}
                        sx={{ minWidth: 120 }}
                      >
                        Marcar Listo
                      </Button>
                      
                      {getDocumentosAgrupablesPorCliente(documento).length > 0 && (
                        <Tooltip title="Agrupar automáticamente con documentos del mismo cliente">
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            startIcon={<GroupsIcon />}
                            onClick={() => handleSmartGroupSelection(documento)}
                            sx={{ minWidth: 100 }}
                          >
                            Agrupar
                          </Button>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Paginación */}
        <TablePagination
          component="div"
          count={totalPages * rowsPerPage}
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
      </Card>

      {/* Modal de confirmación */}
      <Dialog open={showConfirmDialog} onClose={cerrarConfirmacion} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'individual' ? '🎯 Marcar Documento como Listo' : '👥 Marcar Grupo como Listo'}
        </DialogTitle>
        <DialogContent>
          {actionType === 'individual' && documentoIndividual && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                ¿Está seguro que desea marcar este documento como LISTO?
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Cliente:</strong> {documentoIndividual.clientName}</Typography>
                <Typography variant="body2"><strong>Documento:</strong> {documentoIndividual.protocolNumber}</Typography>
                <Typography variant="body2"><strong>Tipo:</strong> {documentoIndividual.documentType}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Se generará automáticamente un código de 4 dígitos para el retiro.
              </Typography>
            </Box>
          )}
          
          {actionType === 'grupal' && selectedDocuments.length > 0 && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                ¿Está seguro que desea marcar estos {selectedDocuments.length} documentos como LISTOS?
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Documentos seleccionados:</strong> {selectedDocuments.length}</Typography>
                <Typography variant="body2"><strong>Cliente:</strong> {
                  documentos.find(doc => selectedDocuments.includes(doc.id))?.clientName
                }</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Se generará un código único compartido para todos los documentos del grupo.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarConfirmacion}>
            Cancelar
          </Button>
          <Button 
            onClick={ejecutarMarcarListo} 
            variant="contained" 
            color="success"
            startIcon={<CheckCircleIcon />}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={cerrarSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={cerrarSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default DocumentosEnProceso;