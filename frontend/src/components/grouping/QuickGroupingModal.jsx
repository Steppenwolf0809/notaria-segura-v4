import React, { useState } from 'react';
import EditDocumentModal from '../shared/EditDocumentModal';
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
  Badge as BadgeIcon,
  Edit as EditIcon,
  Notifications as NotificationsIcon
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
  onDocumentUpdated, // Nuevo prop para notificar actualizaciones
  loading = false 
}) => {
  const [confirming, setConfirming] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState(
    new Set(relatedDocuments.map(doc => doc.id))
  );
  
  // Estados para modal de edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState(null);
  const [documentUpdates, setDocumentUpdates] = useState(new Map());
  const [updatedMainDocument, setUpdatedMainDocument] = useState(null);


  // Debug del modal
  const loggedRef = React.useRef(false);
  React.useEffect(() => {
    if (open) {
      if (!loggedRef.current) {
        console.log('🔗 QuickGroupingModal abierto con datos:', {
          open,
          mainDocument: mainDocument?.protocolNumber,
          relatedDocuments: relatedDocuments.map(d => d.protocolNumber),
          totalDocuments: (relatedDocuments?.length || 0) + (mainDocument ? 1 : 0)
        });
        loggedRef.current = true;
      }
      // Reset selección y documento actualizado cuando se abre
      setSelectedDocuments(new Set((relatedDocuments || []).map(doc => doc.id)));
      setUpdatedMainDocument(null);
      setDocumentUpdates(new Map());
    } else {
      loggedRef.current = false;
    }
  }, [open, mainDocument, relatedDocuments]);

  const handleConfirm = async (markAsReady = false) => {
    setConfirming(true);
    try {
      console.log('🔗 Ejecutando confirmación de agrupación...', { markAsReady });
      if (onConfirm) {
        const selectedIds = Array.from(selectedDocuments);
        await onConfirm(selectedIds, markAsReady);
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

  // Funciones para edición de documentos
  const handleEditDocument = (document) => {
    console.log('📝 Abriendo edición para documento:', document.id);
    setDocumentToEdit(document);
    setEditModalOpen(true);
  };

  const handleDocumentUpdated = (updatedDocument) => {
    console.log('📝 Documento actualizado:', updatedDocument.id);
    
    // Guardar los cambios en un mapa para referencia local
    const updates = new Map(documentUpdates);
    updates.set(updatedDocument.id, updatedDocument);
    setDocumentUpdates(updates);
    
    // Si es el documento principal, actualizar estado local para reflejar cambios inmediatamente
    if (updatedDocument.id === mainDocument?.id) {
      setUpdatedMainDocument(updatedDocument);
      console.log('📝 Documento principal actualizado localmente');
    }
    // También actualizar la lista de relatedDocuments si coincide
    try {
      const index = relatedDocuments.findIndex(d => d.id === updatedDocument.id);
      if (index !== -1) {
        relatedDocuments[index] = { ...relatedDocuments[index], ...updatedDocument };
      }
    } catch {}
    
    // 🎯 CORRECCIÓN: Notificar al componente padre para que actualice los datos
    if (onDocumentUpdated) {
      onDocumentUpdated(updatedDocument);
      console.log('📤 Notificando actualización al componente padre');
    }
    
    setEditModalOpen(false);
    setDocumentToEdit(null);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setDocumentToEdit(null);
  };

  // ✅ El total siempre es 1 (principal) + relacionados seleccionados
  const totalSelected = 1 + selectedDocuments.size;

  // Usar documento principal actualizado si existe, sino el original
  const currentMainDocument = updatedMainDocument || mainDocument || {};

  if (!open) return null;

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
          background: (theme) => theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #162840, #17a2b8)'
            : 'linear-gradient(135deg, #1976d2, #42a5f5)',
          color: 'primary.contrastText',
          borderBottom: (theme) => `3px solid ${theme.palette.warning.main}`,
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
                color: 'primary.main' 
              }} />
              <Typography variant="h6" sx={{ 
                color: 'text.primary', 
                fontWeight: 600 
              }}>
                {currentMainDocument.clientName}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {currentMainDocument.clientPhone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneIcon sx={{ fontSize: '16px', color: 'primary.main' }} />
                  <Typography variant="body2">{currentMainDocument.clientPhone}</Typography>
                </Box>
              )}
              {currentMainDocument.clientRuc && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BadgeIcon sx={{ fontSize: '16px', color: 'warning.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {currentMainDocument.clientRuc}
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
            color: 'text.primary', 
            mb: 1, 
            fontSize: '1rem' 
          }}>
            <DocumentIcon sx={{ 
              mr: 1, 
              verticalAlign: 'middle',
              color: 'primary.main'
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
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <FormControlLabel
                  sx={{ flex: 1 }}
                  control={<Checkbox checked disabled />}
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {currentMainDocument.actoPrincipalDescripcion || currentMainDocument.documentType}
                        {documentUpdates.has(currentMainDocument.id) && (
                          <Chip 
                            label="Editado" 
                            size="small" 
                            color="success" 
                            sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                          />
                        )}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                        <Chip 
                          label={currentMainDocument.documentType}
                          size="small"
                          sx={{ height: 22, fontSize: '0.7rem' }}
                        />
                        <Typography variant="body2" color="textSecondary">
                          Protocolo: {currentMainDocument.protocolNumber}
                        </Typography>
                      </Box>
                      <Chip 
                        label={currentMainDocument.status} 
                        size="small" 
                        color="primary"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  }
                />
                
                {/* 🎯 NUEVO: Botón de Edición para documento principal */}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditDocument(currentMainDocument)}
                  sx={{ 
                    minWidth: 'auto',
                    height: 32,
                    px: 1.5,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      backgroundColor: 'primary.light'
                    }
                  }}
                >
                  Editar
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Documentos Relacionados */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ 
            color: 'text.primary', 
            mb: 1, 
            fontSize: '1rem' 
          }}>
            <GroupIcon sx={{ 
              mr: 1, 
              verticalAlign: 'middle',
              color: 'primary.main'
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
                  borderColor: 'primary.main',
                  boxShadow: (theme) => `0 2px 8px ${theme.palette.primary.main}26`
                }
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <FormControlLabel
                    sx={{ flex: 1 }}
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
                          {documentUpdates.has(doc.id) && (
                            <Chip 
                              label="Editado" 
                              size="small" 
                              color="success" 
                              sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                            />
                          )}
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
                  
                  {/* Botón de Edición */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditDocument(doc)}
                    sx={{ 
                      minWidth: 'auto',
                      height: 32,
                      px: 1.5,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        borderColor: 'primary.dark',
                        backgroundColor: 'primary.light'
                      }
                    }}
                  >
                    Editar
                  </Button>
                </Box>
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
                primary={`• ${currentMainDocument.actoPrincipalDescripcion || currentMainDocument.documentType} (principal)`}
                secondary={`Protocolo: ${currentMainDocument.protocolNumber}`}
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



        {/* Información del Proceso - ACTUALIZADA */}
        <Alert severity="info" sx={{ 
          background: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(23, 162, 184, 0.2)'
            : 'rgba(23, 162, 184, 0.05)'
        }}>
          <AlertTitle>Opciones de Agrupación:</AlertTitle>
          <List sx={{ py: 0 }}>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• Agrupar Documentos: Los documentos se agrupan en estado AGRUPADO" />
            </ListItem>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• Agrupar y Marcar Listo: Agrupa + marca como LISTO + envía WhatsApp" />
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
        
        {/* NUEVA FUNCIONALIDAD: Botones separados para agrupar vs agrupar y marcar listo */}
        <Button
          onClick={() => handleConfirm(false)}
          disabled={confirming || loading || selectedDocuments.size === 0}
          variant="outlined"
          sx={{
            borderColor: 'primary.main',
            color: 'primary.main',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: (theme) => `${theme.palette.primary.main}1A`
            }
          }}
        >
          {confirming ? (
            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
          ) : (
            <GroupIcon sx={{ mr: 1 }} />
          )}
          Agrupar Documentos ({totalSelected})
        </Button>
        
        <Button
          onClick={() => handleConfirm(true)}
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
            <NotificationsIcon sx={{ mr: 1 }} />
          )}
          Agrupar y Marcar Listo ({totalSelected})
        </Button>
      </DialogActions>
      
      {/* Modal de Edición de Documento */}
      <EditDocumentModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        document={documentToEdit}
        onDocumentUpdated={handleDocumentUpdated}
      />
    </Dialog>
  );
};

export default QuickGroupingModal;
