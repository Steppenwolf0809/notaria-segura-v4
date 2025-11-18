/**
 * Visor seguro de PDFs de escrituras
 * Muestra el PDF completo con navegación de páginas y protecciones básicas
 * Usado tanto en panel de admin/matrizadores como en página pública de verificación
 */

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Stack
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Refresh,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Visibility as ViewIcon,
  VisibilityOff
} from '@mui/icons-material';

// Configurar worker de PDF.js con versión específica conocida
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Componente SecurePDFViewer
 * @param {Object} props
 * @param {string} props.pdfUrl - URL del PDF a mostrar
 * @param {string} props.numeroEscritura - Número de la escritura (para título)
 * @param {boolean} props.showControls - Mostrar controles completos (default: true)
 * @param {boolean} props.showBanner - Mostrar banner informativo (default: true)
 * @param {Array<number>} props.hiddenPages - Array de páginas a ocultar (default: [])
 * @param {Object} props.containerSx - Estilos adicionales para el contenedor
 */
export default function SecurePDFViewer({ 
  pdfUrl, 
  numeroEscritura,
  showControls = true,
  showBanner = true,
  hiddenPages = [],
  containerSx = {}
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingPage, setLoadingPage] = useState(false);
  
  // Restablecer página al cambiar PDF
  useEffect(() => {
    setPageNumber(1);
    setScale(1.0);
    setError(null);
  }, [pdfUrl]);
  
  // Bloquear clic derecho
  useEffect(() => {
    const preventContextMenu = (e) => {
      if (e.target.closest('.pdf-viewer-container')) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('contextmenu', preventContextMenu);
    
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);
  
  // Bloquear atajos de teclado (Ctrl+S, Ctrl+P)
  useEffect(() => {
    const preventShortcuts = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
        e.preventDefault();
        return false;
      }
    };
    
    document.addEventListener('keydown', preventShortcuts);
    
    return () => {
      document.removeEventListener('keydown', preventShortcuts);
    };
  }, []);
  
  // Manejar carga exitosa del documento
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };
  
  // Manejar error de carga
  const onDocumentLoadError = (error) => {
    setLoading(false);
    setError('No se pudo cargar el PDF. Verifica tu conexión e intenta nuevamente.');
  };
  
  // Navegación de páginas
  const goToPage = (page) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
      setLoadingPage(true);
    }
  };
  
  const previousPage = () => goToPage(pageNumber - 1);
  const nextPage = () => goToPage(pageNumber + 1);
  
  // Control de zoom
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setScale(1.0);
  
  // Recargar PDF
  const handleReload = () => {
    setLoading(true);
    setError(null);
    setPageNumber(1);
    // Forzar recarga agregando timestamp a la URL
    const urlWithTimestamp = `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    window.location.href = urlWithTimestamp;
  };
  
  return (
    <Box className="pdf-viewer-container" sx={{ ...containerSx }}>
      {/* Banner informativo */}
      {showBanner && (
        <Alert 
          severity="info" 
          icon={<CheckIcon />}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <ViewIcon fontSize="small" />
            <Typography variant="body2">
              <strong>Documento oficial y verificable</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • Solo para verificación • No descargable
            </Typography>
          </Stack>
        </Alert>
      )}
      
      {/* Título */}
      {numeroEscritura && (
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Escritura: {numeroEscritura}
          {numPages && (
            <Chip 
              label={`${numPages} página${numPages !== 1 ? 's' : ''}`}
              size="small" 
              color="primary" 
              variant="outlined"
            />
          )}
        </Typography>
      )}
      
      {/* Controles superiores */}
      {showControls && !loading && !error && (
        <Paper 
          elevation={2} 
          sx={{ 
            p: 1, 
            mb: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          {/* Navegación de páginas */}
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton 
              onClick={previousPage} 
              disabled={pageNumber <= 1}
              size="small"
            >
              <ChevronLeft />
            </IconButton>
            
            <Typography variant="body2" sx={{ minWidth: '120px', textAlign: 'center' }}>
              Página <strong>{pageNumber}</strong> de <strong>{numPages}</strong>
            </Typography>
            
            <IconButton 
              onClick={nextPage} 
              disabled={pageNumber >= numPages}
              size="small"
            >
              <ChevronRight />
            </IconButton>
          </Box>
          
          {/* Controles de zoom */}
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Alejar">
              <IconButton 
                onClick={zoomOut} 
                disabled={scale <= 0.5}
                size="small"
              >
                <ZoomOut />
              </IconButton>
            </Tooltip>
            
            <Typography variant="caption" sx={{ minWidth: '50px', textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </Typography>
            
            <Tooltip title="Acercar">
              <IconButton 
                onClick={zoomIn} 
                disabled={scale >= 2.0}
                size="small"
              >
                <ZoomIn />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Restablecer zoom">
              <IconButton 
                onClick={resetZoom} 
                size="small"
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      )}
      
      {/* Contenedor del PDF */}
      <Paper 
        elevation={3}
        sx={{ 
          p: 2,
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: 400,
          bgcolor: '#f5f5f5',
          position: 'relative',
          userSelect: 'none', // Deshabilitar selección de texto
        }}
      >
        {/* Estado de carga */}
        {loading && (
          <Box textAlign="center">
            <CircularProgress size={60} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Cargando PDF...
            </Typography>
          </Box>
        )}
        
        {/* Estado de error */}
        {error && (
          <Box textAlign="center" maxWidth={400}>
            <WarningIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="body1" color="error" gutterBottom>
              {error}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={handleReload}
              startIcon={<Refresh />}
              sx={{ mt: 2 }}
            >
              Reintentar
            </Button>
          </Box>
        )}
        
        {/* Documento PDF */}
        {!loading && !error && (
          <>
            {/* Mostrar placeholder si la página está oculta */}
            {hiddenPages.includes(pageNumber) ? (
              <Box
                sx={{
                  minHeight: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 4,
                  bgcolor: 'grey.100',
                  border: '2px dashed',
                  borderColor: 'warning.main'
                }}
              >
                <VisibilityOff sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                  Página Oculta por Privacidad
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
                  Esta página contiene datos sensibles y ha sido ocultada para proteger la privacidad.
                </Typography>
                <Chip 
                  label={`Página ${pageNumber} de ${numPages}`}
                  color="warning"
                  sx={{ mt: 2 }}
                />
              </Box>
            ) : (
              // Mostrar página normal
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  loading={
                    <Box textAlign="center" py={4}>
                      <CircularProgress size={40} />
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Cargando página {pageNumber}...
                      </Typography>
                    </Box>
                  }
                  onLoadSuccess={() => setLoadingPage(false)}
                  renderTextLayer={false} // Desactivar capa de texto para mayor seguridad
                  renderAnnotationLayer={true}
                />
              </Document>
            )}
          </>
        )}
      </Paper>
      
      {/* Controles inferiores (móvil) */}
      {showControls && !loading && !error && numPages > 1 && (
        <Box 
          sx={{ 
            mt: 2, 
            display: { xs: 'flex', sm: 'none' },
            justifyContent: 'center',
            gap: 2
          }}
        >
          <Button 
            variant="outlined" 
            onClick={previousPage}
            disabled={pageNumber <= 1}
            startIcon={<ChevronLeft />}
          >
            Anterior
          </Button>
          <Button 
            variant="outlined" 
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            endIcon={<ChevronRight />}
          >
            Siguiente
          </Button>
        </Box>
      )}
    </Box>
  );
}

