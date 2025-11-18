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
    // Mostrar agrupación para documentos EN_PROCESO y LISTO
    if (isVisible && document && ['EN_PROCESO', 'LISTO'].includes(document.status)) {
      detectGroupableDocuments();
    }
  }, [document, isVisible]);
  
  const detectGroupableDocuments = async () => {
    // Requiere al menos clientName
    if (!document?.clientName) {
      return;
    }

    // Advertencia si no hay clientId (menos preciso)
    // Si no hay clientId, la detección será menos precisa pero aún funcional

    setLoading(true);
    try {
      const response = await documentService.detectGroupableDocuments({
        clientName: document.clientName,
        clientId: document.clientId || ''
      });
      
      // Filtramos el documento actual de la lista de agrupables
      const otherGroupableDocs = response.groupableDocuments.filter(doc => doc.id !== document.id);

      if (response.canGroup && otherGroupableDocs.length > 0) {
        setGroupableDocuments(otherGroupableDocs);
      } else {
        setGroupableDocuments([]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  
  if (!groupableDocuments.length || loading) {
    return null;
  }
  
  return (
    <Button
      fullWidth
      size="small"
      variant="outlined"
      startIcon={<GroupIcon />}
      onClick={() => onGroupDocuments(groupableDocuments)}
      sx={{
        mb: 1,
        py: 0.5,
        borderColor: 'info.main',
        color: 'info.main',
        backgroundColor: 'rgba(33, 150, 243, 0.04)',
        '&:hover': {
          backgroundColor: 'rgba(33, 150, 243, 0.08)',
          borderColor: 'info.dark'
        },
        fontSize: '0.75rem',
        textTransform: 'none',
        borderRadius: 1
      }}
    >
      🔗 Agrupar con {groupableDocuments.length} documento{groupableDocuments.length !== 1 ? 's' : ''} más
    </Button>
  );
};

export default GroupingDetector; 