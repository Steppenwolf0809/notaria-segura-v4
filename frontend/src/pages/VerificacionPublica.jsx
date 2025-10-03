/**
 * Página de Verificación Pública de Escrituras
 * Página independiente para verificar escrituras usando tokens QR
 * Diseñada para ser embebida en notaria18quito.com.ec
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { verifyEscritura } from '../services/escrituras-qr-service';

const VerificacionPublica = () => {
  // Extraer token de la URL sin React Router
  const getTokenFromURL = () => {
    const path = window.location.pathname;
    const match = path.match(/\/verify\/([A-Za-z0-9]{8})/);
    return match ? match[1] : null;
  };

  const token = getTokenFromURL();
  const [escritura, setEscritura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Formatea la cuantía para mostrar
   * @param {number|string} cuantia - Cuantía normalizada del backend
   * @returns {string} Cuantía formateada
   */
  const formatCuantia = (cuantia) => {
    if (typeof cuantia === 'number') {
      return new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(cuantia);
    }
    return cuantia || 'Indeterminada';
  };

  /**
   * El backend ya limpia los datos, solo necesitamos formatearlos para mostrar
   * @param {Array} list - Lista de personas ya limpia del backend
   * @returns {Array} Lista formateada para mostrar
   */
  const formatPersons = (list) => {
    if (!Array.isArray(list)) return [];
    
    return list.map(p => ({
      nombre: p.nombre || 'N/A',
      documento: p.documento || '',
      numero: p.numero || '',
      nacionalidad: p.nacionalidad || '',
      calidad: p.calidad || ''
    }));
  };

  /**
   * Verifica la escritura al cargar el componente
   */
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError('Token de verificación no proporcionado');
      setLoading(false);
    }
  }, [token]);

  /**
   * Función para verificar el token
   */
  const verifyToken = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await verifyEscritura(token);
      
      if (response.success) {
        setEscritura(response.data);
      } else {
        setError(response.message || 'Error en la verificación');
      }
    } catch (err) {
      setError(err.message || 'Error al verificar la escritura');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Comparte la verificación
   */
  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Verificación de Escritura Notarial',
          text: `Escritura ${escritura.numeroEscritura} verificada`,
          url: url
        });
      } catch (err) {
        // Usuario canceló o error
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: copiar URL
      try {
        await navigator.clipboard.writeText(url);
        alert('URL copiada al portapapeles');
      } catch (err) {
        console.error('Error copying URL:', err);
      }
    }
  };

  /**
   * Imprime la verificación
   */
  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f5f5f5',
      py: 4
    }}>
      <Container maxWidth="md">
        {/* Header institucional */}
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            mb: 3, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #20B2AA 0%, #1A5799 100%)',
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.01)'
            }
          }}
          onClick={() => window.open('https://www.notaria18quito.com.ec', '_blank')}
        >
          {/* Logo de la Notaría */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              mb: 2 
            }}
          >
            <Box
              component="img"
              src="/logo-notaria.png"
              alt="Logo Notaría 18"
              sx={{
                height: 80,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
                // Sin filtro para que se vea el logo original
                borderRadius: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onError={(e) => {
                // Si no existe el logo, ocultar el elemento
                e.target.style.display = 'none';
              }}
            />
          </Box>

          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            GLENDA ZAPATA SILVA
          </Typography>
          <Typography variant="h5" gutterBottom>
            NOTARIO DÉCIMO OCTAVO
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Verificación de Escritura Notarial
          </Typography>
          
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.3)' }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Calle Azuay E2-231 entre Av. Amazonas y Av. Azuay, Quito, Ecuador
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Teléfono: (02) 224-7787 / 099-695-1682 | Email: notaria18uio@gmail.com
            </Typography>
          </Box>
          
          {/* Indicador de clickeable */}
          <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
            Click para visitar nuestro sitio web
          </Typography>
        </Paper>

        {/* Contenido principal */}
        <Paper elevation={2} sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Verificando escritura...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Token: {token}
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" color="error" gutterBottom>
                Error de Verificación
              </Typography>
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
              <Button
                variant="outlined"
                onClick={verifyToken}
                sx={{ mt: 2 }}
              >
                Intentar Nuevamente
              </Button>
            </Box>
          ) : escritura ? (
            <Box>
              {/* Resultado exitoso */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
                <Typography variant="h5" color="success.main" gutterBottom>
                  Escritura Verificada
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  La escritura es auténtica y está registrada en nuestro sistema
                </Typography>
              </Box>

              {/* Partes y Observaciones (datos críticos) */}
              {escritura.otorgantes || escritura.objeto_observaciones ? (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Partes y Observaciones</Typography>
                    <Grid container spacing={2}>
                      {escritura.otorgantes && (
                        <>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Otorgado Por</Typography>
                            <Box sx={{ mt: 1 }}>
                              {formatPersons(escritura.otorgantes?.otorgado_por).length > 0 ? (
                                formatPersons(escritura.otorgantes?.otorgado_por).map((p, idx) => (
                                  <Box key={idx} sx={{ mb: 1.2 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{p.nombre}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                      {p.documento && p.numero && (
                                        <Chip size="small" label={`${p.documento}: ${p.numero}`} />
                                      )}
                                      {!p.documento && p.numero && (
                                        <Chip size="small" label={`N° ${p.numero}`} />
                                      )}
                                      {p.nacionalidad && <Chip size="small" label={p.nacionalidad} />}
                                      {p.calidad && <Chip size="small" label={p.calidad} />}
                                    </Box>
                                  </Box>
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No disponible
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>A Favor De</Typography>
                            <Box sx={{ mt: 1 }}>
                              {formatPersons(escritura.otorgantes?.a_favor_de).length > 0 ? (
                                formatPersons(escritura.otorgantes?.a_favor_de).map((p, idx) => (
                                  <Box key={idx} sx={{ mb: 1.2 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{p.nombre}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                      {p.documento && p.numero && (
                                        <Chip size="small" label={`${p.documento}: ${p.numero}`} />
                                      )}
                                      {!p.documento && p.numero && (
                                        <Chip size="small" label={`N° ${p.numero}`} />
                                      )}
                                      {p.nacionalidad && <Chip size="small" label={p.nacionalidad} />}
                                      {p.calidad && <Chip size="small" label={p.calidad} />}
                                    </Box>
                                  </Box>
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No disponible
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                        </>
                      )}
                      {escritura.objeto_observaciones && (
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Objeto / Observaciones</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                            {escritura.objeto_observaciones}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              ) : null}

              {/* Información básica */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Número de Escritura:
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        {escritura.numeroEscritura || 'N/A'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Token de Verificación:
                      </Typography>
                      <Typography variant="h6" fontFamily="monospace" gutterBottom>
                        {escritura.token}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Acto/Contrato:
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {escritura.acto || 'N/A'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Fecha de Otorgamiento:
                      </Typography>
                      <Typography variant="body1">
                        {escritura.fecha_otorgamiento || 'N/A'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Cuantía:
                      </Typography>
                      <Typography variant="body1">
                        {formatCuantia(escritura.cuantia)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Fotografía del menor (si existe) */}
              {escritura.fotoURL && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
                      Fotografía del Menor
                    </Typography>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        component="img"
                        src={escritura.fotoURL}
                        alt="Fotografía del menor"
                        onError={(e) => {
                          // Si la imagen no carga, mostrar placeholder
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                        sx={{
                          maxWidth: { xs: '100%', sm: '80%', md: '400px' },
                          height: 'auto',
                          borderRadius: 2,
                          boxShadow: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                      <Box
                        sx={{
                          display: 'none', // Oculto por defecto, solo se muestra si falla la imagen
                          textAlign: 'center',
                          p: 3,
                          bgcolor: 'action.hover',
                          borderRadius: 2,
                          border: '1px dashed',
                          borderColor: 'divider'
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Imagen no disponible
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Botones de acción */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<ViewIcon />}
                  onClick={() => setShowDetails(true)}
                >
                  Ver Detalles Completos
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                >
                  Imprimir
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={handleShare}
                >
                  Compartir
                </Button>
              </Box>

              {/* Información de verificación */}
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Verificado el:</strong> {new Date(escritura.verificadoEn).toLocaleString()}
                </Typography>
                {escritura.procesadoPor && (
                  <Typography variant="body2">
                    <strong>Procesado por:</strong> {escritura.procesadoPor}
                  </Typography>
                )}
              </Alert>
            </Box>
          ) : null}
        </Paper>

        {/* Footer institucional */}
        <Paper 
          elevation={1}
          sx={{ 
            p: 2, 
            mt: 3, 
            textAlign: 'center',
            bgcolor: '#1A5799',
            color: 'white'
          }}
        >
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Este documento ha sido verificado electrónicamente por el sistema de la Notaría 18
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Para más información, contacte a la notaría en los datos proporcionados arriba
          </Typography>
        </Paper>

        {/* Diálogo de detalles completos */}
        <Dialog
          open={showDetails}
          onClose={() => setShowDetails(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Detalles Completos de la Escritura
          </DialogTitle>
          
          <DialogContent>
            {escritura && (
              <Box>
                {/* Información notarial */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Información Notarial
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell><strong>Notario:</strong></TableCell>
                          <TableCell>{escritura.notario || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Notaría:</strong></TableCell>
                          <TableCell>{escritura.notaria || 'N/A'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Ubicación */}
                {escritura.ubicacion && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Ubicación
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell><strong>Provincia:</strong></TableCell>
                            <TableCell>{escritura.ubicacion.provincia || 'N/A'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Cantón:</strong></TableCell>
                            <TableCell>{escritura.ubicacion.canton || 'N/A'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Parroquia:</strong></TableCell>
                            <TableCell>{escritura.ubicacion.parroquia || 'N/A'}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Información de verificación */}
                <Alert severity="info">
                  <Typography variant="body2">
                    Esta información ha sido extraída y verificada del sistema oficial de la Notaría 18.
                    Para consultas adicionales, contacte directamente a la notaría.
                  </Typography>
                </Alert>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setShowDetails(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default VerificacionPublica;
