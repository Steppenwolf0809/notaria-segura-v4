import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';

import apiClient from '../../services/api-client';
import useAuthStore from '../../store/auth-store';

import UAFEKPICards from './UAFEKPICards';
import UAFEStatusPipeline from './UAFEStatusPipeline';
import UAFEProtocolTable from './UAFEProtocolTable';
import UAFEProtocolDetail from './UAFEProtocolDetail';
import UAFEReportPanel from './UAFEReportPanel';
import { UAFE_COLORS, getSemaforoFromProtocol, ESTADOS_PROTOCOLO_FLOW } from './uafe-constants';

/**
 * UAFEDashboard - Main container for the redesigned UAFE module
 *
 * Replaces the monolithic FormulariosUAFE.jsx with a modular,
 * professional compliance dashboard.
 */
export default function UAFEDashboard() {
  // ── Auth / Role ─────────────────────────────────────────────
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role || '';
  const isOficialOrAdmin = ['ADMIN', 'SUPER_ADMIN', 'OFICIAL_CUMPLIMIENTO'].includes(userRole);

  // ── State ─────────────────────────────────────────────────────
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0=Protocolos, 1=Reportes
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    tipoActo: '',
  });

  // ── Data fetching ─────────────────────────────────────────────
  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    try {
      // OFICIAL_CUMPLIMIENTO and ADMIN see ALL protocols via admin endpoint
      const endpoint = isOficialOrAdmin
        ? '/formulario-uafe/admin/protocolos'
        : '/formulario-uafe/protocolos';
      const { data } = await apiClient.get(endpoint, {
        params: { limit: 200 },
      });
      setProtocols(data.data || data.protocolos || []);
    } catch (err) {
      console.error('Error fetching UAFE protocols:', err);
      setProtocols([]);
    } finally {
      setLoading(false);
    }
  }, [isOficialOrAdmin]);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  // ── Computed stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = protocols.length;
    let completos = 0;
    let pendientes = 0;
    let criticos = 0;

    const stateCounts = {};
    ESTADOS_PROTOCOLO_FLOW.forEach((s) => { stateCounts[s] = 0; });

    protocols.forEach((p) => {
      const sem = getSemaforoFromProtocol(p);
      if (sem.key === 'VERDE') completos++;
      else if (sem.key === 'AMARILLO') pendientes++;
      else criticos++;

      const state = p.estado || 'BORRADOR';
      if (stateCounts[state] !== undefined) stateCounts[state]++;
    });

    const completitud = total > 0 ? Math.round((completos / total) * 100) : 0;

    return { total, completos, pendientes, criticos, completitud, stateCounts };
  }, [protocols]);

  // ── Filtered protocols ────────────────────────────────────────
  const filteredProtocols = useMemo(() => {
    return protocols.filter((p) => {
      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchProtocol = (p.numeroProtocolo || '').toLowerCase().includes(q);
        const matchActo = (p.actoContrato || '').toLowerCase().includes(q);
        const matchPersona = (p.personas || []).some((per) => {
          const nombre = per.persona
            ? `${per.persona.nombres || ''} ${per.persona.apellidos || ''}`.toLowerCase()
            : (per.nombreTemporal || '').toLowerCase();
          const cedula = (per.personaCedula || '').toLowerCase();
          return nombre.includes(q) || cedula.includes(q);
        });
        if (!matchProtocol && !matchActo && !matchPersona) return false;
      }

      // Estado filter
      if (filters.estado && p.estado !== filters.estado) return false;

      // Tipo acto filter
      if (filters.tipoActo && p.tipoActo !== filters.tipoActo) return false;

      return true;
    });
  }, [protocols, filters]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleView = (protocol) => {
    setSelectedProtocol(protocol);
  };

  const handleEdit = (protocol) => {
    setSelectedProtocol(protocol);
  };

  const handleBack = () => {
    setSelectedProtocol(null);
  };

  const handleSave = async (updatedFields) => {
    if (!selectedProtocol) return;
    try {
      await apiClient.put(
        `/formulario-uafe/protocolos/${selectedProtocol.id}`,
        updatedFields
      );
      await fetchProtocols();
      // Update selected protocol with fresh data
      const { data } = await apiClient.get(
        `/formulario-uafe/protocolos/${selectedProtocol.id}`
      );
      setSelectedProtocol(data.data || data.protocolo || data);
    } catch (err) {
      console.error('Error saving protocol:', err);
    }
  };

  // ── Detail view ───────────────────────────────────────────────
  if (selectedProtocol) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <UAFEProtocolDetail
          protocol={selectedProtocol}
          onBack={handleBack}
          onSave={handleSave}
        />
      </Box>
    );
  }

  // ── Dashboard view ────────────────────────────────────────────
  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography
            sx={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: UAFE_COLORS.textPrimary,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Control UAFE
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: UAFE_COLORS.textSecondary,
              fontSize: '0.82rem',
              mt: 0.25,
            }}
          >
            Gestion de protocolos y reportes de la Unidad de Analisis Financiero
          </Typography>
        </Box>
        {userRole !== 'OFICIAL_CUMPLIMIENTO' && (
          <Tooltip title="Crea un nuevo protocolo UAFE. Ingrese los datos del acto notarial y agregue los comparecientes para iniciar el proceso de debida diligencia." arrow placement="left">
            <Button
              variant="contained"
              startIcon={<AddOutlinedIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                backgroundColor: UAFE_COLORS.primary,
                borderRadius: '8px',
                px: 2.5,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 2px 12px rgba(30,90,142,0.3)',
                  backgroundColor: UAFE_COLORS.primaryDark,
                },
              }}
            >
              Nuevo Protocolo
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* KPI Cards */}
      <UAFEKPICards stats={stats} loading={loading} />

      {/* Status pipeline */}
      <Box
        sx={{
          p: 2,
          backgroundColor: UAFE_COLORS.surfaceElevated,
          borderRadius: '10px',
          border: `1px solid ${UAFE_COLORS.border}`,
        }}
      >
        <Typography
          variant="overline"
          sx={{
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: UAFE_COLORS.textMuted,
            display: 'block',
            mb: 1,
          }}
        >
          Distribucion por Estado
        </Typography>
        <UAFEStatusPipeline mode="summary" counts={stats.stateCounts || {}} />
      </Box>

      {/* Tabs: Protocolos / Reportes */}
      <Box>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            mb: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              minHeight: 42,
              color: UAFE_COLORS.textSecondary,
              '&.Mui-selected': {
                color: UAFE_COLORS.primary,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: UAFE_COLORS.primary,
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab
            icon={<ListAltOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Protocolos"
            sx={{ gap: 0.75 }}
          />
          {isOficialOrAdmin && (
            <Tab
              icon={<AssessmentOutlinedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Reportes Mensuales"
              sx={{ gap: 0.75 }}
            />
          )}
        </Tabs>

        {activeTab === 0 && (
          <UAFEProtocolTable
            protocols={filteredProtocols}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}

        {activeTab === 1 && isOficialOrAdmin && (
          <UAFEReportPanel
            stats={{
              total: stats.total,
              completos: stats.completos,
              pendientes: stats.pendientes,
              criticos: stats.criticos,
            }}
            disabled={true} // OLA 4
          />
        )}
      </Box>
    </Box>
  );
}
