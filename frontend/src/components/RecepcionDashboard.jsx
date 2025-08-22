import React from 'react';
import RecepcionDashboardStats from './RecepcionDashboardStats';

/**
 * Dashboard principal del rol RECEPCION
 * Muestra estadísticas y métricas importantes
 */
function RecepcionDashboard({ estadisticas, onEstadisticasChange, onDocumentClick }) {

  return (
    <RecepcionDashboardStats 
      estadisticas={estadisticas}
      onEstadisticasChange={onEstadisticasChange}
      onDocumentClick={onDocumentClick}
    />
  );
}

export default RecepcionDashboard;