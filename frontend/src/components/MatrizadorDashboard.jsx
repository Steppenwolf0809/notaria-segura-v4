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
  Divider,
  Paper,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  Notifications as NotificationsIcon,
  History as HistoryIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
// import DocumentCard from './DocumentCard';
import NotificationsHistory from './Documents/NotificationsHistory';
import useDocumentStore from '../store/document-store';
import useStats from '../hooks/useStats';
import useDocuments from '../hooks/useDocuments';
// Importar componentes visuales superiores
import KPISection from './MatrizadorDashboard/KPISection';
import WidgetsAtencion from './MatrizadorDashboard/WidgetsAtencion';
import ProgresoGeneral from './MatrizadorDashboard/ProgresoGeneral';

/**
 * REFACTORIZACIÓN COMPLETADA [ENERO 2025]
 * - Integrado diseño superior de MatrizadorDashboardNew.jsx
 * - Mantenida toda funcionalidad original
 * - KPIs y widgets ahora usan componentes visuales mejorados
 * 
 * Dashboard ejecutivo mejorado para el rol Matrizador
 * Incluye KPIs, centro de control y navegación entre vistas
 */
const MatrizadorDashboard = ({ onDocumentClick }) => {
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
  const [currentView, setCurrentView] = useState(0); // 0: Dashboard, 1: Historial

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
      console.log('Estado actualizado exitosamente');
    }
    return success;
  };

  /**
   * Usar hooks mejorados
   */
  const { basicStats, advancedMetrics, kpiMetrics, alerts, utils } = useStats();

  /**
   * Enriquecer kpiMetrics con iconos para los nuevos componentes
   */
  const enhancedKpiMetrics = {
    ...kpiMetrics,
    totalActive: { ...kpiMetrics.totalActive, icon: AssignmentIcon },
    inProgress: { ...kpiMetrics.inProgress, icon: ScheduleIcon },
    readyForDelivery: { ...kpiMetrics.readyForDelivery, icon: CheckCircleIcon },
    avgTime: { ...kpiMetrics.avgTime, icon: SpeedIcon }
  };
  
  /**
   * Por ahora comentamos el hook avanzado para evitar bucles infinitos
   * Usaremos el store básico que ya funciona bien
   */
  // const {
  //   documents: enhancedDocuments,
  //   loading: enhancedLoading,
  //   lastRefresh,
  //   getAdvancedStats,
  //   updateDocumentStatus: enhancedUpdateStatus,
  //   config: documentsConfig
  // } = useDocuments({
  //   autoRefresh: true,
  //   refreshInterval: 30000, // 30 segundos
  //   enableCache: true,
  //   enableOptimisticUpdates: true,
  //   sorting: { field: 'createdAt', direction: 'desc' }
  // });

  // Vista detallada por estado eliminada para evitar listas infinitas.

  // KPICard component removed - now using superior visual components from KPISection

  // AttentionWidget component removed - now using superior visual components from WidgetsAtencion

  // RecentActivityWidget component removed - now using superior visual components from WidgetsAtencion

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

  // Sección de documentos por estado eliminada.

  /**
   * Renderizar vista según la pestaña seleccionada
   */
  const renderCurrentView = () => {
    switch (currentView) {
      case 0: // Dashboard
        return (
          <Box>
            {/* KPIs Principales - COMPONENTE VISUAL SUPERIOR */}
            <KPISection kpiMetrics={enhancedKpiMetrics} loading={loading} />

            {/* Widgets de Acción - COMPONENTES VISUALES SUPERIORES */}
            <WidgetsAtencion advancedMetrics={advancedMetrics} loading={loading} />

            {/* Progress Bar General - COMPONENTE VISUAL SUPERIOR */}
            <ProgresoGeneral kpiMetrics={enhancedKpiMetrics} loading={loading} />
          </Box>
        );
      
      case 1: // Historial de Notificaciones
        return <NotificationsHistory />;
      
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Principal */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 0.5 }}>
            Centro de Control - Matrizador
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Dashboard ejecutivo y gestión de documentos
          </Typography>
          {/* Comentamos por ahora la información de auto-refresh */}
          {/* {lastRefresh && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              🔄 Auto-refresh activo • Última actualización: {lastRefresh.toLocaleTimeString('es-EC')}
            </Typography>
          )} */}
        </Box>
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

      {/* Navegación entre Vistas */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentView} 
          onChange={(e, newValue) => setCurrentView(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<SpeedIcon />} 
            label="Dashboard" 
            sx={{ fontWeight: 'bold' }}
          />
          <Tab 
            icon={<HistoryIcon />} 
            label="Historial"
            sx={{ fontWeight: 'bold' }}
          />
        </Tabs>
      </Paper>

      {/* Loading Skeletons */}
      {loading && documents.length === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Cargando datos del dashboard...
          </Typography>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item}>
                <Card sx={{ height: 140 }}>
                  <CardContent>
                    <Skeleton variant="rectangular" width="100%" height={60} />
                    <Skeleton variant="text" width="80%" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Contenido Principal */}
      {!loading && documents.length === 0 && !error && (
        <EmptyState
          title="No tienes documentos asignados"
          message="Cuando se te asignen documentos, aparecerán en este dashboard con métricas y controles avanzados"
          icon={AssignmentIcon}
        />
      )}

      {/* Renderizar Vista Actual */}
      {(!loading || documents.length > 0) && renderCurrentView()}

      {/* Vista clásica por estado eliminada para mejorar rendimiento */}
    </Box>
  );
};

export default MatrizadorDashboard; 
