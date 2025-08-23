import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import MatrizadorLayout from './MatrizadorLayout';
import MatrizadorDashboard from './MatrizadorDashboard';
import GestionDocumentos from './GestionDocumentos';
import NotificationsHistory from './Documents/NotificationsHistory';
import useDocumentStore from '../store/document-store';

/**
 * Centro de Control Matrizador
 * - Layout con sidebar correcto
 * - Dashboard con KPIs horizontales 
 * - Vista Lista simplificada
 */
const MatrizadorCenter = () => {
  const [currentView, setCurrentView] = useState('documents'); // Iniciar en documentos por defecto
  const { 
    documents, 
    loading, 
    error, 
    fetchMyDocuments, 
    clearError 
  } = useDocumentStore();

  /**
   * Cargar datos al montar el componente
   */
  useEffect(() => {
    fetchMyDocuments();
  }, [fetchMyDocuments]);

  /**
   * Manejar cambios de vista
   */
  const handleViewChange = (view) => {
    setCurrentView(view);
    clearError(); // Limpiar errores al cambiar vista
  };

  /**
   * Renderizar contenido según la vista actual
   */
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <MatrizadorDashboard />;
      
      case 'documents':
        return <GestionDocumentos />;
      
      case 'history':
        return <NotificationsHistory />;
      
      default:
        return <MatrizadorDashboard />;
    }
  };

  return (
    <MatrizadorLayout 
      currentView={currentView} 
      onViewChange={handleViewChange}
    >
      {/* Error Global */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Contenido Principal */}
      <Box sx={{ height: '100%' }}>
        {renderContent()}
      </Box>
    </MatrizadorLayout>
  );
};

export default MatrizadorCenter;