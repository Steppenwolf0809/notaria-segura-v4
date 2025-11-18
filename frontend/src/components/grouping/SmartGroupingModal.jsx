import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Alert,
  AlertTitle,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import {
  Group as GroupIcon,
  Description as DocumentIcon,
  NotificationImportant as NotificationIcon,
  SmartToy as SmartIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import documentService from '../../services/document-service';

/**
 * 🔗 MODAL DE AGRUPACIÓN INTELIGENTE
 * Se muestra automáticamente después del batch upload cuando se detectan documentos relacionados
 * Permite al usuario decidir si agrupar los documentos o mantenerlos individuales
 */
const SmartGroupingModal = ({ 
  open, 
  onClose, 
  groupingSuggestions = [], // Array de sugerencias de agrupación del backend
  onGroupingComplete,
  onSkipGrouping 
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState({});
  const [notificationPolicy, setNotificationPolicy] = useState('automatica');

  // Inicializar selecciones cuando se abra el modal
  React.useEffect(() => {
    if (open && groupingSuggestions.length > 0) {
      const initialSelections = {};
      groupingSuggestions.forEach((suggestion, index) => {
        if (suggestion.groupingSuggestion?.canGroup) {
          initialSelections[index] = {
            selected: true,
            documentIds: [
              suggestion.documentId,
              ...suggestion.groupableDocuments.map(doc => doc.id)
            ]
          };
        }
      });
      setSelectedSuggestions(initialSelections);
    }
  }, [open, groupingSuggestions]);

  /**
   * Manejar cambio de selección de un grupo
   */
  const handleGroupSelectionChange = (suggestionIndex, checked) => {
    setSelectedSuggestions(prev => ({
      ...prev,
      [suggestionIndex]: {
        ...prev[suggestionIndex],
        selected: checked
      }
    }));
  };

  /**
   * Procesar agrupaciones seleccionadas
   */
  const handleProcessGroupings = async () => {
    setLoading(true);
    
    try {
      const selectedGroups = Object.entries(selectedSuggestions)
        .filter(([_, selection]) => selection.selected)
        .map(([index, selection]) => ({
          documentIds: selection.documentIds,
          suggestion: groupingSuggestions[parseInt(index)]
        }));

      if (selectedGroups.length === 0) {
        handleSkipAll();
        return;
      }


      // Crear grupos uno por uno
      const results = [];
      for (const group of selectedGroups) {
        try {
          const response = await documentService.createSmartGroup({
            documentIds: group.documentIds,
            notificationPolicy
          });
          
          if (response.success) {
            results.push({
              success: true,
              groupId: response.data.groupId,
              documentsCount: group.documentIds.length,
              clientName: group.suggestion.groupingSuggestion.clientName
            });
          } else {
            results.push({
              success: false,
              error: response.message,
              documentsCount: group.documentIds.length
            });
          }
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            documentsCount: group.documentIds.length
          });
        }
      }

      // Mostrar resultado
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (onGroupingComplete) {
        onGroupingComplete({
          successful,
          failed,
          results,
          notificationPolicy
        });
      }

      onClose();

    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  /**
   * Saltar todas las agrupaciones
   */
  const handleSkipAll = () => {
    if (onSkipGrouping) {
      onSkipGrouping();
    }
    onClose();
  };

  /**
   * Contar documentos en grupos seleccionados
   */
  const getSelectedDocumentsCount = () => {
    return Object.values(selectedSuggestions)
      .filter(selection => selection.selected)
      .reduce((total, selection) => total + selection.documentIds.length, 0);
  };

  /**
   * Contar grupos seleccionados
   */
  const getSelectedGroupsCount = () => {
    return Object.values(selectedSuggestions)
      .filter(selection => selection.selected).length;
  };

  if (!open || groupingSuggestions.length === 0) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartIcon color="primary" />
        <Typography variant="h6">
          🔗 Agrupación Inteligente Detectada
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>✨ Sistema Inteligente Activado</AlertTitle>
          Se detectaron <strong>{groupingSuggestions.length}</strong> oportunidades de agrupación 
          que pueden optimizar la experiencia del cliente y reducir notificaciones.
        </Alert>

        {/* Lista de agrupaciones sugeridas */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            📋 Agrupaciones Sugeridas
          </Typography>
          
          {groupingSuggestions.map((suggestion, index) => {
            const grouping = suggestion.groupingSuggestion;
            const relatedDocs = suggestion.groupableDocuments || [];
            
            if (!grouping?.canGroup) return null;

            return (
              <Card key={index} sx={{ mb: 2, border: selectedSuggestions[index]?.selected ? '2px solid #1976d2' : '1px solid #e0e0e0' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedSuggestions[index]?.selected || false}
                            onChange={(e) => handleGroupSelectionChange(index, e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              👥 {grouping.clientName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              📞 {grouping.clientPhone}
                            </Typography>
                          </Box>
                        }
                      />
                      
                      <Box sx={{ mt: 1, ml: 4 }}>
                        <Chip 
                          icon={<GroupIcon />}
                          label={`${grouping.count} documentos para agrupar`}
                          color="primary"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {grouping.suggestion}
                        </Typography>
                      </Box>

                      {/* Documentos incluidos */}
                      <Box sx={{ mt: 2, ml: 4 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          📄 Documentos a agrupar:
                        </Typography>
                        <List dense>
                          {/* Documento principal (recién subido) */}
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon>
                              <DocumentIcon color="primary" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${suggestion.protocolNumber} (NUEVO)`}
                              secondary="Documento recién procesado"
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                          
                          {/* Documentos relacionados encontrados */}
                          {relatedDocs.map((doc, docIndex) => (
                            <ListItem key={docIndex} sx={{ py: 0.5 }}>
                              <ListItemIcon>
                                <DocumentIcon color="action" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={doc.protocolNumber}
                                secondary={`${doc.documentType} - ${doc.status}`}
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Configuración de notificaciones */}
        <Box sx={{ mb: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <NotificationIcon color="primary" />
              📱 Política de Notificaciones
            </FormLabel>
            <RadioGroup
              value={notificationPolicy}
              onChange={(e) => setNotificationPolicy(e.target.value)}
            >
              <FormControlLabel
                value="automatica"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      🔔 Notificar automáticamente
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Envía WhatsApp grupal: "Sus X documentos están listos. Código: XXXX"
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="no_notificar"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      🚫 No notificar
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Solo agrupar documentos, sin enviar notificación
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </Box>

        {/* Resumen de selección */}
        {getSelectedGroupsCount() > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ✅ <strong>Resumen:</strong> Se crearán {getSelectedGroupsCount()} grupos 
              agrupando {getSelectedDocumentsCount()} documentos en total.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleSkipAll}
          disabled={loading}
          color="inherit"
        >
          Mantener Individual
        </Button>
        
        <Button
          onClick={handleProcessGroupings}
          disabled={loading || getSelectedGroupsCount() === 0}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
        >
          {loading 
            ? 'Creando Grupos...' 
            : `Crear ${getSelectedGroupsCount()} Grupos`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SmartGroupingModal;