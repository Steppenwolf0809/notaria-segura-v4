import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import ArchivoLayout from './ArchivoLayout';
import ArchivoDashboard from './ArchivoDashboard';
import GestionArchivo from './GestionArchivo';
import SupervisionGeneral from './archivo/SupervisionGeneral';
import NotificationHistory from './archivo/NotificationHistory';
import archivoService from '../services/archivo-service';
import useAuth from '../hooks/use-auth';

/**
 * Centro de Control Archivo
 * Funcionalidad dual:
 * - Dashboard para documentos propios
 * - Vista supervisión global de todos los documentos (solo lectura)
 */
const ArchivoCenter = () => {
  const [currentView, setCurrentView] = useState('documentos'); // Iniciar en documentos por defecto
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const { token } = useAuth();

  /**
   * Cargar datos del dashboard al montar
   */
  useEffect(() => {
    if (currentView === 'documentos' || currentView === 'dashboard') {
      cargarDashboard();
    }
  }, [currentView, token]);

  /**
   * Cargar datos del dashboard
   */
  const cargarDashboard = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await archivoService.getDashboard(token);
      
      if (response.success) {
        setDashboardData(response.data);
        setError(null);
      } else {
        setError(response.message || 'Error cargando dashboard');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
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
   * Limpiar error
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Actualizar datos (callback para componentes hijos)
   */
  const handleDataUpdate = () => {
    if (currentView === 'documentos' || currentView === 'dashboard') {
      cargarDashboard();
    }
  };

  /**
   * Renderizar contenido según la vista actual
   */
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <ArchivoDashboard 
            data={dashboardData}
            loading={loading}
            onDataUpdate={handleDataUpdate}
          />
        );
      
      case 'documentos':
        return (
          <GestionArchivo 
            dashboardData={dashboardData}
            loading={loading}
            onDataUpdate={handleDataUpdate}
          />
        );
      
      case 'notificaciones':
        return <NotificationHistory />;
      
      case 'supervision':
        return (
          <SupervisionGeneral 
            onDataUpdate={handleDataUpdate}
          />
        );
      
      default:
        return (
          <GestionArchivo 
            dashboardData={dashboardData}
            loading={loading}
            onDataUpdate={handleDataUpdate}
          />
        );
    }
  };

  return (
    <ArchivoLayout 
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
    </ArchivoLayout>
  );
};

export default ArchivoCenter;