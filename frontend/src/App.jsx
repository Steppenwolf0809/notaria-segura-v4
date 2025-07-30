import React, { useEffect } from 'react';
import useAuth from './hooks/use-auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * Componente raíz de la aplicación
 * Maneja la autenticación y navegación principal
 * 
 * NOTA: El tema se maneja en main.jsx con AppWithTheme
 * para soportar modo oscuro dinámico
 */
function App() {
  const { isAuthenticated, checkAuth } = useAuth();

  useEffect(() => {
    // Verificar autenticación al cargar la aplicación
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      {isAuthenticated ? (
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      ) : (
        <LoginPage />
      )}
    </>
  );
}

export default App;
