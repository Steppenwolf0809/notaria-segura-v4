import { useCallback } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import useAuthStore from '../store/auth-store';
import apiClient from '../services/api-client';

/**
 * Hook personalizado para manejar autenticación
 * Integra Clerk (auth) con el backend (perfil/roles)
 */
const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
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

  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();

  /**
   * Carga el perfil del usuario desde el backend
   * Clerk ya autenticó — aquí obtenemos rol, notaría, etc.
   */
  const loadProfile = useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      const token = await getToken();
      if (!token) {
        clearAuth();
        return false;
      }

      const response = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.success) {
        setUser(response.data.data.user);
        return true;
      } else {
        setError('No se pudo cargar el perfil');
        return false;
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        // Usuario autenticado en Clerk pero no existe en DB aún (webhook pendiente)
        setError('Tu cuenta está siendo configurada. Intenta de nuevo en unos segundos.');
      } else {
        setError(error?.response?.data?.message || 'Error de conexión');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [getToken, setUser, clearAuth, setLoading, setError, clearError]);

  /**
   * Cerrar sesión (Clerk + limpiar estado local)
   */
  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch {}
    clearAuth();
  }, [signOut, clearAuth]);

  /**
   * Obtener token de Clerk para requests API
   */
  const getAuthToken = useCallback(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken]);

  return {
    // Estado
    user,
    isAuthenticated,
    isLoading,
    isLoadingProfile: isLoading,
    error,

    // Acciones
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

    // Compatibilidad — los componentes existentes usan checkAuth
    checkAuth: loadProfile,
    token: null // Ya no se maneja token manualmente
  };
};

export default useAuth;
