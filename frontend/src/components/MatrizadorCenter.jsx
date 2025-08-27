import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import MatrizadorLayout from './MatrizadorLayout';
import MatrizadorDashboard from './MatrizadorDashboard';
import ConcuerdoGenerator from './matrizador/concuerdos/ConcuerdoGenerator.jsx';
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
  const [documentoEspecifico, setDocumentoEspecifico] = useState(null);
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
   * Función para navegar a un documento desde alertas
   */
  const handleDocumentClick = (alerta) => {
    console.log('Navegando a documento desde alerta (MATRIZADOR):', alerta);
    
    // Preparar información del documento específico
    const documentoTarget = {
      id: alerta.id,
      protocolNumber: alerta.protocolNumber,
      clientName: alerta.clientName,
      documentType: alerta.documentType,
      isGrouped: alerta.isGrouped,
      autoSearch: true
    };

    // Setear el documento específico para navegación
    setDocumentoEspecifico(documentoTarget);
    
    // Cambiar a la vista de documentos
    setCurrentView('documents');
  };

  /**
   * Renderizar contenido según la vista actual
   */
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <MatrizadorDashboard onDocumentClick={handleDocumentClick} />;
      
      case 'documents':
        return (
          <GestionDocumentos 
            documentoEspecifico={documentoEspecifico}
            onDocumentoFound={() => setDocumentoEspecifico(null)}
          />
        );
      
      case 'history':
        return <NotificationsHistory />;
      
      case 'concuerdos':
        return <ConcuerdoGenerator />;
      
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