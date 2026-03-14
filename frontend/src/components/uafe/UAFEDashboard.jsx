import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import LockResetIcon from '@mui/icons-material/LockReset';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import ResetearPinDialog from '../ResetearPinDialog';

import apiClient from '../../services/api-client';
import useAuthStore from '../../store/auth-store';

import UAFEKPICards from './UAFEKPICards';
import UAFEStatusPipeline from './UAFEStatusPipeline';
import UAFEProtocolTable from './UAFEProtocolTable';
import UAFEProtocolDetail from './UAFEProtocolDetail';
import UAFEReportPanel from './UAFEReportPanel';
import UAFEPersonaEditDialog from './UAFEPersonaEditDialog';
import UAFEVehiculoForm from './UAFEVehiculoForm';
import UAFEIndiceCruce from './UAFEIndiceCruce';
import { UAFE_COLORS, TIPOS_ACTO_UAFE, TIPOS_BIEN, CALIDADES_COMPARECIENTE, FORMAS_PAGO, formatCurrency, getSemaforoFromProtocol, ESTADOS_PROTOCOLO_FLOW } from './uafe-constants';

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
  // OLA 3: Manual edit dialog
  const [editPersona, setEditPersona] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // Add compareciente dialog
  const [showAddPersona, setShowAddPersona] = useState(false);
  const [addPersonaForm, setAddPersonaForm] = useState({ cedula: '', calidad: 'OTRO', actuaPor: 'PROPIOS_DERECHOS' });
  const [addPersonaLoading, setAddPersonaLoading] = useState(false);
  const [openResetearPin, setOpenResetearPin] = useState(false);
  // Create protocol wizard
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [wizardStep, setWizardStep] = useState('upload'); // upload | parsing | preview | creating
  const [wizardFile, setWizardFile] = useState(null);
  const [wizardFecha, setWizardFecha] = useState(new Date().toISOString().slice(0, 10));
  const [wizardMinutaUrl, setWizardMinutaUrl] = useState(null);
  const [wizardData, setWizardData] = useState(null);
  const [wizardError, setWizardError] = useState(null);
  // OLA 4: Report generation
  const [reportLoading, setReportLoading] = useState(false);
  // Vehicle form dialog
  const [showVehiculoForm, setShowVehiculoForm] = useState(false);
  // Threshold alerts
  const [umbralAlertas, setUmbralAlertas] = useState(0);

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

  // Fetch threshold alerts for current month
  const fetchUmbral = useCallback(async () => {
    try {
      const now = new Date();
      const mes = now.getMonth() + 1;
      const anio = now.getFullYear();
      const { data } = await apiClient.get(`/formulario-uafe/umbral/${mes}/${anio}`);
      if (data.success) {
        setUmbralAlertas(data.data?.totalAlertas || 0);
      }
    } catch (err) {
      console.warn('[UAFE] Error fetching umbral:', err);
    }
  }, []);

  useEffect(() => {
    fetchProtocols();
    fetchUmbral();
  }, [fetchProtocols, fetchUmbral]);

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
  const loadFullProtocol = async (protocol) => {
    setSelectedProtocol(protocol); // Mostrar inmediato con datos parciales
    try {
      const { data } = await apiClient.get(`/formulario-uafe/protocolo/${protocol.id}`);
      setSelectedProtocol(data.data || data.protocolo || data);
    } catch (err) {
      console.error('[UAFE] Error cargando detalle:', err);
    }
  };

  const handleView = (protocol) => loadFullProtocol(protocol);
  const handleEdit = (protocol) => loadFullProtocol(protocol);

  const handleBack = () => {
    setSelectedProtocol(null);
  };

  const refreshSelectedProtocol = async () => {
    if (!selectedProtocol) return;
    try {
      const { data } = await apiClient.get(
        `/formulario-uafe/protocolo/${selectedProtocol.id}`
      );
      setSelectedProtocol(data.data || data.protocolo || data);
    } catch (err) {
      console.error('Error refreshing protocol:', err);
    }
  };

  const handleSave = async (updatedFields) => {
    if (!selectedProtocol) return;
    try {
      console.log('[UAFE] Guardando campos:', Object.keys(updatedFields), updatedFields);
      const { data } = await apiClient.put(
        `/formulario-uafe/protocolo/${selectedProtocol.id}`,
        updatedFields
      );
      console.log('[UAFE] Respuesta guardado:', data);
      setSnackbar({ open: true, message: 'Protocolo guardado', severity: 'success' });
      await fetchProtocols();
      await refreshSelectedProtocol();
    } catch (err) {
      console.error('[UAFE] Error guardando protocolo:', err.response?.status, err.response?.data);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error al guardar protocolo',
        severity: 'error'
      });
      throw err; // Re-throw para que el detail no limpie editedFields
    }
  };

  // OLA 3: Edit persona manually (fallback matrizador)
  const handleEditPerson = (persona) => {
    setEditPersona(persona);
  };

  const handlePersonaSaved = async () => {
    setSnackbar({ open: true, message: 'Datos del compareciente actualizados', severity: 'success' });
    await fetchProtocols();
    await refreshSelectedProtocol();
  };

  // Add compareciente to protocol
  const handleAddPerson = () => {
    setAddPersonaForm({ cedula: '', calidad: 'OTRO', actuaPor: 'PROPIOS_DERECHOS' });
    setShowAddPersona(true);
  };

  const handleAddPersonaConfirm = async () => {
    if (!addPersonaForm.cedula || addPersonaForm.cedula.length < 10) {
      setSnackbar({ open: true, message: 'Ingrese una cedula o RUC valido', severity: 'error' });
      return;
    }
    setAddPersonaLoading(true);
    try {
      await apiClient.post(`/formulario-uafe/protocolo/${selectedProtocol.id}/persona`, {
        cedula: addPersonaForm.cedula,
        calidad: addPersonaForm.calidad,
        actuaPor: addPersonaForm.actuaPor,
      });
      setShowAddPersona(false);
      setSnackbar({ open: true, message: 'Compareciente agregado', severity: 'success' });
      await fetchProtocols();
      await refreshSelectedProtocol();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Error al agregar compareciente', severity: 'error' });
    } finally {
      setAddPersonaLoading(false);
    }
  };

  // OLA 3: Copy global form link to clipboard
  const handleSendForm = (_persona) => {
    const link = 'https://notaria18quito.com.ec/formulario';
    navigator.clipboard.writeText(link).then(() => {
      setSnackbar({ open: true, message: 'Enlace del formulario copiado', severity: 'success' });
    }).catch(() => {
      setSnackbar({ open: true, message: `Enlace: ${link}`, severity: 'info' });
    });
  };

  // OLA 4: Generate UAFE report
  const handleGenerateReport = async (type, mes, anio) => {
    setReportLoading(true);
    try {
      const { data } = await apiClient.post('/formulario-uafe/reporte/generar', { mes, anio });
      if (data.success && data.data) {
        const reporte = data.data;
        const reporteId = reporte.id;
        const tipoArchivo = type === 'TRANSACCION' ? 'transaccion' : 'interviniente';
        // Download the file
        const response = await apiClient.get(`/formulario-uafe/reporte/descargar/${reporteId}/${tipoArchivo}`, {
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${type}_${anio}_${String(mes).padStart(2, '0')}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setSnackbar({ open: true, message: `${type}.xlsx generado y descargado`, severity: 'success' });
        // Refresh protocols (some may have changed to REPORTADO)
        fetchProtocols();
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Error al generar reporte', severity: 'error' });
    } finally {
      setReportLoading(false);
    }
  };

  // Wizard: reset state
  const resetWizard = () => {
    setWizardStep('upload');
    setWizardFile(null);
    setWizardFecha(new Date().toISOString().slice(0, 10));
    setWizardMinutaUrl(null);
    setWizardData(null);
    setWizardError(null);
  };

  const openWizard = () => {
    resetWizard();
    setShowCreateDialog(true);
  };

  // Wizard step 1: Upload & parse
  const handleWizardUpload = async () => {
    if (!wizardFile) return;
    setWizardStep('parsing');
    setWizardError(null);
    try {
      const formData = new FormData();
      formData.append('minuta', wizardFile);
      const { data } = await apiClient.post('/formulario-uafe/parse-minuta', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      if (data.success) {
        setWizardData(data.data.datosExtraidos);
        setWizardMinutaUrl(data.data.minutaUrl);
        setWizardStep('preview');
      } else {
        throw new Error(data.error || 'Error al procesar');
      }
    } catch (err) {
      setWizardError(err.response?.data?.error || err.message || 'Error al procesar la minuta');
      setWizardStep('upload');
    }
  };

  // Wizard step 2: Confirm & create
  const handleWizardConfirm = async () => {
    setWizardStep('creating');
    setWizardError(null);
    try {
      const datosParaEnviar = { ...wizardData };
      if (datosParaEnviar.cuantia != null) datosParaEnviar.cuantia = parseFloat(datosParaEnviar.cuantia) || null;
      if (datosParaEnviar.avaluoMunicipal != null) datosParaEnviar.avaluoMunicipal = parseFloat(datosParaEnviar.avaluoMunicipal) || null;
      const { data } = await apiClient.post('/formulario-uafe/protocolo-con-minuta', {
        fecha: wizardFecha,
        minutaUrl: wizardMinutaUrl,
        datosConfirmados: datosParaEnviar,
      });
      setShowCreateDialog(false);
      setSnackbar({ open: true, message: 'Protocolo creado exitosamente', severity: 'success' });
      await fetchProtocols();
      const proto = data.data || data;
      if (proto?.id) {
        try {
          const { data: detailRes } = await apiClient.get(`/formulario-uafe/protocolo/${proto.id}`);
          setSelectedProtocol(detailRes.data || detailRes);
        } catch { setSelectedProtocol(proto); }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al crear protocolo';
      setSnackbar({ open: true, message: msg, severity: 'error' });
      setWizardStep('preview');
    }
  };

  // Wizard: edit helpers
  const updateWizardField = (field, value) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };
  const updateWizardComp = (index, field, value) => {
    setWizardData(prev => {
      const comps = [...(prev.comparecientes || [])];
      comps[index] = { ...comps[index], [field]: value };
      return { ...prev, comparecientes: comps };
    });
  };
  const removeWizardComp = (index) => {
    setWizardData(prev => ({
      ...prev,
      comparecientes: prev.comparecientes.filter((_, i) => i !== index),
    }));
  };

  // ── Detail view ───────────────────────────────────────────────
  if (selectedProtocol) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <UAFEProtocolDetail
          protocol={selectedProtocol}
          onBack={handleBack}
          onSave={handleSave}
          onAddPerson={handleAddPerson}
          onEditPerson={handleEditPerson}
          onDeletePerson={async (persona) => {
            try {
              await apiClient.delete(`/formulario-uafe/protocolo/${selectedProtocol.id}/persona/${persona.id}`);
              setSnackbar({ open: true, message: 'Compareciente eliminado', severity: 'success' });
              refreshSelectedProtocol();
            } catch (err) {
              setSnackbar({ open: true, message: err.response?.data?.message || 'Error al eliminar compareciente', severity: 'error' });
            }
          }}
          onUpdatePersonaProtocolo={async (protocoloId, personaId, data) => {
            try {
              await apiClient.put(`/formulario-uafe/protocolo/${protocoloId}/persona/${personaId}`, data);
              setSnackbar({ open: true, message: 'Procedencia de fondos guardada', severity: 'success' });
              refreshSelectedProtocol();
            } catch (err) {
              setSnackbar({ open: true, message: err.response?.data?.message || 'Error al guardar', severity: 'error' });
            }
          }}
          onSendForm={handleSendForm}
          onRefresh={refreshSelectedProtocol}
          onGenerateTexts={async (protocoloId, forzar) => {
            try {
              const { data } = await apiClient.post(`/formulario-uafe/protocolo/${protocoloId}/generar-textos`, { forzar });
              if (data.success) {
                setSnackbar({ open: true, message: data.message, severity: data.tieneIncompletos ? 'warning' : 'success' });
                refreshSelectedProtocol();
                return data;
              }
            } catch (err) {
              setSnackbar({ open: true, message: err.response?.data?.message || 'Error al generar textos', severity: 'error' });
            }
          }}
          onGenerateWord={async (protocoloId) => {
            try {
              setSnackbar({ open: true, message: 'Generando formularios Word...', severity: 'info' });
              const response = await apiClient.get(`/formulario-uafe/protocolo/${protocoloId}/generar-word`, {
                responseType: 'blob'
              });
              const contentDisposition = response.headers['content-disposition'] || '';
              const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
              const filename = filenameMatch ? filenameMatch[1] : `FormulariosUAFE_${protocoloId}.zip`;
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', filename);
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.URL.revokeObjectURL(url);
              setSnackbar({ open: true, message: 'Formularios Word descargados', severity: 'success' });
            } catch (err) {
              console.error('[UAFE] Error generando Word:', err);
              setSnackbar({ open: true, message: err.response?.data?.message || 'Error al generar formularios Word', severity: 'error' });
            }
          }}
          onGenerateWordPersona={async (protocoloId, personaId) => {
            try {
              setSnackbar({ open: true, message: 'Generando formulario Word...', severity: 'info' });
              const response = await apiClient.get(`/formulario-uafe/protocolo/${protocoloId}/generar-word`, {
                params: { personaId },
                responseType: 'blob'
              });
              const contentDisposition = response.headers['content-disposition'] || '';
              const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
              const filename = filenameMatch ? filenameMatch[1] : `FormularioUAFE_${personaId}.docx`;
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', filename);
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.URL.revokeObjectURL(url);
              setSnackbar({ open: true, message: 'Formulario Word descargado', severity: 'success' });
            } catch (err) {
              console.error('[UAFE] Error generando Word individual:', err);
              setSnackbar({ open: true, message: err.response?.data?.message || 'Error al generar formulario Word', severity: 'error' });
            }
          }}
        />
        <UAFEPersonaEditDialog
          open={!!editPersona}
          onClose={() => setEditPersona(null)}
          persona={editPersona}
          protocoloId={selectedProtocol.id}
          onSaved={handlePersonaSaved}
        />

        {/* Dialog: Agregar Compareciente */}
        <Dialog open={showAddPersona} onClose={() => setShowAddPersona(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>Agregar Compareciente</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Cedula o RUC"
              value={addPersonaForm.cedula}
              onChange={(e) => setAddPersonaForm(prev => ({ ...prev, cedula: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
              inputProps={{ inputMode: 'numeric' }}
              sx={{ mb: 2, mt: 1 }}
              size="small"
            />
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Calidad</InputLabel>
              <Select
                value={addPersonaForm.calidad}
                label="Calidad"
                onChange={(e) => setAddPersonaForm(prev => ({ ...prev, calidad: e.target.value }))}
              >
                {CALIDADES_COMPARECIENTE.map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Comparece</InputLabel>
              <Select
                value={addPersonaForm.actuaPor}
                label="Comparece"
                onChange={(e) => setAddPersonaForm(prev => ({ ...prev, actuaPor: e.target.value }))}
              >
                <MenuItem value="PROPIOS_DERECHOS">Por sus propios derechos</MenuItem>
                <MenuItem value="APODERADO_GENERAL">Representado/a por apoderado general</MenuItem>
                <MenuItem value="APODERADO_ESPECIAL">Representado/a por apoderado especial</MenuItem>
                <MenuItem value="REPRESENTANTE_LEGAL">Representado/a por representante legal</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddPersona(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleAddPersonaConfirm}
              disabled={addPersonaLoading || addPersonaForm.cedula.length < 10}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {addPersonaLoading ? <CircularProgress size={20} /> : 'Agregar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
        </Snackbar>
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
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Tooltip title="Resetear PIN de un usuario que olvido su clave de acceso al formulario publico" arrow>
              <Button
                variant="outlined"
                startIcon={<LockResetIcon />}
                onClick={() => setOpenResetearPin(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  borderColor: '#ed6c02',
                  color: '#ed6c02',
                  '&:hover': { borderColor: '#e65100', color: '#e65100', backgroundColor: 'rgba(237,108,2,0.04)' },
                }}
              >
                Resetear PIN
              </Button>
            </Tooltip>
            <Tooltip title="Registrar reconocimiento de firma de vehiculo. Formulario manual para actos sin minuta Word." arrow>
              <Button
                variant="outlined"
                startIcon={<DirectionsCarOutlinedIcon />}
                onClick={() => setShowVehiculoForm(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  borderColor: '#e65100',
                  color: '#e65100',
                  '&:hover': { borderColor: '#bf360c', color: '#bf360c', backgroundColor: 'rgba(230,81,0,0.04)' },
                }}
              >
                Vehiculo
              </Button>
            </Tooltip>
            <Tooltip title="Crea un nuevo protocolo UAFE. Ingrese los datos del acto notarial y agregue los comparecientes para iniciar el proceso de debida diligencia." arrow placement="left">
              <Button
                variant="contained"
                startIcon={<AddOutlinedIcon />}
                onClick={openWizard}
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
          </Box>
        )}
      </Box>

      {/* KPI Cards */}
      <UAFEKPICards stats={stats} loading={loading} umbralAlertas={umbralAlertas} />

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
          {isOficialOrAdmin && (
            <Tab
              icon={<CompareArrowsOutlinedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Cruce Indice"
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
            disabled={false}
            loading={reportLoading}
            onGenerate={handleGenerateReport}
          />
        )}

        {activeTab === 2 && isOficialOrAdmin && (
          <UAFEIndiceCruce />
        )}
      </Box>

      {/* Create Protocol Wizard */}
      <Dialog
        open={showCreateDialog}
        onClose={() => { if (wizardStep !== 'parsing' && wizardStep !== 'creating') setShowCreateDialog(false); }}
        maxWidth={wizardStep === 'preview' ? 'md' : 'sm'}
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>Nuevo Protocolo UAFE</Typography>
            <Chip
              size="small"
              label={wizardStep === 'upload' || wizardStep === 'parsing' ? 'Paso 1 de 2' : 'Paso 2 de 2'}
              sx={{ fontSize: '0.68rem', fontWeight: 600, backgroundColor: UAFE_COLORS.primaryLight, color: UAFE_COLORS.primary }}
            />
          </Box>
          <IconButton size="small" onClick={() => setShowCreateDialog(false)} disabled={wizardStep === 'parsing' || wizardStep === 'creating'}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2, minHeight: 200 }}>
          {/* Step 1: Upload */}
          {wizardStep === 'upload' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                size="small"
                label="Fecha del tramite *"
                type="date"
                value={wizardFecha}
                onChange={(e) => setWizardFecha(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Box
                sx={{
                  border: `2px dashed ${UAFE_COLORS.border}`,
                  borderRadius: '10px',
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: UAFE_COLORS.surface,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: UAFE_COLORS.primary },
                }}
              >
                <UploadFileOutlinedIcon sx={{ fontSize: 40, color: UAFE_COLORS.primary, mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: UAFE_COLORS.textPrimary }}>
                  Seleccione la minuta Word (.docx)
                </Typography>
                <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted, display: 'block', mb: 2 }}>
                  El sistema extraera automaticamente tipo de acto, cuantia, comparecientes y mas datos
                </Typography>
                <Button variant="outlined" component="label" sx={{ textTransform: 'none', fontSize: '0.82rem' }}>
                  {wizardFile ? wizardFile.name : 'Seleccionar archivo'}
                  <input
                    type="file"
                    hidden
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (!f.name.endsWith('.docx')) {
                          setWizardError('Solo se permiten archivos Word (.docx)');
                          return;
                        }
                        if (f.size > 10 * 1024 * 1024) {
                          setWizardError('El archivo no puede superar 10MB');
                          return;
                        }
                        setWizardFile(f);
                        setWizardError(null);
                      }
                    }}
                  />
                </Button>
                {wizardFile && (
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', color: UAFE_COLORS.textMuted }}>
                    {(wizardFile.size / 1024).toFixed(0)} KB
                  </Typography>
                )}
              </Box>
              {wizardError && <Alert severity="error" onClose={() => setWizardError(null)}>{wizardError}</Alert>}
            </Box>
          )}

          {/* Parsing spinner */}
          {wizardStep === 'parsing' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={48} sx={{ color: UAFE_COLORS.primary, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Procesando minuta...</Typography>
              <Typography variant="body2" sx={{ color: UAFE_COLORS.textSecondary }}>
                Extrayendo datos del documento. Esto puede tomar unos segundos.
              </Typography>
            </Box>
          )}

          {/* Creating spinner */}
          {wizardStep === 'creating' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={48} sx={{ color: UAFE_COLORS.primary, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Creando protocolo...</Typography>
            </Box>
          )}

          {/* Step 2: Preview */}
          {wizardStep === 'preview' && wizardData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {wizardError && <Alert severity="error" onClose={() => setWizardError(null)}>{wizardError}</Alert>}

              {/* Datos del acto */}
              <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: UAFE_COLORS.textMuted }}>
                Datos del Acto (editables)
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth size="small" label="Fecha *" type="date"
                    value={wizardFecha}
                    onChange={(e) => setWizardFecha(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Acto</InputLabel>
                    <Select
                      value={wizardData.codigoActo || ''}
                      label="Tipo de Acto"
                      onChange={(e) => {
                        const acto = TIPOS_ACTO_UAFE.find(a => a.codigo === e.target.value);
                        updateWizardField('codigoActo', e.target.value);
                        if (acto) updateWizardField('tipoActo', acto.descripcion);
                      }}
                    >
                      {TIPOS_ACTO_UAFE.map(a => (
                        <MenuItem key={a.codigo} value={a.codigo}>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{a.codigo} - {a.descripcion}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth size="small" label="Cuantia (USD)"
                    inputProps={{ inputMode: 'decimal' }}
                    value={wizardData.cuantia ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (v === '' || /^\d*\.?\d*$/.test(v)) updateWizardField('cuantia', v === '' ? null : v);
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth size="small" label="Avaluo (USD)"
                    inputProps={{ inputMode: 'decimal' }}
                    value={wizardData.avaluoMunicipal ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (v === '' || /^\d*\.?\d*$/.test(v)) updateWizardField('avaluoMunicipal', v === '' ? null : v);
                    }}
                  />
                </Grid>
              </Grid>

              {/* Bien y forma de pago */}
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Bien</InputLabel>
                    <Select
                      value={wizardData.tipoBien || ''}
                      label="Tipo de Bien"
                      onChange={(e) => updateWizardField('tipoBien', e.target.value)}
                    >
                      {TIPOS_BIEN.map(b => (
                        <MenuItem key={b.codigo} value={b.codigo}>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{b.codigo} - {b.descripcion}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth size="small" label="Descripcion del Bien"
                    value={wizardData.descripcionBien || ''}
                    onChange={(e) => updateWizardField('descripcionBien', e.target.value)}
                  />
                </Grid>
              </Grid>

              {/* Forma de pago */}
              <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: UAFE_COLORS.textMuted, mt: 1 }}>
                Forma de Pago
              </Typography>
              {(wizardData.formaPago || []).map((fp, idx) => (
                <Grid container spacing={1} key={idx} sx={{ mb: 0.5 }}>
                  <Grid size={{ xs: 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        value={fp.tipo || ''}
                        label="Tipo"
                        onChange={(e) => {
                          const arr = [...(wizardData.formaPago || [])];
                          arr[idx] = { ...arr[idx], tipo: e.target.value };
                          updateWizardField('formaPago', arr);
                        }}
                      >
                        {FORMAS_PAGO.map(f => (
                          <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField
                      fullWidth size="small" label="Monto (USD)"
                      inputProps={{ inputMode: 'decimal' }}
                      value={fp.monto ?? ''}
                      onChange={(e) => {
                        const v = e.target.value.replace(',', '.');
                        if (v === '' || /^\d*\.?\d*$/.test(v)) {
                          const arr = [...(wizardData.formaPago || [])];
                          arr[idx] = { ...arr[idx], monto: v === '' ? null : v };
                          updateWizardField('formaPago', arr);
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    <TextField
                      fullWidth size="small" label="Detalle"
                      value={fp.detalle || ''}
                      onChange={(e) => {
                        const arr = [...(wizardData.formaPago || [])];
                        arr[idx] = { ...arr[idx], detalle: e.target.value };
                        updateWizardField('formaPago', arr);
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 1 }} sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small" onClick={() => {
                      const arr = (wizardData.formaPago || []).filter((_, i) => i !== idx);
                      updateWizardField('formaPago', arr);
                    }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button
                size="small"
                onClick={() => {
                  const arr = [...(wizardData.formaPago || []), { tipo: '', monto: null, detalle: '' }];
                  updateWizardField('formaPago', arr);
                }}
                sx={{ textTransform: 'none', fontSize: '0.75rem', mt: 0.5 }}
              >
                + Agregar forma de pago
              </Button>

              {/* Comparecientes */}
              <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: UAFE_COLORS.textMuted, mt: 1 }}>
                Comparecientes ({wizardData.comparecientes?.length || 0})
              </Typography>
              {(!wizardData.comparecientes || wizardData.comparecientes.length === 0) ? (
                <Alert severity="warning">
                  No se encontraron comparecientes. Se pueden agregar manualmente despues de crear el protocolo.
                </Alert>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${UAFE_COLORS.border}` }}>
                        {['Cedula', 'Nombres', 'Apellidos', 'Calidad', 'Actua Por', ''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, fontSize: '0.75rem', color: UAFE_COLORS.textSecondary }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {wizardData.comparecientes.map((comp, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${UAFE_COLORS.borderLight}` }}>
                          <td style={{ padding: '4px 8px' }}>
                            <TextField size="small" variant="standard" value={comp.cedula || ''} onChange={(e) => updateWizardComp(idx, 'cedula', e.target.value)} sx={{ width: 110 }} />
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <TextField size="small" variant="standard" value={comp.nombres || ''} onChange={(e) => updateWizardComp(idx, 'nombres', e.target.value)} sx={{ width: 130 }} />
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <TextField size="small" variant="standard" value={comp.apellidos || ''} onChange={(e) => updateWizardComp(idx, 'apellidos', e.target.value)} sx={{ width: 130 }} />
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <Select size="small" variant="standard" value={comp.calidad || 'OTRO'} onChange={(e) => updateWizardComp(idx, 'calidad', e.target.value)} sx={{ fontSize: '0.78rem', minWidth: 100 }}>
                              {CALIDADES_COMPARECIENTE.map(c => <MenuItem key={c} value={c} sx={{ fontSize: '0.78rem' }}>{c}</MenuItem>)}
                            </Select>
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <Select size="small" variant="standard" value={comp.actuaPor || 'PROPIOS_DERECHOS'} onChange={(e) => updateWizardComp(idx, 'actuaPor', e.target.value)} sx={{ fontSize: '0.78rem', minWidth: 120 }}>
                              <MenuItem value="PROPIOS_DERECHOS" sx={{ fontSize: '0.78rem' }}>Por sus propios derechos</MenuItem>
                              <MenuItem value="APODERADO_GENERAL" sx={{ fontSize: '0.78rem' }}>Representado/a por apod. general</MenuItem>
                              <MenuItem value="APODERADO_ESPECIAL" sx={{ fontSize: '0.78rem' }}>Representado/a por apod. especial</MenuItem>
                              <MenuItem value="REPRESENTANTE_LEGAL" sx={{ fontSize: '0.78rem' }}>Representado/a por rep. legal</MenuItem>
                            </Select>
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            <IconButton size="small" onClick={() => removeWizardComp(idx)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
              <Button
                size="small"
                onClick={() => {
                  const comps = [...(wizardData.comparecientes || []), { cedula: '', nombres: '', apellidos: '', calidad: 'OTRO', actuaPor: 'PROPIOS_DERECHOS' }];
                  updateWizardField('comparecientes', comps);
                }}
                sx={{ textTransform: 'none', fontSize: '0.75rem', mt: 0.5 }}
              >
                + Agregar compareciente
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {wizardStep === 'upload' && (
            <>
              <Button onClick={() => setShowCreateDialog(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleWizardUpload}
                disabled={!wizardFile || !wizardFecha}
                startIcon={<UploadFileOutlinedIcon />}
                sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: UAFE_COLORS.primary, '&:hover': { backgroundColor: UAFE_COLORS.primaryDark } }}
              >
                Procesar Minuta
              </Button>
            </>
          )}
          {wizardStep === 'preview' && (
            <>
              <Button onClick={() => { setWizardStep('upload'); setWizardFile(null); setWizardData(null); }} sx={{ textTransform: 'none' }}>
                Volver
              </Button>
              <Button
                variant="contained"
                onClick={handleWizardConfirm}
                startIcon={<AddOutlinedIcon />}
                sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' } }}
              >
                Crear Protocolo
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>

      {/* Vehicle form dialog */}
      <UAFEVehiculoForm
        open={showVehiculoForm}
        onClose={() => setShowVehiculoForm(false)}
        onSaved={async (proto) => {
          setSnackbar({ open: true, message: 'Protocolo vehiculo creado exitosamente', severity: 'success' });
          setShowVehiculoForm(false);
          await fetchProtocols();
          if (proto?.id) {
            try {
              const { data } = await apiClient.get(`/formulario-uafe/protocolo/${proto.id}`);
              setSelectedProtocol(data.data || data);
            } catch { setSelectedProtocol(proto); }
          }
        }}
      />

      {/* Dialog resetear PIN */}
      <ResetearPinDialog
        open={openResetearPin}
        onClose={() => setOpenResetearPin(false)}
        onSuccess={() => setSnackbar({ open: true, message: 'PIN reseteado exitosamente', severity: 'success' })}
      />
    </Box>
  );
}
