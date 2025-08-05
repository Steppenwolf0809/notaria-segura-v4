import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip,
  Avatar,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import useDocumentStore from '../../store/document-store';
import useStats from '../../hooks/useStats';
import useDebounce from '../../hooks/useDebounce';
import DocumentDetailModal from './DocumentDetailModal';
import GroupingAlert from '../grouping/GroupingAlert';

/**
 * Componente DocumentsList - Vista de tabla con búsqueda y filtros avanzados
 * Proporciona navegación eficiente para alto volumen de documentos
 */
const DocumentsList = () => {
  const { documents, updateDocumentStatus } = useDocumentStore();
  const { basicStats, utils } = useStats();

  // Estados para filtros y búsqueda
  // SEPARACIÓN DE ESTADOS: inputValue (inmediato) vs searchTerm (debounced)
  const [inputValue, setInputValue] = useState(''); // Estado local del input - actualización inmediata
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // DEBOUNCING: Solo buscar después de que el usuario pause por 400ms
  const debouncedSearchTerm = useDebounce(inputValue, 400);

  /**
   * Filtrar y buscar documentos
   * MEJORA: Usar debouncedSearchTerm en lugar de searchTerm directo
   */
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];

    // Búsqueda por texto con debouncing - solo buscar si tiene al menos 2 caracteres
    if (debouncedSearchTerm.trim() && debouncedSearchTerm.length >= 2) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.clientName?.toLowerCase().includes(searchLower) ||
        doc.protocolNumber?.toLowerCase().includes(searchLower) ||
        doc.actoPrincipalDescripcion?.toLowerCase().includes(searchLower) ||
        doc.documentType?.toLowerCase().includes(searchLower) ||
        doc.clientPhone?.includes(debouncedSearchTerm) ||
        doc.clientEmail?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por estado
    if (statusFilter) {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Filtro por tipo de documento
    if (typeFilter) {
      filtered = filtered.filter(doc => doc.documentType === typeFilter);
    }

    // Filtro por rango de fechas
    if (dateRange) {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        filtered = filtered.filter(doc => new Date(doc.createdAt) >= startDate);
      }
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Manejar diferentes tipos de datos
      if (sortField === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [documents, debouncedSearchTerm, statusFilter, typeFilter, dateRange, sortField, sortDirection]);

  /**
   * Documentos paginados
   */
  const paginatedDocuments = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredDocuments.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredDocuments, page, rowsPerPage]);

  /**
   * Obtener tipos de documentos únicos
   */
  const documentTypes = useMemo(() => {
    const types = [...new Set(documents.map(doc => doc.documentType))];
    return types.filter(Boolean);
  }, [documents]);

  /**
   * Limpiar todos los filtros
   * MEJORA: Limpiar inputValue en lugar de searchTerm
   */
  const clearFilters = () => {
    setInputValue(''); // Limpiar el input local
    setStatusFilter('');
    setTypeFilter('');
    setDateRange('');
    setPage(0);
  };

  /**
   * Manejar cambio de página
   */
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Manejar cambio de filas por página
   */
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Formatear moneda
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  /**
   * Formatear fecha
   */
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    const colors = {
      PENDIENTE: 'warning',
      EN_PROCESO: 'info',
      LISTO: 'success',
      ENTREGADO: 'default'
    };
    return colors[status] || 'default';
  };

  /**
   * Obtener texto del estado
   */
  const getStatusText = (status) => {
    const texts = {
      PENDIENTE: 'Pendiente',
      EN_PROCESO: 'En Proceso',
      LISTO: 'Listo',
      ENTREGADO: 'Entregado'
    };
    return texts[status] || status;
  };

  /**
   * Manejar acción rápida
   */
  const handleQuickAction = async (documentId, action) => {
    let newStatus;
    switch (action) {
      case 'start':
        newStatus = 'EN_PROCESO';
        break;
      case 'ready':
        newStatus = 'LISTO';
        break;
      case 'deliver':
        newStatus = 'ENTREGADO';
        break;
      default:
        return;
    }

    await updateDocumentStatus(documentId, newStatus);
  };

  /**
   * Abrir modal de detalle
   */
  const openDetailModal = (document) => {
    setSelectedDocument(document);
    setDetailModalOpen(true);
  };

  /**
   * Cerrar modal de detalle
   */
  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedDocument(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
          Vista Lista de Documentos
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Gestión avanzada con búsqueda y filtros en tiempo real
        </Typography>
      </Box>

      {/* Estadísticas rápidas */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={4} sx={{ alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                {filteredDocuments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Documentos encontrados
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                {basicStats.EN_PROCESO}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                En proceso
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                {basicStats.LISTO}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Listos
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Filtros y búsqueda */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
            {/* Búsqueda global - MEJORADA con estado separado */}
            <TextField
              fullWidth
              placeholder="Buscar por cliente, protocolo, descripción, teléfono..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: inputValue && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setInputValue('')} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 300 }}
            />

            {/* Filtro por estado */}
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Estado"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
                <MenuItem value="LISTO">Listo</MenuItem>
                <MenuItem value="ENTREGADO">Entregado</MenuItem>
              </Select>
            </FormControl>

            {/* Filtro por tipo */}
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Tipo"
              >
                <MenuItem value="">Todos</MenuItem>
                {documentTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Filtro por fecha */}
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Fecha</InputLabel>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                label="Fecha"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="today">Hoy</MenuItem>
                <MenuItem value="week">Esta semana</MenuItem>
                <MenuItem value="month">Este mes</MenuItem>
              </Select>
            </FormControl>

            {/* Botón limpiar */}
            <Button
              variant="outlined"
              onClick={clearFilters}
              startIcon={<FilterIcon />}
              sx={{ minWidth: 120 }}
            >
              Limpiar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabla de documentos */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Documento</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acto Principal</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDocuments.map((document) => (
                <TableRow
                  key={document.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  {/* Cliente */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                        {document.clientName?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {document.clientName}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          {document.clientPhone && (
                            <Tooltip title={document.clientPhone}>
                              <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            </Tooltip>
                          )}
                          {document.clientEmail && (
                            <Tooltip title={document.clientEmail}>
                              <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            </Tooltip>
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Documento */}
                  <TableCell>
                    <Box>
                      <Chip
                        label={document.documentType}
                        size="small"
                        sx={{ 
                          mb: 0.5,
                          bgcolor: (theme) => theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgb(226, 232, 240)',
                          color: (theme) => theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.7)'
                            : 'rgb(71, 85, 105)',
                          border: 'none',
                          borderRadius: '12px' // rounded-full
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        {document.protocolNumber}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip
                        label={getStatusText(document.status)}
                        color={getStatusColor(document.status)}
                        size="small"
                        variant={document.status === 'LISTO' ? 'filled' : 'outlined'}
                      />
                      {/* 🔗 ALERTA DE AGRUPACIÓN COMPACTA */}
                      {!document.isGrouped && (
                        <GroupingAlert
                          document={document}
                          variant="chip"
                        />
                      )}
                    </Box>
                  </TableCell>

                  {/* Acto Principal */}
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {document.actoPrincipalDescripcion}
                    </Typography>
                  </TableCell>

                  {/* Valor */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MoneyIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatCurrency(document.actoPrincipalValor)}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Fecha */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                      <Typography variant="caption">
                        {formatDate(document.createdAt)}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Ver detalle">
                        <IconButton 
                          size="small"
                          onClick={() => openDetailModal(document)}
                        >
                          <ViewIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      
                      {document.status === 'PENDIENTE' && (
                        <Tooltip title="Iniciar proceso">
                          <IconButton
                            size="small"
                            onClick={() => handleQuickAction(document.id, 'start')}
                          >
                            <EditIcon sx={{ fontSize: 18, color: 'info.main' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {document.status === 'EN_PROCESO' && (
                        <Tooltip title="Marcar como listo">
                          <IconButton
                            size="small"
                            onClick={() => handleQuickAction(document.id, 'ready')}
                          >
                            <EditIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {document.status === 'LISTO' && (
                        <Tooltip title="Marcar como entregado">
                          <IconButton
                            size="small"
                            onClick={() => handleQuickAction(document.id, 'deliver')}
                          >
                            <EditIcon sx={{ fontSize: 18, color: 'grey.600' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredDocuments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>

      {/* Modal de Detalle */}
      <DocumentDetailModal
        open={detailModalOpen}
        onClose={closeDetailModal}
        document={selectedDocument}
      />
    </Box>
  );
};

export default DocumentsList;