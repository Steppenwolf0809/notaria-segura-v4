import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Grid,
  FormControlLabel,
  Checkbox,
  Link,
  Stack,
  Divider,
  Grow
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';

/**
 * Componente de formulario de inicio de sesión
 * Utiliza Material UI y los colores oficiales del proyecto
 */
const LoginForm = () => {
  const { login, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  /**
   * Maneja los cambios en los campos del formulario
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo si existe
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Limpiar error general si existe
    if (error) {
      clearError();
    }
  };

  /**
   * Valida el formulario antes del envío
   */
  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'El email no es válido';
    }
    
    if (!formData.password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    setFormErrors(errors);
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

    await login(formData);
  };

  /**
   * Alterna la visibilidad de la contraseña
   */
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      <Grid container sx={{ minHeight: '100vh' }}>
        {/* Columna Izquierda - Branding */}
        <Grid
          item
          xs={12}
          md={5}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 4, md: 6 },
            background: 'linear-gradient(135deg, #000000 0%, #0b1624 40%, #1B5E96 100%)',
            color: '#ffffff',
            position: 'relative'
          }}
        >
          <Grow in timeout={700}>
            <Box sx={{ textAlign: 'center', maxWidth: 520, width: '100%' }}>
              <div className="logo-container" aria-label="Identidad Notaría 18">
                <h1 className="gzs-initials gradient-logo-primary">GZS</h1>
                <h2 className="notaria-title">NOTARÍA 18</h2>
                <div className="decorative-line" />
                <p className="doctor-name">Dra. Glenda Zapata Silva</p>
                <p className="system-description">Sistema de Trazabilidad<br/>Documental</p>
              </div>

              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 3, opacity: 0.9 }}>
                <SecurityIcon fontSize="small" />
                <Typography variant="body2">Conexión Segura</Typography>
              </Stack>
            </Box>
          </Grow>
        </Grid>

        {/* Columna Derecha - Formulario */}
        <Grid
          item
          xs={12}
          md={7}
          sx={{
            backgroundColor: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 4, md: 8 }
          }}
        >
          <Grow in timeout={800}>
            <Card sx={{ width: '100%', maxWidth: 460 }}>
              <CardContent sx={{ p: { xs: 4, md: 5 } }}>
                {/* Encabezado */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1 }}>
                    Iniciar Sesión
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Acceda al sistema de trazabilidad de Notaría 18
                  </Typography>
                </Box>

                {/* Error */}
                {error && (
                  <Alert severity="error" variant="filled" sx={{ mb: 2 }} onClose={clearError}>
                    {error.message || error}
                  </Alert>
                )}

                {/* Formulario */}
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <TextField
                    fullWidth
                    id="email"
                    name="email"
                    label="Correo electrónico"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                    disabled={isLoading}
                    margin="normal"
                    required
                    autoComplete="email"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: '#1B5E96' }} />
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(27,94,150,0.35)' },
                        '&:hover fieldset': { borderColor: '#1B5E96' },
                        '&.Mui-focused fieldset': { borderColor: '#1B5E96' },
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#1B5E96' }
                    }}
                  />

                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    error={!!formErrors.password}
                    helperText={formErrors.password}
                    disabled={isLoading}
                    margin="normal"
                    required
                    autoComplete="current-password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#1B5E96' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={togglePasswordVisibility} disabled={isLoading} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(27,94,150,0.35)' },
                        '&:hover fieldset': { borderColor: '#1B5E96' },
                        '&.Mui-focused fieldset': { borderColor: '#1B5E96' },
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#1B5E96' }
                    }}
                  />

                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                    <FormControlLabel
                      control={<Checkbox color="primary" size="small" />}
                      label={<Typography variant="body2">Recordar mi sesión</Typography>}
                    />
                    <Link href="#" underline="hover" variant="body2">¿Olvidaste tu contraseña?</Link>
                  </Stack>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading}
                    sx={{
                      mt: 3,
                      height: 48,
                      background: 'linear-gradient(135deg, #1B5E96 0%, #2563EB 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #174a75 0%, #1e40af 100%)'
                      }
                    }}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                  >
                    {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" sx={{ mt: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <SecurityIcon fontSize="small" sx={{ color: '#1B5E96' }} />
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>Conexión Segura</Typography>
                    </Stack>
                    <Link href="mailto:soporte@notaria18.ec" underline="hover" variant="caption">
                      Contactar Soporte
                    </Link>
                  </Stack>
                </Box>

                <Divider sx={{ my: 3 }} />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    Sistema Notaría Segura v4.0
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grow>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LoginForm; 