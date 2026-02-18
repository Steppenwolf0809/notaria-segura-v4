import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import CajaStatsDashboard from './CajaStatsDashboard';
import XmlUploadCenter from './XmlUploadCenter';
import CajaDashboard from './CajaDashboard';
// Billing module components
import ImportarDatos from './billing/ImportarDatos';
import ListaFacturas from './billing/ListaFacturas';
import DetalleFactura from './billing/DetalleFactura';
import ListaPagos from './billing/ListaPagos';
import Reportes from './billing/Reportes';
import ParticipacionEstado from './admin/ParticipacionEstado';

/**
 * Centro de Control de CAJA
 * Maneja el routing basado en hash para las vistas de CAJA
 *
 * Rutas:
 * - #/dashboard: Dashboard con estadísticas de negocio
 * - #/subir-xml: Centro de carga XML (individual y lote)
 * - #/documentos: Tabla de documentos para gestión
 * - #/importar-datos: Importar datos de Koinor
 * - #/facturas: Lista de facturas
 * - #/factura-detalle/:id: Detalle de factura
 * - #/pagos: Lista de pagos
 * - #/participacion-estado: Participación al Estado
 */
const CajaCenter = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  // Escuchar cambios en el hash
  useEffect(() => {
    const updateView = () => {
      const hash = window.location.hash.replace(/^#\//, '') || 'dashboard';
      // Extraer la vista base (sin parámetros)
      const viewBase = hash.split('/')[0];
      setCurrentView(viewBase);
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

    switch (currentView) {
      case 'dashboard':
        // Nuevo: Dashboard con estadísticas de negocio
        return <CajaStatsDashboard />;

      case 'subir-xml':
      case 'uploads':
        // Nuevo: Centro unificado de carga XML con pestañas
        return <XmlUploadCenter />;

      case 'documentos':
        // Tabla de documentos para gestión (CajaDashboard sin funcionalidad de upload)
        return <CajaDashboard />;

      // === BILLING MODULE ROUTES ===
      case 'importar-datos':
        return <ImportarDatos />;

      case 'facturas':
        return <ListaFacturas />;

      case 'factura-detalle':
        // El componente extrae el ID del hash
        return <DetalleFactura />;

      case 'pagos':
        return <ListaPagos />;

      case 'reportes':
        return <Reportes />;

      case 'participacion-estado':
        return <ParticipacionEstado />;

      default:
        // Si el hash no coincide con ninguna vista, mostrar dashboard
        return <CajaStatsDashboard />;
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {renderView()}
    </Box>
  );
};

export default CajaCenter;

