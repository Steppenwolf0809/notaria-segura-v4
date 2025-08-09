import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Table, TableHead, TableBody, TableRow, TableCell,
  Checkbox, Chip, Alert, Typography, Box, Paper
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import { toast } from 'react-toastify';

const DocumentGroupingModal = ({
  open,
  onClose,
  groupableDocuments = [],
  onCreateGroup
}) => {
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Inicializar con todos los documentos seleccionados
  useEffect(() => {
    if (open && groupableDocuments.length > 0) {
      setSelectedDocuments(groupableDocuments.map(doc => doc.id));
      setVerifiedPhone(groupableDocuments[0]?.clientPhone || '');
    }
  }, [open, groupableDocuments]);
  
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedDocuments(groupableDocuments.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };
  
  const handleToggleDocument = (documentId) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };
  
  const handleCreateGroup = async () => {
    if (selectedDocuments.length < 2) {
      toast.error('Debe seleccionar al menos 2 documentos para agrupar');
      return;
    }
    
    if (!verifiedPhone.trim()) {
      toast.error('Debe verificar el teléfono del cliente');
      return;
    }
    
    setLoading(true);
    try {
      await onCreateGroup({
        documentIds: selectedDocuments,
        verifiedPhone: verifiedPhone.trim(),
        sendNotification
      });
      
      toast.success(`Grupo creado con ${selectedDocuments.length} documentos`);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Error al crear grupo');
    } finally {
      setLoading(false);
    }
  };
  
  const clientName = groupableDocuments[0]?.clientName || '';
  const allSelected = selectedDocuments.length === groupableDocuments.length && groupableDocuments.length > 0;
  const someSelected = selectedDocuments.length > 0 && !allSelected;
  const selectedDocs = groupableDocuments.filter(doc => selectedDocuments.includes(doc.id));
  
  // Generar preview del mensaje
  const messagePreview = `🏛️ NOTARÍA DÉCIMA OCTAVA\n\nEstimado/a ${clientName},\n\nSus documentos están listos para retiro:\n\n📋 DOCUMENTOS DISPONIBLES:\n${selectedDocs.map(doc => `• ${doc.documentType} ${doc.protocolNumber}`).join('\n')}\n\n[Se generará UN CÓDIGO para todos los documentos]\n\n📍 Dirección: Azuay E2-231\n⏰ Horario: Lunes a Viernes 8:00-17:00`;
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: (theme) => ({
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'background.paper',
          color: 'text.primary'
        })
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon />
          <Typography variant="h6">
            Agrupar documentos para procesamiento
          </Typography>
        </Box>
        <Typography variant="subtitle2" color="text.secondary">
          Cliente: {clientName}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {/* Alerta informativa */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>¿Cómo funciona la agrupación?</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Todos los documentos seleccionados se marcarán como LISTOS</li>
            <li>Se generará UN SOLO código de verificación para todos</li>
            <li>El cliente recibirá una notificación con todos los documentos</li>
            <li>Al entregar con el código, se entregarán TODOS los documentos</li>
          </ul>
        </Alert>
        
        {/* Verificación de teléfono */}
        <Box sx={{ mb: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ Verificar que el teléfono sea correcto antes de crear el grupo
          </Alert>
          
          <TextField
            fullWidth
            label="Teléfono del cliente (WhatsApp)"
            value={verifiedPhone}
            onChange={(e) => setVerifiedPhone(e.target.value)}
            helperText="Verificar que sea número de WhatsApp válido"
            error={!verifiedPhone.trim()}
            InputLabelProps={{ sx: { color: 'text.primary' } }}
            FormHelperTextProps={{ sx: { color: 'text.secondary' } }}
            sx={{
              '& .MuiInputBase-root': {
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'background.paper',
                color: 'text.primary'
              }
            }}
          />
        </Box>
        
        {/* Tabla de documentos */}
        <Typography variant="h6" sx={{ mb: 1 }}>
          Documentos a agrupar ({selectedDocuments.length} seleccionados):
        </Typography>
        
        <Table size="small" sx={{
          '& thead th': {
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            color: 'text.primary'
          }
        }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Acto Principal</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupableDocuments.map(doc => (
              <TableRow 
                key={doc.id}
                selected={selectedDocuments.includes(doc.id)}
              >
                <TableCell padding="checkbox">
                  <Checkbox 
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={() => handleToggleDocument(doc.id)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {doc.protocolNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={doc.documentType} 
                    size="small" 
                    variant="outlined"
                    sx={{ bgcolor: 'action.hover', color: 'text.primary', borderColor: 'divider' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {doc.actoPrincipalDescripcion}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={doc.status}
                    size="small"
                    color={doc.status === 'EN_PROCESO' ? 'warning' : 'default'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Preview del mensaje */}
        {selectedDocuments.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Vista previa de la notificación:
            </Typography>
            <Paper sx={{ 
              p: 2, 
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50', 
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
              maxHeight: 200, 
              overflow: 'auto' 
            }}>
              <Typography 
                variant="body2" 
                sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}
              >
                {messagePreview}
              </Typography>
            </Paper>
          </Box>
        )}
        
        {/* Opción de notificación */}
        <Box sx={{ mt: 2 }}>
          <Checkbox
            checked={sendNotification}
            onChange={(e) => setSendNotification(e.target.checked)}
          />
          <Typography variant="body2" component="span">
            Enviar notificación WhatsApp inmediatamente
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleCreateGroup}
          variant="contained"
          disabled={loading || selectedDocuments.length < 2 || !verifiedPhone.trim()}
        >
          {loading ? 'Creando grupo...' : `Crear grupo con ${selectedDocuments.length} documentos`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentGroupingModal; 