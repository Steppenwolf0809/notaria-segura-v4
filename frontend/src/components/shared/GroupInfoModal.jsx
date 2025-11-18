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
import useAuthStore from '../../store/auth-store';
import documentService from '../../services/document-service';

/**
 * Modal para mostrar información detallada de un grupo de documentos
 * Se activa al hacer click en "Parte de un grupo"
 */
const GroupInfoModal = ({ open, onClose, document, onUngrouped }) => {
  // 🚫 DESHABILITADO: Modal de información de grupo desactivado
  return null;

  const [groupDocuments, setGroupDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ungroupLoading, setUngroupLoading] = useState(false);
  const { documents, ungroupDocument, fetchMyDocuments, fetchAllDocuments } = useDocumentStore();
  const { user } = useAuthStore();

  // Cargar documentos del grupo cuando se abre el modal
  useEffect(() => {
    const loadGroup = async () => {
      if (open && document) {
        if (!document.documentGroupId) {
          setGroupDocuments([]);
          return;
        }

        setLoading(true);
        try {
          // 1) Intentar desde el store (rápido)
          const fromStore = documents.filter(doc =>
            doc.documentGroupId === document.documentGroupId && doc.isGrouped
          );
          if (fromStore.length > 0) {
            setGroupDocuments(fromStore);
            return;
          }
          // 2) Fallback desde el backend (Recepción/Archivo no siempre tienen el store cargado)
          const resp = await documentService.getGroupDocuments(document.documentGroupId);
          if (resp.success) {
            setGroupDocuments(resp.data || []);
          } else {
            setGroupDocuments([]);
          }
        } catch (error) {
          setGroupDocuments([]);
        } finally {
          setLoading(false);
        }
      }
    };
    loadGroup();
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
      // Preferir el código a nivel de grupo si está disponible
      verificationCode: firstDoc?.documentGroup?.verificationCode || firstDoc?.groupVerificationCode || 'Sin código',
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

  // Permitir abrir el modal si tiene documentGroupId O si isGrouped es true
  if (!document || (!document.isGrouped && !document.documentGroupId)) {
    return null;
  }

  const canUngroup = ['MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'ADMIN'].includes(user?.role);

  const handleUngroup = async () => {
    if (!document?.id) return;
    setUngroupLoading(true);
    try {
      const result = await ungroupDocument(document.id);
      if (result.success) {
        // 🔄 Refrescar ANTES de cerrar para asegurar que el cambio se vea
        if (['MATRIZADOR', 'ARCHIVO'].includes(user?.role)) {
          await fetchMyDocuments();
        } else {
          await fetchAllDocuments();
        }

        // Callback opcional para componente padre
        try { onUngrouped?.(result); } catch {}

        // Cerrar modal DESPUÉS del refresh
        onClose?.();
      } else {
        alert(result.error || 'No se pudo desagrupar el documento');
      }
    } catch (e) {
      alert('Error inesperado al desagrupar');
    } finally {
      setUngroupLoading(false);
    }
  };

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
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              No se pudo cargar la información del grupo
            </Typography>
            <Typography variant="body2">
              {!document?.documentGroupId ? (
                <>El documento no tiene ID de grupo asociado. Esto puede suceder si el documento fue creado antes de implementar la agrupación o si no está correctamente marcado como parte de un grupo.</>
              ) : (
                <>No se encontraron documentos en este grupo. El grupo puede haber sido eliminado o los documentos pueden haber sido desagrupados.</>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Detalles técnicos: ID de grupo: {document?.documentGroupId || 'N/A'} | isGrouped: {document?.isGrouped ? 'Sí' : 'No'}
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1, justifyContent: 'space-between' }}>
        {canUngroup && (
          <Tooltip title="Separar este documento del grupo (permite entrega parcial)">
            <span>
              <Button 
                onClick={handleUngroup}
                variant="outlined"
                color="warning"
                disabled={ungroupLoading}
              >
                {ungroupLoading ? 'Desagrupando...' : 'Desagrupar este documento'}
              </Button>
            </span>
          </Tooltip>
        )}
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