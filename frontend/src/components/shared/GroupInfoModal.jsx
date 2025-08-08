import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import useDocumentStore from '../../store/document-store';

/**
 * Modal para mostrar información detallada de un grupo de documentos
 * Se activa al hacer click en "Parte de un grupo"
 */
const GroupInfoModal = ({ open, onClose, document }) => {
  const [groupDocuments, setGroupDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const { documents } = useDocumentStore();

  // Cargar documentos del grupo cuando se abre el modal
  useEffect(() => {
    if (open && document?.documentGroupId) {
      setLoading(true);
      try {
        // Filtrar documentos del mismo grupo
        const groupDocs = documents.filter(doc => 
          doc.documentGroupId === document.documentGroupId && doc.isGrouped
        );
        setGroupDocuments(groupDocs);
      } catch (error) {
        console.error('Error cargando documentos del grupo:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [open, document, documents]);

  // Obtener información del grupo
  const getGroupInfo = () => {
    if (groupDocuments.length === 0 || !document?.documentGroupId) return null;

    const firstDoc = groupDocuments[0];
    const statusCounts = groupDocuments.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {});

    return {
      groupId: document.documentGroupId,
      clientName: firstDoc?.clientName || 'Cliente desconocido',
      clientPhone: firstDoc?.clientPhone || 'Sin teléfono',
      totalDocuments: groupDocuments.length,
      statusCounts,
      verificationCode: firstDoc?.verificationCode || 'Sin código',
      createdAt: Math.min(...groupDocuments.map(doc => new Date(doc.createdAt || Date.now()).getTime())),
      lastUpdatedAt: Math.max(...groupDocuments.map(doc => new Date(doc.updatedAt || doc.createdAt || Date.now()).getTime()))
    };
  };

  const groupInfo = getGroupInfo();

  const getStatusColor = (status) => {
    const colors = {
      'PENDIENTE': 'default',
      'EN_PROCESO': 'warning',
      'LISTO': 'info',
      'ENTREGADO': 'success'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      'PENDIENTE': 'Pendiente',
      'EN_PROCESO': 'En Proceso',
      'LISTO': 'Listo',
      'ENTREGADO': 'Entregado'
    };
    return texts[status] || status;
  };

  if (!document || !document.isGrouped) {
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
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon />
          <Typography variant="h6" component="div">
            Información del Grupo
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: 'inherit' }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : groupInfo ? (
          <>
            {/* Información general del grupo */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                <GroupIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                Resumen del Grupo
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Cliente:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 16 }} />
                    {groupInfo.clientName || 'Sin nombre'}
                  </Typography>
                </Box>

                {groupInfo.clientPhone && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Teléfono:</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 16 }} />
                      {groupInfo.clientPhone}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Total documentos:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {groupInfo.totalDocuments} documentos
                  </Typography>
                </Box>

                {groupInfo.verificationCode && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Código de verificación:</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {groupInfo.verificationCode}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Creado:</strong>
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(groupInfo.createdAt), 'PPp', { locale: es })}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Última actualización:</strong>
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(groupInfo.lastUpdatedAt), 'PPp', { locale: es })}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Estados del grupo */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Estado de los documentos
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(groupInfo.statusCounts).map(([status, count]) => (
                  <Chip
                    key={status}
                    label={`${getStatusText(status)}: ${count}`}
                    color={getStatusColor(status)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            {/* Lista de documentos */}
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Documentos del grupo
              </Typography>
              <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                {groupDocuments.map((doc, index) => (
                  <React.Fragment key={doc.id}>
                    <ListItem>
                      <ListItemIcon>
                        <AssignmentIcon color={getStatusColor(doc.status)} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {doc.protocolNumber || `Documento ${doc.id}`}
                            </Typography>
                            <Chip
                              label={getStatusText(doc.status)}
                              color={getStatusColor(doc.status)}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            {doc.documentType || 'Tipo no especificado'}
                            <br />
                            Creado: {format(new Date(doc.createdAt), 'PPp', { locale: es })}
                          </>
                        }
                      />
                    </ListItem>
                    {index < groupDocuments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>

            {/* Información de entrega */}
            {groupInfo.verificationCode && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <WhatsAppIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Este grupo tiene código de verificación <strong>{groupInfo.verificationCode}</strong> para entrega.
                  Todos los documentos del grupo se entregan juntos con el mismo código.
                </Typography>
              </Alert>
            )}
          </>
        ) : (
          <Alert severity="warning">
            No se pudo cargar la información del grupo.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          color="primary"
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GroupInfoModal;