import { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  IconButton,
  Typography,
  Collapse,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  Skeleton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import SemaforoIndicator, { SemaforoPersona } from './SemaforoIndicator';
import {
  UAFE_COLORS as UAFE_COLORS_STATIC,
  getUAFEColors,
  ESTADOS_PROTOCOLO,
  TIPOS_ACTO_UAFE,
  getSemaforoFromProtocol,
  getMissingFields,
  formatCurrency,
  formatDate,
} from './uafe-constants';
import { useTheme } from '@mui/material/styles';

function useUAFEColors() {
  const theme = useTheme();
  return getUAFEColors(theme.palette.mode === 'dark');
}

const headCells = [
  { id: 'expand', label: '', width: 40, sortable: false },
  { id: 'numeroProtocolo', label: 'Protocolo', width: 110 },
  { id: 'fecha', label: 'Fecha', width: 100 },
  { id: 'tipoActo', label: 'Tipo de Acto', width: 200 },
  { id: 'valorContrato', label: 'Cuantia', width: 120, align: 'right' },
  { id: 'personas', label: 'Comparecientes', width: 180, sortable: false },
  { id: 'estado', label: 'Estado', width: 140, sortable: false },
  { id: 'acciones', label: '', width: 90, sortable: false },
];

function ExpandedPersonRow({ personas = [] }) {
  const UAFE_COLORS = useUAFEColors();
  if (personas.length === 0) {
    return (
      <Box sx={{ py: 2, px: 3 }}>
        <Typography variant="caption" color="text.secondary">
          No hay comparecientes registrados
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1.5, px: 3 }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: UAFE_COLORS.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: '0.6rem',
          display: 'block',
          mb: 1,
        }}
      >
        Comparecientes ({personas.length})
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {personas.map((p, idx) => {
          const nombre = p.nombre || p.nombreTemporal || 'Sin nombre';
          const cedula = p.cedula || p.personaCedula || '-';

          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 0.75,
                px: 1.5,
                borderRadius: '6px',
                backgroundColor: UAFE_COLORS.surface,
                border: `1px solid ${UAFE_COLORS.borderLight}`,
              }}
            >
              <PersonOutlineIcon sx={{ fontSize: 16, color: UAFE_COLORS.textMuted }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    color: UAFE_COLORS.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {nombre}
                </Typography>
                <Typography variant="caption" sx={{ color: UAFE_COLORS.textMuted, fontSize: '0.68rem' }}>
                  {cedula} &middot; {p.calidad || 'Sin calidad'}
                </Typography>
              </Box>
              <SemaforoPersona
                estadoCompletitud={p.estadoCompletitud}
                camposFaltantes={p.camposFaltantes || []}
                variant="badge"
                size="small"
              />
              <Typography
                variant="caption"
                sx={{
                  color: UAFE_COLORS.textMuted,
                  fontSize: '0.65rem',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 30,
                  textAlign: 'right',
                }}
              >
                {p.porcentajeCompletitud ?? 0}%
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function ProtocolRow({ protocol, onView, onEdit }) {
  const UAFE_COLORS = useUAFEColors();
  const [expanded, setExpanded] = useState(false);

  const semaforo = getSemaforoFromProtocol(protocol);
  const missingFields = getMissingFields(protocol);
  const estadoConfig = ESTADOS_PROTOCOLO[protocol.estado] || ESTADOS_PROTOCOLO.BORRADOR;
  const personas = protocol.personas || [];
  const tipoActoDesc = TIPOS_ACTO_UAFE.find((t) => t.codigo === protocol.tipoActo)?.descripcion;

  const personNames = personas
    .slice(0, 2)
    .map((p) => p.nombre || p.nombreTemporal || 'Sin nombre');

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: 'pointer',
          '& td': {
            borderBottom: expanded ? 'none' : undefined,
            py: 1.25,
          },
          '&:hover': {
            backgroundColor: `${UAFE_COLORS.primaryLight}40`,
          },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand toggle */}
        <TableCell sx={{ width: 40, px: 1 }}>
          <IconButton size="small" sx={{ p: 0.25 }}>
            {expanded ? (
              <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
            ) : (
              <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </TableCell>

        {/* Protocolo # */}
        <TableCell>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.82rem',
              color: UAFE_COLORS.textPrimary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {protocol.numeroProtocolo || (
              <Tooltip title="Este protocolo aun no tiene numero asignado. Se asigna al facturar el acto notarial." arrow>
                <Typography component="span" sx={{ color: UAFE_COLORS.textMuted, fontStyle: 'italic', fontSize: '0.78rem' }}>
                  Sin asignar
                </Typography>
              </Tooltip>
            )}
          </Typography>
        </TableCell>

        {/* Fecha */}
        <TableCell>
          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: UAFE_COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
            {formatDate(protocol.fecha)}
          </Typography>
        </TableCell>

        {/* Tipo de Acto */}
        <TableCell>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.75rem',
              color: UAFE_COLORS.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 200,
            }}
          >
            {tipoActoDesc || protocol.actoContrato || '-'}
          </Typography>
        </TableCell>

        {/* Cuantia */}
        <TableCell align="right">
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: UAFE_COLORS.textPrimary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(protocol.valorContrato)}
          </Typography>
        </TableCell>

        {/* Comparecientes */}
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Chip
              size="small"
              label={personas.length}
              sx={{
                height: 20,
                minWidth: 20,
                fontSize: '0.68rem',
                fontWeight: 700,
                backgroundColor: UAFE_COLORS.primaryLight,
                color: UAFE_COLORS.primary,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: UAFE_COLORS.textSecondary,
                fontSize: '0.72rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 120,
              }}
            >
              {personNames.join(', ')}
              {personas.length > 2 && ` +${personas.length - 2}`}
            </Typography>
          </Box>
        </TableCell>

        {/* Estado (semaforo + badge) */}
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SemaforoIndicator
              level={semaforo.key}
              variant="dot"
              missingFields={missingFields}
              pulsate={semaforo.key === 'ROJO'}
            />
            <Tooltip title={estadoConfig.description} arrow>
              <Chip
                size="small"
                label={estadoConfig.label}
                sx={{
                  height: 22,
                  fontSize: '0.63rem',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  backgroundColor: estadoConfig.bg,
                  color: estadoConfig.color,
                  border: 'none',
                }}
              />
            </Tooltip>
          </Box>
        </TableCell>

        {/* Acciones */}
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Ver detalle del protocolo: datos del acto, comparecientes, textos generados y progreso" arrow>
              <IconButton
                size="small"
                onClick={() => onView?.(protocol)}
                sx={{
                  color: UAFE_COLORS.textMuted,
                  '&:hover': { color: UAFE_COLORS.primary, backgroundColor: UAFE_COLORS.primaryLight },
                }}
              >
                <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar datos del protocolo: tipo de acto, cuantia, ubicacion y comparecientes" arrow>
              <IconButton
                size="small"
                onClick={() => onEdit?.(protocol)}
                sx={{
                  color: UAFE_COLORS.textMuted,
                  '&:hover': { color: UAFE_COLORS.primary, backgroundColor: UAFE_COLORS.primaryLight },
                }}
              >
                <EditOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>

      {/* Expanded: person details */}
      <TableRow>
        <TableCell colSpan={headCells.length} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <ExpandedPersonRow personas={personas} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

/**
 * UAFEProtocolTable - Main data table for UAFE protocols
 *
 * Props:
 *   - protocols: ProtocoloUAFE[] with personas included
 *   - loading: boolean
 *   - onView: (protocol) => void
 *   - onEdit: (protocol) => void
 *   - filters: { search, estado, mes, tipoActo }
 *   - onFiltersChange: (newFilters) => void
 */
export default function UAFEProtocolTable({
  protocols = [],
  loading = false,
  onView,
  onEdit,
  filters = {},
  onFiltersChange,
}) {
  const UAFE_COLORS = useUAFEColors();
  const isDark = useTheme().palette.mode === 'dark';
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState('fecha');
  const [orderDir, setOrderDir] = useState('desc');

  const handleSort = (field) => {
    const isAsc = orderBy === field && orderDir === 'asc';
    setOrderDir(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const sortedProtocols = useMemo(() => {
    return [...protocols].sort((a, b) => {
      let valA = a[orderBy];
      let valB = b[orderBy];

      if (orderBy === 'valorContrato') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || '');
        valB = String(valB || '');
      }

      if (valA < valB) return orderDir === 'asc' ? -1 : 1;
      if (valA > valB) return orderDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [protocols, orderBy, orderDir]);

  const paginatedProtocols = sortedProtocols.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${UAFE_COLORS.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      {/* Filters bar */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          p: 2,
          borderBottom: `1px solid ${UAFE_COLORS.borderLight}`,
          backgroundColor: UAFE_COLORS.surface,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          size="small"
          placeholder="Buscar protocolo, nombre o cedula..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange?.({ ...filters, search: e.target.value })}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: UAFE_COLORS.textMuted }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: 1,
            minWidth: 240,
            '& .MuiOutlinedInput-root': {
              fontSize: '0.82rem',
              backgroundColor: isDark ? 'transparent' : '#fff',
              borderRadius: '8px',
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ fontSize: '0.82rem' }}>Estado</InputLabel>
          <Select
            value={filters.estado || ''}
            label="Estado"
            onChange={(e) => onFiltersChange?.({ ...filters, estado: e.target.value })}
            sx={{ fontSize: '0.82rem', backgroundColor: isDark ? 'transparent' : '#fff', borderRadius: '8px' }}
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.values(ESTADOS_PROTOCOLO).map((e) => (
              <MenuItem key={e.key} value={e.key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: e.color }} />
                  {e.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={{ fontSize: '0.82rem' }}>Tipo de Acto</InputLabel>
          <Select
            value={filters.tipoActo || ''}
            label="Tipo de Acto"
            onChange={(e) => onFiltersChange?.({ ...filters, tipoActo: e.target.value })}
            sx={{ fontSize: '0.82rem', backgroundColor: isDark ? 'transparent' : '#fff', borderRadius: '8px' }}
          >
            <MenuItem value="">Todos</MenuItem>
            {TIPOS_ACTO_UAFE.map((t) => (
              <MenuItem key={t.codigo} value={t.codigo} sx={{ fontSize: '0.82rem' }}>
                {t.descripcion}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  backgroundColor: UAFE_COLORS.surface,
                  borderBottom: `2px solid ${UAFE_COLORS.border}`,
                  color: UAFE_COLORS.textSecondary,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  py: 1.25,
                },
              }}
            >
              {headCells.map((cell) => (
                <TableCell
                  key={cell.id}
                  align={cell.align || 'left'}
                  sx={{ width: cell.width }}
                >
                  {cell.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === cell.id}
                      direction={orderBy === cell.id ? orderDir : 'asc'}
                      onClick={() => handleSort(cell.id)}
                    >
                      {cell.label}
                    </TableSortLabel>
                  ) : (
                    cell.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {headCells.map((cell) => (
                    <TableCell key={cell.id}>
                      <Skeleton variant="text" width="80%" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedProtocols.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headCells.length} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No se encontraron protocolos
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProtocols.map((protocol) => (
                <ProtocolRow
                  key={protocol.id}
                  protocol={protocol}
                  onView={onView}
                  onEdit={onEdit}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={sortedProtocols.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Filas:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        sx={{
          borderTop: `1px solid ${UAFE_COLORS.borderLight}`,
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.75rem',
          },
        }}
      />
    </Paper>
  );
}
