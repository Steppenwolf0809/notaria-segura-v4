import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import UploadXML from './UploadXML';
import BatchUpload from './BatchUpload';

/**
 * Centro Unificado de Carga de XML
 * Consolida la funcionalidad de subida individual y en lote en pestañas
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

      {/* Card con pestañas */}
      <Card>
        <CardContent>
          {/* Tabs */}
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab
              icon={<UploadIcon />}
              label="Subida Individual"
              iconPosition="start"
              sx={{ fontWeight: 'bold' }}
            />
            <Tab
              icon={<CloudUploadIcon />}
              label="Subida en Lote"
              iconPosition="start"
              sx={{ fontWeight: 'bold' }}
            />
          </Tabs>

          {/* Content */}
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
          • <strong>Subida Individual:</strong> Sube un archivo XML a la vez. Ideal para procesar documentos individuales.
          <br />
          • <strong>Subida en Lote:</strong> Sube hasta 20 archivos XML simultáneamente. Ideal para procesar múltiples documentos de una sola vez.
          <br />
          • Los documentos se crearán automáticamente y se asignarán al matrizador correspondiente cuando sea posible.
        </Typography>
      </Paper>
    </Box>
  );
};

export default XmlUploadCenter;
