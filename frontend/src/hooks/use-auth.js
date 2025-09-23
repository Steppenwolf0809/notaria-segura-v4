import { useCallback } from 'react';
import useAuthStore from '../store/auth-store';
import authService from '../services/auth-service';

/**
 * Hook personalizado para manejar autenticación
 * Integra el store de Zustand con los servicios de API
 */
const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    setAuth,
    clearAuth,
    setLoading,
    setError,
    clearError,
    getUserRoleColor,
    hasRole,
    hasAnyRole,
    isAdmin,
    getFullName,
    getUserInitials
  } = useAuthStore();

  /**
   * Función para iniciar sesión
   * @param {Object} credentials - Email y contraseña
   */
  const login = useCallback(async (credentials) => {
    setLoading(true);
    clearError();

    try {
      const response = await authService.login(credentials);
      
      if (response.success) {
        setAuth(response.data.user, response.data.token);
        return { success: true, message: response.message };
      } else {
        setError(response.message || 'Error en el inicio de sesión');
        return { success: false, message: response.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Error de conexión';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [setAuth, setLoading, setError, clearError]);

  /**
   * Función para registrar nuevo usuario (solo ADMIN)
   * @param {Object} userData - Datos del usuario a registrar
   */
  const register = useCallback(async (userData) => {
    if (!token) {
      const errorMessage = 'No hay token de autorización';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }

    setLoading(true);
    clearError();

    try {
      const response = await authService.register(userData, token);
      
      if (response.success) {
        return { 
          success: true, 
          message: response.message,
          user: response.data.user 
        };
      } else {
        setError(response.message || 'Error en el registro');
        return { success: false, message: response.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Error de conexión';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [token, setLoading, setError, clearError]);

  /**
   * Función para cerrar sesión
   * - Limpia estado/token
   * - Navega a /login (si es posible)
   * - Emite traza [SESSION]
   */
  const logout = useCallback(() => {
    try {
      // eslint-disable-next-line no-console
      console.info('[SESSION]', { event: 'logout' });
    } catch {}
    // Limpiar credenciales persistidas
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('notaria-auth-storage');
    } catch {}
    clearAuth();
    try {
      if (typeof window !== 'undefined' && window.location) {
        // Intentar navegación suave sin recargar
        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', '/login');
        } else {
          window.location.assign('/login');
        }
      }
    } catch {
      // Ignorar errores de navegación en entornos sin history/router
    }
  }, [clearAuth]);

  /**
   * Función para verificar y refrescar la autenticación
   */
  const checkAuth = useCallback(async () => {
    if (!token) {
      clearAuth();
      return false;
    }

    try {
      const response = await authService.verifyToken(token);
      
      if (response.success) {
        // Token válido, mantener sesión
        return true;
      } else {
        // Token inválido, limpiar sesión
        clearAuth();
        return false;
      }
    } catch (error) {
      // Error al verificar, limpiar sesión
      clearAuth();
      return false;
    }
  }, [token, clearAuth]);

  /**
   * Función para refrescar el token
   */
  const refreshAuthToken = useCallback(async () => {
    if (!token) return false;

    try {
      const response = await authService.refreshToken(token);
      
      if (response.success) {
        setAuth(user, response.data.token);
        return true;
      } else {
        clearAuth();
        return false;
      }
    } catch (error) {
      clearAuth();
      return false;
    }
  }, [token, user, setAuth, clearAuth]);

  /**
   * Función para obtener el perfil actualizado del usuario
   */
  const refreshProfile = useCallback(async () => {
    if (!token) return false;

    try {
      const response = await authService.getProfile(token);
      
      if (response.success) {
        setAuth(response.data.user, token);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }, [token, setAuth]);

  /**
   * Función para verificar el estado de la API
   */
  const checkApiHealth = useCallback(async () => {
    try {
      const response = await authService.checkHealth();
      return response;
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'API no disponible' 
      };
    }
  }, []);

  return {
    // Estado
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    
    // Acciones
    login,
    register,
    logout,
    checkAuth,
    refreshAuthToken,
    refreshProfile,
    checkApiHealth,
    clearError,
    
    // Utilidades
    getUserRoleColor,
    hasRole,
    hasAnyRole,
    isAdmin,
    getFullName,
    getUserInitials
  };
};

export default useAuth; 