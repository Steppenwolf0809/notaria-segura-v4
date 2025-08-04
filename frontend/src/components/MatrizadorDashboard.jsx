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
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  History as HistoryIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import DocumentCard from './DocumentCard';
import KanbanBoard from './Documents/KanbanBoard';
import DocumentsList from './Documents/DocumentsList';
import NotificationsHistory from './Documents/NotificationsHistory';
import useDocumentStore from '../store/document-store';
import useStats from '../hooks/useStats';
import useDocuments from '../hooks/useDocuments';

/**
 * Dashboard ejecutivo mejorado para el rol Matrizador
 * Incluye KPIs, centro de control y navegación entre vistas
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
  const [currentView, setCurrentView] = useState(0); // 0: Dashboard, 1: Kanban, 2: Lista, 3: Historial

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

  /**
   * Documentos por estado
   */
  const pendingDocs = getDocumentsByStatus('PENDIENTE');
  const inProgressDocs = getDocumentsByStatus('EN_PROCESO');
  const readyDocs = getDocumentsByStatus('LISTO');
  const deliveredDocs = getDocumentsByStatus('ENTREGADO');

  /**
   * Componente KPI Card mejorado
   */
  const KPICard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15, ${color}05)` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color, mb: 0.5 }}>
              {value}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            <Icon sx={{ fontSize: 28 }} />
          </Avatar>
        </Box>
        {trend && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
            <Typography variant="caption" color="success.main">
              {trend}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  /**
   * Widget de documentos que requieren atención
   */
  const AttentionWidget = () => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WarningIcon sx={{ color: 'warning.main', mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
            Requieren Atención
          </Typography>
          <Badge badgeContent={advancedMetrics.needAttention.length} color="warning" sx={{ ml: 1 }} />
        </Box>
        
        {advancedMetrics.needAttention.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.light', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              ¡Excelente! No hay documentos atrasados
            </Typography>
          </Box>
        ) : (
          <List dense>
            {advancedMetrics.needAttention.slice(0, 3).map((doc) => (
              <ListItem key={doc.id} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.light', width: 32, height: 32 }}>
                    <AccessTimeIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={doc.clientName}
                  secondary={`${doc.documentType} - ${Math.floor((new Date() - new Date(doc.createdAt)) / (1000 * 60 * 60 * 24))} días`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
            {advancedMetrics.needAttention.length > 3 && (
              <ListItem sx={{ px: 0, justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  +{advancedMetrics.needAttention.length - 3} documentos más
                </Typography>
              </ListItem>
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );

  /**
   * Widget de actividad reciente
   */
  const RecentActivityWidget = () => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <NotificationsIcon sx={{ color: 'info.main', mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
            Actividad Reciente
          </Typography>
        </Box>
        
        <List dense>
          {advancedMetrics.todayDocs.slice(0, 4).map((doc, index) => (
            <ListItem key={doc.id} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ 
                  bgcolor: doc.status === 'LISTO' ? 'success.main' : 'info.main', 
                  width: 32, 
                  height: 32 
                }}>
                  {doc.status === 'LISTO' ? 
                    <CheckCircleIcon sx={{ fontSize: 16 }} /> : 
                    <AssignmentIcon sx={{ fontSize: 16 }} />
                  }
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${doc.clientName}`}
                secondary={`${doc.documentType} - Hoy`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <ListItemSecondaryAction>
                <Chip
                  label={doc.status === 'LISTO' ? 'Completado' : 'En Proceso'}
                  size="small"
                  color={doc.status === 'LISTO' ? 'success' : 'info'}
                  variant="outlined"
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          
          {advancedMetrics.todayDocs.length === 0 && (
            <ListItem sx={{ px: 0, justifyContent: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No hay actividad reciente hoy
              </Typography>
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );

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

  /**
   * Renderizar vista según la pestaña seleccionada
   */
  const renderCurrentView = () => {
    switch (currentView) {
      case 0: // Dashboard
        return (
          <Box>
            {/* KPIs Principales */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title={kpiMetrics.totalActive.label}
                  value={kpiMetrics.totalActive.value}
                  icon={AssignmentIcon}
                  color="#3b82f6"
                  subtitle="Documentos activos"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title={kpiMetrics.inProgress.label}
                  value={kpiMetrics.inProgress.value}
                  icon={ScheduleIcon}
                  color="#f59e0b"
                  trend={kpiMetrics.inProgress.trend}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title={kpiMetrics.readyForDelivery.label}
                  value={kpiMetrics.readyForDelivery.value}
                  icon={CheckCircleIcon}
                  color="#10b981"
                  trend={kpiMetrics.readyForDelivery.trend}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title={kpiMetrics.avgTime.label}
                  value={kpiMetrics.avgTime.value}
                  icon={SpeedIcon}
                  color="#6366f1"
                  subtitle="Tiempo de procesamiento"
                />
              </Grid>
            </Grid>

            {/* Widgets de Acción */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <AttentionWidget />
              </Grid>
              <Grid item xs={12} md={6}>
                <RecentActivityWidget />
              </Grid>
            </Grid>

            {/* Progress Bar General */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Progreso General
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                    {kpiMetrics.productivity.value}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={kpiMetrics.productivity.numericValue} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Documentos completados del total asignado
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );
      
      case 1: // Vista Kanban
        return <KanbanBoard />;
      
      case 2: // Vista Lista
        return <DocumentsList />;
      
      case 3: // Historial de Notificaciones
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
            icon={<ViewModuleIcon />} 
            label="Vista Kanban"
            sx={{ fontWeight: 'bold' }}
          />
          <Tab 
            icon={<ViewListIcon />} 
            label="Vista Lista"
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

      {/* Vista Clásica de Documentos (Solo visible en Dashboard) */}
      {currentView === 0 && !loading && documents.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 3, color: 'text.primary', fontWeight: 'bold' }}>
            Vista Detallada por Estado
          </Typography>

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
      )}
    </Box>
  );
};

export default MatrizadorDashboard; 