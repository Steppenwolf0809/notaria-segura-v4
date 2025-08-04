import React from 'react';
import RecepcionDashboardStats from './RecepcionDashboardStats';

/**
 * Dashboard principal del rol RECEPCION
 * Muestra estadísticas y métricas importantes
 */
function RecepcionDashboard({ estadisticas, onEstadisticasChange }) {

  return (
    <RecepcionDashboardStats 
      estadisticas={estadisticas}
      onEstadisticasChange={onEstadisticasChange}
    />
  );
}

export default RecepcionDashboard;