/**
 * Componente QRDisplay
 * Muestra códigos QR generados con opciones de descarga y compartir
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  InputAdornment,
  Snackbar
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  PhotoCamera as CaptureIcon
} from '@mui/icons-material';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { 
  getEscrituraQR, 
  generateVerificationURL, 
  copyToClipboard, 
  downloadQRImage 
} from '../../services/escrituras-qr-service';

const QRDisplay = ({ escrituraId, escritura, onRefresh }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('display');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [capturingQR, setCapturingQR] = useState(false);
  
  // Ref para capturar el QR con leyenda
  const qrContainerRef = useRef(null);

  // Formatos disponibles
  const formats = [
    { key: 'display', label: 'Pantalla', description: 'Optimizado para mostrar en pantalla' },
    { key: 'print', label: 'Impresión', description: 'Alta calidad para imprimir' },
    { key: 'web', label: 'Web', description: 'Tamaño pequeño para web' },
    { key: 'official', label: 'Oficial', description: 'Con colores oficiales de la notaría' }
  ];

  /**
   * Carga los datos del QR
   */
  const loadQRData = async (format = selectedFormat) => {
    if (!escrituraId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getEscrituraQR(escrituraId, format);
      setQrData(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading QR data:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Efecto para cargar datos iniciales
   */
  useEffect(() => {
    if (escrituraId) {
      loadQRData();
    }
  }, [escrituraId]);

  /**
   * Maneja el cambio de formato
   */
  const handleFormatChange = (event, newFormat) => {
    setSelectedFormat(newFormat);
    loadQRData(newFormat);
  };

  /**
   * Copia la URL de verificación al portapapeles
   */
  const handleCopyURL = async () => {
    if (!qrData?.verificationURL) return;

    const success = await copyToClipboard(qrData.verificationURL);
    if (success) {
      setShowCopySuccess(true);
    }
  };

  /**
   * Copia el token al portapapeles
   */
  const handleCopyToken = async () => {
    if (!qrData?.token) return;

    const success = await copyToClipboard(qrData.token);
    if (success) {
      setShowCopySuccess(true);
    }
  };

  /**
   * Descarga el QR como imagen
   */
  const handleDownload = () => {
    if (!qrData?.qrDataURL) return;

    const filename = `escritura-qr-${escritura?.numeroEscritura || qrData.token}-${selectedFormat}.png`;
    downloadQRImage(qrData.qrDataURL, filename);
  };

  /**
   * Comparte la URL de verificación
   */
  const handleShare = async () => {
    if (!qrData?.verificationURL) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Verificación de Escritura Notarial',
          text: `Verifica la escritura ${escritura?.numeroEscritura || 'notarial'}`,
          url: qrData.verificationURL
        });
      } catch (err) {
        // Si el usuario cancela, no hacer nada
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      // Fallback: copiar al portapapeles
      handleCopyURL();
    }
  };

  /**
   * Imprime el QR
   */
  const handlePrint = () => {
    if (!qrData?.verificationURL) return;

    const printWindow = window.open('', '_blank');
    const qrSize = 300;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Código QR - Escritura ${escritura?.numeroEscritura || qrData.token}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
            }
            .header {
              margin-bottom: 20px;
              border-bottom: 2px solid #1A5799;
              padding-bottom: 15px;
            }
            .qr-container {
              margin: 20px 0;
            }
            .info {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #ccc;
              padding-top: 15px;
              font-size: 10px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GLENDA ZAPATA SILVA - NOTARIO 18</h1>
            <p>Verificación de Escritura Notarial</p>
          </div>
          
          <div class="qr-container">
            <div id="qr-code"></div>
          </div>
          
          <div class="info">
            <p><strong>Escritura:</strong> ${escritura?.numeroEscritura || 'N/A'}</p>
            <p><strong>Token:</strong> ${qrData.token}</p>
            <p><strong>URL:</strong> ${qrData.verificationURL}</p>
            <p><strong>Generado:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="footer">
            <p>Calle Azuay E2-231 entre Av. Amazonas y Av. Azuay, Quito, Ecuador</p>
            <p>Teléfono: (02) 224-7787 / 099-695-1682 | Email: notaria18uio@gmail.com</p>
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(document.getElementById('qr-code'), '${qrData.verificationURL}', {
              width: ${qrSize},
              margin: 2,
              color: {
                dark: '#1A5799',
                light: '#FFFFFF'
              }
            }, function (error) {
              if (error) console.error(error);
              else window.print();
            });
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  /**
   * Captura el código QR con leyenda como imagen y lo copia al portapapeles
   * EDUCATIVO: Esta función:
   * 1. Usa html2canvas para capturar el div del QR con leyenda
   * 2. Intenta copiar al portapapeles usando navigator.clipboard.write()
   * 3. Si falla, hace fallback a descarga del archivo
   */
  const handleCaptureQRWithLegend = async () => {
    if (!qrContainerRef.current) return;

    setCapturingQR(true);
    try {
      // 1. Capturar el contenedor del QR con html2canvas
      const canvas = await html2canvas(qrContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Alta calidad
        logging: false,
        useCORS: true
      });

      // 2. Convertir canvas a blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Error al generar la imagen');
        }

        try {
          // 3. Intentar copiar al portapapeles
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            
            console.log('✅ QR con leyenda copiado al portapapeles');
            setShowCopySuccess(true);
            
          } else {
            // Navegador no soporta clipboard API, hacer fallback a descarga
            throw new Error('Clipboard API no disponible');
          }
          
        } catch (clipboardError) {
          console.warn('No se pudo copiar al portapapeles, descargando archivo:', clipboardError.message);
          
          // Fallback: Descargar la imagen
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `qr-escritura-${escritura?.numeroEscritura || qrData?.token}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          console.log('QR con leyenda descargado como archivo');
          alert('No se pudo copiar al portapapeles. El QR se descargó como archivo.');
        }
        
        setCapturingQR(false);
        
      }, 'image/png');

    } catch (error) {
      console.error('Error capturando QR con leyenda:', error);
      alert('Error al capturar el QR. Por favor intenta nuevamente.');
      setCapturingQR(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <QrCodeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography>Generando código QR...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => loadQRData()}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      </Paper>
    );
  }

  if (!qrData) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No hay datos de QR disponibles
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Tabs de formatos */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={selectedFormat}
          onChange={handleFormatChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {formats.map((format) => (
            <Tab
              key={format.key}
              label={format.label}
              value={format.key}
              sx={{ minWidth: 100 }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Información del formato seleccionado */}
      <Alert severity="info" sx={{ mb: 2 }}>
        {formats.find(f => f.key === selectedFormat)?.description}
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Código QR */}
        <Card sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <CardContent sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Código QR
            </Typography>
            
            {/* Contenedor capurable con ref */}
            <Box 
              ref={qrContainerRef}
              sx={{ 
                display: 'inline-block', 
                p: 3, 
                bgcolor: 'white', 
                borderRadius: 1,
                border: 1,
                borderColor: 'divider'
              }}
            >
              <QRCode
                value={qrData.verificationURL}
                size={200}
                level="M"
                fgColor={selectedFormat === 'official' ? '#1A5799' : '#000000'}
                bgColor="#FFFFFF"
              />
              
              {/* Leyenda descriptiva */}
              <Typography 
                variant="body2" 
                sx={{ 
                  mt: 2,
                  fontSize: '15px',
                  color: '#333',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  maxWidth: '240px',
                  margin: '16px auto 0'
                }}
              >
                Para verificar la autenticidad de esta escritura, escanee este código QR
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Chip
                label={`Token: ${qrData.token}`}
                size="small"
                onClick={handleCopyToken}
                clickable
                icon={<CopyIcon />}
              />
            </Box>
          </CardContent>

          {/* Botones principales simplificados */}
          <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<CaptureIcon />}
              onClick={handleCaptureQRWithLegend}
              disabled={capturingQR}
              size="medium"
            >
              {capturingQR ? 'Capturando...' : 'Capturar QR'}
            </Button>
            
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              size="medium"
            >
              Imprimir QR
            </Button>
          </Box>
        </Card>

        {/* Información de verificación */}
        <Card sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Información de Verificación
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                URL de Verificación:
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={qrData.verificationURL}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleCopyURL} size="small">
                        <CopyIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Token de Verificación:
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={qrData.token}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleCopyToken} size="small">
                        <CopyIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {escritura && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Escritura:
                </Typography>
                <Typography variant="body1">
                  {escritura.numeroEscritura || 'N/A'}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Generado:
              </Typography>
              <Typography variant="body2">
                {new Date(qrData.generatedAt).toLocaleString()}
              </Typography>
            </Box>

            {qrData.config && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Configuración:
                </Typography>
                <Typography variant="caption" component="div">
                  Tamaño: {qrData.config.size}px<br />
                  Formato: {qrData.config.format}<br />
                  Corrección de errores: {qrData.config.errorCorrection}
                </Typography>
              </Box>
            )}
          </CardContent>

          <CardActions>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={handleShare}
            >
              Compartir URL
            </Button>
          </CardActions>
        </Card>
      </Box>

      {/* Instrucciones de uso */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Instrucciones de uso:</strong>
        </Typography>
        <Typography variant="body2" component="div">
          • Escanea el código QR con cualquier aplicación de códigos QR<br />
          • O visita la URL de verificación directamente<br />
          • El código QR llevará a una página pública de verificación<br />
          • No se requiere autenticación para verificar la escritura
        </Typography>
      </Alert>

      {/* Snackbar de éxito al copiar */}
      <Snackbar
        open={showCopySuccess}
        autoHideDuration={3000}
        onClose={() => setShowCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowCopySuccess(false)} 
          severity="success" 
          sx={{ width: '100%' }}
          icon={<CheckIcon />}
        >
          Copiado al portapapeles
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QRDisplay;
