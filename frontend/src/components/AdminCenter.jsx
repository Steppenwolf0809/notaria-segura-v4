import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Assessment as StatsIcon,
  Assignment as DocumentIcon,
  Security as SecurityIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  AccessTime as TimeIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import AdminLayout from './AdminLayout';
import UserManagement from './admin/UserManagement';
import DocumentOversight from './admin/DocumentOversight';
import NotificationHistory from './admin/NotificationHistory';
import NotificationSettings from './admin/NotificationSettings';
import NotificationTemplates from './admin/NotificationTemplates';
import WhatsAppTemplates from './admin/WhatsAppTemplates';
import AdminSettings from './admin/AdminSettings';
import AdminFormulariosUAFE from './admin/AdminFormulariosUAFE';
import { getDashboardStats } from '../services/admin-dashboard-service';

/**
 * Centro de administración - Panel principal para ADMIN
 * Ahora usando AdminLayout con sidebar como otros roles
 */
const AdminCenter = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  /**
   * Manejar cambios de vista
   */
  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  /**
   * Renderizar contenido según la vista actual
   */
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <AdminDashboard />;

      case 'users':
        return <UserManagement />;

      case 'documents':
        return <DocumentOversight />;

      case 'formularios-uafe':
        return <AdminFormulariosUAFE />;

      case 'notifications':
        return <NotificationHistory />;

      case 'notification-templates':
        return <NotificationTemplates />;

      case 'whatsapp-templates':
        return <WhatsAppTemplates />;

      case 'settings':
        return <AdminSettings />;

      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout currentView={currentView} onViewChange={handleViewChange}>
      {renderContent()}
    </AdminLayout>
  );
};

/**
 * Dashboard principal del administrador
 */
const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        setError('Error al cargar estadísticas del sistema');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
    );
  }

  const { kpis, charts, alerts } = stats || {};

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DashboardIcon sx={{ mr: 1, fontSize: 30, color: 'primary.main' }} />
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Panel de Control General
        </Typography>
      </Box>

      {/* KPIs Principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Trámites Totales"
            value={kpis?.totalDocuments || 0}
            icon={<DocumentIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Facturación Total"
            value={`$${(kpis?.totalFacturado || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            icon={<MoneyIcon />}
            color="success"
            subtext="Acumulado histórico"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Pendientes"
            value={kpis?.pendingCount || 0}
            icon={<TimeIcon />}
            color="warning"
            subtext="En proceso o pendientes"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Por Retirar"
            value={kpis?.readyCount || 0}
            icon={<DescriptionIcon />}
            color="info"
            subtext="Listos para entrega"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Sección de Alertas */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                Alertas y Atención Requerida
              </Typography>

              <Box sx={{ mt: 2 }}>
                {(!alerts?.stagnant?.length && !alerts?.uncollected?.length) && (
                  <Alert severity="success">Todo está al día. No hay trámites estancados ni olvidados.</Alert>
                )}

                {/* Trámites Estancados */}
                {alerts?.stagnant?.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="error" sx={{ fontWeight: 'bold', mb: 1 }}>
                      ⚠️ Trámites sin procesar ({'>'} 48h)
                    </Typography>
                    <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                      <List dense>
                        {alerts.stagnant.map(doc => (
                          <ListItem key={doc.id}>
                            <ListItemIcon><TimeIcon color="error" fontSize="small" /></ListItemIcon>
                            <ListItemText
                              primary={`${doc.protocolNumber || 'S/N'} - ${doc.clientName}`}
                              secondary={`${new Date(doc.createdAt).toLocaleDateString()} - ${doc.status}`}
                            />
                            <Chip size="small" label={doc.documentType} color="error" variant="outlined" />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                )}

                {/* Trámites No Retirados */}
                {alerts?.uncollected?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                      📦 Listos sin retirar ({'>'} 7 días)
                    </Typography>
                    <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                      <List dense>
                        {alerts.uncollected.map(doc => (
                          <ListItem key={doc.id}>
                            <ListItemIcon><DescriptionIcon color="warning" fontSize="small" /></ListItemIcon>
                            <ListItemText
                              primary={`${doc.protocolNumber || 'S/N'} - ${doc.clientName}`}
                              secondary={`Listo desde: ${new Date(doc.updatedAt).toLocaleDateString()}`}
                            />
                            <Chip size="small" label={doc.clientPhone} icon={<PersonIcon />} />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Resumen de Estados */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribución por Estado
              </Typography>
              <Box sx={{ mt: 3 }}>
                <StatusRow label="Pendiente" value={charts?.byStatus?.['PENDIENTE'] || 0} total={kpis?.totalDocuments} color="warning" />
                <StatusRow label="En Proceso" value={charts?.byStatus?.['EN_PROCESO'] || 0} total={kpis?.totalDocuments} color="info" />
                <StatusRow label="Listo" value={charts?.byStatus?.['LISTO'] || 0} total={kpis?.totalDocuments} color="success" />
                <StatusRow label="Entregado" value={charts?.byStatus?.['ENTREGADO'] || 0} total={kpis?.totalDocuments} color="primary" />
                <StatusRow label="Anulado (NC)" value={charts?.byStatus?.['ANULADO_NOTA_CREDITO'] || 0} total={kpis?.totalDocuments} color="error" />
              </Box>

              <Box sx={{ mt: 4, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Notas de Crédito Emitidas
                </Typography>
                <Typography variant="h4" color="error.main">
                  {kpis?.creditNotesCount || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Trámites anulados con nota de crédito
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const SummaryCard = ({ title, value, icon, color, subtext }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: `${color}.main` }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: `${color}.light`,
          color: `${color}.contrastText`,
          display: 'flex'
        }}>
          {React.cloneElement(icon, { fontSize: 'medium' })}
        </Box>
      </Box>
      {subtext && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          {subtext}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const StatusRow = ({ label, value, total, color }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight="bold">{value} ({percentage}%)</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
};

export default AdminCenter;