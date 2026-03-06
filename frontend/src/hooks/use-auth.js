import { useCallback } from 'react';
import useAuthStore from '../store/auth-store';
import apiClient from '../services/api-client';

/**
 * Hook personalizado para manejar autenticacion
 * JWT propio — sin dependencia de Clerk
 */
const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    setToken,
    setUser,
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
   * Login con email y password
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    clearError();

    try {
      const response = await apiClient.post('/auth/login', { email, password });

      if (response.data?.success) {
        setToken(response.data.data.token);
        setUser(response.data.data.user);
        return true;
      } else {
        setError(response.data?.message || 'Error al iniciar sesion');
        return false;
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Error de conexion';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [setToken, setUser, setLoading, setError, clearError]);

  /**
   * Carga el perfil del usuario desde el backend
   */
  const loadProfile = useCallback(async () => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) {
      clearAuth();
      return false;
    }

    setLoading(true);
    clearError();

    try {
      const response = await apiClient.get('/auth/me');

      if (response.data?.success) {
        setUser(response.data.data.user);
        return true;
      } else {
        clearAuth();
        return false;
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        clearAuth();
      } else {
        setError(error?.response?.data?.message || 'Error de conexion');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [setUser, clearAuth, setLoading, setError, clearError]);

  /**
   * Cerrar sesion
   */
  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  /**
   * Obtener token para requests API
   */
  const getAuthToken = useCallback(() => {
    return useAuthStore.getState().token;
  }, []);

  return {
    // Estado
    user,
    token,
    isAuthenticated,
    isLoading,
    isLoadingProfile: isLoading,
    error,

    // Acciones
    login,
    loadProfile,
    logout,
    getAuthToken,
    clearAuth,
    clearError,

    // Utilidades
    getUserRoleColor,
    hasRole,
    hasAnyRole,
    isAdmin,
    getFullName,
    getUserInitials,

    // Compatibilidad
    checkAuth: loadProfile
  };
};

export default useAuth;
