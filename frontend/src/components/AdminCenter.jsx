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
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar
} from '@mui/material';
import {
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Assignment as DocumentIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon
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
import { getSupervisionStats, getMatrizadores } from '../services/admin-supervision-service';

/**
 * Centro de administración - Panel principal para ADMIN
 */
const AdminCenter = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

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
 * Dashboard de Supervisión
 */
const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [thresholdDays, setThresholdDays] = useState(15);
  const [selectedMatrixer, setSelectedMatrixer] = useState('');
  const [matrizadores, setMatrizadores] = useState([]);

  useEffect(() => {
    loadMatrizadores();
  }, []);

  useEffect(() => {
    loadStats();
  }, [thresholdDays, selectedMatrixer]);

  const loadMatrizadores = async () => {
    try {
      const users = await getMatrizadores();
      setMatrizadores(users);
    } catch (e) {
      console.error('Error cargando matrizadores', e);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getSupervisionStats({
        thresholdDays,
        matrixerId: selectedMatrixer
      });
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar estadísticas de supervisión.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  const { kpis, criticalList, teamPerformance } = stats || {};

  return (
    <Box>
      {/* Encabezado con Filtros */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DashboardIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight="bold">Supervisión</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Umbral Retraso</InputLabel>
            <Select
              value={thresholdDays}
              label="Umbral Retraso"
              onChange={(e) => setThresholdDays(e.target.value)}
            >
              <MenuItem value={5}>5 días</MenuItem>
              <MenuItem value={10}>10 días</MenuItem>
              <MenuItem value={15}>15 días</MenuItem>
              <MenuItem value={30}>30 días</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Matrizador</InputLabel>
            <Select
              value={selectedMatrixer}
              label="Matrizador"
              onChange={(e) => setSelectedMatrixer(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {matrizadores.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Actualizar">
            <IconButton onClick={loadStats} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            title="Total Activos"
            value={kpis?.activeCount || 0}
            icon={<DescriptionIcon />}
            color="primary"
            subtext="Trámites en curso"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            title={`Críticos (> ${thresholdDays}d)`}
            value={kpis?.criticalCount || 0}
            icon={<WarningIcon />}
            color="error"
            subtext="Requieren atención"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            title="Eficiencia Semanal"
            value={`${kpis?.weeklyEfficiency || 0}%`}
            icon={<TrendingUpIcon />}
            color={kpis?.weeklyEfficiency > 80 ? "success" : "warning"}
            subtext="Entregados / Ingresados"
          />
        </Grid>
      </Grid>

      {/* Tabla de Alertas Críticas */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <ErrorIcon color="error" sx={{ mr: 1 }} />
            Alertas de Retraso
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Protocolo</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Matrizador</TableCell>
                  <TableCell>Acto</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Días</TableCell>
                  <TableCell>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {criticalList?.map((row) => {
                  const isCritical = row.daysDelayed > 15;
                  const isWarning = row.daysDelayed >= 10 && row.daysDelayed <= 15;
                  let bgSx = {};
                  if (isCritical) bgSx = { bgcolor: '#ffebee' };
                  else if (isWarning) bgSx = { bgcolor: '#fff3e0' };

                  return (
                    <TableRow key={row.id} sx={bgSx}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{row.protocol || 'S/N'}</TableCell>
                      <TableCell>{row.client}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}>
                            {row.matrixer?.charAt(0) || '?'}
                          </Avatar>
                          {row.matrixer}
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={row.type} size="small" variant="outlined" /></TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${row.daysDelayed}d`}
                          color={isCritical ? "error" : "warning"}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Ver Detalles">
                          <IconButton size="small"><VisibilityIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!criticalList || criticalList.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box sx={{ py: 3 }}>
                        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography>¡Excelente! No hay trámites con retraso crítico.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Rendimiento de Equipo */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Rendimiento de Equipo</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Matrizador</TableCell>
                  <TableCell align="center">Carga Activa</TableCell>
                  <TableCell align="center">Críticos</TableCell>
                  <TableCell align="center">Entregas (Mes)</TableCell>
                  <TableCell align="center">Velocidad Prom.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamPerformance?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{member.name}</TableCell>
                    <TableCell align="center">{member.activeLoad}</TableCell>
                    <TableCell align="center">
                      <Typography color={member.criticalCount > 0 ? "error" : "textPrimary"} fontWeight={member.criticalCount > 0 ? "bold" : "regular"}>
                        {member.criticalCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{member.deliveredMonth}</TableCell>
                    <TableCell align="center">
                      {member.avgVelocityDays > 0 ? `${member.avgVelocityDays}d` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

const SummaryCard = ({ title, value, icon, color, subtext }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="overline">{title}</Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: `${color}.main` }}>{value}</Typography>
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}.light`, color: `${color}.contrastText`, display: 'flex' }}>
          {React.cloneElement(icon, { fontSize: 'medium' })}
        </Box>
      </Box>
      {subtext && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>{subtext}</Typography>
      )}
    </CardContent>
  </Card>
);

export default AdminCenter;