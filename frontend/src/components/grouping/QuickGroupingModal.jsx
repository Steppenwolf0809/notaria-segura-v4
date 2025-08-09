import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,

} from '@mui/material';
import {
  Group as GroupIcon,
  Description as DocumentIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Link as LinkIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';

/**
 * 🎨 MODAL PROFESIONAL DE AGRUPACIÓN CON CHECKBOXES
 * Modal rediseñado con paleta corporativa y selección granular
 */
const QuickGroupingModal = ({ 
  open, 
  onClose, 
  mainDocument,
  relatedDocuments = [],
  onConfirm,
  loading = false 
}) => {
  const [confirming, setConfirming] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState(
    new Set(relatedDocuments.map(doc => doc.id))
  );


  // Debug del modal
  React.useEffect(() => {
    if (open) {
      console.log('🔗 QuickGroupingModal abierto con datos:', {
        open,
        mainDocument: mainDocument?.protocolNumber,
        relatedDocuments: relatedDocuments.map(d => d.protocolNumber),
        totalDocuments: relatedDocuments.length + 1
      });
      // Reset selección cuando se abre
      setSelectedDocuments(new Set(relatedDocuments.map(doc => doc.id)));
    }
  }, [open, mainDocument, relatedDocuments]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      console.log('🔗 Ejecutando confirmación de agrupación...');
      if (onConfirm) {
        const selectedIds = Array.from(selectedDocuments);
        await onConfirm(selectedIds);
      }
      console.log('✅ Agrupación confirmada exitosamente');
      onClose();
    } catch (error) {
      console.error('❌ Error confirmando agrupación:', error);
    } finally {
      setConfirming(false);
    }
  };

  const handleDocumentToggle = (documentId) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const totalSelected = selectedDocuments.size + 1; // +1 por documento principal

  if (!open || !mainDocument) {
    console.log('🔗 QuickGroupingModal NO mostrado - open:', open, 'mainDocument:', !!mainDocument);
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '12px',
          overflow: 'hidden'
        }
      }}
    >
      {/* Header Profesional */}
      <DialogTitle 
        sx={{ 
          background: 'linear-gradient(135deg, #162840, #17a2b8)',
          color: 'white',
          borderBottom: '3px solid #D4AF37',
          py: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            Confirmar Agrupación de Documentos
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          Seleccione los documentos que desea agrupar
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Información del Cliente */}
        <Card sx={{ 
          mb: 3, 
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid #444'
            : '1px solid #D0D7D9',
          backgroundColor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'white'
        }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <PersonIcon sx={{ 
                color: (theme) => theme.palette.mode === 'dark' ? '#17a2b8' : '#162840' 
              }} />
              <Typography variant="h6" sx={{ 
                color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#162840', 
                fontWeight: 600 
              }}>
                {mainDocument.clientName}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {mainDocument.clientPhone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneIcon sx={{ fontSize: '16px', color: '#17a2b8' }} />
                  <Typography variant="body2">{mainDocument.clientPhone}</Typography>
                </Box>
              )}
              {mainDocument.clientRuc && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BadgeIcon sx={{ fontSize: '16px', color: '#D4AF37' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {mainDocument.clientRuc}
                  </Typography>
                </Box>
              )}
            </Box>
            <Alert severity="warning" sx={{ mt: 2, py: 0.5 }}>
              <Typography variant="caption">
                ⚠️ Verifique que sea la misma persona para agrupar
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        {/* Documento Principal */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ 
            color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#162840', 
            mb: 1, 
            fontSize: '1rem' 
          }}>
            <DocumentIcon sx={{ 
              mr: 1, 
              verticalAlign: 'middle',
              color: (theme) => theme.palette.mode === 'dark' ? '#17a2b8' : '#162840'
            }} />
            Documento Principal
          </Typography>
          
          <Card sx={{ 
            border: '2px solid #28a745', 
            background: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(40, 167, 69, 0.2)'
              : 'rgba(40, 167, 69, 0.05)',
            backgroundColor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'white'
          }}>
            <CardContent sx={{ py: 2 }}>
              <FormControlLabel
                control={<Checkbox checked disabled />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {mainDocument.actoPrincipalDescripcion || mainDocument.documentType}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                      <Chip 
                        label={mainDocument.documentType}
                        size="small"
                        sx={{ height: 22, fontSize: '0.7rem' }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        Protocolo: {mainDocument.protocolNumber}
                      </Typography>
                    </Box>
                    <Chip 
                      label={mainDocument.status} 
                      size="small" 
                      color="primary"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                }
              />
            </CardContent>
          </Card>
        </Box>

        {/* Documentos Relacionados */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ 
            color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#162840', 
            mb: 1, 
            fontSize: '1rem' 
          }}>
            <GroupIcon sx={{ 
              mr: 1, 
              verticalAlign: 'middle',
              color: (theme) => theme.palette.mode === 'dark' ? '#17a2b8' : '#162840'
            }} />
            Documentos Relacionados ({relatedDocuments.length})
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Seleccione los documentos que desea incluir en el grupo
          </Typography>

          {relatedDocuments.map((doc) => (
            <Card 
              key={doc.id}
              sx={{ 
                mb: 1,
                border: selectedDocuments.has(doc.id) 
                  ? '2px solid #28a745' 
                  : (theme) => theme.palette.mode === 'dark'
                    ? '1px solid #444'
                    : '1px solid #D0D7D9',
                background: selectedDocuments.has(doc.id)
                  ? (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(40, 167, 69, 0.2)'
                    : 'rgba(40, 167, 69, 0.05)'
                  : (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'white',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#17a2b8',
                  boxShadow: '0 2px 8px rgba(23, 162, 184, 0.15)'
                }
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedDocuments.has(doc.id)}
                      onChange={() => handleDocumentToggle(doc.id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {doc.actoPrincipalDescripcion || doc.documentType}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                        <Chip 
                          label={doc.documentType}
                          size="small"
                          sx={{ height: 22, fontSize: '0.7rem' }}
                        />
                        <Typography variant="body2" color="textSecondary">
                          Protocolo: {doc.protocolNumber}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={doc.status} 
                          size="small" 
                          color="info"
                        />
                        <Typography variant="caption" color="textSecondary">
                          {new Date(doc.createdAt).toLocaleDateString('es-EC')}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Resumen de Selección */}
        <Alert 
          severity="info" 
          icon={<InfoIcon />}
          sx={{ mb: 3 }}
        >
          <AlertTitle>Documentos Seleccionados: {totalSelected}</AlertTitle>
          <List sx={{ py: 0 }}>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText 
                primary={`• ${mainDocument.actoPrincipalDescripcion || mainDocument.documentType} (principal)`}
                secondary={`Protocolo: ${mainDocument.protocolNumber}`}
                sx={{ my: 0 }}
              />
            </ListItem>
            {relatedDocuments
              .filter(doc => selectedDocuments.has(doc.id))
              .map(doc => (
                <ListItem key={doc.id} sx={{ py: 0.25, px: 0 }}>
                  <ListItemText 
                    primary={`• ${doc.actoPrincipalDescripcion || doc.documentType}`}
                    secondary={`Protocolo: ${doc.protocolNumber}`}
                    sx={{ my: 0 }}
                  />
                </ListItem>
              ))
            }
          </List>
        </Alert>



        {/* Información del Proceso */}
        <Alert severity="success" sx={{ 
          background: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(40, 167, 69, 0.2)'
            : 'rgba(40, 167, 69, 0.05)'
        }}>
          <AlertTitle>Al confirmar se realizará:</AlertTitle>
          <List sx={{ py: 0 }}>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• Se generará un código único para todos los documentos" />
            </ListItem>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• Se enviará una notificación WhatsApp grupal al cliente" />
            </ListItem>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• Los documentos se marcarán como LISTOS" />
            </ListItem>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• El cliente podrá retirar todos con un solo código" />
            </ListItem>
          </List>
        </Alert>
      </DialogContent>

      {/* Footer Profesional */}
      <DialogActions sx={{ 
        p: 2, 
        background: (theme) => theme.palette.mode === 'dark'
          ? '#2d2d2d'
          : '#f8f9fa',
        borderTop: (theme) => theme.palette.mode === 'dark'
          ? '1px solid #444'
          : '1px solid #dee2e6'
      }}>
        <Button 
          onClick={onClose}
          sx={{ 
            background: (theme) => theme.palette.mode === 'dark'
              ? '#444'
              : '#D0D7D9',
            color: (theme) => theme.palette.mode === 'dark'
              ? '#fff'
              : '#162840',
            border: (theme) => theme.palette.mode === 'dark'
              ? '1px solid #666'
              : '1px solid #162840',
            '&:hover': {
              background: (theme) => theme.palette.mode === 'dark'
                ? '#555'
                : '#c6ced1'
            }
          }}
        >
          <CloseIcon sx={{ mr: 1 }} />
          Cancelar
        </Button>
        
        <Button
          onClick={handleConfirm}
          disabled={confirming || loading || selectedDocuments.size === 0}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #28a745, #20c997)',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #218838, #1e947b)'
            }
          }}
        >
          {confirming ? (
            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
          ) : (
            <CheckIcon sx={{ mr: 1 }} />
          )}
          Confirmar Agrupación ({totalSelected})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickGroupingModal;