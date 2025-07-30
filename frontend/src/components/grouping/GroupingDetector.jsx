import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, Button, Box, Typography } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import documentService from '../../services/document-service';

const GroupingDetector = ({ 
  document, 
  onGroupDocuments, 
  isVisible = true 
}) => {
  const [groupableDocuments, setGroupableDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isVisible && document?.status === 'EN_PROCESO') {
      detectGroupableDocuments();
    }
  }, [document, isVisible]);
  
  const detectGroupableDocuments = async () => {
    // Solo requiere clientName, clientPhone es opcional
    if (!document?.clientName) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await documentService.detectGroupableDocuments({
        clientName: document.clientName,
        clientPhone: document.clientPhone || ''
      });
      
      // Filtramos el documento actual de la lista de agrupables
      const otherGroupableDocs = response.groupableDocuments.filter(doc => doc.id !== document.id);

      if (response.canGroup && otherGroupableDocs.length > 0) {
        setGroupableDocuments(otherGroupableDocs);
        console.log(`✅ GroupingDetector: Encontrados ${otherGroupableDocs.length} documentos agrupables para ${document.clientName}`);
      } else {
        setGroupableDocuments([]);
      }
    } catch (error) {
      console.error('❌ Error detecting groupable documents:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!groupableDocuments.length || loading) {
    return null;
  }
  
  return (
    <Alert 
      severity="info" 
      sx={{ mb: 2, bgcolor: 'info.light', border: '1px solid', borderColor: 'info.main' }}
      icon={<GroupIcon />}
    >
      <AlertTitle>📋 Agrupación disponible</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Se encontraron <strong>{groupableDocuments.length} documentos adicionales</strong> del mismo cliente que pueden procesarse juntos.
      </Typography>
      
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <Button 
          size="small" 
          variant="outlined"
          onClick={() => onGroupDocuments([document, ...groupableDocuments])}
        >
          Ver documentos disponibles
        </Button>
        <Button 
          size="small" 
          variant="contained"
          onClick={() => onGroupDocuments([document, ...groupableDocuments], true)}
        >
          Agrupar y marcar como listos
        </Button>
      </Box>
    </Alert>
  );
};

export default GroupingDetector; 