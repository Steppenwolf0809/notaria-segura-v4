import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import DocumentTimeline from '../Documents/DocumentTimeline';

/**
 * Componente para mostrar el timeline completo de un documento
 * Refactorizado para usar el componente DocumentTimeline reutilizable
 */
const DocumentStatusTimeline = ({ open, onClose, document }) => {
  if (!document) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Timeline del Documento - {document.protocolNumber}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Timeline completo usando componente reutilizable */}
        <DocumentTimeline 
          documentId={document.id}
          showRefresh={true}
          showLoadMore={true}
          autoRefresh={false}
          options={{
            limit: 50,
            fallbackToSimulated: false // Admin siempre usa datos reales
          }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" startIcon={<CloseIcon />}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentStatusTimeline;