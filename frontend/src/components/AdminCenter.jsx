import React, { useState, useEffect, useRef } from 'react';
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
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
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

  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
  Pending as PendingIcon,
  PlayArrow as InProgressIcon,
  LocalShipping as DeliveredIcon,
  PriorityHigh as PriorityIcon,
  Style as StyleIcon,
  Gavel as GavelIcon,
  ArrowForward as ArrowForwardIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import InfoTooltip from './UI/InfoTooltip';
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
import DocumentTimeline from './Documents/DocumentTimeline';
import EnviarMensajeModal from './admin/EnviarMensajeModal';
import documentService from '../services/document-service';
import SeguimientoMensajes from './admin/SeguimientoMensajes';
// Billing module components
import ImportarDatos from './billing/ImportarDatos';
import ListaFacturas from './billing/ListaFacturas';
import DetalleFactura from './billing/DetalleFactura';
import ListaPagos from './billing/ListaPagos';
import Reportes from './billing/Reportes';
import FinancialHealthCard from './admin/FinancialHealthCard';
import ParticipacionEstado from './admin/ParticipacionEstado';
import billingService from '../services/billing-service';
import {
  getMonthRange,
  extractSubtotal,
  calculateStateParticipation,
  getSemaphoreState,
  calculateBracketProgress,
} from '../utils/stateParticipationCalculator';

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
        return <AdminDashboard onViewChange={handleViewChange} />;
      case 'users':
        return <UserManagement />;
      case 'documents':
        return <DocumentOversight />;
      case 'formularios-uafe':
        return <FormulariosUAFE adminMode={true} />;
      case 'analisis-uafe':
        return <AnalisisUAFE />;
      case 'participacion-estado':
        return <ParticipacionEstado />;
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
      case 'seguimiento-mensajes':
        return <SeguimientoMensajes />;
      // === BILLING MODULE ROUTES ===
      case 'importar-datos':
        return <ImportarDatos />;
      case 'facturas':
        return <ListaFacturas />;
      case 'factura-detalle':
        return <DetalleFactura />;
      case 'pagos':
        return <ListaPagos />;
      case 'reportes':
        return <Reportes />;
      default:
        return <AdminDashboard onViewChange={handleViewChange} />;
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
// ── WIDGET PARTICIPACIÓN (DASHBOARD) ──
const ParticipationWidget = ({ onViewChange, subtotal, loading }) => {
  const now = new Date();
  const paymentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const paymentMonthName = paymentMonth.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
  const billingMonthName = now.toLocaleDateString('es-EC', { month: 'long' });

  const formatMoney = (value) =>
    '$' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatMoneyShort = (value) => {
    const n = Number(value || 0);
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
    return '$' + n.toFixed(0);
  };

  const calc = calculateStateParticipation(subtotal || 0);
  const progress = calculateBracketProgress(subtotal || 0, calc.bracketInfo);
  const semaphore = getSemaphoreState(progress.remaining, progress.isTopBracket);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(148, 163, 184, 0.12)',
        background: 'rgba(255, 255, 255, 0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: '#6366f120',
            color: '#6366f1',
            display: 'flex'
          }}>
            <GavelIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Participación Estado
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Facturado en {billingMonthName}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={() => onViewChange('participacion-estado')}
          sx={{ color: 'primary.main', bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
        >
          <ArrowForwardIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
            <CircularProgress size={18} />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                A pagar por lo facturado hasta hoy
              </Typography>
              <Box sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: semaphore.color,
                boxShadow: `0 0 4px ${semaphore.color}60`,
                flexShrink: 0,
              }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
              {formatMoney(calc.totalToPay)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Base Imponible (sin IVA): {formatMoney(subtotal)}
            </Typography>
          </>
        )}
      </Box>

      {/* ── Bracket Progress Bar ── */}
      {!loading && (
        <Box sx={{ mt: 1.5, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Esquema {calc.bracketLevel}
            </Typography>
            {progress.isTopBracket ? (
              <Chip
                size="small"
                label="Tramo máximo"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  bgcolor: 'rgba(100, 116, 139, 0.12)',
                  color: '#64748b',
                  fontWeight: 700,
                }}
              />
            ) : (
              <Typography variant="caption" sx={{ color: semaphore.color, fontWeight: 700 }}>
                {formatMoney(progress.remaining)} para Esquema {calc.bracketLevel + 1}
              </Typography>
            )}
          </Box>

          {/* Progress bar */}
          <Box sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'rgba(148, 163, 184, 0.12)',
            overflow: 'hidden',
          }}>
            <Box sx={{
              height: '100%',
              borderRadius: 4,
              width: `${Math.min(progress.percent, 100)}%`,
              bgcolor: semaphore.color,
              transition: 'width 0.6s ease-in-out',
              boxShadow: `0 0 6px ${semaphore.color}40`,
            }} />
          </Box>

          {/* Range labels */}
          {!progress.isTopBracket && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.3 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
                {formatMoneyShort(calc.bracketInfo.lowerLimit)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem', fontWeight: 600 }}>
                {Math.round(progress.percent)}%
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
                {formatMoneyShort(calc.bracketInfo.nextBracketAt)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
        <ScheduleIcon sx={{ fontSize: 14 }} />
        Pagar hasta el 10 de {paymentMonthName}
      </Typography>
    </Paper>
  );
};

const AdminDashboard = ({ onViewChange }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [thresholdDays, setThresholdDays] = useState(15);
  const [selectedMatrixer, setSelectedMatrixer] = useState('');
  const [statusFilter, setStatusFilter] = useState('EN_PROCESO'); // Filtro de estado por defecto EN_PROCESO
  const [billedTimeRange, setBilledTimeRange] = useState('current_month'); // Filtro Facturación
  // const [startDate, setStartDate] = useState(''); // Filtro fecha inicio (Removido por solicitud)
  // const [endDate, setEndDate] = useState(''); // Filtro fecha fin
  const [performanceTimeRange, setPerformanceTimeRange] = useState('current_month');

  const [matrizadores, setMatrizadores] = useState([]);
  const [currentMonthBilled, setCurrentMonthBilled] = useState(0);
  const [participationLoading, setParticipationLoading] = useState(true);

  // Mapeo de tipos de acto a badges - Paleta refinada y elegante
  const actoBadges = {
    'PROTOCOLO': { label: 'P', color: '#1e3a5f', bgColor: 'rgba(30, 58, 95, 0.1)' },      // Azul marino
    'CERTIFICACION': { label: 'C', color: '#2f5233', bgColor: 'rgba(47, 82, 51, 0.1)' },  // Verde bosque
    'ARRENDAMIENTO': { label: 'A', color: '#5b4a6c', bgColor: 'rgba(91, 74, 108, 0.1)' }, // Púrpura grisáceo
    'DECLARACION': { label: 'D', color: '#8b5a2b', bgColor: 'rgba(139, 90, 43, 0.1)' },   // Marrón arcilla
    'RECONOCIMIENTO': { label: 'R', color: '#5a6572', bgColor: 'rgba(90, 101, 114, 0.1)' }, // Gris pizarra
    'DILIGENCIA': { label: 'Di', color: '#2c5f6f', bgColor: 'rgba(44, 95, 111, 0.1)' },    // Azul petróleo
    'OTROS': { label: 'O', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' }        // Gris neutro
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDIENTE': return <PendingIcon fontSize="small" />;
      case 'EN_PROCESO': return <InProgressIcon fontSize="small" />;
      case 'LISTO': return <CheckCircleIcon fontSize="small" />;
      case 'ENTREGADO': return <DeliveredIcon fontSize="small" />;
      default: return <PendingIcon fontSize="small" />;
    }
  };

  // Paginación
  const [page, setPage] = useState(1);
  const [docsList, setDocsList] = useState([]); // Lista acumulativa
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Menu para filtro de facturación
  const [billingAnchorEl, setBillingAnchorEl] = useState(null);
  const [performanceAnchorEl, setPerformanceAnchorEl] = useState(null);

  // Ref para scroll al hacer clic en rendimiento de equipo
  const docsCardRef = useRef(null);

  // Modal de mensaje
  const [mensajeModalOpen, setMensajeModalOpen] = useState(false);
  const [documentoParaMensaje, setDocumentoParaMensaje] = useState(null);

  const handleOpenMensajeModal = (doc) => {
    // Necesitamos pasar un objeto compatible con lo que espera el modal (assignedTo es crucial)
    const docAdaptado = {
      ...doc,
      id: doc.id,
      protocolNumber: doc.protocol,
      clientName: doc.client,
      // Si el objeto row ya trae AssignedTo completo genial, si no, intentamos adaptarlo
      // En getSupervisionStats el backend suele devolver matrixer como nombre string.
      // El modal espera assignedTo: { id, firstName, lastName }
      // Revisando el servicio, parece que row.matrixer es un string.
      // OJO: Si row.matrixer es solo string, el modal fallará al intentar leer assignedTo.id
      // En DocumentOversight funciona porque recibe el objeto completo de /admin/documents/oversight
      // Aquí estamos recibiendo DTOs de estadísticas simplificados.
      // SOLUCIÓN: Usaremos assignedTo si existe en row, o reconstruiremos un objeto básico si tenemos ID.
      // Revisando getSupervisionStats en backend, devuelve: 
      // id, protocol, client, type, status, daysDelayed, matrixer (nombre), matrixerId (id)
      assignedTo: doc.matrixerId ? { id: doc.matrixerId, firstName: doc.matrixer, lastName: '' } : null
    };

    setDocumentoParaMensaje(docAdaptado);
    setMensajeModalOpen(true);
  };

  // Modal de detalles de documento
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Handler para ver detalles
  const handleViewDetails = async (document) => {
    // Abrir rápido con datos disponibles
    setSelectedDocument(document);
    setDetailsModalOpen(true);

    // En segundo plano, traer detalle completo (incluye fechaFactura)
    try {
      if (document?.id) {
        const res = await documentService.getDocumentById(document.id);
        if (res.success && res.data?.document) {
          setSelectedDocument(prev => ({ ...prev, ...res.data.document }));
        }
      }
    } catch (e) {
      // Silencioso: mantenemos datos básicos si falla
      console.warn('No se pudo refrescar detalle del documento:', e?.message);
    }
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedDocument(null);
  };

  useEffect(() => {
    loadMatrizadores();
  }, []);

  useEffect(() => {
    loadCurrentMonthParticipation();
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

  const loadCurrentMonthParticipation = async () => {
    try {
      setParticipationLoading(true);
      const { fromISO, toISO } = getMonthRange(new Date(), { currentMonthUntilToday: true });
      const summary = await billingService.getSummary({
        dateFrom: fromISO,
        dateTo: toISO
      });
      // Usar subtotal directo de la BD (Base Imponible sin IVA)
      const subtotalFromDB = Number(summary?.totals?.subtotalInvoiced || 0);
      const totalWithIVA = Number(summary?.totals?.invoiced || 0);
      // Fallback: si no hay subtotal en BD, estimar dividiendo por 1.15
      setCurrentMonthBilled(subtotalFromDB > 0 ? subtotalFromDB : Number(extractSubtotal(totalWithIVA)));
    } catch (e) {
      console.error('Error cargando participacion', e);
      setCurrentMonthBilled(0);
    } finally {
      setParticipationLoading(false);
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

  // Handler: clic en fila de rendimiento -> filtrar documentos críticos de ese matrizador
  const handleTeamRowClick = (member) => {
    setSelectedMatrixer(member.id);
    setStatusFilter('');  // '' = ALERTAS (Default) -> muestra documentos críticos/retrasados
    // Scroll suave a la tabla de documentos
    setTimeout(() => {
      docsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // currentMonthBilled ya es subtotal (sin IVA) — se pasa directo al widget

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

      {/* === KPIs AGRUPADOS === */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* ── GRUPO GESTIÓN ── */}
        <Grid item xs={12} md={7}>
          <Box sx={{
            p: 2.5,
            borderRadius: 3,
            border: '1px solid rgba(148, 163, 184, 0.12)',
            bgcolor: 'rgba(248, 250, 252, 0.5)',
          }}>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', mb: 2, display: 'block' }}
            >
              GESTIÓN OPERATIVA
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <SummaryCard title="Activos" value={kpis?.activeCount || 0} icon={<DescriptionIcon />} color="primary" subtext="En curso" infoTooltip="Documentos que aun no han llegado a estado final (escritura entregada o cancelado)." />
              </Grid>
              <Grid item xs={6} sm={3}>
                <SummaryCard title={`Críticos`} value={kpis?.criticalCount || 0} icon={<WarningIcon />} color="error" subtext={`> ${thresholdDays}d`} infoTooltip={`Documentos que superan ${thresholdDays} dias en su estado actual. Ajuste el umbral en el filtro "Umbral Retraso".`} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <SummaryCard title="En Proceso" value={kpis?.inProgressCount || 0} icon={<InProgressIcon />} color="info" subtext="En curso" infoTooltip="Documentos asignados a un matrizador que estan siendo trabajados activamente." />
              </Grid>
              <Grid item xs={6} sm={3}>
                <SummaryCard title="Listos" value={kpis?.readyCount || 0} icon={<CheckCircleIcon />} color="success" subtext="Para entregar" infoTooltip="Documentos completados por el matrizador, pendientes de entrega al cliente." />
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* --- GRUPO FINANZAS --- */}
        <Grid item xs={12} md={5}>
          <Box sx={{
            p: 2.5,
            borderRadius: 3,
            border: '1px solid rgba(148, 163, 184, 0.12)',
            bgcolor: 'rgba(248, 250, 252, 0.5)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}
              >
                INTELIGENCIA FINANCIERA
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={(e) => setBillingAnchorEl(e.currentTarget)}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
                  {billingIntervals[billedTimeRange]}
                </Typography>
                <RefreshIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              </Box>
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
            </Box>
            <Box sx={{ flex: 1 }}>
              <FinancialHealthCard
                totalBilled={kpis?.totalBilled || kpis?.totalInvoiceBilled || 0}
                totalCollected={kpis?.totalCollected || 0}
                periodLabel={billingIntervals[billedTimeRange]}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <SummaryCard
                title="Eficiencia Semanal"
                value={`${kpis?.weeklyEfficiency || 0}%`}
                icon={<TrendingUpIcon />}
                color={kpis?.weeklyEfficiency > 80 ? "success" : "warning"}
                subtext="Entregados / Ingresados"
                infoTooltip="Ritmo de salida: mide si el equipo esta cerrando mas tramites de los que abre en los ultimos 7 dias."
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              {/* WIDGET PARTICIPACIÓN */}
              <ParticipationWidget
                onViewChange={onViewChange}
                subtotal={currentMonthBilled}
                loading={participationLoading}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Tabla de Documentos / Alertas */}
      <Card variant="outlined" sx={{ mb: 3 }} ref={docsCardRef}>
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
                      <TableCell sx={{
                        fontWeight: 'bold',
                        color: isCritical ? 'error.main' : 'inherit'
                      }}>
                        {isCritical && <PriorityIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />}
                        {row.protocol || 'S/N'}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={row.client}>
                          <span>{row.client}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                            {row.matrixer?.charAt(0) || '?'}
                          </Avatar>
                          <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
                            {row.matrixer || 'Sin asignar'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {(() => {
                          const badge = actoBadges[row.type] || actoBadges['OTROS'];
                          return (
                            <Tooltip title={row.type}>
                              <Avatar sx={{ bgcolor: badge.color, width: 24, height: 24, fontSize: 12, margin: '0 auto' }}>
                                {badge.label}
                              </Avatar>
                            </Tooltip>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(row.status)}
                          label={row.status}
                          size="small"
                          sx={{
                            '& .MuiChip-label': { fontSize: '0.75rem', fontWeight: 500 },
                            height: 26,
                            backgroundColor: row.status === 'LISTO'
                              ? 'rgba(4, 120, 87, 0.1)'
                              : row.status === 'EN_PROCESO'
                                ? 'rgba(2, 132, 199, 0.1)'
                                : row.status === 'ENTREGADO'
                                  ? 'rgba(100, 116, 139, 0.1)'
                                  : 'rgba(217, 119, 6, 0.1)',
                            color: row.status === 'LISTO'
                              ? '#047857'
                              : row.status === 'EN_PROCESO'
                                ? '#0284c7'
                                : row.status === 'ENTREGADO'
                                  ? '#64748b'
                                  : '#d97706',
                            border: '1px solid',
                            borderColor: row.status === 'LISTO'
                              ? 'rgba(4, 120, 87, 0.2)'
                              : row.status === 'EN_PROCESO'
                                ? 'rgba(2, 132, 199, 0.2)'
                                : row.status === 'ENTREGADO'
                                  ? 'rgba(100, 116, 139, 0.2)'
                                  : 'rgba(217, 119, 6, 0.2)',
                            '& .MuiChip-icon': {
                              color: 'inherit'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${days}d`}
                          color={(days > 15 && !['ENTREGADO'].includes(row.status)) ? "error" : "default"}
                          size="small"
                          variant="outlined"
                          sx={{ height: 24 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Ver Detalles">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(row)}
                            data-testid="btn-ver-detalles"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Enviar Mensaje Interno">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              // Intentar encontrar ID si falta
                              if (!row.matrixerId && row.matrixer) {
                                const mat = matrizadores.find(m => `${m.firstName} ${m.lastName}` === row.matrixer || m.firstName === row.matrixer);
                                if (mat) row.matrixerId = mat.id;
                              }
                              handleOpenMensajeModal(row);
                            }}
                            disabled={!row.matrixerId && !matrizadores.some(m => `${m.firstName} ${m.lastName}` === row.matrixer || m.firstName === row.matrixer)}
                          >
                            <ChatIcon fontSize="small" />
                          </IconButton>
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
                  <TableCell align="center">Carga Activa <InfoTooltip text="Documentos activos asignados actualmente a este matrizador." /></TableCell>
                  <TableCell align="center">Críticos <InfoTooltip text="Documentos que superan el umbral de dias permitido en su estado actual." /></TableCell>
                  <TableCell align="center">Entregas ({billingIntervals[performanceTimeRange]})</TableCell>
                  <TableCell align="center">Velocidad Prom. <InfoTooltip text="Dias promedio que tarda este matrizador en completar un documento, desde asignacion hasta estado Listo." /></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamPerformance?.map((member) => {
                  const isSaturated = member.avgVelocityDays > 15 || member.activeLoad > 300;
                  return (
                    <Tooltip
                      key={member.id}
                      title={isSaturated ? '⚠️ Riesgo de incumplimiento legal por saturación' : ''}
                      placement="left"
                      arrow
                    >
                      <TableRow
                        onClick={() => handleTeamRowClick(member)}
                        sx={{
                          cursor: 'pointer',
                          ...(isSaturated && {
                            bgcolor: 'rgba(220, 38, 38, 0.04)',
                            borderLeft: '3px solid #dc2626',
                            '& td': { color: '#991b1b' },
                          }),
                          transition: 'background-color 0.2s ease',
                          '&:hover': { bgcolor: isSaturated ? 'rgba(220, 38, 38, 0.08)' : 'rgba(0,0,0,0.04)' },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {member.name}
                            {isSaturated && <WarningIcon sx={{ fontSize: 16, color: '#dc2626' }} />}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            fontWeight={member.activeLoad > 300 ? 'bold' : 'regular'}
                            color={member.activeLoad > 300 ? 'error' : 'textPrimary'}
                          >
                            {member.activeLoad}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography color={member.criticalCount > 0 ? "error" : "textPrimary"} fontWeight={member.criticalCount > 0 ? "bold" : "regular"}>
                            {member.criticalCount}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{member.deliveredMonth}</TableCell>
                        <TableCell align="center">
                          <Typography
                            fontWeight={member.avgVelocityDays > 15 ? 'bold' : 'regular'}
                            color={member.avgVelocityDays > 15 ? 'error' : 'textPrimary'}
                          >
                            {member.avgVelocityDays > 0 ? `${member.avgVelocityDays}d` : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </Tooltip>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Modal de Detalles de Documento */}
      <Dialog
        open={detailsModalOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        data-testid="modal-detalles"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                Detalles del Documento
              </Typography>
            </Box>
            <IconButton onClick={handleCloseDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDocument && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary">Número de Protocolo</Typography>
                <Typography variant="body1" fontWeight="bold" data-testid="detalle-numero">
                  {selectedDocument.protocol || 'S/N'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary">Estado Actual</Typography>
                <Box>
                  <Chip
                    label={selectedDocument.status}
                    size="small"
                    color={selectedDocument.status === 'LISTO' ? 'success' : selectedDocument.status === 'EN_PROCESO' ? 'info' : 'default'}
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary">Cliente</Typography>
                <Typography variant="body1">{selectedDocument.client || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary">Tipo de Acto</Typography>
                <Typography variant="body1">{selectedDocument.type || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary">N° Factura</Typography>
                <Typography variant="body1" color={selectedDocument.numeroFactura ? 'textPrimary' : 'textSecondary'}>
                  {selectedDocument.numeroFactura || 'Sin asignar'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary">Fecha de Factura</Typography>
                <Typography variant="body1">
                  {selectedDocument.fechaFactura
                    ? new Date(selectedDocument.fechaFactura).toLocaleDateString('es-EC')
                    : '—'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary">Matrizador Asignado</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}>
                    {selectedDocument.matrixer?.charAt(0) || '?'}
                  </Avatar>
                  <Typography variant="body1">{selectedDocument.matrixer || 'Sin asignar'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary">Antigüedad</Typography>
                <Typography variant="body1" color={selectedDocument.daysDelayed > 15 ? 'error.main' : 'textPrimary'}>
                  {selectedDocument.daysDelayed} días
                </Typography>
              </Grid>
              {selectedDocument.id && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="overline" color="textSecondary">ID del Documento</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    {selectedDocument.id}
                  </Typography>
                </Grid>
              )}

              {/* Timeline del documento */}
              {selectedDocument.id && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    <DocumentTimeline
                      documentId={selectedDocument.id}
                      showRefresh={true}
                      showLoadMore={true}
                      autoRefresh={false}
                      options={{
                        limit: 20,
                        fallbackToSimulated: false
                      }}
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDetails} variant="outlined" startIcon={<CloseIcon />}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      <EnviarMensajeModal
        open={mensajeModalOpen}
        onClose={() => setMensajeModalOpen(false)}
        documento={documentoParaMensaje}
        onSuccess={() => {
          // Opcional: recargar estadísticas si queremos ver cambios inmediatos
          loadStats(page, false);
        }}
      />
    </Box >
  );
};

// Paleta de colores refinada para KPIs
const kpiColors = {
  primary: { main: '#1e3a5f', light: 'rgba(30, 58, 95, 0.08)', contrast: '#fff' },
  success: { main: '#047857', light: 'rgba(4, 120, 87, 0.08)', contrast: '#fff' },
  warning: { main: '#d97706', light: 'rgba(217, 119, 6, 0.08)', contrast: '#fff' },
  error: { main: '#be123c', light: 'rgba(190, 18, 60, 0.08)', contrast: '#fff' },
  info: { main: '#0284c7', light: 'rgba(2, 132, 199, 0.08)', contrast: '#fff' },
  neutral: { main: '#64748b', light: 'rgba(100, 116, 139, 0.08)', contrast: '#fff' }
};

const SummaryCard = ({ title, value, icon, color = 'primary', subtext, infoTooltip }) => {
  const themeColor = kpiColors[color] || kpiColors.primary;

  return (
    <Card
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        '&:hover': {
          boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -5px rgba(0, 0, 0, 0.02)',
        }
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="overline"
              sx={{
                color: 'text.secondary',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                mb: 0.5,
                display: 'block'
              }}
            >
              {title}
              {infoTooltip && <InfoTooltip text={infoTooltip} />}
            </Typography>
            <Typography
              variant="h4"
              component="div"
              sx={{
                fontWeight: 700,
                color: themeColor.main,
                fontSize: '1.875rem',
                lineHeight: 1.2,
                letterSpacing: '-0.02em'
              }}
            >
              {value}
            </Typography>
          </Box>
          <Box sx={{
            p: 1.25,
            borderRadius: 2.5,
            backgroundColor: themeColor.light,
            color: themeColor.main,
            display: 'flex',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.03)'
          }}>
            {React.cloneElement(icon, {
              fontSize: 'small',
              sx: { opacity: 0.9 }
            })}
          </Box>
        </Box>
        {subtext && (
          <Typography
            variant="caption"
            sx={{
              mt: 1.5,
              display: 'block',
              color: 'text.secondary',
              fontWeight: 500
            }}
          >
            {subtext}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminCenter;
