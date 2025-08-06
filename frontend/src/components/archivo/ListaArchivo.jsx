import React, { useState } from 'react';
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
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Button,
  Divider,
  TableSortLabel
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import archivoService from '../../services/archivo-service';
import { formatCurrency } from '../../utils/currencyUtils';
import DocumentDetailModal from '../Documents/DocumentDetailModal';
import EditDocumentModal from '../Documents/EditDocumentModal';
import ConfirmationModal from '../Documents/ConfirmationModal';
import useDocumentStore from '../../store/document-store';

/**
 * Vista Lista para documentos de archivo
 * Tabla completa con filtros y paginación
 */
const ListaArchivo = ({ documentos, onEstadoChange, onRefresh }) => {
  const { requiresConfirmation } = useDocumentStore();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filtros, setFiltros] = useState({
    search: '',
    estado: 'TODOS',
    tipo: 'TODOS'
  });
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Estados para modales
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false);

  /**
   * Filtrar y ordenar documentos (igual que ListView de Matrizador)
   */
  const documentosFiltrados = documentos.filter(doc => {
    // Filtro de búsqueda mejorado
    const searchTerm = filtros.search.toLowerCase();
    const matchesSearch = !searchTerm || searchTerm.length < 2 ||
      doc.clientName?.toLowerCase().includes(searchTerm) ||
      doc.protocolNumber?.toLowerCase().includes(searchTerm) ||
      doc.documentType?.toLowerCase().includes(searchTerm) ||
      doc.clientPhone?.includes(searchTerm);

    // Filtro de estado
    const matchesEstado = filtros.estado === 'TODOS' || doc.status === filtros.estado;

    // Filtro de tipo
    const matchesTipo = filtros.tipo === 'TODOS' || doc.documentType === filtros.tipo;

    return matchesSearch && matchesEstado && matchesTipo;
  }).sort((a, b) => {
    // Ordenamiento dinámico
    let aValue = a[orderBy];
    let bValue = b[orderBy];
    
    if (orderBy === 'createdAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (order === 'desc') {
      return bValue > aValue ? 1 : -1;
    }
    return aValue > bValue ? 1 : -1;
  });

  /**
   * Documentos de la página actual
   */
  const documentosPagina = documentosFiltrados.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
   * Abrir menú de acciones
   */
  const handleMenuOpen = (event, documento) => {
    setMenuAnchor(event.currentTarget);
    setSelectedDocument(documento);
  };

  /**
   * Cerrar menú
   */
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedDocument(null);
  };

  /**
   * Manejar ordenamiento (igual que ListView de Matrizador)
   */
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
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
   * Abrir modal de detalles
   */
  const handleVerDetalles = () => {
    setDetailModalOpen(true);
    handleMenuClose();
  };

  /**
   * Abrir modal de edición
   */
  const handleEditar = () => {
    setEditModalOpen(true);
    handleMenuClose();
  };

  /**
   * Cambiar estado del documento
   */
  const handleCambiarEstado = async (nuevoEstado) => {
    if (!selectedDocument) return;

    console.log(`🚀 handleCambiarEstado: ${selectedDocument.protocolNumber} → ${nuevoEstado}`);
    
    // Verificar si requiere confirmación
    const confirmationInfo = requiresConfirmation(selectedDocument.status, nuevoEstado);
    
    if (confirmationInfo.requiresConfirmation) {
      console.log('🎯 Cambio requiere confirmación, abriendo modal...');
      setConfirmationData({
        document: selectedDocument,
        currentStatus: selectedDocument.status,
        newStatus: nuevoEstado,
        confirmationInfo: confirmationInfo
      });
      setConfirmationModalOpen(true);
    } else {
      // Proceder directamente
      try {
        const response = await onEstadoChange(selectedDocument.id, nuevoEstado);
        if (response.success && onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error al cambiar estado:', error);
      }
    }
    
    handleMenuClose();
  };

  /**
   * Cerrar modal de confirmación
   */
  const handleCloseConfirmation = () => {
    setConfirmationModalOpen(false);
    setConfirmationData(null);
    setIsConfirmationLoading(false);
  };

  /**
   * Confirmar cambio de estado
   */
  const handleConfirmStatusChange = async (data) => {
    console.log('🎯 Confirmando cambio de estado:', data);
    setIsConfirmationLoading(true);
    
    try {
      const response = await onEstadoChange(data.document.id, data.newStatus, {
        reversionReason: data.reversionReason,
        changeType: data.changeType,
        deliveredTo: data.deliveredTo
      });
      
      if (response.success) {
        console.log('✅ Cambio de estado confirmado exitosamente');
        handleCloseConfirmation();
        
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('❌ Error al confirmar cambio:', response.message);
        setIsConfirmationLoading(false);
      }
    } catch (error) {
      console.error('❌ Error al confirmar cambio de estado:', error);
      setIsConfirmationLoading(false);
    }
  };

  /**
   * Cerrar modales
   */
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
  };

  /**
   * Guardar edición
   */
  const handleEditSave = async (formData) => {
    try {
      handleCloseEditModal();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error al guardar edición:', error);
      throw error;
    }
  };

  return (
    <Box>
      {/* Controles y Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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

          {/* Filtro de Estado */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={filtros.estado}
              label="Estado"
              onChange={(e) => handleFilterChange('estado', e.target.value)}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
              <MenuItem value="LISTO">Listo</MenuItem>
              <MenuItem value="ENTREGADO">Entregado</MenuItem>
            </Select>
          </FormControl>

          {/* Filtro de Tipo */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filtros.tipo}
              label="Tipo"
              onChange={(e) => handleFilterChange('tipo', e.target.value)}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              <MenuItem value="PROTOCOLO">Protocolo</MenuItem>
              <MenuItem value="DILIGENCIA">Diligencia</MenuItem>
              <MenuItem value="CERTIFICACION">Certificación</MenuItem>
              <MenuItem value="ARRENDAMIENTO">Arrendamiento</MenuItem>
              <MenuItem value="OTROS">Otros</MenuItem>
            </Select>
          </FormControl>

          {/* Botón Refrescar */}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            size="small"
          >
            Refrescar
          </Button>
        </Box>

        {/* Resumen de resultados */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {documentosPagina.length} de {documentosFiltrados.length} documentos
          </Typography>
          
          {filtros.search && (
            <Chip 
              label={`Búsqueda: "${filtros.search}"`} 
              size="small" 
              onDelete={() => handleFilterChange('search', '')}
            />
          )}
          
          {filtros.estado !== 'TODOS' && (
            <Chip 
              label={`Estado: ${archivoService.formatearEstado(filtros.estado).texto}`} 
              size="small" 
              onDelete={() => handleFilterChange('estado', 'TODOS')}
            />
          )}
          
          {filtros.tipo !== 'TODOS' && (
            <Chip 
              label={`Tipo: ${filtros.tipo}`} 
              size="small" 
              onDelete={() => handleFilterChange('tipo', 'TODOS')}
            />
          )}
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'protocolNumber'}
                    direction={orderBy === 'protocolNumber' ? order : 'asc'}
                    onClick={() => handleSort('protocolNumber')}
                  >
                    Protocolo
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'clientName'}
                    direction={orderBy === 'clientName' ? order : 'asc'}
                    onClick={() => handleSort('clientName')}
                  >
                    Cliente
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'documentType'}
                    direction={orderBy === 'documentType' ? order : 'asc'}
                    onClick={() => handleSort('documentType')}
                  >
                    Tipo
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'totalFactura'}
                    direction={orderBy === 'totalFactura' ? order : 'asc'}
                    onClick={() => handleSort('totalFactura')}
                  >
                    Valor
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Estado
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={orderBy === 'createdAt'}
                    direction={orderBy === 'createdAt' ? order : 'asc'}
                    onClick={() => handleSort('createdAt')}
                  >
                    Fecha
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentosPagina.map((documento) => (
                <TableRow 
                  key={documento.id}
                  hover
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'action.hover',
                      cursor: 'pointer' 
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
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {documento.clientPhone || '-'}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {documento.documentType}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                      {formatCurrency(documento.totalFactura || 0)}
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
                      {formatearFecha(documento.createdAt)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, documento)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              
              {documentosPagina.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      {documentosFiltrados.length === 0 
                        ? 'No hay documentos que coincidan con los filtros'
                        : 'No hay documentos en esta página'
                      }
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
          count={documentosFiltrados.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>

      {/* Menú de acciones funcional */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleVerDetalles}>
          Ver Detalles
        </MenuItem>
        <MenuItem onClick={handleEditar}>
          Editar
        </MenuItem>
        <Divider />
        {selectedDocument?.status === 'EN_PROCESO' && (
          <MenuItem onClick={() => handleCambiarEstado('LISTO')}>
            Marcar como Listo
          </MenuItem>
        )}
        {selectedDocument?.status === 'LISTO' && (
          <MenuItem onClick={() => handleCambiarEstado('ENTREGADO')}>
            Marcar como Entregado
          </MenuItem>
        )}
        {selectedDocument?.status === 'ENTREGADO' && (
          <MenuItem onClick={() => handleCambiarEstado('LISTO')}>
            Revertir a Listo
          </MenuItem>
        )}
      </Menu>

      {/* Modal de detalles del documento */}
      {detailModalOpen && selectedDocument && (
        <DocumentDetailModal
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          document={selectedDocument}
          userRole="archivo"
        />
      )}

      {/* Modal de edición del documento */}
      {editModalOpen && selectedDocument && (
        <EditDocumentModal
          open={editModalOpen}
          onClose={handleCloseEditModal}
          document={selectedDocument}
          onSave={handleEditSave}
        />
      )}

      {/* Modal de confirmación de cambio de estado */}
      {confirmationModalOpen && confirmationData && (
        <ConfirmationModal
          open={confirmationModalOpen}
          onClose={handleCloseConfirmation}
          onConfirm={handleConfirmStatusChange}
          document={confirmationData.document}
          currentStatus={confirmationData.currentStatus}
          newStatus={confirmationData.newStatus}
          confirmationInfo={confirmationData.confirmationInfo}
          isLoading={isConfirmationLoading}
        />
      )}
    </Box>
  );
};

export default ListaArchivo;