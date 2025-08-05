import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  ViewKanban as KanbanIcon,
  List as ListIcon 
} from '@mui/icons-material';
import KanbanArchivo from './archivo/KanbanArchivo';
import ListaArchivo from './archivo/ListaArchivo';
import archivoService from '../services/archivo-service';
import useAuth from '../hooks/use-auth';
import { filterRecentlyDelivered, DELIVERY_FILTER_PERIODS } from '../utils/dateUtils';

/**
 * Componente de Gestión de Archivo
 * Vista principal para documentos propios del archivo
 * Incluye toggle entre vista Kanban y Lista (como GestionDocumentos)
 */
const GestionArchivo = ({ dashboardData, loading, onDataUpdate }) => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'lista'
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  /**
   * Cargar documentos al montar o cuando cambia el modo
   */
  useEffect(() => {
    cargarDocumentos();
  }, [token, viewMode]);

  /**
   * Cargar documentos propios
   */
  const cargarDocumentos = async () => {
    if (!token) return;

    setLoadingDocuments(true);
    setError(null);

    try {
      const response = await archivoService.getMisDocumentos(token, {
        limit: 50 // Cargar más documentos para vista completa
      });

      if (response.success) {
        setDocumentos(response.data.documentos);
      } else {
        setError(response.message || 'Error cargando documentos');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoadingDocuments(false);
    }
  };

  /**
   * Manejar cambio de estado de documento (drag & drop)
   */
  const handleEstadoChange = async (documentoId, nuevoEstado) => {
    if (!token) return;

    try {
      const response = await archivoService.cambiarEstadoDocumento(token, documentoId, nuevoEstado);

      if (response.success) {
        // Actualizar documento en el estado local
        setDocumentos(prev => 
          prev.map(doc => 
            doc.id === documentoId 
              ? { ...doc, status: nuevoEstado }
              : doc
          )
        );

        // Actualizar dashboard si está disponible
        if (onDataUpdate) {
          onDataUpdate();
        }

        return { success: true };
      } else {
        setError(response.message || 'Error cambiando estado');
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
      return { success: false, message: 'Error de conexión' };
    }
  };

  /**
   * Manejar cambio de vista
   */
  const handleViewChange = (event, newValue) => {
    setViewMode(newValue);
  };

  /**
   * Limpiar error
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Agrupar documentos por estado para kanban
   * FILTRO TEMPORAL: Solo documentos ENTREGADOS de los últimos 7 días
   */
  const agruparDocumentosPorEstado = () => {
    const entregados = documentos.filter(doc => doc.status === 'ENTREGADO');
    const entregadosRecientes = filterRecentlyDelivered(entregados, DELIVERY_FILTER_PERIODS.WEEK);
    
    return {
      EN_PROCESO: documentos.filter(doc => doc.status === 'EN_PROCESO'),
      LISTO: documentos.filter(doc => doc.status === 'LISTO'),
      ENTREGADO: entregadosRecientes
    };
  };

  if (loading || loadingDocuments) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          📁 Mis Documentos de Archivo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestiona tus documentos de archivo asignados
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Toggle Vista */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={viewMode} 
          onChange={handleViewChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem'
            }
          }}
        >
          <Tab 
            value="kanban" 
            label="Vista Kanban" 
            icon={<KanbanIcon />}
            iconPosition="start"
          />
          <Tab 
            value="lista" 
            label="Vista Lista" 
            icon={<ListIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Contenido según vista */}
      {viewMode === 'kanban' ? (
        <KanbanArchivo 
          documentos={agruparDocumentosPorEstado()}
          estadisticas={dashboardData?.estadisticas}
          onEstadoChange={handleEstadoChange}
          onRefresh={cargarDocumentos}
        />
      ) : (
        <ListaArchivo 
          documentos={documentos}
          onEstadoChange={handleEstadoChange}
          onRefresh={cargarDocumentos}
        />
      )}
    </Box>
  );
};

export default GestionArchivo;