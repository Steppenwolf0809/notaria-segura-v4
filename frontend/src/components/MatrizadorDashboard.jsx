import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Alert,
  Skeleton,
  Button,
  Stack,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon
} from '@mui/icons-material';
import DocumentCard from './DocumentCard';
import useDocumentStore from '../store/document-store';

/**
 * Dashboard donde matrizador ve sus documentos asignados y cambia estados
 */
const MatrizadorDashboard = () => {
  const {
    documents,
    loading,
    error,
    fetchMyDocuments,
    updateDocumentStatus,
    getDocumentsByStatus,
    getDocumentStats,
    clearError
  } = useDocumentStore();

  const [refreshing, setRefreshing] = useState(false);

  /**
   * Cargar documentos al montar el componente
   */
  useEffect(() => {
    loadDocuments();
  }, []);

  /**
   * Cargar documentos del matrizador
   */
  const loadDocuments = async () => {
    await fetchMyDocuments();
  };

  /**
   * Refrescar datos manualmente
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  /**
   * Manejar cambio de estado de documento
   */
  const handleStatusChange = async (documentId, newStatus) => {
    const success = await updateDocumentStatus(documentId, newStatus);
    if (success) {
      // Opcionalmente mostrar notificación de éxito
      console.log('Estado actualizado exitosamente');
    }
    return success;
  };

  /**
   * Obtener estadísticas de documentos
   */
  const stats = getDocumentStats();

  /**
   * Documentos por estado
   */
  const pendingDocs = getDocumentsByStatus('PENDIENTE');
  const inProgressDocs = getDocumentsByStatus('EN_PROCESO');
  const readyDocs = getDocumentsByStatus('LISTO');
  const deliveredDocs = getDocumentsByStatus('ENTREGADO');

  /**
   * Componente de skeleton para loading
   */
  const DocumentSkeleton = () => (
    <Card sx={{ height: 300 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="rectangular" width={80} height={24} />
          <Skeleton variant="rectangular" width={80} height={24} />
        </Box>
        <Skeleton variant="text" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" height={24} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" height={24} />
      </CardContent>
    </Card>
  );

  /**
   * Estado vacío cuando no hay documentos
   */
  const EmptyState = ({ title, message, icon: Icon }) => (
    <Card sx={{ textAlign: 'center', p: 4 }}>
      <CardContent>
        <Icon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </CardContent>
    </Card>
  );

  /**
   * Sección de documentos por estado
   */
  const DocumentSection = ({ title, documents, icon: Icon, color, emptyMessage }) => (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Icon sx={{ mr: 1, color }} />
        <Typography variant="h6" sx={{ color, fontWeight: 'bold' }}>
          {title}
        </Typography>
        <Chip 
          label={documents.length} 
          size="small" 
          sx={{ ml: 1, bgcolor: color, color: 'white' }}
        />
      </Box>
      
      {documents.length === 0 ? (
        <EmptyState 
          title={`No hay documentos ${title.toLowerCase()}`}
          message={emptyMessage}
          icon={Icon}
        />
      ) : (
        <Grid container spacing={3}>
          {documents.map((document) => (
            <Grid item xs={12} sm={6} lg={4} key={document.id}>
              <DocumentCard 
                document={document} 
                onStatusChange={handleStatusChange}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Mis Documentos Asignados
        </Typography>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          startIcon={<RefreshIcon />}
          sx={{ color: 'primary.main', borderColor: 'primary.main' }}
        >
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Resumen de Documentos
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                  {stats.PENDIENTE}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pendientes
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                  {stats.EN_PROCESO}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  En Proceso
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                  {stats.LISTO}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Listos
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loading Skeletons */}
      {loading && documents.length === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Cargando documentos...
          </Typography>
          <Grid container spacing={3}>
            {[1, 2, 3].map((item) => (
              <Grid item xs={12} sm={6} lg={4} key={item}>
                <DocumentSkeleton />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Secciones de documentos por estado */}
      {!loading && documents.length === 0 && !error && (
        <EmptyState
          title="No tienes documentos asignados"
          message="Cuando se te asignen documentos, aparecerán aquí organizados por estado"
          icon={AssignmentIcon}
        />
      )}

      {/* Documentos En Proceso (Prioritarios) */}
      {inProgressDocs.length > 0 && (
        <DocumentSection
          title="En Proceso"
          documents={inProgressDocs}
          icon={ScheduleIcon}
          color="info.main"
          emptyMessage="No hay documentos en proceso actualmente"
        />
      )}

      {/* Documentos Pendientes */}
      {pendingDocs.length > 0 && (
        <DocumentSection
          title="Pendientes"
          documents={pendingDocs}
          icon={AssignmentIcon}
          color="warning.main"
          emptyMessage="No hay documentos pendientes"
        />
      )}

      {/* Documentos Listos */}
      {readyDocs.length > 0 && (
        <DocumentSection
          title="Listos para Entrega"
          documents={readyDocs}
          icon={CheckCircleIcon}
          color="success.main"
          emptyMessage="No hay documentos listos para entrega"
        />
      )}

      {/* Documentos Entregados */}
      {deliveredDocs.length > 0 && (
        <DocumentSection
          title="Entregados"
          documents={deliveredDocs}
          icon={LocalShippingIcon}
          color="grey.600"
          emptyMessage="No hay documentos entregados"
        />
      )}
    </Box>
  );
};

export default MatrizadorDashboard; 