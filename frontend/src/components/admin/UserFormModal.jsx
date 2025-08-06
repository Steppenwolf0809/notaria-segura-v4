import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  InputAdornment,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Badge as RoleIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import adminService from '../../services/admin-service';
import useAuthStore from '../../store/auth-store';

/**
 * Modal para crear/editar usuarios
 * Incluye validación en tiempo real y indicador de fortaleza de contraseña
 */
const UserFormModal = ({ open, onClose, user = null, onUserSaved }) => {
  const { token } = useAuthStore();
  const isEdit = !!user;

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: '',
    password: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(null);

  // Cargar datos del usuario si es edición
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || '',
        password: '',
        confirmPassword: ''
      });
    } else {
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: '',
        password: '',
        confirmPassword: ''
      });
    }
    setValidationErrors({});
    setError(null);
    setPasswordStrength(null);
  }, [user, open]);

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
    if (name === 'password') {
      validatePasswordStrength(value);
    }

    // Validar confirmación de contraseña
    if (name === 'confirmPassword' || (name === 'password' && formData.confirmPassword)) {
      const password = name === 'password' ? value : formData.password;
      const confirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword;
      
      if (confirmPassword && password !== confirmPassword) {
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
   */
  const validatePasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }

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
    const validation = adminService.validateUserData({
      ...formData,
      password: !isEdit || formData.password ? formData.password : undefined
    });

    setValidationErrors(validation.errors);
    return validation.isValid;
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
      let response;
      const userData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role
      };

      // Solo incluir contraseña si se proporciona
      if (formData.password) {
        userData.password = formData.password;
      }

      if (isEdit) {
        response = await adminService.updateUser(user.id, userData, token);
        toast.success('Usuario actualizado exitosamente');
      } else {
        response = await adminService.createUser(userData, token);
        toast.success('Usuario creado exitosamente');
      }

      if (response.success) {
        onUserSaved(response.data.user);
        handleClose();
      }
    } catch (error) {
      console.error('Error guardando usuario:', error);
      setError(error.message || 'Error al guardar el usuario');

      // Si hay errores específicos del servidor, mostrarlos
      if (error.details?.errors) {
        const serverErrors = {};
        error.details.errors.forEach(err => {
          if (err.includes('email')) {
            serverErrors.email = err;
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
      email: '',
      firstName: '',
      lastName: '',
      role: '',
      password: '',
      confirmPassword: ''
    });
    setShowPasswords({
      password: false,
      confirmPassword: false
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
    if (!passwordStrength || !formData.password) return null;

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

  const roleOptions = adminService.getRoleOptions();

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
          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            {isEdit ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
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

          {/* Información del usuario */}
          {isEdit && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Editando usuario: <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Deja la contraseña vacía si no quieres cambiarla
              </Typography>
            </Alert>
          )}

          {/* Email */}
          <TextField
            fullWidth
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            disabled={isLoading}
            margin="normal"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon sx={{ color: 'primary.main' }} />
                </InputAdornment>
              )
            }}
          />

          {/* Nombre */}
          <TextField
            fullWidth
            name="firstName"
            label="Nombre"
            value={formData.firstName}
            onChange={handleInputChange}
            error={!!validationErrors.firstName}
            helperText={validationErrors.firstName}
            disabled={isLoading}
            margin="normal"
            required
          />

          {/* Apellido */}
          <TextField
            fullWidth
            name="lastName"
            label="Apellido"
            value={formData.lastName}
            onChange={handleInputChange}
            error={!!validationErrors.lastName}
            helperText={validationErrors.lastName}
            disabled={isLoading}
            margin="normal"
            required
          />

          {/* Rol */}
          <FormControl fullWidth margin="normal" error={!!validationErrors.role} required>
            <InputLabel>Rol</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              disabled={isLoading}
              startAdornment={
                <InputAdornment position="start">
                  <RoleIcon sx={{ color: 'primary.main' }} />
                </InputAdornment>
              }
            >
              {roleOptions.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: role.color,
                        mr: 1
                      }}
                    />
                    {role.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {validationErrors.role && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {validationErrors.role}
              </Typography>
            )}
          </FormControl>

          {/* Contraseña */}
          <TextField
            fullWidth
            name="password"
            label={isEdit ? "Nueva Contraseña (opcional)" : "Contraseña"}
            type={showPasswords.password ? 'text' : 'password'}
            value={formData.password}
            onChange={handleInputChange}
            error={!!validationErrors.password}
            helperText={validationErrors.password}
            disabled={isLoading}
            margin="normal"
            required={!isEdit}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: 'primary.main' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('password')}
                    disabled={isLoading}
                    edge="end"
                  >
                    {showPasswords.password ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {/* Indicador de fortaleza de contraseña */}
          {renderPasswordStrength()}

          {/* Confirmar contraseña */}
          {(!isEdit || formData.password) && (
            <TextField
              fullWidth
              name="confirmPassword"
              label="Confirmar Contraseña"
              type={showPasswords.confirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword}
              disabled={isLoading}
              margin="normal"
              required={!isEdit || !!formData.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      disabled={isLoading}
                      edge="end"
                    >
                      {showPasswords.confirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          )}
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
            disabled={isLoading || (formData.password && !passwordStrength?.isValid)}
            sx={{ ml: 1 }}
          >
            {isLoading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Usuario')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserFormModal;