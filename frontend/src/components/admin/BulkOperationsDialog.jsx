import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
  TextField,
  Chip,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  SwapHoriz as ReassignIcon,
  Edit as StatusIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Assignment as DocumentIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/auth-store';

/**
 * Modal para operaciones masivas en documentos
 * Permite reasignar, cambiar estado, etc. en múltiples documentos
 */
const BulkOperationsDialog = ({ open, onClose, selectedDocuments, onOperationComplete }) => {
  const { token } = useAuthStore();
  
  const [operation, setOperation] = useState('');
  const [loading, setLoading] = useState(false);
  const [newMatrizador, setNewMatrizador] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [matrizadores, setMatrizadores] = useState([]);
  const [confirmation, setConfirmation] = useState('');
  const [results, setResults] = useState(null);
  const [documentsInfo, setDocumentsInfo] = useState([]);

  /**
   * Cargar información de documentos seleccionados
   */
  const loadDocumentsInfo = async () => {
    if (!selectedDocuments || selectedDocuments.length === 0) return;

    try {
      const response = await fetch('http://localhost:3001/api/admin/documents/bulk-info', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentIds: selectedDocuments })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDocumentsInfo(data.data.documents);
        }
      }
    } catch (error) {
      console.error('Error cargando información de documentos:', error);
    }
  };

  /**
   * Cargar matrizadores para reasignación
   */
  const loadMatrizadores = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/users?role=MATRIZADOR&status=active&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMatrizadores(data.data.users);
        }
      }
    } catch (error) {
      console.error('Error cargando matrizadores:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadDocumentsInfo();
      loadMatrizadores();
    }
  }, [open, selectedDocuments, token]);

  /**
   * Manejar cierre del modal
   */
  const handleClose = () => {
    setOperation('');
    setNewMatrizador('');
    setNewStatus('');
    setConfirmation('');
    setResults(null);
    onClose();
  };

  /**
   * Ejecutar operación masiva
   */
  const executeOperation = async () => {
    if (!operation) return;

    // Validar confirmación
    const requiredConfirmation = `${operation.toUpperCase()}-${selectedDocuments.length}`;
    if (confirmation !== requiredConfirmation) {
      toast.error(`Confirmación incorrecta. Escriba: ${requiredConfirmation}`);
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        documentIds: selectedDocuments,
        operation,
        ...(operation === 'reassign' && { newMatrizadorId: newMatrizador }),
        ...(operation === 'changeStatus' && { newStatus })
      };

      const response = await fetch('http://localhost:3001/api/admin/documents/bulk-operation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data.results);
        toast.success(`Operación completada: ${data.data.successCount} documentos procesados`);
        
        if (data.data.errorCount > 0) {
          toast.warning(`${data.data.errorCount} documentos tuvieron errores`);
        }
        
        // Llamar callback después de un breve delay para mostrar resultados
        setTimeout(() => {
          onOperationComplete();
          handleClose();
        }, 3000);
      } else {
        throw new Error(data.message || 'Error en la operación');
      }
    } catch (error) {
      console.error('Error en operación masiva:', error);
      toast.error(error.message || 'Error al ejecutar la operación');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renderizar resultados de la operación
   */
  const renderResults = () => {
    if (!results) return null;

    return (
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          Resultados de la Operación
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip
            icon={<SuccessIcon />}
            label={`${results.successCount} Exitosos`}
            color="success"
            size="small"
          />
          <Chip
            icon={<ErrorIcon />}
            label={`${results.errorCount} Errores`}
            color="error"
            size="small"
          />
        </Box>

        {results.errors && results.errors.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="error" gutterBottom>
              Documentos con errores:
            </Typography>
            <List dense>
              {results.errors.map((error, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon>
                    <ErrorIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={error.documentId}
                    secondary={error.message}
                    primaryTypographyProps={{ variant: 'caption' }}
                    secondaryTypographyProps={{ variant: 'caption', color: 'error' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>
    );
  };

  /**
   * Renderizar formulario según operación
   */
  const renderOperationForm = () => {
    switch (operation) {
      case 'reassign':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Nuevo Matrizador</InputLabel>
            <Select
              value={newMatrizador}
              onChange={(e) => setNewMatrizador(e.target.value)}
              label="Nuevo Matrizador"
              required
            >
              <MenuItem value="">
                <em>Sin asignar</em>
              </MenuItem>
              {matrizadores.map((matrizador) => (
                <MenuItem key={matrizador.id} value={matrizador.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                    {matrizador.firstName} {matrizador.lastName}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'changeStatus':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Nuevo Estado</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Nuevo Estado"
              required
            >
              <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
              <MenuItem value="LISTO">Listo</MenuItem>
              <MenuItem value="ENTREGADO">Entregado</MenuItem>
            </Select>
          </FormControl>
        );

      default:
        return null;
    }
  };

  const operationNames = {
    reassign: 'Reasignar Matrizador',
    changeStatus: 'Cambiar Estado'
  };

  const selectedMatrizador = matrizadores.find(m => m.id.toString() === newMatrizador);
  const requiredConfirmation = operation ? `${operation.toUpperCase()}-${selectedDocuments.length}` : '';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Operaciones en Lote
          </Typography>
          <Button
            onClick={handleClose}
            color="inherit"
            startIcon={<CloseIcon />}
          >
            Cerrar
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {/* Información de documentos seleccionados */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{selectedDocuments.length} documento(s) seleccionado(s)</strong>
          </Typography>
          {documentsInfo.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Tipos: {[...new Set(documentsInfo.map(doc => doc.documentType))].join(', ')}
              </Typography>
            </Box>
          )}
        </Alert>

        {/* Lista de documentos */}
        {documentsInfo.length > 0 && (
          <Paper variant="outlined" sx={{ mb: 3, maxHeight: 200, overflow: 'auto' }}>
            <List dense>
              {documentsInfo.map((doc) => (
                <ListItem key={doc.id}>
                  <ListItemIcon>
                    <DocumentIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={doc.protocolNumber}
                    secondary={`${doc.clientName} - ${doc.status}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Chip
                    label={doc.documentType}
                    size="small"
                    variant="outlined"
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* Selector de operación */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Seleccionar Operación</InputLabel>
          <Select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            label="Seleccionar Operación"
          >
            <MenuItem value="reassign">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ReassignIcon sx={{ mr: 1 }} />
                Reasignar Matrizador
              </Box>
            </MenuItem>
            <MenuItem value="changeStatus">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StatusIcon sx={{ mr: 1 }} />
                Cambiar Estado
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Formulario específico de la operación */}
        {renderOperationForm()}

        {/* Confirmación */}
        {operation && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Esta acción afectará {selectedDocuments.length} documento(s)</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Operación: {operationNames[operation]}
                {operation === 'reassign' && selectedMatrizador && (
                  <>
                    <br />
                    Nuevo matrizador: {selectedMatrizador.firstName} {selectedMatrizador.lastName}
                  </>
                )}
                {operation === 'changeStatus' && newStatus && (
                  <>
                    <br />
                    Nuevo estado: {newStatus}
                  </>
                )}
              </Typography>
            </Alert>

            <TextField
              fullWidth
              label="Confirmación"
              placeholder={`Escriba: ${requiredConfirmation}`}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              helperText={`Para confirmar, escriba exactamente: ${requiredConfirmation}`}
              error={confirmation && confirmation !== requiredConfirmation}
              sx={{ mb: 2 }}
            />
          </Box>
        )}

        {/* Resultados */}
        {renderResults()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          color="inherit"
        >
          Cancelar
        </Button>
        <Button
          onClick={executeOperation}
          disabled={
            !operation || 
            loading || 
            confirmation !== requiredConfirmation ||
            (operation === 'reassign' && newMatrizador === '') ||
            (operation === 'changeStatus' && !newStatus) ||
            results !== null
          }
          variant="contained"
          color="warning"
        >
          {loading ? 'Procesando...' : 'Ejecutar Operación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkOperationsDialog;