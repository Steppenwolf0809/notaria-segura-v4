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
  TableSortLabel,
  Checkbox,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Phone as PhoneIcon,
  Undo as UndoIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon
} from '@mui/icons-material';
import useDocumentStore from '../../store/document-store';
import DocumentDetailModal from './DocumentDetailModal';
import GroupingAlert from '../grouping/GroupingAlert';
import { formatCurrency } from '../../utils/currencyUtils';
import QuickGroupingModal from '../grouping/QuickGroupingModal';
import GroupInfoModal from '../shared/GroupInfoModal';
// NUEVOS COMPONENTES PARA SELECCIÓN MÚLTIPLE
import useBulkActions from '../../hooks/useBulkActions';
import BulkActionToolbar from '../bulk/BulkActionToolbar';
import BulkStatusChangeModal from '../bulk/BulkStatusChangeModal';
import ReversionModal from '../recepcion/ReversionModal';
import ModalEntregaMatrizador from '../matrizador/ModalEntregaMatrizador.jsx';
import { toast } from 'react-toastify';

/**
 * Vista Lista - EXACTA AL PROTOTIPO + SELECCIÓN MÚLTIPLE
 * Tabla completa con todas las funcionalidades + checkboxes para cambios masivos
 */
const ListView = ({ searchTerm, statusFilter, typeFilter, mostrarEntregados = false, onSearchByClient }) => {
  const { documents, updateDocumentStatus, updateDocument, createDocumentGroup, detectGroupableDocuments, fetchMyDocuments } = useDocumentStore();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  // Estados para modales y acciones
  const [confirmListoOpen, setConfirmListoOpen] = useState(false);
  const [entregaOpen, setEntregaOpen] = useState(false);
  const [reversionOpen, setReversionOpen] = useState(false);
  const [currentDocumento, setCurrentDocumento] = useState(null);

  // 🔗 Estados para agrupación rápida reutilizando modal existente
  const [showQuickGroupingModal, setShowQuickGroupingModal] = useState(false);
  const [pendingGroupData, setPendingGroupData] = useState({ main: null, related: [] });
  const [groupingLoading, setGroupingLoading] = useState(false);
  const [groupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [selectedGroupDocument, setSelectedGroupDocument] = useState(null);

  // 🆕 NUEVOS ESTADOS PARA SELECCIÓN MÚLTIPLE
  const bulkActions = useBulkActions();
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState(null);

  /**
   * Filtrar y ordenar documentos
   */
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      // CORRECCIÓN: Solo buscar si el término tiene al menos 2 caracteres
      const matchesSearch = !searchTerm || searchTerm.length < 2 ||
        doc.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.protocolNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !statusFilter || doc.status === statusFilter;
      const matchesType = !typeFilter || doc.documentType === typeFilter;

      // 🆕 Filtro para ocultar ENTREGADOS si el toggle está desactivado
      const matchesEntregados = mostrarEntregados || doc.status !== 'ENTREGADO';

      return matchesSearch && matchesStatus && matchesType && matchesEntregados;
    });

    // Ordenar
    filtered.sort((a, b) => {
      // 🆕 PRIORIDAD POR ESTADO: EN_PROCESO > LISTO > OTROS > ENTREGADO
      const prioridad = {
        'EN_PROCESO': 1,
        'LISTO': 2,
        'PENDIENTE': 3,
        'CANCELADO': 4,
        'ENTREGADO': 5
      };

      const prioA = prioridad[a.status] || 99;
      const prioB = prioridad[b.status] || 99;

      // Si tienen diferente prioridad, ordenar por prioridad (menor número = mayor prioridad)
      if (prioA !== prioB) {
        return prioA - prioB;
      }

      // Si tienen misma prioridad, aplicar ordenamiento dinámico
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
  }, [documents, searchTerm, statusFilter, typeFilter, orderBy, order, mostrarEntregados]);

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
   * Manejar actualización de documento desde modal de detalle
   */
  const handleDocumentUpdated = (updatedData) => {
    console.log('📝 Documento actualizado desde modal (ListView):', updatedData);
    
    // Si tenemos la estructura { document: documentData }
    if (updatedData && updatedData.document) {
      const updatedDocument = updatedData.document;
      
      // Actualizar el documento seleccionado para el modal
      setSelectedDocument(prev => prev ? {
        ...prev,
        ...updatedDocument
      } : null);
      
      // Actualizar documento en el store para que se refleje en la vista
      updateDocument(updatedDocument.id, updatedDocument);
      
      console.log('🔄 Documento actualizado en vista Lista:', updatedDocument);
    }
  };

  // Abrir/ cerrar modales
  const openConfirmListo = (doc) => { setCurrentDocumento(doc); setConfirmListoOpen(true); };
  const closeConfirmListo = () => { setConfirmListoOpen(false); setCurrentDocumento(null); };
  const openEntrega = (doc) => { setCurrentDocumento(doc); setEntregaOpen(true); };
  const closeEntrega = () => { setEntregaOpen(false); setCurrentDocumento(null); };
  const openReversion = (doc) => { setCurrentDocumento(doc); setReversionOpen(true); };
  const closeReversion = () => { setReversionOpen(false); setCurrentDocumento(null); };

  // Confirmar marcar como LISTO
  const handleConfirmMarcarListo = async () => {
    if (!currentDocumento) return;
    const result = await updateDocumentStatus(currentDocumento.id, 'LISTO');
    closeConfirmListo();
    // Notificación global según resultado y política de notificación
    if (!result) return;
    if (result.success) {
      const w = result.data?.whatsapp || {};
      const sentLike = !!(w.sent || ['sent','queued','delivered'].includes(w.status) || w.sid || w.messageId);
      if (sentLike) {
        toast.success('Documento marcado como LISTO. WhatsApp enviado.');
      } else if (w.skipped || currentDocumento?.notificationPolicy === 'no_notificar') {
        toast.info('Documento marcado como LISTO. No se envió WhatsApp (preferencia no notificar).');
      } else if (w.error) {
        toast.error(`Documento LISTO, pero WhatsApp falló: ${w.error}`);
      } else {
        toast.success('Documento marcado como LISTO.');
      }
    } else {
      toast.error(result.error || 'Error al marcar como LISTO');
    }
  };

  // Confirmar entrega (ENTREGADO) para matrizador
  const handleConfirmEntrega = async ({ deliveredTo }) => {
    if (!currentDocumento) return;
    const result = await updateDocumentStatus(currentDocumento.id, 'ENTREGADO', { deliveredTo });
    closeEntrega();
    if (!result) return;
    if (result.success) {
      const w = result.data?.whatsapp || {};
      if (w.sent) {
        toast.success('Documento entregado. Confirmación WhatsApp enviada.');
      } else if (w.error) {
        toast.error(`Documento entregado, pero WhatsApp falló: ${w.error}`);
      } else {
        toast.success('Documento marcado como ENTREGADO.');
      }
    } else {
      toast.error(result.error || 'Error al marcar como ENTREGADO');
    }
  };

  /**
   * Abrir flujo de agrupación rápida desde un documento
   */
  const handleOpenGroupingFromDocument = async (document) => {
    try {
      // Detectar documentos agrupables para el cliente
      const result = await detectGroupableDocuments({
        clientName: document.clientName,
        clientId: document.clientId || ''
      });

      const related = (result.groupableDocuments || []).filter(d => d.id !== document.id);
      if (result.success && related.length > 0) {
        setPendingGroupData({ main: document, related });
        setShowQuickGroupingModal(true);
      } else {
        // Silencioso: cerrar menú sin ruido si no hay agrupables
      }
    } catch (e) {
      // Silencioso para no ensuciar la vista lista
      console.error('Error detectando agrupables (ListView):', e);
    } finally {
      // No menu to close; keep UX silent
    }
  };

  /**
   * Callback para chip/alerta de agrupación
   */
  const handleGroupDocuments = (groupableDocuments, mainDocument) => {
    setPendingGroupData({ main: mainDocument, related: groupableDocuments });
    setShowQuickGroupingModal(true);
  };

  // 🎯 NUEVAS FUNCIONES PARA SELECCIÓN MÚLTIPLE

  // Documentos de la página actual - DEBE IR ANTES de los useMemo
  const paginatedDocuments = filteredAndSortedDocuments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  /**
   * Manejar selección de todos los documentos visibles
   */
  const handleSelectAll = (event) => {
    bulkActions.toggleSelectAll(paginatedDocuments, event.target.checked);
  };

  /**
   * Verificar si todos los documentos visibles están seleccionados
   */
  const isAllSelected = useMemo(() => {
    if (paginatedDocuments.length === 0) return false;
    return paginatedDocuments.every(doc => bulkActions.selectedDocuments.has(doc.id));
  }, [paginatedDocuments, bulkActions.selectedDocuments]);

  /**
   * Verificar si algunos documentos están seleccionados (para indeterminate)
   */
  const isIndeterminate = useMemo(() => {
    const selectedCount = paginatedDocuments.filter(doc => 
      bulkActions.selectedDocuments.has(doc.id)
    ).length;
    return selectedCount > 0 && selectedCount < paginatedDocuments.length;
  }, [paginatedDocuments, bulkActions.selectedDocuments]);

  /**
   * Manejar clic en acción masiva desde toolbar
   */
  const handleBulkAction = (targetStatus, options) => {
    const selectedDocs = filteredAndSortedDocuments.filter(doc => 
      bulkActions.selectedDocuments.has(doc.id)
    );
    
    setPendingBulkAction({
      documents: selectedDocs,
      fromStatus: bulkActions.getCommonStatus(filteredAndSortedDocuments),
      toStatus: targetStatus,
      options
    });
    setBulkModalOpen(true);
  };

  /**
   * Ejecutar cambio masivo confirmado
   */
  const handleConfirmBulkAction = async (actionData) => {
    try {
      // Filtrar opciones para evitar duplicados de fromStatus/toStatus
      const { fromStatus, toStatus, ...cleanOptions } = actionData.options || {};
      
      const result = await bulkActions.executeBulkStatusChange(
        filteredAndSortedDocuments, 
        actionData.toStatus, 
        cleanOptions
      );
      
      // Refrescar la lista para reflejar estados actualizados
      if (result && result.success && typeof fetchMyDocuments === 'function') {
        await fetchMyDocuments();
      }
      console.log('✅ Cambio masivo completado en ListView');
    } catch (error) {
      console.error('❌ Error en cambio masivo:', error);
      // TODO: Mostrar notificación de error
    } finally {
      setBulkModalOpen(false);
      setPendingBulkAction(null);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tabla principal */}
      <Paper sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {/* 🎯 NUEVA COLUMNA: Checkbox para selección múltiple */}
                <TableCell padding="checkbox" sx={{ fontWeight: 'bold' }}>
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    disabled={paginatedDocuments.length === 0}
                    color="primary"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'protocolNumber'}
                    direction={orderBy === 'protocolNumber' ? order : 'asc'}
                    onClick={() => handleSort('protocolNumber')}
                  >
                    Código
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'clientName'}
                    direction={orderBy === 'clientName' ? order : 'asc'}
                    onClick={() => handleSort('clientName')}
                  >
                    Cliente
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'documentType'}
                    direction={orderBy === 'documentType' ? order : 'asc'}
                    onClick={() => handleSort('documentType')}
                  >
                    Tipo Documento
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Estado
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'createdAt'}
                    direction={orderBy === 'createdAt' ? order : 'asc'}
                    onClick={() => handleSort('createdAt')}
                  >
                    Fecha Ingreso
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  Valor
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">
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
                    selected={bulkActions.selectedDocuments.has(document.id)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      ...(bulkActions.selectedDocuments.has(document.id) && {
                        bgcolor: 'action.selected'
                      })
                    }}
                  >
                    {/* 🎯 NUEVA CELDA: Checkbox individual */}
                    <TableCell 
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()} // Evitar que abra el modal
                    >
                      <Checkbox
                        checked={bulkActions.selectedDocuments.has(document.id)}
                        onChange={() => bulkActions.toggleDocumentSelection(
                          document.id, 
                          document.status, 
                          filteredAndSortedDocuments
                        )}
                        disabled={!bulkActions.canSelectDocument(document, filteredAndSortedDocuments)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell onClick={() => openDetailModal(document)}>
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
                          <Tooltip title="Click para buscar todos los documentos de este cliente" arrow>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 'medium',
                                cursor: 'pointer',
                                '&:hover': {
                                  color: 'primary.main',
                                  textDecoration: 'underline'
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSearchByClient) {
                                  onSearchByClient(document.clientName);
                                }
                              }}
                            >
                              {document.clientName}
                            </Typography>
                          </Tooltip>
                          {document.clientPhone && (
                            <Typography variant="caption" color="text.secondary">
                              <PhoneIcon sx={{ fontSize: 12, mr: 0.5 }} />
                              {document.clientPhone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => openDetailModal(document)}>
                      <Chip
                        label={document.documentType}
                        size="small"
                        sx={{
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
                    </TableCell>
                    <TableCell onClick={() => openDetailModal(document)}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          color={statusInfo.color}
                          variant="filled"
                        />
                        {/* 🔗 ALERTA DE AGRUPACIÓN COMPACTA */}
                        {/* 🚫 AGRUPACIÓN TEMPORALMENTE DESHABILITADA (sin notificaciones WhatsApp) */}
                        {/* Mostrar chip de agrupación si aplica; si ya está agrupado, mostrar texto sutil */}
                        {false && !document.isGrouped ? (
                          <GroupingAlert
                            document={document}
                            variant="chip"
                            onGroupAction={handleGroupDocuments}
                          />
                        ) : document.isGrouped ? (
                          <Chip 
                            label="⚡ Parte de un grupo"
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGroupDocument(document);
                              setGroupInfoModalOpen(true);
                            }}
                            sx={{ mt: 0.5, height: '20px', '& .MuiChip-label': { px: 1 } }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => openDetailModal(document)}>
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
                    <TableCell onClick={() => openDetailModal(document)}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                        {formatCurrency(document.totalFactura || 0)} {/* ⭐ CAMBIO: Usar valor total de factura */}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {document.actoPrincipalDescripcion}
                      </Typography>
                    </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    {/* Ver detalles */}
                    <Tooltip title="Ver detalles">
                      <IconButton 
                        size="small"
                        onClick={(e) => { e.stopPropagation(); openDetailModal(document); }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {/* Botón principal según estado */}
                    {document.status === 'EN_PROCESO' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={(e) => { e.stopPropagation(); openConfirmListo(document); }}
                        sx={{ textTransform: 'none' }}
                      >
                        Marcar Listo
                      </Button>
                    )}
                    {document.status === 'LISTO' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<SendIcon />}
                        onClick={(e) => { e.stopPropagation(); openEntrega(document); }}
                        sx={{ textTransform: 'none' }}
                      >
                        Entregar
                      </Button>
                    )}
                    {/* Revertir estado: visible para LISTO o ENTREGADO */}
                    {['LISTO','ENTREGADO'].includes(document.status) && (
                      <Tooltip title={document.isGrouped ? 'Revertir (afectará al grupo)' : 'Revertir estado'}>
                        <IconButton size="small" color="warning" onClick={(e) => { e.stopPropagation(); openReversion(document); }}>
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
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

      {/* Modal de confirmación para marcar LISTO */}
      <Dialog open={confirmListoOpen} onClose={closeConfirmListo} maxWidth="xs" fullWidth>
        <DialogTitle>Marcar como LISTO</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Confirmas marcar el documento como LISTO para entrega?
          </Typography>
          {currentDocumento?.isGrouped && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Documento agrupado: este cambio puede propagarse a su grupo.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmListo}>Cancelar</Button>
          <Button onClick={handleConfirmMarcarListo} variant="contained" color="success">Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de entrega de Matrizador (sin código) */}
      {entregaOpen && currentDocumento && (
        <ModalEntregaMatrizador
          open={entregaOpen}
          onClose={closeEntrega}
          documento={currentDocumento}
          onConfirm={handleConfirmEntrega}
        />
      )}

      {/* Modal de reversión de estado */}
      {reversionOpen && currentDocumento && (
        <ReversionModal
          open={reversionOpen}
          onClose={closeReversion}
          documento={currentDocumento}
          loading={false}
          onConfirm={async ({ documentId, newStatus, reversionReason }) => {
            await updateDocumentStatus(documentId, newStatus, { reversionReason });
            closeReversion();
          }}
        />
      )}

      {/* Modal de Detalle */}
      <DocumentDetailModal
        open={detailModalOpen}
        onClose={closeDetailModal}
        document={selectedDocument}
        onDocumentUpdated={handleDocumentUpdated}
      />

      {/* Modal de información de grupo (reutilizado) */}
      {groupInfoModalOpen && selectedGroupDocument && (
        <GroupInfoModal
          open={groupInfoModalOpen}
          onClose={() => { setGroupInfoModalOpen(false); setSelectedGroupDocument(null); }}
          document={selectedGroupDocument}
        />
      )}

      {/* Modal de agrupación rápida (reutilizado sin duplicar lógica) */}
      <QuickGroupingModal
        open={showQuickGroupingModal}
        onClose={() => setShowQuickGroupingModal(false)}
        mainDocument={pendingGroupData.main}
        relatedDocuments={pendingGroupData.related}
        loading={groupingLoading}
        onDocumentUpdated={handleDocumentUpdated}
        onConfirm={async (selectedDocumentIds) => {
          if (pendingGroupData.main && selectedDocumentIds.length > 0) {
            setGroupingLoading(true);
            try {
              const documentIds = [pendingGroupData.main.id, ...selectedDocumentIds];
              await createDocumentGroup(documentIds);
            } finally {
              setGroupingLoading(false);
              setShowQuickGroupingModal(false);
            }
          } else {
            setShowQuickGroupingModal(false);
          }
        }}
      />

      {/* 🎯 NUEVOS COMPONENTES: Selección múltiple */}
      
      {/* Toolbar flotante para acciones masivas */}
      <BulkActionToolbar
        selectionCount={bulkActions.selectionInfo.count}
        commonStatus={bulkActions.getCommonStatus(filteredAndSortedDocuments)}
        validTransitions={bulkActions.getValidTransitions(filteredAndSortedDocuments)}
        maxSelection={bulkActions.MAX_BULK_SELECTION}
        isExecuting={bulkActions.isExecuting}
        onClearSelection={bulkActions.clearSelection}
        onBulkAction={handleBulkAction}
      />

      {/* Modal de confirmación para cambios masivos */}
      <BulkStatusChangeModal
        open={bulkModalOpen}
        onClose={() => {
          setBulkModalOpen(false);
          setPendingBulkAction(null);
        }}
        documents={pendingBulkAction?.documents || []}
        fromStatus={pendingBulkAction?.fromStatus}
        toStatus={pendingBulkAction?.toStatus}
        onConfirm={handleConfirmBulkAction}
        loading={bulkActions.isExecuting}
      />

      {/* Alerta informativa cuando hay documentos con estados mixtos */}
      {bulkActions.selectionInfo.count > 0 && !bulkActions.getCommonStatus(filteredAndSortedDocuments) && (
        <Alert 
          severity="warning" 
          sx={{ 
            position: 'fixed', 
            bottom: 100, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1200,
            maxWidth: '90vw'
          }}
        >
          Solo se pueden realizar cambios masivos en documentos del mismo estado. 
          Documentos con estados diferentes han sido deseleccionados automáticamente.
        </Alert>
      )}
    </Box>
  );
};

export default ListView;
