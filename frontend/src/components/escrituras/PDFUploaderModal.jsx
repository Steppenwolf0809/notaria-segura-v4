/**
 * Modal para subir el PDF completo de una escritura
 * Permite a matrizadores/admins subir el PDF verificable para usuarios públicos
 */

import React, { useState, useRef } from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Checkbox,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Visibility as EyeIcon,
  VisibilityOff as EyeOffIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon
} from '@mui/icons-material';
import { 
  uploadPDFToEscritura, 
  validatePDFFileUpload, 
  formatFileSize,
  hasPDFUploaded
} from '../../services/escrituras-qr-service';

// Configurar worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Componente PDFUploaderModal
 * @param {Object} props
 * @param {boolean} props.open - Si el modal está abierto
 * @param {Function} props.onClose - Callback al cerrar el modal
 * @param {Object} props.escritura - Datos de la escritura
 * @param {Function} props.onSuccess - Callback cuando se sube exitosamente
 */
export default function PDFUploaderModal({ open, onClose, escritura, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const fileInputRef = useRef(null);
  
  // Estados para preview de páginas
  const [currentStep, setCurrentStep] = useState(0); // 0: selección, 1: preview de páginas
  const [numPages, setNumPages] = useState(null);
  const [hiddenPages, setHiddenPages] = useState([]); // Array de páginas a ocultar
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  
  const hasExistingPDF = hasPDFUploaded(escritura);
  
  const steps = ['Seleccionar PDF', 'Configurar Privacidad'];
  
  // Manejar selección de archivo
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setValidationResult(null);
      setPdfPreviewUrl(null);
      return;
    }
    
    // Validar archivo
    const validation = validatePDFFileUpload(file);
    setValidationResult(validation);
    
    if (validation.isValid) {
      setSelectedFile(file);
      setError(null);
      
      // Crear URL para preview del PDF
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
    } else {
      setSelectedFile(null);
      setError(validation.errors.join('. '));
      setPdfPreviewUrl(null);
    }
  };
  
  // Manejar carga del documento en preview
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    console.log(`PDF cargado: ${numPages} páginas`);
  };
  
  // Toggle página oculta
  const toggleHiddenPage = (pageNumber) => {
    setHiddenPages(prev => {
      if (prev.includes(pageNumber)) {
        return prev.filter(p => p !== pageNumber);
      } else {
        return [...prev, pageNumber].sort((a, b) => a - b);
      }
    });
  };
  
  // Ir al paso siguiente
  const handleNext = () => {
    if (currentStep === 0 && selectedFile && validationResult?.isValid) {
      setCurrentStep(1);
    }
  };
  
  // Volver al paso anterior
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(0);
    }
  };
  
  // Manejar subida de archivo
  const handleUpload = async () => {
    if (!selectedFile || !validationResult?.isValid) {
      return;
    }
    
    setUploading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      const result = await uploadPDFToEscritura(
        escritura.id,
        selectedFile,
        hiddenPages, // Enviar páginas ocultas
        (progress) => setUploadProgress(progress)
      );
      
      // Éxito
      if (onSuccess) {
        onSuccess(result.data);
      }
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        handleClose();
      }, 1500);
      
    } catch (err) {
      console.error('Error uploading PDF:', err);
      setError(err.message || 'Error al subir el PDF');
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Manejar cierre del modal
  const handleClose = () => {
    if (uploading) return; // No cerrar durante subida
    
    setSelectedFile(null);
    setValidationResult(null);
    setError(null);
    setUploadProgress(0);
    setUploading(false);
    setCurrentStep(0);
    setNumPages(null);
    setHiddenPages([]);
    
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onClose();
  };
  
  // Click en botón de selección
  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
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
          <IconButton 
            onClick={handleClose} 
            disabled={uploading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Información de la escritura */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Escritura
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {escritura.numeroEscritura || 'Sin número'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Token: {escritura.token}
          </Typography>
        </Paper>
        
        {/* Advertencia si ya existe PDF */}
        {hasExistingPDF && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
            <Typography variant="body2" fontWeight="medium">
              Ya existe un PDF subido
            </Typography>
            <Typography variant="caption">
              Si subes un nuevo PDF, el anterior será reemplazado automáticamente.
            </Typography>
          </Alert>
        )}
        
        {/* Información importante */}
        <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>Este PDF será visible públicamente</strong> para cualquiera que tenga el 
            token o escanee el código QR de la escritura.
          </Typography>
        </Alert>
        
        {/* Área de selección de archivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            border: '2px dashed',
            borderColor: selectedFile ? 'success.main' : 'divider',
            bgcolor: selectedFile ? 'success.lighter' : 'background.paper',
            '&:hover': uploading ? {} : {
              borderColor: 'primary.main',
              bgcolor: 'action.hover'
            }
          }}
          onClick={handleSelectClick}
        >
          {!selectedFile ? (
            <>
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" gutterBottom>
                Haz clic para seleccionar un PDF
              </Typography>
              <Typography variant="caption" color="text.secondary">
                o arrastra y suelta aquí
              </Typography>
            </>
          ) : (
            <>
              <PdfIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="body1" fontWeight="medium" gutterBottom>
                {selectedFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(selectedFile.size)}
              </Typography>
            </>
          )}
        </Paper>
        
        {/* Validación - Errores */}
        {validationResult && validationResult.errors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Archivo no válido:
            </Typography>
            <List dense>
              {validationResult.errors.map((err, idx) => (
                <ListItem key={idx} sx={{ py: 0 }}>
                  <ListItemText 
                    primary={err}
                    primaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}
        
        {/* Validación - Advertencias */}
        {validationResult && validationResult.warnings.length > 0 && validationResult.isValid && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {validationResult.warnings.map((warn, idx) => (
              <Typography key={idx} variant="caption" display="block">
                {warn}
              </Typography>
            ))}
          </Alert>
        )}
        
        {/* Requisitos del archivo */}
        {!selectedFile && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              <strong>Requisitos:</strong>
            </Typography>
            <List dense>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="Formato PDF válido"
                  primaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="Tamaño máximo: 10MB"
                  primaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="El archivo se nombrará automáticamente con el token"
                  primaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            </List>
          </Box>
        )}
        
        {/* Barra de progreso durante subida */}
        {uploading && (
          <Box sx={{ mt: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="body2">
                Subiendo PDF...
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {uploadProgress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            {uploadProgress === 100 && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                ✓ PDF subido exitosamente
              </Typography>
            )}
          </Box>
        )}
        
        {/* Error general */}
        {error && !validationResult && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={uploading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          startIcon={<UploadIcon />}
          disabled={!selectedFile || !validationResult?.isValid || uploading}
        >
          {uploading ? 'Subiendo...' : hasExistingPDF ? 'Reemplazar PDF' : 'Subir PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

