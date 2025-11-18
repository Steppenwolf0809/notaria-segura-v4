import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Typography,
  Box,
  LinearProgress,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import useAuthStore from '../store/auth-store';
import authService from '../services/auth-service';

/**
 * Componente para cambiar contraseña del usuario
 * Incluye validación en tiempo real y indicador de fortaleza
 */
const ChangePassword = ({ open, onClose }) => {
  const { user, token } = useAuthStore();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(null);

  /**
   * Maneja cambios en los campos del formulario
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar errores específicos del campo
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Limpiar error general
    if (error) {
      setError(null);
    }

    // Validar fortaleza de contraseña nueva en tiempo real
    if (name === 'newPassword') {
      validatePasswordStrength(value);
    }

    // Validar confirmación de contraseña
    if (name === 'confirmPassword' || (name === 'newPassword' && formData.confirmPassword)) {
      const newPassword = name === 'newPassword' ? value : formData.newPassword;
      const confirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword;
      
      if (confirmPassword && newPassword !== confirmPassword) {
        setValidationErrors(prev => ({
          ...prev,
          confirmPassword: 'Las contraseñas no coinciden'
        }));
      } else {
        setValidationErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      }
    }
  };

  /**
   * Valida la fortaleza de la contraseña
   * Implementa las mismas reglas que el backend
   */
  const validatePasswordStrength = (password) => {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noSpaces: !/\s/.test(password)
    };

    const errors = [];
    if (!requirements.minLength) errors.push('Mínimo 8 caracteres');
    if (!requirements.hasUppercase) errors.push('Una letra mayúscula');
    if (!requirements.hasLowercase) errors.push('Una letra minúscula');
    if (!requirements.hasNumber) errors.push('Un número');
    if (!requirements.noSpaces) errors.push('Sin espacios');

    // Calcular fortaleza
    let score = 0;
    if (requirements.minLength) score += 2;
    if (requirements.hasUppercase) score += 1;
    if (requirements.hasLowercase) score += 1;
    if (requirements.hasNumber) score += 1;
    if (requirements.hasSpecialChar) score += 1;

    let level = 'weak';
    let color = '#ef4444';
    if (score >= 5) {
      level = 'strong';
      color = '#22c55e';
    } else if (score >= 4) {
      level = 'medium';
      color = '#f59e0b';
    }

    setPasswordStrength({
      requirements,
      errors,
      isValid: errors.length === 0,
      score,
      maxScore: 6,
      level,
      color,
      percentage: Math.round((score / 6) * 100)
    });
  };

  /**
   * Alterna visibilidad de contraseñas
   */
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  /**
   * Valida el formulario completo
   */
  const validateForm = () => {
    const errors = {};

    if (!formData.currentPassword) {
      errors.currentPassword = 'La contraseña actual es obligatoria';
    }

    if (!formData.newPassword) {
      errors.newPassword = 'La nueva contraseña es obligatoria';
    } else if (!passwordStrength?.isValid) {
      errors.newPassword = 'La contraseña no cumple los requisitos de seguridad';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirme la nueva contraseña';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.changePassword(formData, token);
      
      if (response.success) {
        toast.success('Contraseña cambiada exitosamente', {
          position: 'top-right',
          autoClose: 3000
        });
        
        // Resetear formulario y cerrar modal
        handleClose();
      }
    } catch (error) {
      setError(error.message || 'Error al cambiar la contraseña');
      
      // Si hay errores específicos del servidor, mostrarlos
      if (error.details?.errors) {
        const serverErrors = {};
        error.details.errors.forEach(err => {
          if (err.includes('actual')) {
            serverErrors.currentPassword = err;
          } else if (err.includes('nueva')) {
            serverErrors.newPassword = err;
          }
        });
        setValidationErrors(serverErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cierra el modal y resetea el estado
   */
  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    setError(null);
    setValidationErrors({});
    setPasswordStrength(null);
    onClose();
  };

  /**
   * Renderiza el indicador de fortaleza de contraseña
   */
  const renderPasswordStrength = () => {
    if (!passwordStrength || !formData.newPassword) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ mr: 1 }}>
            Fortaleza:
          </Typography>
          <Chip
            label={passwordStrength.level === 'strong' ? 'Fuerte' : 
                  passwordStrength.level === 'medium' ? 'Media' : 'Débil'}
            size="small"
            sx={{
              bgcolor: passwordStrength.color,
              color: 'white',
              fontSize: '0.7rem'
            }}
          />
        </Box>
        
        <LinearProgress
          variant="determinate"
          value={passwordStrength.percentage}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              bgcolor: passwordStrength.color,
              borderRadius: 3
            }
          }}
        />

        {/* Requisitos de contraseña */}
        <List dense sx={{ mt: 1 }}>
          {[
            { key: 'minLength', text: 'Al menos 8 caracteres' },
            { key: 'hasUppercase', text: 'Una letra mayúscula' },
            { key: 'hasLowercase', text: 'Una letra minúscula' },
            { key: 'hasNumber', text: 'Un número' },
            { key: 'hasSpecialChar', text: 'Un carácter especial (recomendado)' }
          ].map((req) => (
            <ListItem key={req.key} sx={{ py: 0, px: 1 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {passwordStrength.requirements[req.key] ? (
                  <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={req.text}
                primaryTypographyProps={{
                  variant: 'caption',
                  color: passwordStrength.requirements[req.key] ? 'success.main' : 'text.secondary'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LockIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Cambiar Contraseña
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {/* Error general */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Info del usuario */}
          <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
            <Typography variant="body2">
              <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Asegúrate de usar una contraseña segura y única
            </Typography>
          </Alert>

          {/* Contraseña actual */}
          <TextField
            fullWidth
            name="currentPassword"
            label="Contraseña Actual"
            type={showPasswords.current ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={handleInputChange}
            error={!!validationErrors.currentPassword}
            helperText={validationErrors.currentPassword}
            disabled={isLoading}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('current')}
                    disabled={isLoading}
                    edge="end"
                  >
                    {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {/* Nueva contraseña */}
          <TextField
            fullWidth
            name="newPassword"
            label="Nueva Contraseña"
            type={showPasswords.new ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={handleInputChange}
            error={!!validationErrors.newPassword}
            helperText={validationErrors.newPassword}
            disabled={isLoading}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('new')}
                    disabled={isLoading}
                    edge="end"
                  >
                    {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {/* Indicador de fortaleza */}
          {renderPasswordStrength()}

          {/* Confirmar contraseña */}
          <TextField
            fullWidth
            name="confirmPassword"
            label="Confirmar Nueva Contraseña"
            type={showPasswords.confirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={!!validationErrors.confirmPassword}
            helperText={validationErrors.confirmPassword}
            disabled={isLoading}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('confirm')}
                    disabled={isLoading}
                    edge="end"
                  >
                    {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            disabled={isLoading}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !passwordStrength?.isValid}
            sx={{ ml: 1 }}
          >
            {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChangePassword;