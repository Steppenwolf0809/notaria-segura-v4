import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import ListaArchivo from './archivo/ListaArchivo';
import archivoService from '../services/archivo-service';
import useAuth from '../hooks/use-auth';

/**
 * Componente de Gestión de Archivo
 * Vista principal para documentos propios del archivo
 * Solo usa vista de lista (similar a Recepción)
 */
const GestionArchivo = ({ dashboardData, loading, onDataUpdate }) => {
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  /**
   * Cargar documentos al montar
   */
  useEffect(() => {
    cargarDocumentos();
  }, [token]);

  /**
   * Cargar documentos propios
   */
  const cargarDocumentos = async () => {
    if (!token) return;

    setLoadingDocuments(true);
    setError(null);

    try {
      const response = await archivoService.getMisDocumentos(token, {
        limit: 500 // Cargar todos los documentos del usuario
      });

      if (response.success) {
        setDocumentos(response.data.documentos);
      } else {
        setError(response.message || 'Error cargando documentos');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoadingDocuments(false);
    }
  };

  /**
   * Manejar cambio de estado de documento
   */
  const handleEstadoChange = async (documentoId, nuevoEstado) => {
    if (!token) return;

    try {
      const response = await archivoService.cambiarEstadoDocumento(token, documentoId, nuevoEstado);

      if (response.success) {
        // Usar documento actualizado del backend si viene en la respuesta
        const updated = response.data?.documento;
        if (updated) {
          setDocumentos(prev => prev.map(doc => (doc.id === documentoId ? { ...doc, ...updated } : doc)));
        } else {
          // Fallback mínimo: solo estado
          setDocumentos(prev => prev.map(doc => (doc.id === documentoId ? { ...doc, status: nuevoEstado } : doc)));
        }

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
      setError('Error de conexión');
      return { success: false, message: 'Error de conexión' };
    }
  };

  /**
   * Refrescar documentos (callback para componentes hijos)
   */
  const handleRefresh = () => {
    cargarDocumentos();
    if (onDataUpdate) {
      onDataUpdate();
    }
  };

  /**
   * Limpiar error
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Renderizar contenido principal
   */
  const renderContent = () => {
    if (loadingDocuments) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando documentos...</Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={cargarDocumentos}
            >
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      );
    }

    // Solo vista de lista (similar a Recepción)
    return (
      <ListaArchivo
        documentos={documentos}
        onEstadoChange={handleEstadoChange}
        onRefresh={handleRefresh}
      />
    );
  };

  if (loading) {
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
    <Box sx={{ height: '100%' }}>
      {/* Header simplificado */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          📄 Gestión de Documentos
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Vista unificada para gestionar, agrupar y entregar documentos.
        </Typography>
      </Box>

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

      {/* Contenido principal */}
      {renderContent()}
    </Box>
  );
};

export default GestionArchivo;
