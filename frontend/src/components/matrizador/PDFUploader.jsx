/**
 * Componente PDFUploader
 * Permite subir archivos PDF con drag & drop y validación
 * También soporta subida de foto opcional para escrituras de menores
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
  ListItemSecondaryAction,
  Divider,
  Card,
  CardMedia
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Image as ImageIcon,
  Close as CloseIcon
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
  const [selectedPhoto, setSelectedPhoto] = useState(null); // Nueva: foto del menor
  const [photoPreview, setPhotoPreview] = useState(null); // Nueva: preview de foto

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
   * Maneja la selección de foto
   */
  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG o WEBP');
      return;
    }
    
    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('La imagen es demasiado grande (máximo 5MB)');
      return;
    }
    
    // Guardar archivo y generar preview
    setSelectedPhoto(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  /**
   * Elimina la foto seleccionada
   */
  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  /**
   * Maneja el upload (PDF + foto opcional)
   */
  const handleUpload = () => {
    const validFiles = selectedFiles.filter(f => f.status === 'valid');
    if (validFiles.length > 0 && onUpload) {
      const pdfFile = maxFiles === 1 ? validFiles[0].file : validFiles.map(f => f.file);
      // Pasar PDF y foto al callback
      onUpload(pdfFile, selectedPhoto);
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

      {/* Sección para subir foto del menor (opcional) */}
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImageIcon />
          Fotografía de Verificación (Opcional)
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Adjunta una fotografía que servirá como respaldo para la verificación de identidad.
        </Typography>
        
        {!photoPreview ? (
          <Box>
            <input
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: 'none' }}
              id="foto-input"
              type="file"
              onChange={handlePhotoSelect}
              disabled={disabled || loading}
            />
            <label htmlFor="foto-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<ImageIcon />}
                disabled={disabled || loading}
              >
                Seleccionar Fotografía
              </Button>
            </label>
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
              Formatos: JPG, PNG, WEBP • Tamaño máximo: 5MB
            </Typography>
          </Box>
        ) : (
          <Card sx={{ maxWidth: 400, position: 'relative' }}>
            <IconButton
              onClick={handleRemovePhoto}
              disabled={loading}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'error.main', color: 'white' }
              }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
            <CardMedia
              component="img"
              image={photoPreview}
              alt="Vista previa de fotografía"
              sx={{ maxHeight: 300, objectFit: 'contain', p: 2 }}
            />
            <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="body2">
                {selectedPhoto?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(selectedPhoto?.size || 0)}
              </Typography>
            </Box>
          </Card>
        )}
      </Box>

      {/* Lista de archivos PDF seleccionados */}
      {showPreview && selectedFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Archivos PDF Seleccionados ({selectedFiles.length})
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
            <strong>PDF:</strong> Extracto de escritura (obligatorio)
          </Typography>
          <Typography variant="body2">
            <strong>Fotografía:</strong> Imagen de verificación (opcional)
          </Typography>
          <Typography variant="body2">
            <strong>Tamaño máximo PDF:</strong> 10MB
          </Typography>
          <Typography variant="body2">
            <strong>Tamaño máximo foto:</strong> 5MB
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default PDFUploader;
