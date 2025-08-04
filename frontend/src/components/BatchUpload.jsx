import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Grid
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import useDocumentStore from '../store/document-store';
import { toast } from 'react-toastify';

/**
 * 📦 COMPONENTE DE CARGA EN LOTE DE XML
 * 
 * Funcionalidades:
 * - Arrastrar y soltar múltiples archivos XML
 * - Previsualizar archivos antes del procesamiento
 * - Mostrar progreso de procesamiento
 * - Mostrar resultados detallados del lote
 */
const BatchUpload = () => {
  const { 
    uploadXmlDocumentsBatch, 
    loading, 
    uploadProgress, 
    fetchAllDocuments 
  } = useDocumentStore();

  // Estados locales
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [batchResults, setBatchResults] = useState(null);

  /**
   * Configuración de dropzone para múltiples archivos XML
   */
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Manejar archivos rechazados
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles.map(file => 
        `${file.file.name}: ${file.errors.map(e => e.message).join(', ')}`
      );
      toast.error(`Archivos rechazados:\n${reasons.join('\n')}`);
    }

    // Filtrar solo archivos XML válidos
    const validXmlFiles = acceptedFiles.filter(file => 
      file.name.toLowerCase().endsWith('.xml')
    );

    if (validXmlFiles.length !== acceptedFiles.length) {
      toast.warning('Solo se aceptan archivos XML');
    }

    // Agregar archivos válidos (sin duplicados por nombre)
    setSelectedFiles(prevFiles => {
      const existingNames = prevFiles.map(f => f.name);
      const newFiles = validXmlFiles.filter(f => !existingNames.includes(f.name));
      
      if (newFiles.length !== validXmlFiles.length) {
        toast.info('Algunos archivos ya estaban seleccionados');
      }
      
      const combined = [...prevFiles, ...newFiles];
      
      // Validar límite máximo
      if (combined.length > 20) {
        toast.error('Máximo 20 archivos por lote');
        return combined.slice(0, 20);
      }
      
      return combined;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml']
    },
    maxFiles: 20,
    multiple: true,
    disabled: loading
  });

  /**
   * Remover archivo de la lista
   */
  const removeFile = (fileToRemove) => {
    setSelectedFiles(files => files.filter(file => file !== fileToRemove));
  };

  /**
   * Limpiar todos los archivos
   */
  const clearAllFiles = () => {
    setSelectedFiles([]);
    setBatchResults(null);
  };

  /**
   * Procesar lote de archivos XML
   */
  const processBatch = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('Seleccione al menos un archivo XML');
      return;
    }

    try {
      const result = await uploadXmlDocumentsBatch(selectedFiles);
      
      setBatchResults(result.data);
      setShowResults(true);

      if (result.success) {
        const { resumen } = result.data;
        toast.success(
          `Lote procesado: ${resumen.exitosos}/${resumen.totalArchivos} archivos exitosos (${resumen.porcentajeExito}%)`
        );
        
        // Limpiar archivos seleccionados después del éxito
        setSelectedFiles([]);
        
        // Recargar documentos
        await fetchAllDocuments();
      } else {
        toast.error(`Error en procesamiento: ${result.error}`);
      }
    } catch (error) {
      console.error('Error procesando lote:', error);
      toast.error('Error inesperado al procesar el lote');
    }
  };

  /**
   * Cerrar diálogo de resultados
   */
  const closeResults = () => {
    setShowResults(false);
    setBatchResults(null);
  };

  /**
   * Formatear tamaño de archivo
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
          📦 Carga en Lote de Archivos XML
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Arrastra múltiples archivos XML aquí para procesarlos automáticamente (máximo 20 archivos)
        </Typography>

        {/* Zona de Drop */}
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'divider',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: loading ? 'not-allowed' : 'pointer',
            bgcolor: isDragActive ? 'action.hover' : 'action.hover',
            transition: 'all 0.2s ease-in-out',
            opacity: loading ? 0.6 : 1,
            '&:hover': {
              borderColor: loading ? 'divider' : 'primary.main',
              bgcolor: loading ? 'action.hover' : 'action.selected'
            }
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          
          {isDragActive ? (
            <Typography variant="h6" color="primary.main">
              Suelta los archivos XML aquí...
            </Typography>
          ) : (
            <>
              <Typography variant="h6" gutterBottom color="text.primary">
                Arrastra múltiples archivos XML aquí
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                o haz clic para seleccionar archivos
              </Typography>
              <Button
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                Seleccionar Archivos XML
              </Button>
            </>
          )}
        </Box>

        {/* Lista de archivos seleccionados */}
        {selectedFiles.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                Archivos Seleccionados ({selectedFiles.length}/20)
              </Typography>
              <Button
                size="small"
                onClick={clearAllFiles}
                disabled={loading}
                sx={{ color: 'text.secondary' }}
              >
                Limpiar Todo
              </Button>
            </Box>

            <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
              {selectedFiles.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  <DescriptionIcon sx={{ color: 'primary.main', mr: 2 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => removeFile(file)}
                    disabled={loading}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>

            {/* Botón de procesamiento */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={processBatch}
                disabled={loading || selectedFiles.length === 0}
                startIcon={<CloudUploadIcon />}
                sx={{ minWidth: 200 }}
              >
                {loading ? 'Procesando...' : `Procesar ${selectedFiles.length} Archivo${selectedFiles.length !== 1 ? 's' : ''}`}
              </Button>
              
              {selectedFiles.length > 10 && (
                <Chip
                  icon={<InfoIcon />}
                  label={`Lote grande: ${selectedFiles.length} archivos`}
                  variant="outlined"
                  color="warning"
                  size="small"
                />
              )}
            </Box>
          </Box>
        )}

        {/* Progress Bar */}
        {loading && uploadProgress !== null && (
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
              Procesando lote... {uploadProgress}%
            </Typography>
          </Box>
        )}

        {/* Diálogo de Resultados */}
        <Dialog 
          open={showResults} 
          onClose={closeResults}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            📊 Resultados del Procesamiento en Lote
            <IconButton onClick={closeResults}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {batchResults && (
              <Box>
                {/* Resumen General */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary.main">
                        {batchResults.resumen?.totalArchivos || 0}
                      </Typography>
                      <Typography variant="caption">Total</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.dark">
                        {batchResults.resumen?.exitosos || 0}
                      </Typography>
                      <Typography variant="caption">Exitosos</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="error.dark">
                        {batchResults.resumen?.errores || 0}
                      </Typography>
                      <Typography variant="caption">Errores</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="info.dark">
                        {batchResults.resumen?.porcentajeExito || 0}%
                      </Typography>
                      <Typography variant="caption">Éxito</Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Archivos Procesados Exitosamente */}
                {batchResults.detalles?.archivosProcesados?.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ color: 'success.main', mb: 1 }}>
                      ✅ Archivos Procesados Exitosamente
                    </Typography>
                    <List dense>
                      {batchResults.detalles.archivosProcesados.map((archivo, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary={archivo.archivo}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  Protocolo: {archivo.protocolo}
                                </Typography>
                                {archivo.asignado && archivo.matrizador && (
                                  <Typography variant="caption" color="primary">
                                    Asignado a: {archivo.matrizador}
                                  </Typography>
                                )}
                                {!archivo.asignado && (
                                  <Typography variant="caption" color="warning.main">
                                    Sin asignar automáticamente
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Archivos con Errores */}
                {batchResults.detalles?.archivosConError?.length > 0 && (
                  <Box>
                    <Typography variant="h6" sx={{ color: 'error.main', mb: 1 }}>
                      ❌ Archivos con Errores
                    </Typography>
                    <List dense>
                      {batchResults.detalles.archivosConError.map((archivo, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <ErrorIcon color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={archivo.archivo}
                            secondary={archivo.error}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeResults} color="primary">
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BatchUpload;