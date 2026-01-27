import useAuthStore from '../store/auth-store';

/**
 * Hook para verificar permisos de admin en componentes
 */
export const useAdminCheck = () => {
    const { isAuthenticated, isAdmin, user } = useAuthStore();

    return {
        isAuthenticated,
        isAdmin: isAdmin(),
        hasAdminAccess: isAuthenticated && isAdmin(),
        userRole: user?.role,
        canAccessAdmin: () => isAuthenticated && isAdmin()
    };
};

export default useAdminCheck;
