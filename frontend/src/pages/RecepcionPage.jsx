import React from 'react';
import ReceptionCenter from '../components/ReceptionCenter';

/**
 * Página principal del rol RECEPCION
 * Punto de entrada para gestión de entregas (UI Activos/Entregados)
 */
function RecepcionPage() {
  return (
    <div className="recepcion-page">
      <ReceptionCenter />
    </div>
  );
}

export default RecepcionPage;