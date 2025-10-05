/**
 * Modal mejorado para subir PDF con selección de páginas a ocultar
 * Versión 2: Incluye preview de páginas y configuración de privacidad
 */

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  IconButton,
  Paper,
  Chip,
  Checkbox,
  FormControlLabel,
  Grid,
  Card,
  Stepper,
  Step,
  StepLabel,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  VisibilityOff as HideIcon,
  Visibility as ShowIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { 
  uploadPDFToEscritura, 
  validatePDFFileUpload, 
  formatFileSize,
  hasPDFUploaded
} from '../../services/escrituras-qr-service';

// Configurar worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PDFUploaderModalV2({ open, onClose, escritura, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Estados para preview
  const [currentStep, setCurrentStep] = useState(0);
  const [numPages, setNumPages] = useState(null);
  const [hiddenPages, setHiddenPages] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  
  const hasExistingPDF = hasPDFUploaded(escritura);
  const steps = ['Seleccionar PDF', 'Configurar Privacidad'];
  
  // Limpiar URL al desmontar
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validation = validatePDFFileUpload(file);
    if (!validation.isValid) {
      setError(validation.errors.join('. '));
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setPdfUrl(URL.createObjectURL(file));
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const result = await uploadPDFToEscritura(
        escritura.id,
        selectedFile,
        hiddenPages,
        (progress) => setUploadProgress(progress)
      );
      
      if (onSuccess) onSuccess(result.data);
      setTimeout(handleClose, 1500);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };
  
  const handleClose = () => {
    if (uploading) return;
    
    setSelectedFile(null);
    setError(null);
    setCurrentStep(0);
    setNumPages(null);
    setHiddenPages([]);
    setUploadProgress(0);
    setUploading(false);
    
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onClose();
  };
  
  const togglePageHidden = (pageNum) => {
    setHiddenPages(prev => 
      prev.includes(pageNum) 
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={uploading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PdfIcon color="primary" />
            <Typography variant="h6">
              {hasExistingPDF ? 'Reemplazar PDF' : 'Subir PDF Completo'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={uploading} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Stepper */}
        <Stepper activeStep={currentStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {/* Paso 1: Seleccionar archivo */}
        {currentStep === 0 && (
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {!selectedFile ? (
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '2px dashed',
                  borderColor: 'divider',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1">Haz clic para seleccionar un PDF</Typography>
                <Typography variant="caption" color="text.secondary">
                  Máximo 10MB
                </Typography>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <PdfIcon color="success" sx={{ fontSize: 40 }} />
                  <Box flex={1}>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(selectedFile.size)}
                    </Typography>
                  </Box>
                  <Button 
                    size="small" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Cambiar
                  </Button>
                </Box>
              </Paper>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}
        
        {/* Paso 2: Configurar páginas ocultas */}
        {currentStep === 1 && pdfUrl && (
          <Box>
            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="medium">
                Protección de Privacidad
              </Typography>
              <Typography variant="caption">
                Marca las páginas que contengan datos sensibles (cédulas, biométricos de menores, etc.). 
                Estas páginas mostrarán un mensaje de privacidad al visualizarse públicamente.
              </Typography>
            </Alert>
            
            {hiddenPages.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  {hiddenPages.length} página{hiddenPages.length !== 1 ? 's' : ''} oculta{hiddenPages.length !== 1 ? 's' : ''}: {hiddenPages.join(', ')}
                </Typography>
              </Alert>
            )}
            
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<Typography>Cargando páginas...</Typography>}
              >
                <Grid container spacing={2}>
                  {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                    const isHidden = hiddenPages.includes(pageNum);
                    return (
                      <Grid item xs={6} sm={4} md={3} key={pageNum}>
                        <Card 
                          sx={{ 
                            position: 'relative',
                            border: isHidden ? '2px solid' : '1px solid',
                            borderColor: isHidden ? 'warning.main' : 'divider',
                            bgcolor: isHidden ? 'warning.lighter' : 'background.paper'
                          }}
                        >
                          <Box sx={{ p: 1, position: 'relative' }}>
                            <Page
                              pageNumber={pageNum}
                              width={150}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                            
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={isHidden}
                                  onChange={() => togglePageHidden(pageNum)}
                                  icon={<ShowIcon />}
                                  checkedIcon={<HideIcon />}
                                />
                              }
                              label={
                                <Typography variant="caption">
                                  Pág. {pageNum}
                                  {isHidden && ' (oculta)'}
                                </Typography>
                              }
                              sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                m: 0,
                                bgcolor: 'rgba(255,255,255,0.9)',
                                px: 1
                              }}
                            />
                          </Box>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Document>
            </Box>
          </Box>
        )}
        
        {/* Progreso de subida */}
        {uploading && (
          <Box sx={{ mt: 3 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Subiendo PDF...</Typography>
              <Typography variant="body2" fontWeight="medium">{uploadProgress}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={uploading}>
          Cancelar
        </Button>
        
        {currentStep === 0 ? (
          <Button
            onClick={() => setCurrentStep(1)}
            variant="contained"
            disabled={!selectedFile || uploading}
            endIcon={<NextIcon />}
          >
            Siguiente
          </Button>
        ) : (
          <>
            <Button
              onClick={() => setCurrentStep(0)}
              startIcon={<BackIcon />}
              disabled={uploading}
            >
              Atrás
            </Button>
            <Button
              onClick={handleUpload}
              variant="contained"
              disabled={uploading}
              startIcon={<UploadIcon />}
            >
              {uploading ? 'Subiendo...' : 'Subir PDF'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

