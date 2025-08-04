import React, { useState, useMemo } from 'react';
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
  Chip,
  IconButton,
  Typography,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  TableSortLabel
} from '@mui/material';
import {
  Visibility as ViewIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import useDocumentStore from '../../store/document-store';
import DocumentDetailModal from './DocumentDetailModal';

/**
 * Vista Lista - EXACTA AL PROTOTIPO
 * Tabla completa con todas las funcionalidades
 */
const ListView = ({ searchTerm, statusFilter, typeFilter }) => {
  const { documents, updateDocumentStatus } = useDocumentStore();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);

  /**
   * Filtrar y ordenar documentos
   */
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      const matchesSearch = !searchTerm || 
        doc.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.protocolNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || doc.status === statusFilter;
      const matchesType = !typeFilter || doc.documentType === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Ordenar
    filtered.sort((a, b) => {
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

    return filtered;
  }, [documents, searchTerm, statusFilter, typeFilter, orderBy, order]);

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    const colors = {
      'EN_PROCESO': { color: 'warning', label: 'En Proceso' },
      'LISTO': { color: 'success', label: 'Listo para Entrega' },
      'ENTREGADO': { color: 'info', label: 'Entregado' },
      'PENDIENTE': { color: 'default', label: 'Pendiente' }
    };
    return colors[status] || { color: 'default', label: status };
  };

  /**
   * Manejar ordenamiento
   */
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  /**
   * Manejar paginación
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

  /**
   * Manejar menú de acciones
   */
  const handleMenuOpen = (event, documentId) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(documentId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  /**
   * Cambiar estado del documento
   */
  const handleStatusChange = async (documentId, newStatus) => {
    await updateDocumentStatus(documentId, newStatus);
    handleMenuClose();
  };

  // Documentos de la página actual
  const paginatedDocuments = filteredAndSortedDocuments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tabla principal */}
      <Paper sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                  <TableSortLabel
                    active={orderBy === 'protocolNumber'}
                    direction={orderBy === 'protocolNumber' ? order : 'asc'}
                    onClick={() => handleSort('protocolNumber')}
                  >
                    Código
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                  <TableSortLabel
                    active={orderBy === 'clientName'}
                    direction={orderBy === 'clientName' ? order : 'asc'}
                    onClick={() => handleSort('clientName')}
                  >
                    Cliente
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                  <TableSortLabel
                    active={orderBy === 'documentType'}
                    direction={orderBy === 'documentType' ? order : 'asc'}
                    onClick={() => handleSort('documentType')}
                  >
                    Tipo Documento
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Estado
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                  <TableSortLabel
                    active={orderBy === 'createdAt'}
                    direction={orderBy === 'createdAt' ? order : 'asc'}
                    onClick={() => handleSort('createdAt')}
                  >
                    Fecha Ingreso
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                  Valor
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }} align="center">
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDocuments.map((document) => {
                const statusInfo = getStatusColor(document.status);
                return (
                  <TableRow 
                    key={document.id} 
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => openDetailModal(document)}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {document.protocolNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ 
                          width: 32, 
                          height: 32, 
                          mr: 1.5,
                          bgcolor: 'primary.main',
                          fontSize: '0.875rem'
                        }}>
                          {document.clientName?.charAt(0) || 'C'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {document.clientName}
                          </Typography>
                          {document.clientPhone && (
                            <Typography variant="caption" color="text.secondary">
                              <PhoneIcon sx={{ fontSize: 12, mr: 0.5 }} />
                              {document.clientPhone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={document.documentType}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusInfo.label}
                        size="small"
                        color={statusInfo.color}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(document.createdAt).toLocaleDateString('es-EC', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(document.createdAt).toLocaleTimeString('es-EC', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                        ${new Intl.NumberFormat('es-EC').format(document.actoPrincipalValor || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {document.actoPrincipalDescripcion}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Ver detalles">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(document);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Más opciones">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuOpen(e, document.id);
                            }}
                          >
                            <MoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredAndSortedDocuments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>

      {/* Menú de acciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleStatusChange(selectedRowId, 'EN_PROCESO')}>
          <EditIcon sx={{ mr: 1, fontSize: 16 }} />
          Marcar En Proceso
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange(selectedRowId, 'LISTO')}>
          <EditIcon sx={{ mr: 1, fontSize: 16 }} />
          Marcar Listo
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange(selectedRowId, 'ENTREGADO')}>
          <EditIcon sx={{ mr: 1, fontSize: 16 }} />
          Marcar Entregado
        </MenuItem>
      </Menu>

      {/* Modal de Detalle */}
      <DocumentDetailModal
        open={detailModalOpen}
        onClose={closeDetailModal}
        document={selectedDocument}
      />
    </Box>
  );
};

export default ListView;