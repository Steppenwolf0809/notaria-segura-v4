import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import UploadXML from './UploadXML';
import BatchUpload from './BatchUpload';

/**
 * Centro Unificado de Carga de XML
 * Consolida la funcionalidad de subida individual y en lote con UI mejorada
 */
const XmlUploadCenter = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Subir Archivos XML
        </Typography>
      </Box>

      {/* Selector de modo visual (tarjetas) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card
            elevation={currentTab === 0 ? 8 : 2}
            sx={{
              border: currentTab === 0 ? '3px solid' : '1px solid',
              borderColor: currentTab === 0 ? 'primary.main' : 'divider',
              transition: 'all 0.3s ease'
            }}
          >
            <CardActionArea onClick={() => setCurrentTab(0)}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: currentTab === 0 ? 'primary.main' : 'action.hover',
                      color: currentTab === 0 ? 'white' : 'text.primary',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <UploadIcon sx={{ fontSize: 40 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Subida Individual
                      </Typography>
                      {currentTab === 0 && (
                        <Chip label="ACTIVO" color="primary" size="small" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Sube un archivo XML a la vez
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Ideal para documentos únicos
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            elevation={currentTab === 1 ? 8 : 2}
            sx={{
              border: currentTab === 1 ? '3px solid' : '1px solid',
              borderColor: currentTab === 1 ? 'primary.main' : 'divider',
              transition: 'all 0.3s ease'
            }}
          >
            <CardActionArea onClick={() => setCurrentTab(1)}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: currentTab === 1 ? 'primary.main' : 'action.hover',
                      color: currentTab === 1 ? 'white' : 'text.primary',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 40 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Subida en Lote
                      </Typography>
                      {currentTab === 1 && (
                        <Chip label="ACTIVO" color="primary" size="small" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Sube hasta 20 archivos XML simultáneamente
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Ideal para múltiples documentos
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      {/* Contenido según pestaña activa */}
      <Card>
        <CardContent>
          {currentTab === 0 && (
            <Box>
              <UploadXML />
            </Box>
          )}

          {currentTab === 1 && (
            <Box>
              <BatchUpload />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.main' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>ℹ️ Información:</strong>
          <br />
          • Los documentos se crean automáticamente al subir el XML
          <br />
          • Se asignarán automáticamente al matrizador correspondiente cuando sea posible
          <br />
          • Puedes ver los documentos creados en la sección "Documentos"
        </Typography>
      </Paper>
    </Box>
  );
};

export default XmlUploadCenter;
