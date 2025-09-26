/**
 * Componente PDFUploader
 * Permite subir archivos PDF con drag & drop y validación
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { validatePDFFile, formatFileSize } from '../../services/escrituras-qr-service';

const PDFUploader = ({ 
  onFileSelect, 
  onUpload, 
  loading = false, 
  disabled = false,
  maxFiles = 1,
  showPreview = true 
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [validationResults, setValidationResults] = useState({});

  /**
   * Maneja la selección de archivos
   */
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Procesar archivos aceptados
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'selected'
    }));

    // Validar cada archivo
    const newValidationResults = {};
    newFiles.forEach(fileObj => {
      const validation = validatePDFFile(fileObj.file);
      newValidationResults[fileObj.id] = validation;
      fileObj.status = validation.isValid ? 'valid' : 'invalid';
    });

    // Procesar archivos rechazados
    const rejectedFileObjs = rejectedFiles.map(({ file, errors }) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}-rejected`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'rejected',
      errors: errors.map(e => e.message)
    }));

    // Actualizar estado
    if (maxFiles === 1) {
      setSelectedFiles([...newFiles, ...rejectedFileObjs]);
      setValidationResults(newValidationResults);
    } else {
      setSelectedFiles(prev => [...prev, ...newFiles, ...rejectedFileObjs]);
      setValidationResults(prev => ({ ...prev, ...newValidationResults }));
    }

    // Notificar al componente padre
    if (onFileSelect && newFiles.length > 0) {
      onFileSelect(maxFiles === 1 ? newFiles[0] : newFiles);
    }
  }, [maxFiles, onFileSelect]);

  /**
   * Configuración del dropzone
   */
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: disabled || loading
  });

  /**
   * Elimina un archivo de la lista
   */
  const removeFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    setValidationResults(prev => {
      const newResults = { ...prev };
      delete newResults[fileId];
      return newResults;
    });
  };

  /**
   * Limpia todos los archivos
   */
  const clearFiles = () => {
    setSelectedFiles([]);
    setValidationResults({});
  };

  /**
   * Maneja el upload
   */
  const handleUpload = () => {
    const validFiles = selectedFiles.filter(f => f.status === 'valid');
    if (validFiles.length > 0 && onUpload) {
      onUpload(maxFiles === 1 ? validFiles[0].file : validFiles.map(f => f.file));
    }
  };

  /**
   * Obtiene el color del borde según el estado del drag
   */
  const getBorderColor = () => {
    if (isDragAccept) return 'success.main';
    if (isDragReject) return 'error.main';
    if (isDragActive) return 'primary.main';
    return 'grey.300';
  };

  /**
   * Obtiene el icono de estado para un archivo
   */
  const getStatusIcon = (fileObj) => {
    switch (fileObj.status) {
      case 'valid':
        return <CheckIcon color="success" />;
      case 'invalid':
        return <ErrorIcon color="error" />;
      case 'rejected':
        return <ErrorIcon color="error" />;
      default:
        return <PdfIcon color="primary" />;
    }
  };

  /**
   * Obtiene el color del chip de estado
   */
  const getStatusChipColor = (status) => {
    switch (status) {
      case 'valid':
        return 'success';
      case 'invalid':
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const validFiles = selectedFiles.filter(f => f.status === 'valid');
  const hasValidFiles = validFiles.length > 0;

  return (
    <Box>
      {/* Área de drop */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: 2,
          borderStyle: 'dashed',
          borderColor: getBorderColor(),
          borderRadius: 2,
          textAlign: 'center',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: disabled || loading ? 'background.paper' : 'action.hover',
            borderColor: disabled || loading ? 'grey.300' : 'primary.main'
          }
        }}
      >
        <input {...getInputProps()} />
        
        <UploadIcon 
          sx={{ 
            fontSize: 48, 
            color: isDragActive ? 'primary.main' : 'text.secondary',
            mb: 2 
          }} 
        />
        
        <Typography variant="h6" gutterBottom>
          {isDragActive
            ? 'Suelta el archivo aquí...'
            : 'Arrastra un PDF aquí o haz clic para seleccionar'
          }
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Archivos PDF únicamente • Máximo 10MB
        </Typography>
        
        {loading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Procesando archivo...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Lista de archivos seleccionados */}
      {showPreview && selectedFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Archivos Seleccionados ({selectedFiles.length})
            </Typography>
            <Button
              size="small"
              onClick={clearFiles}
              disabled={loading}
              startIcon={<DeleteIcon />}
            >
              Limpiar Todo
            </Button>
          </Box>

          <List>
            {selectedFiles.map((fileObj) => {
              const validation = validationResults[fileObj.id];
              
              return (
                <ListItem
                  key={fileObj.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  <ListItemIcon>
                    {getStatusIcon(fileObj)}
                  </ListItemIcon>
                  
                  <ListItemText
                    disableTypography
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" noWrap component="span">
                          {fileObj.name}
                        </Typography>
                        <Chip
                          label={fileObj.status === 'valid' ? 'Válido' : 
                                fileObj.status === 'invalid' ? 'Inválido' : 'Rechazado'}
                          size="small"
                          color={getStatusChipColor(fileObj.status)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" component="span">
                          {formatFileSize(fileObj.size)} • {fileObj.type}
                        </Typography>
                        
                        {/* Errores de validación */}
                        {validation?.errors?.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            {validation.errors.map((error, index) => (
                              <Alert key={index} severity="error" size="small" sx={{ mt: 0.5 }}>
                                {error}
                              </Alert>
                            ))}
                          </Box>
                        )}
                        
                        {/* Advertencias */}
                        {validation?.warnings?.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            {validation.warnings.map((warning, index) => (
                              <Alert key={index} severity="warning" size="small" sx={{ mt: 0.5 }}>
                                {warning}
                              </Alert>
                            ))}
                          </Box>
                        )}
                        
                        {/* Errores de rechazo */}
                        {fileObj.errors && (
                          <Box sx={{ mt: 1 }}>
                            {fileObj.errors.map((error, index) => (
                              <Alert key={index} severity="error" size="small" sx={{ mt: 0.5 }}>
                                {error}
                              </Alert>
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => removeFile(fileObj.id)}
                      disabled={loading}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>

          {/* Botón de upload */}
          {hasValidFiles && onUpload && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleUpload}
                disabled={loading}
                startIcon={<UploadIcon />}
              >
                {loading ? 'Procesando...' : `Procesar ${validFiles.length} archivo${validFiles.length > 1 ? 's' : ''}`}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Información adicional */}
      <Box sx={{ mt: 2 }}>
        <Alert severity="info" sx={{ mb: 1 }}>
          <Typography variant="body2">
            <strong>Formatos aceptados:</strong> PDF únicamente
          </Typography>
          <Typography variant="body2">
            <strong>Tamaño máximo:</strong> 10MB por archivo
          </Typography>
          {maxFiles > 1 && (
            <Typography variant="body2">
              <strong>Archivos máximos:</strong> {maxFiles}
            </Typography>
          )}
        </Alert>
      </Box>
    </Box>
  );
};

export default PDFUploader;
