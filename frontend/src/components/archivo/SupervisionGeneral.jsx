import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  TableSortLabel
} from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Warning as WarningIcon,
  Whatshot as FireIcon,
  Visibility as ViewIcon,
  Sort as SortIcon,
  TrendingUp as TrendIcon,
  Assignment as DocumentIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import archivoService from '../../services/archivo-service';
import DocumentDetailModal from '../Documents/DocumentDetailModal';
import useAuth from '../../hooks/use-auth';
import useDebounce from '../../hooks/useDebounce';

/**
 * Componente de Supervisión General
 * Vista global de todos los documentos del sistema (solo lectura)
 * Incluye sistema de alertas por tiempo de atraso
 */
const SupervisionGeneral = ({ onDataUpdate }) => {
  const [documentos, setDocumentos] = useState([]);
  const [matrizadores, setMatrizadores] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  const [filtros, setFiltros] = useState(() => {
    try {
      const saved = sessionStorage.getItem('archivo_supervision_filtros');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          search: parsed.search ?? '',
          matrizador: parsed.matrizador ?? 'TODOS',
          estado: parsed.estado ?? 'TODOS',
          alerta: parsed.alerta ?? 'TODAS',
          sortDias: parsed.sortDias ?? undefined
        };
      }
    } catch (_) {
      // Ignorar errores de parseo y usar valores por defecto
    }
    return {
      search: '',
      matrizador: 'TODOS',
      estado: 'TODOS',
      alerta: 'TODAS',
      sortDias: undefined
    };
  });

  // Persistir filtros durante la sesión
  useEffect(() => {
    try {
      sessionStorage.setItem('archivo_supervision_filtros', JSON.stringify(filtros));
    } catch (_) {
      // Ignorar almacenamiento fallido (modo privado, etc.)
    }
  }, [filtros]);

  // Debounce para la búsqueda (500ms)
  const debouncedSearch = useDebounce(filtros.search, 500);

  const { token } = useAuth();

  /**
   * Cargar datos al montar
   */
  useEffect(() => {
    cargarDatos();
  }, [token]);

  /**
   * Cargar documentos cuando cambian filtros o página
   */
  useEffect(() => {
    cargarDocumentos();
  }, [filtros.matrizador, filtros.estado, filtros.alerta, filtros.sortDias, debouncedSearch, page, rowsPerPage, token]);

  /**
   * Cargar datos iniciales
   */
  const cargarDatos = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [resumenResponse, matrizadoresResponse] = await Promise.all([
        archivoService.getResumenGeneral(token),
        archivoService.getMatrizadores(token)
      ]);

      if (resumenResponse.success) {
        setResumen(resumenResponse.data.resumen);
      }

      if (matrizadoresResponse.success) {
        setMatrizadores(matrizadoresResponse.data.matrizadores);
      }

      await cargarDocumentos();
    } catch (error) {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cargar documentos con filtros
   */
  const cargarDocumentos = async () => {
    if (!token) return;

    try {
      const params = {
        ...filtros,
        search: debouncedSearch, // Usar el search con debounce
        page: page + 1,
        limit: rowsPerPage
      };

      // Limpiar parámetros vacíos
      Object.keys(params).forEach(key => {
        if (params[key] === 'TODOS' || params[key] === 'TODAS' || params[key] === '') {
          delete params[key];
        }
      });


      const response = await archivoService.getSupervisionGeneral(token, params);

      if (response.success) {
        setDocumentos(response.data.documentos);
        setTotalDocuments(response.data.pagination.totalDocuments);
        setError(null);
      } else {
        setError(response.message || 'Error cargando documentos');
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  /**
   * Abrir modal de detalle en modo solo lectura
   */
  const handleOpenDetail = (doc) => {
    setSelectedDocument(doc);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedDocument(null);
  };

  /**
   * Manejar cambio de filtros
   */
  const handleFilterChange = (field, value) => {
    setFiltros(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(0); // Resetear a primera página
  };

  /**
   * Manejar cambio de página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Manejar cambio de filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Limpiar filtros
   */
  const limpiarFiltros = () => {
    setFiltros({
      search: '',
      matrizador: 'TODOS',
      estado: 'TODOS',
      alerta: 'TODAS'
    });
    setPage(0);
  };

  // Toggle orden por días (backend aplica el orden para toda la paginación)
  const toggleSortDias = () => {
    setFiltros(prev => ({
      ...prev,
      sortDias: prev.sortDias === 'desc' ? 'asc' : 'desc'
    }));
    setPage(0);
  };

  /**
   * Formatear fecha
   */
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  /**
   * Obtener color del estado
   */
  const getEstadoColor = (estado) => {
    const colores = {
      'PENDIENTE': 'warning',
      'EN_PROCESO': 'info',
      'LISTO': 'success',
      'ENTREGADO': 'default'
    };
    return colores[estado] || 'default';
  };

  /**
   * Renderizar indicador de alerta
   */
  const renderAlerta = (alerta) => {
    if (!alerta || alerta.nivel === 'normal') {
      return null;
    }

    const config = archivoService.formatearAlerta(alerta);
    
    return (
      <Tooltip title={`${config.texto} - ${alerta.dias} días`}>
        <Chip
          icon={alerta.nivel === 'roja' ? <FireIcon /> : <WarningIcon />}
          label={`${alerta.dias}d`}
          color={config.color}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </Tooltip>
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
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          🔍 Supervisión General del Sistema
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Vista global de todos los documentos con sistema de alertas
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Resumen General */}
      {resumen && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <DocumentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {resumen.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Sistema
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <TrendIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {resumen.enProceso}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  En Proceso
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <WarningIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  {resumen.atrasadosAmarillo}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Alertas Amarillas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <FireIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                  {resumen.atrasadosRojo}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Alertas Rojas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <PersonIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {resumen.procesadosHoy}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Procesados Hoy
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          {/* Búsqueda */}
          <TextField
            placeholder="Buscar por cliente, protocolo o teléfono..."
            value={filtros.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300, flex: 1 }}
            size="small"
          />

          {/* Filtro Matrizador */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Matrizador</InputLabel>
            <Select
              value={filtros.matrizador}
              label="Matrizador"
              onChange={(e) => handleFilterChange('matrizador', e.target.value)}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              {matrizadores.map(m => (
                <MenuItem key={m.id} value={m.id}>
                  {m.fullName} ({m.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Filtro Estado */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
              Estado
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filtros.estado === 'TODOS' ? '' : filtros.estado}
              onChange={(e, value) => handleFilterChange('estado', value || 'TODOS')}
              sx={{
                bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderRadius: 1,
                p: 0.25,
                '& .MuiToggleButton-root': {
                  border: 0,
                  textTransform: 'none',
                  px: 1.5,
                  height: 32,
                }
              }}
            >
              <ToggleButton value="">Todos</ToggleButton>
              <ToggleButton value="EN_PROCESO" sx={{ '&.Mui-selected': { bgcolor: 'info.main', color: 'common.white' }, '&.Mui-selected:hover': { bgcolor: 'info.dark' } }}>En Proceso</ToggleButton>
              <ToggleButton value="LISTO" sx={{ '&.Mui-selected': { bgcolor: 'success.main', color: 'common.white' }, '&.Mui-selected:hover': { bgcolor: 'success.dark' } }}>Listo</ToggleButton>
              <ToggleButton value="ENTREGADO" sx={{ '&.Mui-selected': { bgcolor: (t) => t.palette.mode === 'dark' ? t.palette.grey[700] : t.palette.grey[300], color: 'text.primary' }, '&.Mui-selected:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? t.palette.grey[600] : t.palette.grey[400] } }}>Entregado</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Filtro Alertas */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Alertas</InputLabel>
            <Select
              value={filtros.alerta}
              label="Alertas"
              onChange={(e) => handleFilterChange('alerta', e.target.value)}
            >
              <MenuItem value="TODAS">Todas</MenuItem>
              <MenuItem value="ROJAS">Solo Rojas</MenuItem>
              <MenuItem value="AMARILLAS">Solo Amarillas</MenuItem>
              <MenuItem value="NORMALES">Sin Alertas</MenuItem>
            </Select>
          </FormControl>

          {/* Botones */}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={cargarDatos}
            size="small"
          >
            Refrescar
          </Button>

          <Button
            variant="text"
            onClick={limpiarFiltros}
            size="small"
          >
            Limpiar
          </Button>

          <Button
            variant={filtros.sortDias ? 'contained' : 'outlined'}
            startIcon={<SortIcon />}
            onClick={toggleSortDias}
            size="small"
          >
            {filtros.sortDias === 'desc' ? 'Días: Mayor a menor' : filtros.sortDias === 'asc' ? 'Días: Menor a mayor' : 'Ordenar por días'}
          </Button>
        </Box>

        {/* Resumen de filtros activos */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {filtros.search && (
            <Chip 
              label={`Búsqueda: "${filtros.search}"`} 
              size="small" 
              onDelete={() => handleFilterChange('search', '')}
            />
          )}
          
          {filtros.matrizador !== 'TODOS' && (
            <Chip 
              label={`Matrizador: ${matrizadores.find(m => m.id === parseInt(filtros.matrizador))?.fullName || filtros.matrizador}`} 
              size="small" 
              onDelete={() => handleFilterChange('matrizador', 'TODOS')}
            />
          )}
          
          {filtros.estado !== 'TODOS' && (
            <Chip 
              label={`Estado: ${archivoService.formatearEstado(filtros.estado).texto}`} 
              size="small" 
              onDelete={() => handleFilterChange('estado', 'TODOS')}
            />
          )}

          {filtros.alerta !== 'TODAS' && (
            <Chip 
              label={`Alertas: ${filtros.alerta}`} 
              size="small" 
              onDelete={() => handleFilterChange('alerta', 'TODAS')}
            />
          )}
        </Box>
      </Paper>

      {/* Tabla de Documentos */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Protocolo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Matrizador</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Días
                    <TableSortLabel
                      active={!!filtros.sortDias}
                      direction={filtros.sortDias === 'desc' ? 'desc' : 'asc'}
                      onClick={toggleSortDias}
                    />
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Alerta</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentos.map((documento) => (
                <TableRow 
                  key={documento.id}
                  hover
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'action.hover' 
                    } 
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      #{documento.protocolNumber}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {documento.clientName}
                    </Typography>
                    {documento.clientPhone && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {documento.clientPhone}
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {documento.assignedTo 
                        ? `${documento.assignedTo.firstName} ${documento.assignedTo.lastName}`
                        : 'Sin asignar'
                      }
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip 
                      label={archivoService.formatearEstado(documento.status).texto}
                      color={getEstadoColor(documento.status)}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {documento.alerta?.dias || 0} días
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    {renderAlerta(documento.alerta)}
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatearFecha(documento.createdAt)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Tooltip title="Ver detalles (solo lectura)">
                      <IconButton size="small" onClick={() => handleOpenDetail(documento)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              
              {documentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No hay documentos que coincidan con los filtros
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          component="div"
          count={totalDocuments}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>
      {/* Modal de detalle reutilizando el componente general en modo lectura */}
      {detailModalOpen && selectedDocument && (
        <DocumentDetailModal
          open={detailModalOpen}
          onClose={handleCloseDetail}
          document={selectedDocument}
          readOnly={true}
          onDocumentUpdated={() => {
            // Refrescar lista por si cambió algo relevante
            cargarDocumentos();
            onDataUpdate?.();
          }}
        />
      )}

    </Box>
  );
};

export default SupervisionGeneral;