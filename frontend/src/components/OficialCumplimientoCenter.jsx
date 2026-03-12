import React, { useState } from 'react';
import { Box, Alert } from '@mui/material';
import MatrizadorLayout from './MatrizadorLayout';
import { UAFEDashboard } from './uafe';

/**
 * Centro de Control para Oficial de Cumplimiento
 * Vista principal: Control UAFE (formularios-uafe)
 * Solo tiene acceso a dashboard UAFE y reportes
 */
const OficialCumplimientoCenter = () => {
  const [currentView, setCurrentView] = useState('formularios-uafe');
  const [error, setError] = useState(null);

  const handleViewChange = (view) => {
    setCurrentView(view);
    setError(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
      case 'formularios-uafe':
        return <UAFEDashboard />;
      default:
        return <UAFEDashboard />;
    }
  };

  return (
    <MatrizadorLayout
      currentView={currentView}
      onViewChange={handleViewChange}
    >
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 3 }}
        >
          {error.toString()}
        </Alert>
      )}
      <Box sx={{ height: '100%' }}>
        {renderContent()}
      </Box>
    </MatrizadorLayout>
  );
};

export default OficialCumplimientoCenter;
