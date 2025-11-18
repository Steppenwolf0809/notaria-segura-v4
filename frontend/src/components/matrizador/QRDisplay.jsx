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
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import QRCode from 'react-qr-code';
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
  const [copyingQR, setCopyingQR] = useState(false);

  // Referencia al elemento SVG del QR para copiarlo
  const qrRef = useRef(null);

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
   * Copia el QR como imagen PNG al portapapeles
   * Permite pegar directamente en Word, Google Docs, etc.
   */
  const handleCopyQR = async () => {
    if (!qrRef.current) return;

    setCopyingQR(true);

    try {
      // Obtener el elemento SVG del QR
      const svgElement = qrRef.current.querySelector('svg');
      if (!svgElement) {
        throw new Error('No se encontró el elemento SVG del QR');
      }

      // Obtener las dimensiones del SVG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Crear una imagen desde el SVG
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = svgUrl;
      });

      // Crear un canvas y dibujar la imagen
      const canvas = document.createElement('canvas');
      const scale = 2; // Factor de escala para mejor calidad
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Fondo blanco para el QR
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dibujar el QR
      ctx.drawImage(img, 0, 0);

      // Convertir canvas a blob PNG
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0);
      });

      // Copiar al clipboard usando la Clipboard API moderna
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);

      // Limpiar URL temporal
      URL.revokeObjectURL(svgUrl);

      // Mostrar éxito
      setShowCopySuccess(true);

    } catch (err) {
      console.error('Error al copiar QR:', err);

      // Mensaje de error amigable
      if (err.name === 'NotAllowedError') {
        alert('Permiso denegado. Por favor, permite el acceso al portapapeles o usa el botón Descargar.');
      } else if (!navigator.clipboard || !navigator.clipboard.write) {
        alert('Tu navegador no soporta copiar imágenes al portapapeles. Por favor, usa el botón Descargar.');
      } else {
        alert('No se pudo copiar el QR. Intenta usar el botón Descargar como alternativa.');
      }
    } finally {
      setCopyingQR(false);
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
              else window.print();
            });
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
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

            <Box
              ref={qrRef}
              sx={{
                display: 'inline-block',
                p: 2,
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
            </Box>

            {/* Leyenda de verificación */}
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'grey.300',
                maxWidth: 280,
                mx: 'auto'
              }}
            >
              <Typography
                variant="body2"
                color="text.primary"
                align="center"
                sx={{
                  fontWeight: 500,
                  lineHeight: 1.5
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

          <CardActions sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Tooltip title="Copiar QR al portapapeles">
              <span>
                <IconButton
                  onClick={handleCopyQR}
                  color="primary"
                  disabled={copyingQR}
                >
                  <CopyIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Descargar imagen">
              <IconButton onClick={handleDownload} color="primary">
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Compartir">
              <IconButton onClick={handleShare} color="primary">
                <ShareIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Imprimir">
              <IconButton onClick={handlePrint} color="primary">
                <PrintIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Regenerar">
              <IconButton onClick={() => loadQRData()} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </CardActions>
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
