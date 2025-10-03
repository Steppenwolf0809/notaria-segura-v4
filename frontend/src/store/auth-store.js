import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store de autenticación usando Zustand
 * Maneja estado de usuario, token y funciones de login/logout
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Función para establecer el usuario autenticado
       * @param {Object} userData - Datos del usuario
       * @param {string} userToken - Token JWT
       */
      setAuth: (userData, userToken) => {
        // Sincronizar token en localStorage directo para api-client.js
        try {
          localStorage.setItem('token', userToken);
        } catch (error) {
          console.error('Error guardando token en localStorage:', error);
        }
        
        set({
          user: userData,
          token: userToken,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      },

      /**
       * Función para limpiar el estado de autenticación
       */
      clearAuth: () => {
        // Limpiar todos los tokens en localStorage
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('notaria-auth-storage');
        } catch (error) {
          console.error('Error limpiando tokens de localStorage:', error);
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      },

      /**
       * Función para establecer estado de carga
       * @param {boolean} loading - Estado de carga
       */
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      /**
       * Función para establecer error
       * @param {string} errorMessage - Mensaje de error
       */
      setError: (errorMessage) => {
        set({ 
          error: errorMessage, 
          isLoading: false 
        });
      },

      /**
       * Función para limpiar errores
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Función para actualizar el perfil del usuario
       * @param {Object} updatedData - Datos actualizados del usuario
       */
      updateUserProfile: (updatedData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updatedData }
          });
        }
      },

      /**
       * Función para obtener el color del rol del usuario
       * @returns {string} Color del rol
       */
      getUserRoleColor: () => {
        const user = get().user;
        if (!user || !user.role) return '#6b7280';
        
        const roleColors = {
          ADMIN: '#ef4444',      // Rojo - Control total
          CAJA: '#22c55e',       // Verde - Gestión financiera  
          MATRIZADOR: '#3b82f6', // Azul - Creación documentos
          RECEPCION: '#06b6d4',  // Cyan - Entrega documentos
          ARCHIVO: '#9333ea'     // Púrpura - Archivo y supervisión
        };
        
        return roleColors[user.role] || '#6b7280';
      },

      /**
       * Función para verificar si el usuario tiene un rol específico
       * @param {string} role - Rol a verificar
       * @returns {boolean} True si el usuario tiene el rol
       */
      hasRole: (role) => {
        const user = get().user;
        return user?.role === role;
      },

      /**
       * Función para verificar si el usuario tiene alguno de los roles
       * @param {Array} roles - Array de roles a verificar
       * @returns {boolean} True si el usuario tiene alguno de los roles
       */
      hasAnyRole: (roles) => {
        const user = get().user;
        return user?.role && roles.includes(user.role);
      },

      /**
       * Función para verificar si el usuario es admin
       * @returns {boolean} True si el usuario es admin
       */
      isAdmin: () => {
        return get().hasRole('ADMIN');
      },

      /**
       * Función para obtener el nombre completo del usuario
       * @returns {string} Nombre completo
       */
      getFullName: () => {
        const user = get().user;
        if (!user) return '';
        return `${user.firstName} ${user.lastName}`;
      },

      /**
       * Función para obtener las iniciales del usuario
       * @returns {string} Iniciales
       */
      getUserInitials: () => {
        const user = get().user;
        if (!user) return '';
        return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
      }
    }),
    {
      name: 'notaria-auth-storage', // Clave para localStorage
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }) // Solo persistir estos campos
    }
  )
);

export default useAuthStore; 