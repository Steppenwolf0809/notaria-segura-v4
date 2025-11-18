import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import documentService from '../services/document-service';
import useDocumentStore from '../store/document-store';
import { toast } from 'react-toastify';

/**
 * Componente simple para subir archivos XML
 * Permite drag & drop o selección de archivos
 */
const UploadXML = () => {
  const { fetchAllDocuments } = useDocumentStore();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validar extensión
    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Error: Solo se permiten archivos XML');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Error: El archivo es demasiado grande (máximo 10MB)');
      return;
    }

    setUploading(true);
    setProgress(0);
    setResults([]);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await documentService.uploadXmlDocument(file);

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        toast.success(`✅ XML procesado exitosamente`);
        setResults([{
          success: true,
          message: `Documento creado: ${result.data.document.protocolNumber}`,
          document: result.data.document
        }]);

        // ⭐ FIX: Actualizar el store de documentos para que el dashboard muestre el nuevo documento
        try {
          await fetchAllDocuments(1, 50);
        } catch (fetchError) {
          // No mostrar error al usuario ya que el documento se subió correctamente
        }
      } else {
        toast.error(result.error || 'Error al procesar el XML');
        setResults([{
          success: false,
          message: result.error || 'Error al procesar el XML'
        }]);
      }
    } catch (error) {
      toast.error('Error inesperado al subir el XML');
      setResults([{
        success: false,
        message: 'Error inesperado al subir el XML'
      }]);
    } finally {
      setUploading(false);
    }
  }, [fetchAllDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml']
    },
    maxFiles: 1,
    multiple: false,
    disabled: uploading
  });

  const handleReset = () => {
    setResults([]);
    setProgress(0);
  };

  return (
    <Box sx={{ p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 1 }}>
          Subir Archivo XML
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Arrastra un archivo XML o haz clic para seleccionarlo desde tu computadora
        </Typography>
      </Box>

      {/* Upload Zone */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : uploading ? 'grey.400' : 'divider',
              borderRadius: 2,
              p: 6,
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              bgcolor: isDragActive ? 'action.hover' : uploading ? 'action.disabledBackground' : 'action.hover',
              transition: 'all 0.2s ease-in-out',
              opacity: uploading ? 0.6 : 1,
              '&:hover': {
                borderColor: uploading ? 'grey.400' : 'primary.main',
                bgcolor: uploading ? 'action.disabledBackground' : 'action.selected'
              }
            }}
          >
            <input {...getInputProps()} />
            
            <CloudUploadIcon 
              sx={{ 
                fontSize: 64, 
                color: uploading ? 'grey.400' : 'primary.main', 
                mb: 2 
              }} 
            />
            
            {isDragActive ? (
              <Typography variant="h6" color="primary.main">
                Suelta el archivo XML aquí...
              </Typography>
            ) : uploading ? (
              <>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Procesando XML...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Por favor espera mientras procesamos tu archivo
                </Typography>
              </>
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
                  sx={{ mt: 2 }}
                >
                  Seleccionar Archivo XML
                </Button>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                  Tamaño máximo: 10MB
                </Typography>
              </>
            )}
          </Box>

          {/* Progress Bar */}
          {uploading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'primary.main'
                  }
                }}
              />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                Procesando XML... {progress}%
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              Resultado del Procesamiento
            </Typography>
            
            <List>
              {results.map((result, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      {result.success ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={result.message}
                      secondary={result.document && (
                        <Box component="span" sx={{ display: 'block', mt: 1 }}>
                          <Typography variant="caption" display="block">
                            Cliente: {result.document.clientName}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Tipo: {result.document.documentType}
                          </Typography>
                        </Box>
                      )}
                    />
                  </ListItem>
                  {index < results.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleReset}
                startIcon={<CloudUploadIcon />}
              >
                Subir Otro XML
              </Button>
              {results.some(r => r.success) && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    window.location.hash = '#/dashboard';
                  }}
                  startIcon={<DescriptionIcon />}
                >
                  Ver en Dashboard
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      {!uploading && results.length === 0 && (
        <Card sx={{ mt: 4, bgcolor: 'action.hover' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary.main">
              📋 Instrucciones
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="1. El archivo debe ser XML válido"
                  secondary="Formato XML generado por el sistema notarial"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="2. Tamaño máximo 10MB"
                  secondary="Archivos más grandes serán rechazados"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="3. Un documento por XML"
                  secondary="Para subir múltiples documentos, hazlo uno por uno"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="4. Verificación automática"
                  secondary="El sistema valida y procesa el documento automáticamente"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default UploadXML;

