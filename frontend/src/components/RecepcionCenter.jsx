import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import RecepcionLayout from './RecepcionLayout';
import RecepcionDashboard from './RecepcionDashboard';
import DocumentosUnificados from './recepcion/DocumentosUnificados';
import NotificationsHistory from './Documents/NotificationsHistory';
import receptionService from '../services/reception-service';

/**
 * Centro de Control Recepción - Siguiendo el patrón de MatrizadorCenter
 * Gestiona la navegación entre las diferentes vistas de recepción
 */
const RecepcionCenter = () => {
  const [currentView, setCurrentView] = useState('dashboard'); // Iniciar en dashboard
  const [error, setError] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);

  /**
   * Cargar estadísticas al montar el componente
   */
  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const result = await receptionService.getDashboardStats();
      
      if (result.success) {
        setEstadisticas(result.data.stats);
        setError(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error cargando datos del dashboard');
    }
  };

  /**
   * Manejar cambios de vista
   */
  const handleViewChange = (view) => {
    setCurrentView(view);
    setError(null); // Limpiar errores al cambiar vista
  };

  /**
   * Función para actualizar estadísticas desde componentes hijos
   */
  const onEstadisticasChange = () => {
    cargarEstadisticas();
  };

  /**
   * Función para navegar a un documento desde alertas
   */
  const handleDocumentClick = (alerta) => {
    console.log('Navegando a documento desde alerta:', alerta);
    // Cambiar a la vista de documentos para buscar el documento específico
    setCurrentView('documentos');
  };

  /**
   * Renderizar contenido según la vista actual
   */
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <RecepcionDashboard 
            estadisticas={estadisticas} 
            onEstadisticasChange={onEstadisticasChange}
            onDocumentClick={handleDocumentClick}
          />
        );
      
      case 'documentos':
        return (
          <DocumentosUnificados 
            onEstadisticasChange={onEstadisticasChange} 
          />
        );

      case 'notificaciones':
        return <NotificationsHistory />;
      
      default:
        return (
          <RecepcionDashboard 
            estadisticas={estadisticas} 
            onEstadisticasChange={onEstadisticasChange}
            onDocumentClick={handleDocumentClick}
          />
        );
    }
  };

  return (
    <RecepcionLayout 
      currentView={currentView} 
      onViewChange={handleViewChange}
    >
      {/* Error Global */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Contenido Principal */}
      <Box sx={{ height: '100%' }}>
        {renderContent()}
      </Box>
    </RecepcionLayout>
  );
};

export default RecepcionCenter;