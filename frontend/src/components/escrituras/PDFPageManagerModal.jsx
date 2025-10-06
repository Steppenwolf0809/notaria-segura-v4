/**
 * Modal para gestionar páginas ocultas de un PDF ya subido
 * Permite ver el PDF y seleccionar qué páginas ocultar del público
 */

import React, { useState, useEffect } from 'react';
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
  IconButton,
  Chip,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Tooltip,
  Divider,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  VisibilityOff as HideIcon,
  Visibility as ShowIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import { 
  updatePDFHiddenPages,
  getPDFHiddenPages
} from '../../services/escrituras-qr-service';
import { toast } from 'react-toastify';

// Configurar worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// URL base pública del FTP (sin autenticación)
const PUBLIC_FOTOS_URL = 'https://www.notaria18quito.com.ec/fotos-escrituras';

// Opciones para cargar PDFs con CORS
const pdfOptions = {
  cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
};

export default function PDFPageManagerModal({ open, onClose, escritura, onSuccess }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hiddenPages, setHiddenPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [hasChanges, setHasChanges] = useState(false);

  // Usar URL pública del FTP (no requiere autenticación, evita problemas de CORS)
  const pdfUrl = escritura?.pdfFileName 
    ? `${PUBLIC_FOTOS_URL}/${escritura.pdfFileName}`
    : null;

  // Cargar páginas ocultas existentes
  useEffect(() => {
    if (open && escritura) {
      loadHiddenPages();
    }
  }, [open, escritura]);

  const loadHiddenPages = async () => {
    try {
      setLoading(true);
      const pages = await getPDFHiddenPages(escritura.id);
      setHiddenPages(pages || []);
      setHasChanges(false);
    } catch (err) {
      console.error('Error loading hidden pages:', err);
      setError('Error al cargar las páginas ocultas');
    } finally {
      setLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    console.error('PDF URL:', pdfUrl);
    setError(
      'Error al cargar el PDF. Verifica que el archivo esté correctamente subido al servidor FTP. ' +
      'URL: ' + (pdfUrl || 'No disponible')
    );
    setLoading(false);
  };

  const togglePageHidden = (pageNum) => {
    setHiddenPages(prev => {
      const newPages = prev.includes(pageNum)
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b);
      setHasChanges(true);
      return newPages;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const result = await updatePDFHiddenPages(escritura.id, hiddenPages);
      
      toast.success(`Configuración guardada: ${hiddenPages.length} página(s) oculta(s)`);
      setHasChanges(false);
      
      if (onSuccess) {
        onSuccess(result.data);
      }
      
      // Dar tiempo para mostrar el toast antes de cerrar
      setTimeout(() => {
        handleClose();
      }, 1000);
      
    } catch (err) {
      setError(err.message);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    
    if (hasChanges) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?')) {
        return;
      }
    }
    
    setCurrentPage(1);
    setScale(1.0);
    setHasChanges(false);
    setError(null);
    onClose();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
    }
  };

  const handleZoom = (delta) => {
    setScale(prev => Math.max(0.5, Math.min(2.0, prev + delta)));
  };

  const isPageHidden = (pageNum) => hiddenPages.includes(pageNum);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">
              Gestionar Páginas Ocultas
            </Typography>
            <Chip 
              label={`${hiddenPages.length} página(s) oculta(s)`}
              color={hiddenPages.length > 0 ? 'warning' : 'default'}
              size="small"
            />
            {hasChanges && (
              <Chip 
                label="Sin guardar"
                color="error"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={saving}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Escritura: {escritura?.numeroEscritura || escritura?.token}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!pdfUrl && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>PDF no encontrado.</strong> Verifica que el archivo haya sido subido correctamente.
            </Typography>
            {escritura?.pdfFileName && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Buscando: {PUBLIC_FOTOS_URL}/{escritura.pdfFileName}
              </Typography>
            )}
          </Alert>
        )}

        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Instrucciones:</strong> Selecciona las páginas que quieres ocultar del público (por ejemplo, páginas con datos sensibles de menores de edad).
            Las páginas ocultas mostrarán un mensaje de "Página oculta por privacidad" en la verificación pública.
          </Typography>
        </Alert>

        <Grid container spacing={2} sx={{ height: 'calc(90vh - 300px)' }}>
          {/* Panel izquierdo: Vista previa de la página actual */}
          <Grid item xs={12} md={8}>
            <Paper 
              elevation={2} 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                bgcolor: '#525659'
              }}
            >
              {/* Controles del PDF */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'white', 
                borderBottom: 1, 
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2
              }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    size="small"
                  >
                    <PrevIcon />
                  </IconButton>
                  <Typography variant="body2" sx={{ minWidth: 100, textAlign: 'center' }}>
                    Página {currentPage} de {numPages || '...'}
                  </Typography>
                  <IconButton 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= numPages}
                    size="small"
                  >
                    <NextIcon />
                  </IconButton>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton onClick={() => handleZoom(-0.1)} size="small">
                    <ZoomOutIcon />
                  </IconButton>
                  <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
                    {Math.round(scale * 100)}%
                  </Typography>
                  <IconButton onClick={() => handleZoom(0.1)} size="small">
                    <ZoomInIcon />
                  </IconButton>
                </Box>

                <Button
                  variant={isPageHidden(currentPage) ? "contained" : "outlined"}
                  color={isPageHidden(currentPage) ? "success" : "warning"}
                  startIcon={isPageHidden(currentPage) ? <ShowIcon /> : <HideIcon />}
                  onClick={() => togglePageHidden(currentPage)}
                  size="small"
                >
                  {isPageHidden(currentPage) ? 'Mostrar Esta Página' : 'Ocultar Esta Página'}
                </Button>
              </Box>

              {/* Visor del PDF */}
              <Box sx={{ 
                flex: 1, 
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                p: 2
              }}>
                {loading ? (
                  <Box display="flex" flexDirection="column" alignItems="center" gap={2} mt={4}>
                    <CircularProgress size={40} sx={{ color: 'white' }} />
                    <Typography variant="body2" color="white">
                      Cargando PDF...
                    </Typography>
                  </Box>
                ) : (
                  <Document
                    file={{
                      url: pdfUrl,
                      withCredentials: false
                    }}
                    options={pdfOptions}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                        <CircularProgress sx={{ color: 'white' }} />
                        <Typography color="white">Cargando documento...</Typography>
                      </Box>
                    }
                  >
                    <Box position="relative">
                      <Page 
                        pageNumber={currentPage}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                      {isPageHidden(currentPage) && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(255, 152, 0, 0.3)',
                            border: '4px solid',
                            borderColor: 'warning.main',
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Chip
                            label="PÁGINA OCULTA"
                            color="warning"
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '1.2em',
                              px: 2,
                              py: 3
                            }}
                            icon={<HideIcon />}
                          />
                        </Box>
                      )}
                    </Box>
                  </Document>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Panel derecho: Miniaturas de todas las páginas */}
          <Grid item xs={12} md={4}>
            <Paper 
              elevation={2} 
              sx={{ 
                height: '100%', 
                overflow: 'auto',
                p: 2
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Todas las Páginas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={1}>
                {Array.from(new Array(numPages || 0), (_, index) => {
                  const pageNum = index + 1;
                  const hidden = isPageHidden(pageNum);
                  const isCurrent = currentPage === pageNum;
                  
                  return (
                    <Grid item xs={6} key={pageNum}>
                      <Card 
                        sx={{ 
                          border: isCurrent ? 2 : 1,
                          borderColor: isCurrent ? 'primary.main' : 'divider',
                          position: 'relative'
                        }}
                      >
                        <CardActionArea onClick={() => setCurrentPage(pageNum)}>
                          <Box 
                            sx={{ 
                              height: 150, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              bgcolor: '#f5f5f5',
                              position: 'relative'
                            }}
                          >
                            <Document
                              file={{
                                url: pdfUrl,
                                withCredentials: false
                              }}
                              options={pdfOptions}
                              loading={<CircularProgress size={20} />}
                            >
                              <Page 
                                pageNumber={pageNum}
                                width={120}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                              />
                            </Document>
                            
                            {hidden && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  bgcolor: 'rgba(255, 152, 0, 0.7)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <HideIcon sx={{ fontSize: 40, color: 'white' }} />
                              </Box>
                            )}
                          </Box>
                          <CardContent sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="caption">
                              Página {pageNum}
                            </Typography>
                            {hidden && (
                              <Chip 
                                label="Oculta"
                                size="small"
                                color="warning"
                                sx={{ mt: 0.5, fontSize: '0.7em' }}
                              />
                            )}
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Box display="flex" alignItems="center" gap={1}>
            <InfoIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {hiddenPages.length === 0 
                ? 'Todas las páginas serán visibles al público'
                : `${hiddenPages.length} página(s) oculta(s): ${hiddenPages.join(', ')}`
              }
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button 
              onClick={handleClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={saving || !hasChanges}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

