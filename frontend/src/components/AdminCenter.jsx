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
  Avatar,
  Button,
  Menu
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
import NotificationCenter from './notifications/NotificationCenter';
import NotificationSettings from './admin/NotificationSettings';
import NotificationTemplates from './admin/NotificationTemplates';
import WhatsAppTemplates from './admin/WhatsAppTemplates';
import AdminSettings from './admin/AdminSettings';
// import AdminFormulariosUAFE from './admin/AdminFormulariosUAFE';
import FormulariosUAFE from './FormulariosUAFE';
import AnalisisUAFE from './admin/AnalisisUAFE';
import QROversight from './admin/QROversight';
import EncuestasSatisfaccion from './admin/EncuestasSatisfaccion';
import { getSupervisionStats, getMatrizadores } from '../services/admin-supervision-service';
// Billing module components
import ImportarDatos from './billing/ImportarDatos';
import ListaFacturas from './billing/ListaFacturas';
import DetalleFactura from './billing/DetalleFactura';
import ListaPagos from './billing/ListaPagos';

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
        return <FormulariosUAFE adminMode={true} />;
      case 'analisis-uafe':
        return <AnalisisUAFE />;
      case 'notifications':
        return <NotificationCenter />;
      case 'notification-templates':
        return <NotificationTemplates />;
      case 'whatsapp-templates':
        return <WhatsAppTemplates />;
      case 'qr-management':
        return <QROversight />;
      case 'encuestas-satisfaccion':
        return <EncuestasSatisfaccion />;
      case 'settings':
        return <AdminSettings />;
      // === BILLING MODULE ROUTES ===
      case 'importar-datos':
        return <ImportarDatos />;
      case 'facturas':
        return <ListaFacturas />;
      case 'factura-detalle':
        return <DetalleFactura />;
      case 'pagos':
        return <ListaPagos />;
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
  const [statusFilter, setStatusFilter] = useState(''); // Filtro de estado
  const [billedTimeRange, setBilledTimeRange] = useState('current_month'); // Filtro Facturación
  // const [startDate, setStartDate] = useState(''); // Filtro fecha inicio (Removido por solicitud)
  // const [endDate, setEndDate] = useState(''); // Filtro fecha fin
  const [performanceTimeRange, setPerformanceTimeRange] = useState('current_month');
  const [matrizadores, setMatrizadores] = useState([]);

  // Paginación
  const [page, setPage] = useState(1);
  const [docsList, setDocsList] = useState([]); // Lista acumulativa
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Menu para filtro de facturación
  const [billingAnchorEl, setBillingAnchorEl] = useState(null);
  const [performanceAnchorEl, setPerformanceAnchorEl] = useState(null);

  useEffect(() => {
    loadMatrizadores();
  }, []);

  // Recargar al cambiar filtros principales (resetea paginación)
  useEffect(() => {
    setPage(1);
    loadStats(1, false);
  }, [thresholdDays, selectedMatrixer, statusFilter, billedTimeRange, performanceTimeRange]);

  const loadMatrizadores = async () => {
    try {
      const users = await getMatrizadores();
      setMatrizadores(users);
    } catch (e) {
      console.error('Error cargando matrizadores', e);
    }
  };

  const loadStats = async (pageNum = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const data = await getSupervisionStats({
        thresholdDays,
        matrixerId: selectedMatrixer,
        status: statusFilter,
        // startDate,
        // endDate,
        billedTimeRange,
        performanceTimeRange,
        page: pageNum,
        limit: 20
      });

      setStats(prev => isLoadMore ? { ...prev, ...data } : data); // Actualizar KPIs siempre

      // Manejo de lista con paginación
      const newDocs = data.criticalList || [];
      if (isLoadMore) {
        setDocsList(prev => [...prev, ...newDocs]);
      } else {
        setDocsList(newDocs);
      }

      setHasMore(data.pagination?.hasMore || false);
      setError(null);
    } catch (err) {
      setError('Error al cargar estadísticas de supervisión.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadStats(nextPage, true);
  };

  const handleBillingIntervalChange = (interval) => {
    setBilledTimeRange(interval);
    setBillingAnchorEl(null);
  };

  const handlePerformanceIntervalChange = (interval) => {
    setPerformanceTimeRange(interval);
    setPerformanceAnchorEl(null);
  };

  // Solo mostrar spinner completo si es la carga inicial y no tenemos datos
  if (loading && page === 1 && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  const { kpis, teamPerformance } = stats || {};

  // Mapping para textos de intervalos
  const billingIntervals = {
    'current_week': 'Esta Semana',
    'current_month': 'Mes Actual',
    'last_month': 'Mes Anterior',
    'year_to_date': 'Año Actual',
    'all_time': 'Histórico'
  };

  return (
    <Box>
      {/* Encabezado con Filtros */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DashboardIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight="bold">Supervisión</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {/* Filtro de Estado REQUERIDO */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={statusFilter}
              label="Estado"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">ALERTAS (Default)</MenuItem>

              <MenuItem value="EN_PROCESO">EN PROCESO</MenuItem>
              <MenuItem value="LISTO">LISTO</MenuItem>
              <MenuItem value="ENTREGADO">ENTREGADO</MenuItem>
            </Select>
          </FormControl>

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

          {/* <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">Desde:</Typography>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <Typography variant="body2" color="text.secondary">Hasta:</Typography>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </Box> */}

          <Tooltip title="Actualizar">
            <IconButton onClick={() => loadStats(1, false)} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            title="Total Activos"
            value={kpis?.activeCount || 0}
            icon={<DescriptionIcon />}
            color="primary"
            subtext="Trámites en curso"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            title={`Críticos (> ${thresholdDays}d)`}
            value={kpis?.criticalCount || 0}
            icon={<WarningIcon />}
            color="error"
            subtext="Requieren atención"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            title="Pendientes"
            value={kpis?.pendingCount || 0}
            icon={<DocumentIcon />}
            color="warning"
            subtext="Por iniciar"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            title="Listos"
            value={kpis?.readyCount || 0}
            icon={<CheckCircleIcon />}
            color="success"
            subtext="Para entregar"
          />
        </Grid>
        {/* Nueva Tarjeta Facturación */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={(e) => setBillingAnchorEl(e.currentTarget)}>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      FACTURADO ({billingIntervals[billedTimeRange]})
                    </Typography>
                    <RefreshIcon sx={{ fontSize: 14, ml: 0.5, color: 'text.secondary' }} />
                  </Box>
                  {/* Menu Dropdown para Facturación */}
                  <Menu
                    anchorEl={billingAnchorEl}
                    open={Boolean(billingAnchorEl)}
                    onClose={() => setBillingAnchorEl(null)}
                  >
                    <MenuItem onClick={() => handleBillingIntervalChange('current_month')}>Mes Actual</MenuItem>
                    <MenuItem onClick={() => handleBillingIntervalChange('last_month')}>Mes Anterior</MenuItem>
                    <MenuItem onClick={() => handleBillingIntervalChange('year_to_date')}>Año Actual</MenuItem>
                    <MenuItem onClick={() => handleBillingIntervalChange('all_time')}>Histórico</MenuItem>
                  </Menu>

                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    ${(kpis?.totalBilled || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.light', color: 'success.contrastText', display: 'flex' }}>
                  <MoneyIcon />
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Excluye anulados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            title="Eficiencia Semanal"
            value={`${kpis?.weeklyEfficiency || 0}%`}
            icon={<TrendingUpIcon />}
            color={kpis?.weeklyEfficiency > 80 ? "success" : "warning"}
            subtext="Entregados / Ingresados"
          />
        </Grid>
      </Grid>

      {/* Tabla de Documentos / Alertas */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <DescriptionIcon color={statusFilter ? "primary" : "error"} sx={{ mr: 1 }} />
            {statusFilter ? `Documentos: ${statusFilter}` : "Alertas de Retraso"}
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
                  <TableCell>Antigüedad</TableCell>
                  <TableCell>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {docsList.map((row) => {
                  const days = row.daysDelayed;
                  const isCritical = days > 15 && statusFilter === '';
                  // Si hay filtro de estado, no resaltamos tanto en rojo a menos que sea muy critico

                  return (
                    <TableRow key={row.id} hover>
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
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={row.status === 'LISTO' ? 'success' : row.status === 'EN_PROCESO' ? 'info' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${days}d`}
                          color={(days > 15 && !['ENTREGADO'].includes(row.status)) ? "error" : "default"}
                          size="small"
                          variant="outlined"
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
                {docsList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box sx={{ py: 3 }}>
                        <Typography color="textSecondary">No se encontraron documentos.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Load More Button */}
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={20} /> : null}
              >
                {loadingMore ? 'Cargando...' : 'Cargar más documentos'}
              </Button>
            </Box>
          )}

        </CardContent>
      </Card>

      {/* Rendimiento de Equipo */}
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Rendimiento de Equipo</Typography>
            <Box>
              <Button
                size="small"
                onClick={(e) => setPerformanceAnchorEl(e.currentTarget)}
                endIcon={<RefreshIcon />}
                sx={{ textTransform: 'none' }}
              >
                {billingIntervals[performanceTimeRange] || 'Filtro'}
              </Button>
              <Menu
                anchorEl={performanceAnchorEl}
                open={Boolean(performanceAnchorEl)}
                onClose={() => setPerformanceAnchorEl(null)}
              >
                <MenuItem onClick={() => handlePerformanceIntervalChange('current_month')}>Mes Actual</MenuItem>
                <MenuItem onClick={() => handlePerformanceIntervalChange('current_week')}>Esta Semana</MenuItem>
                <MenuItem onClick={() => handlePerformanceIntervalChange('year_to_date')}>Año Actual</MenuItem>
                <MenuItem onClick={() => handlePerformanceIntervalChange('all_time')}>Histórico</MenuItem>
              </Menu>
            </Box>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Matrizador</TableCell>
                  <TableCell align="center">Carga Activa</TableCell>
                  <TableCell align="center">Críticos</TableCell>
                  <TableCell align="center">Entregas ({billingIntervals[performanceTimeRange]})</TableCell>
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