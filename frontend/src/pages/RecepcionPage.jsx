import React from 'react';
import RecepcionDashboard from '../components/RecepcionDashboard';

/**
 * Página principal del rol RECEPCION
 * Punto de entrada para gestión de entregas
 */
function RecepcionPage() {
  return (
    <div className="recepcion-page">
      <RecepcionDashboard />
    </div>
  );
}

export default RecepcionPage;