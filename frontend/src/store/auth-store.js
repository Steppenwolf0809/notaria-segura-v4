import { create } from 'zustand';

/**
 * Store de autenticación usando Zustand
 * Token lo maneja Clerk — aquí solo guardamos perfil del backend
 */
const useAuthStore = create(
  (set, get) => ({
    // Estado inicial
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    setUser: (userData) => {
      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    },

    clearAuth: () => {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    },

    setLoading: (loading) => {
      set({ isLoading: loading });
    },

    setError: (errorMessage) => {
      set({
        error: errorMessage,
        isLoading: false
      });
    },

    clearError: () => {
      set({ error: null });
    },

    updateUserProfile: (updatedData) => {
      const currentUser = get().user;
      if (currentUser) {
        set({
          user: { ...currentUser, ...updatedData }
        });
      }
    },

    getUserRoleColor: () => {
      const user = get().user;
      if (!user || !user.role) return '#6b7280';

      const roleColors = {
        SUPER_ADMIN: '#7c3aed',
        ADMIN: '#ef4444',
        CAJA: '#22c55e',
        MATRIZADOR: '#3b82f6',
        RECEPCION: '#06b6d4',
        ARCHIVO: '#9333ea'
      };

      return roleColors[user.role] || '#6b7280';
    },

    hasRole: (role) => {
      const user = get().user;
      return user?.role === role;
    },

    hasAnyRole: (roles) => {
      const user = get().user;
      if (user?.role === 'SUPER_ADMIN') return true;
      return user?.role && roles.includes(user.role);
    },

    isAdmin: () => {
      const user = get().user;
      return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    },

    getFullName: () => {
      const user = get().user;
      if (!user) return '';
      return `${user.firstName} ${user.lastName}`;
    },

    getUserInitials: () => {
      const user = get().user;
      if (!user) return '';
      return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
    }
  })
);

export default useAuthStore;
