import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  CircularProgress,
  Typography,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import {
  LockReset as LockResetIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { API_BASE } from '../utils/apiConfig';
import { formatDateTimeES } from '../utils/dateUtils';

/**
 * Componente para resetear el PIN de un usuario
 * Permite a MATRIZADOR o ADMIN buscar por cédula y resetear el PIN
 */
const ResetearPinDialog = ({ open, onClose, onSuccess }) => {
  const [cedula, setCedula] = useState('');
  const [motivo, setMotivo] = useState('');
  const [personaEncontrada, setPersonaEncontrada] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const [error, setError] = useState('');
  const [resetExitoso, setResetExitoso] = useState(false);

  // Limpiar estado al cerrar
  const handleClose = () => {
    setCedula('');
    setMotivo('');
    setPersonaEncontrada(null);
    setError('');
    setResetExitoso(false);
    onClose();
  };

  // Buscar persona por cédula
  const buscarPersona = async () => {
    if (!cedula.trim()) {
      setError('Por favor ingresa una cédula');
      return;
    }

    setBuscando(true);
    setError('');
    setPersonaEncontrada(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/personal/buscar/${cedula}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al buscar persona');
      }

      setPersonaEncontrada(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBuscando(false);
    }
  };

  // Resetear PIN
  const resetearPin = async () => {
    if (!motivo.trim()) {
      setError('Por favor proporciona un motivo para el reseteo');
      return;
    }

    if (!personaEncontrada) {
      setError('Primero debes buscar a la persona');
      return;
    }

    setReseteando(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/personal/${personaEncontrada.id}/resetear-pin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ motivo })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al resetear PIN');
      }

      setResetExitoso(true);
      if (onSuccess) {
        onSuccess(data);
      }

      // Cerrar después de 2 segundos
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setReseteando(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LockResetIcon color="primary" />
          <Typography variant="h6">Resetear PIN de Usuario</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {resetExitoso ? (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            <Typography variant="h6">PIN reseteado exitosamente</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              El usuario deberá crear un nuevo PIN en su próximo acceso.
            </Typography>
          </Alert>
        ) : (
          <>
            {/* Paso 1: Buscar persona */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Paso 1: Buscar usuario por cédula
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Cédula / RUC"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  fullWidth
                  disabled={buscando || personaEncontrada}
                  placeholder="Ej: 0123456789"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      buscarPersona();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={buscarPersona}
                  disabled={buscando || personaEncontrada || !cedula.trim()}
                  startIcon={buscando ? <CircularProgress size={20} /> : <SearchIcon />}
                >
                  {buscando ? 'Buscando...' : 'Buscar'}
                </Button>
              </Stack>
            </Box>

            {/* Información de la persona encontrada */}
            {personaEncontrada && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Información del usuario
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Nombre:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {personaEncontrada.nombreCompleto || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Cédula/RUC:
                      </Typography>
                      <Typography variant="body1">
                        {personaEncontrada.numeroIdentificacion}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Tipo:
                      </Typography>
                      <Chip
                        label={personaEncontrada.tipoPersona}
                        size="small"
                        color={personaEncontrada.tipoPersona === 'NATURAL' ? 'primary' : 'secondary'}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Estado:
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {personaEncontrada.bloqueado && (
                          <Chip
                            label="BLOQUEADO"
                            size="small"
                            color="error"
                            icon={<WarningIcon />}
                          />
                        )}
                        {personaEncontrada.intentosFallidos > 0 && (
                          <Chip
                            label={`${personaEncontrada.intentosFallidos} intentos fallidos`}
                            size="small"
                            color="warning"
                          />
                        )}
                        {!personaEncontrada.pinCreado && (
                          <Chip
                            label="SIN PIN"
                            size="small"
                            color="default"
                          />
                        )}
                      </Stack>
                    </Box>
                    {personaEncontrada.ultimoAcceso && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Último acceso:
                        </Typography>
                        <Typography variant="body2">
                          {formatDateTimeES(personaEncontrada.ultimoAcceso)}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Reseteos previos:
                      </Typography>
                      <Typography variant="body2">
                        {personaEncontrada.pinResetCount}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Paso 2: Motivo y confirmar */}
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Paso 2: Proporcionar motivo del reseteo
                  </Typography>
                  <TextField
                    label="Motivo del reseteo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Ej: Usuario olvidó su PIN y presentó cédula física"
                    helperText="Este motivo quedará registrado en la auditoría"
                  />
                </Box>

                {/* Advertencia */}
                <Alert severity="warning" sx={{ mt: 2 }} icon={<WarningIcon />}>
                  <Typography variant="body2">
                    Al resetear el PIN:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Se eliminarán todas las sesiones activas del usuario</li>
                    <li>Se desbloqueará la cuenta si estaba bloqueada</li>
                    <li>El usuario deberá crear un nuevo PIN en su próximo acceso</li>
                    <li>Esta acción quedará registrada en la auditoría</li>
                  </ul>
                </Alert>
              </>
            )}

            {/* Mensajes de error */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={reseteando}>
          {resetExitoso ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!resetExitoso && personaEncontrada && (
          <Button
            variant="contained"
            color="primary"
            onClick={resetearPin}
            disabled={reseteando || !motivo.trim()}
            startIcon={reseteando ? <CircularProgress size={20} /> : <LockResetIcon />}
          >
            {reseteando ? 'Reseteando...' : 'Resetear PIN'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ResetearPinDialog;
