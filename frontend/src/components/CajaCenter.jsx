import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import CajaDashboard from './CajaDashboard';
import UploadXML from './UploadXML';

/**
 * Centro de Control de CAJA
 * Maneja el routing basado en hash para las vistas de CAJA
 */
const CajaCenter = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  // Escuchar cambios en el hash
  useEffect(() => {
    const updateView = () => {
      const hash = window.location.hash.replace(/^#\//, '') || 'dashboard';
      console.log('[CAJA-CENTER] Hash changed:', hash);
      setCurrentView(hash);
    };

    // Actualizar vista inicial y establecer hash por defecto si no existe
    const currentHash = window.location.hash;
    if (!currentHash || currentHash === '#' || currentHash === '#/') {
      window.location.hash = '#/dashboard';
    }
    updateView();

    // Escuchar cambios de hash
    window.addEventListener('hashchange', updateView);

    return () => {
      window.removeEventListener('hashchange', updateView);
    };
  }, []);

  // Renderizar vista según currentView
  const renderView = () => {
    console.log('[CAJA-CENTER] Rendering view:', currentView);

    switch (currentView) {
      case 'dashboard':
        return <CajaDashboard />;
      
      case 'subir-xml':
        return <UploadXML />;
      
      default:
        // Si el hash no coincide con ninguna vista, mostrar dashboard
        return <CajaDashboard />;
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {renderView()}
    </Box>
  );
};

export default CajaCenter;

