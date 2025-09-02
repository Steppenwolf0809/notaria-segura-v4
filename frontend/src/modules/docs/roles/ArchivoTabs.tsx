import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Avatar, Typography, IconButton, Chip, Button, Snackbar, Alert } from '@mui/material';
import { Visibility as VisibilityIcon, Undo as UndoIcon, Send as SendIcon, GroupWork as GroupWorkIcon, Phone as PhoneIcon } from '@mui/icons-material';
import TabsUI from '../ui/Tabs';
import { fetchTrabajoArchivo, fetchListoArchivo, fetchEntregadoArchivo, PAGE_SIZE } from '../services/docsQuery';
import DocumentDetailModal from '../../../components/Documents/DocumentDetailModal';
import ReversionModal from '../../../components/recepcion/ReversionModal';
import ModalEntregaMatrizador from '../../../components/matrizador/ModalEntregaMatrizador.jsx';
import QuickGroupingModal from '../../../components/grouping/QuickGroupingModal.jsx';
import StatusBadge from '../../../components/shared/StatusBadge';
import GroupInfoModal from '../../../components/shared/GroupInfoModal.jsx';
import useDocumentStore from '../../../store/document-store.js';
import useDebounce from '../../../hooks/useDebounce';

type TabKey = 'trabajo' | 'listo' | 'entregado';

function pickBestDate(doc: any) {
  const candidate = doc?.xmlDate || doc?.fechaXml || doc?.fechaXML || doc?.fechaCreacion || doc?.createdAt;
  return candidate;
}
function formatLocalDateFromDoc(doc?: any) {
  const dateString = pickBestDate(doc || {});
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function isGroupedDoc(doc: any) {
  return !!(doc?.isGrouped || doc?.documentGroupId || doc?.groupId || doc?.groupCode);
}

function matchesSearch(doc: any, term: string) {
  if (!term) return true;
  const t = term.toLowerCase();
  const fields = [
    doc?.clientName,
    doc?.protocolNumber,
    doc?.clientId,
    doc?.actoPrincipalDescripcion,
    doc?.documentType,
    doc?.groupCode
  ];
  return fields.some(v => (v || '').toString().toLowerCase().includes(t));
}

const getInitials = (name?: string) => {
  if (!name) return '?';
  const names = name.trim().split(' ').filter(n => n.length > 0);
  if (names.length === 0) return '?';
  const firstInitial = names[0][0];
  const secondInitial = names.length > 1 ? names[1][0] : '';
  return `${firstInitial}${secondInitial}`.toUpperCase();
};

export default function ArchivoTabs() {
  const { updateDocumentStatus, detectGroupableDocuments, createDocumentGroup } = useDocumentStore();
  const [activeTab, setActiveTab] = useState<TabKey>('trabajo');
  const [inputValue, setInputValue] = useState<string>('');
  const search = useDebounce(inputValue, 500) as string;
  const [pageTrabajo, setPageTrabajo] = useState<number>(1);
  const [pageListo, setPageListo] = useState<number>(1);
  const [pageEntregado, setPageEntregado] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(PAGE_SIZE);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  const [totalTrabajo, setTotalTrabajo] = useState<number>(0);
  const [totalListo, setTotalListo] = useState<number>(0);
  const [totalEntregado, setTotalEntregado] = useState<number>(0);
  const [docs, setDocs] = useState<any[]>([]);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [detailDoc, setDetailDoc] = useState<any>(null);
  const [entregaOpen, setEntregaOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [reversionOpen, setReversionOpen] = useState(false);
  const [reversionLoading, setReversionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{open:boolean;message:string;severity:'success'|'error'|'info'}>({open:false,message:'',severity:'success'});
  const [showQuickGroupingModal, setShowQuickGroupingModal] = useState(false);
  const [pendingGroupData, setPendingGroupData] = useState<{ main: any|null; related: any[] }>({ main: null, related: [] });
  const [groupingLoading, setGroupingLoading] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState<{ term: string; did: boolean }>({ term: '', did: false });
  const [loadedTabs, setLoadedTabs] = useState<Record<TabKey, boolean>>({ trabajo: true, listo: false, entregado: false });
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [selectedGroupDocument, setSelectedGroupDocument] = useState<any>(null);

  const currentPage = activeTab === 'trabajo' ? pageTrabajo : activeTab === 'listo' ? pageListo : pageEntregado;
  const totalPages = activeTab === 'trabajo'
    ? Math.max(1, Math.ceil(totalTrabajo / rowsPerPage))
    : activeTab === 'listo'
    ? Math.max(1, Math.ceil(totalListo / rowsPerPage))
    : Math.max(1, Math.ceil(totalEntregado / rowsPerPage));

  useEffect(() => {
    const load = async () => {
      if (activeTab === 'trabajo') {
        const res = await fetchTrabajoArchivo({ page: pageTrabajo, limit: rowsPerPage, search });
        let filtered = (res.documents || [])
          .filter((d: any) => ['EN_PROCESO','LISTO','proceso','listo'].includes((d.status || '').toString()))
          .filter((d: any) => matchesSearch(d, search || ''));
        // Filtro por fechas (local)
        filtered = filtered.filter((d: any) => {
          const dateString = (d?.xmlDate || d?.fechaXml || d?.fechaXML || d?.fechaCreacion || d?.createdAt);
          if (!dateString) return true;
          const t = new Date(dateString).getTime();
          if (fechaDesde) {
            const from = new Date(fechaDesde);
            from.setHours(0,0,0,0);
            if (t < from.getTime()) return false;
          }
          if (fechaHasta) {
            const to = new Date(fechaHasta);
            to.setHours(23,59,59,999);
            if (t > to.getTime()) return false;
          }
          return true;
        });
        // Orden por fecha (local)
        filtered.sort((a: any, b: any) => {
          const ta = new Date(a?.xmlDate || a?.fechaXml || a?.fechaXML || a?.fechaCreacion || a?.createdAt || 0).getTime();
          const tb = new Date(b?.xmlDate || b?.fechaXml || b?.fechaXML || b?.fechaCreacion || b?.createdAt || 0).getTime();
          return sortOrder === 'asc' ? ta - tb : tb - ta;
        });
        const start = (pageTrabajo - 1) * rowsPerPage;
        setDocs(filtered.slice(start, start + rowsPerPage));
        setTotalTrabajo(filtered.length);
      } else if (activeTab === 'listo') {
        const res = await fetchListoArchivo({ page: pageListo, limit: rowsPerPage, search });
        let filtered = (res.documents || [])
          .filter((d: any) => ['LISTO','listo'].includes((d.status || '').toString()))
          .filter((d: any) => matchesSearch(d, search || ''));
        filtered = filtered.filter((d: any) => {
          const dateString = (d?.xmlDate || d?.fechaXml || d?.fechaXML || d?.fechaCreacion || d?.createdAt);
          if (!dateString) return true;
          const t = new Date(dateString).getTime();
          if (fechaDesde) {
            const from = new Date(fechaDesde);
            from.setHours(0,0,0,0);
            if (t < from.getTime()) return false;
          }
          if (fechaHasta) {
            const to = new Date(fechaHasta);
            to.setHours(23,59,59,999);
            if (t > to.getTime()) return false;
          }
          return true;
        });
        filtered.sort((a: any, b: any) => {
          const ta = new Date(a?.xmlDate || a?.fechaXml || a?.fechaXML || a?.fechaCreacion || a?.createdAt || 0).getTime();
          const tb = new Date(b?.xmlDate || b?.fechaXml || b?.fechaXML || b?.fechaCreacion || b?.createdAt || 0).getTime();
          return sortOrder === 'asc' ? ta - tb : tb - ta;
        });
        const start = (pageListo - 1) * rowsPerPage;
        setDocs(filtered.slice(start, start + rowsPerPage));
        setTotalListo(filtered.length);
      } else {
        const res = await fetchEntregadoArchivo({ page: pageEntregado, limit: rowsPerPage, search });
        let filtered = (res.documents || [])
          .filter((d: any) => ['ENTREGADO','entregado'].includes((d.status || '').toString()))
          .filter((d: any) => matchesSearch(d, search || ''));
        filtered = filtered.filter((d: any) => {
          const dateString = (d?.xmlDate || d?.fechaXml || d?.fechaXML || d?.fechaCreacion || d?.createdAt);
          if (!dateString) return true;
          const t = new Date(dateString).getTime();
          if (fechaDesde) {
            const from = new Date(fechaDesde);
            from.setHours(0,0,0,0);
            if (t < from.getTime()) return false;
          }
          if (fechaHasta) {
            const to = new Date(fechaHasta);
            to.setHours(23,59,59,999);
            if (t > to.getTime()) return false;
          }
          return true;
        });
        filtered.sort((a: any, b: any) => {
          const ta = new Date(a?.xmlDate || a?.fechaXml || a?.fechaXML || a?.fechaCreacion || a?.createdAt || 0).getTime();
          const tb = new Date(b?.xmlDate || b?.fechaXml || b?.fechaXML || b?.fechaCreacion || b?.createdAt || 0).getTime();
          return sortOrder === 'asc' ? ta - tb : tb - ta;
        });
        const start = (pageEntregado - 1) * rowsPerPage;
        setDocs(filtered.slice(start, start + rowsPerPage));
        setTotalEntregado(filtered.length);
      }
    };
    if (!loadedTabs[activeTab]) {
      setLoadedTabs(prev => ({ ...prev, [activeTab]: true }));
    }
    load();
  }, [activeTab, pageTrabajo, pageListo, pageEntregado, rowsPerPage, search, fechaDesde, fechaHasta, sortOrder]);

  // Auto-cambiar a Entregado si no hay resultados con un término de búsqueda en Trabajo/Listo
  useEffect(() => {
    const term = (search || '').trim();
    if (term && docs.length === 0 && (activeTab === 'trabajo' || activeTab === 'listo')) {
      if (!(autoSwitch.term === term && autoSwitch.did)) {
        setAutoSwitch({ term, did: true });
        setActiveTab('entregado');
        setPageEntregado(1);
      }
    }
  }, [search, docs.length, activeTab]);

  // Permitir nuevo auto-cambio cuando cambie el término
  useEffect(() => {
    const term = (search || '').trim();
    if (term !== autoSwitch.term) {
      setAutoSwitch({ term, did: false });
    }
  }, [search]);

  const handleOpenDetails = (doc: any) => {
    setDetailDoc(doc);
    setDetailOpen(true);
  };

  const handleOpenEntrega = (doc: any) => {
    setCurrentDoc(doc);
    setEntregaOpen(true);
  };

  const handleMarkListo = async (doc: any) => {
    try {
      const res = await updateDocumentStatus(doc.id, 'LISTO');
      if ((res as any)?.success) {
        setSnackbar({ open: true, message: 'Marcado como LISTO', severity: 'success' });
        if (activeTab === 'trabajo') setPageTrabajo(1); else if (activeTab === 'listo') setPageListo(1); else setPageEntregado(1);
      } else {
        setSnackbar({ open: true, message: (res as any)?.error || 'Error al marcar listo', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Error al marcar listo', severity: 'error' });
    }
  };

  const handleConfirmEntrega = async ({ documentId, deliveredTo }: { documentId: string; deliveredTo: string }) => {
    try {
      const res = await updateDocumentStatus(documentId, 'ENTREGADO', { deliveredTo });
      if ((res as any)?.success) {
        setSnackbar({ open: true, message: 'Documento entregado', severity: 'success' });
        if (activeTab === 'trabajo') setPageTrabajo(1); else if (activeTab === 'listo') setPageListo(1); else setPageEntregado(1);
      } else {
        setSnackbar({ open: true, message: (res as any)?.error || 'Error al entregar', severity: 'error' });
      }
    } finally {
      setEntregaOpen(false);
      setCurrentDoc(null);
    }
  };

  const handleOpenReversion = (doc: any) => {
    setCurrentDoc(doc);
    setReversionOpen(true);
  };

  const handleConfirmReversion = async ({ documentId, newStatus, reversionReason }: any) => {
    try {
      setReversionLoading(true);
      const res = await updateDocumentStatus(documentId, newStatus, { reversionReason });
      if ((res as any)?.success) {
        setSnackbar({ open: true, message: 'Estado revertido', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: (res as any)?.error || 'Error al revertir', severity: 'error' });
      }
    } finally {
      setReversionLoading(false);
      setReversionOpen(false);
      setCurrentDoc(null);
    }
  };

  const handleGroupClick = async (doc: any) => {
    try {
      const result = await detectGroupableDocuments({ clientName: doc.clientName, clientId: doc.clientId || '' });
      const related = (result.groupableDocuments || []).filter((d: any) => d.id !== doc.id);
      if (related.length > 0) {
        setPendingGroupData({ main: doc, related });
        setShowQuickGroupingModal(true);
      } else {
        setSnackbar({ open: true, message: 'No hay documentos agrupables para este cliente', severity: 'info' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Error detectando agrupables', severity: 'error' });
    }
  };

  const handleCreateGroup = async (selectedIds: string[]) => {
    if (!pendingGroupData.main) return;
    setGroupingLoading(true);
    try {
      const ids = [pendingGroupData.main.id, ...selectedIds];
      const res: any = await createDocumentGroup(ids);
      if (res?.success) {
        setSnackbar({ open: true, message: res.message || 'Grupo creado', severity: 'success' });
        // Refrescar filas agrupadas locales
        setDocs(prev => prev.map(d => ids.includes(d.id) ? { ...d, isGrouped: true } : d));
      } else {
        setSnackbar({ open: true, message: res?.error || 'Error al agrupar', severity: 'error' });
      }
    } finally {
      setGroupingLoading(false);
      setShowQuickGroupingModal(false);
      setPendingGroupData({ main: null, related: [] });
    }
  };

  // Función para contar documentos del mismo cliente
  const getClientDocumentCount = (clientName: string) => {
    if (!clientName) return 0;
    return docs.filter(d => d.clientName === clientName && !isGroupedDoc(d)).length;
  };

  return (
    <Box sx={{ p: 3 }}>
      <TabsUI
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        search={inputValue}
        onSearchChange={(v) => {
          setInputValue(v);
          setPageTrabajo(1);
          setPageListo(1);
          setPageEntregado(1);
        }}
        inputId="archivo-docs-search"
        page={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => {
          if (activeTab === 'trabajo') setPageTrabajo(p);
          else if (activeTab === 'listo') setPageListo(p);
          else setPageEntregado(p);
        }}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPageTrabajo(1); setPageListo(1); setPageEntregado(1); }}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        onFechaDesdeChange={(v) => { setFechaDesde(v); setPageTrabajo(1); setPageListo(1); setPageEntregado(1); }}
        onFechaHastaChange={(v) => { setFechaHasta(v); setPageTrabajo(1); setPageListo(1); setPageEntregado(1); }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Cliente / Documento</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2, cursor: 'pointer' }} onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                  Fecha Creación {sortOrder === 'asc' ? '▲' : '▼'}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Estado / Agrupación</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 2 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#6b7280' }}>
                      No se encontraron documentos.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((documento) => (
                  <TableRow key={documento.id} hover onClick={() => handleOpenDetails(documento)} sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, textDecoration: 'underline', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const term = documento.clientName || '';
                            setInputValue(term);
                            const el = document.getElementById('archivo-docs-search') as HTMLInputElement | null;
                            el?.focus();
                          }}
                        >
                          {documento.clientName}
                        </Typography>
                        <Typography variant="caption" component="div" sx={{ fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#4b5563' }}>
                          Doc: <Tooltip title="Ver detalle">
                            <span
                              style={{ textDecoration: 'underline', cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); handleOpenDetails(documento); }}
                            >{documento.protocolNumber}</span>
                          </Tooltip> | {documento.documentType}
                        </Typography>
                        {documento.clientPhone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: '0.8rem', color: 'action.active', mr: 0.5 }} />
                            <Typography variant="caption" sx={{ fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#4b5563' }}>
                              {documento.clientPhone}
                            </Typography>
                          </Box>
                        )}
                        {(documento.actoPrincipalDescripcion || documento.acto?.descripcion) && (
                          <Typography variant="caption" component="div" sx={{ mt: 0.25, color: (theme) => theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280' }}>
                            Acto: {documento.actoPrincipalDescripcion || documento.acto?.descripcion}
                          </Typography>
                        )}
                        {documento.isGrouped && (
                          <Chip 
                            label="⚡ Parte de un grupo" 
                            size="small" 
                            variant="outlined" 
                            color="primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGroupDocument(documento);
                              setShowGroupInfoModal(true);
                            }}
                            sx={{ 
                              cursor: 'pointer', 
                              fontSize: '0.65rem', 
                              height: '20px', 
                              '& .MuiChip-label': { px: 1 }, 
                              mt: 0.5,
                              '&:hover': {
                                bgcolor: 'primary.light',
                                color: 'white'
                              }
                            }} 
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#e2e8f0' : '#374151' }}>
                        {formatLocalDateFromDoc(documento)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <StatusBadge status={documento.status} />
                        {isGroupedDoc(documento) && (
                          <Chip 
                            label="🔗 Agrupado" 
                            size="small" 
                            variant="filled" 
                            color="primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGroupDocument(documento);
                              setShowGroupInfoModal(true);
                            }}
                            sx={{ 
                              fontSize: '0.65rem', 
                              height: '20px', 
                              '& .MuiChip-label': { px: 1 },
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: 'primary.dark'
                              }
                            }} 
                          />
                        )}
                        {!isGroupedDoc(documento) && (documento.status === 'EN_PROCESO' || documento.status === 'LISTO') && getClientDocumentCount(documento.clientName) > 1 && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="info"
                            startIcon={<GroupWorkIcon />}
                            onClick={(e) => { e.stopPropagation(); handleGroupClick(documento); }}
                            sx={{ fontSize: '0.65rem', height: '22px', textTransform: 'none', px: 1 }}
                          >
                            Agrupar
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                        {documento.status === 'EN_PROCESO' && (
                          <Button size="small" variant="contained" color="primary"
                            onClick={(e) => { e.stopPropagation(); handleMarkListo(documento); }}
                          >
                            Marcar Listo
                          </Button>
                        )}
                        {documento.status === 'LISTO' && (
                          <Button size="small" variant="contained" color="primary" startIcon={<SendIcon />}
                            onClick={(e) => { e.stopPropagation(); handleOpenEntrega(documento); }}
                          >
                            Entregar
                          </Button>
                        )}
                        {['LISTO', 'ENTREGADO'].includes(documento.status) && (
                          <IconButton size="small" color="warning" onClick={(e) => { e.stopPropagation(); handleOpenReversion(documento); }}>
                            <UndoIcon fontSize="small" />
                          </IconButton>
                        )}
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" aria-label="ver detalles" onClick={(e) => { e.stopPropagation(); handleOpenDetails(documento); }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Modales */}
      {detailOpen && detailDoc && (
        <DocumentDetailModal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          document={detailDoc}
          onDocumentUpdated={(payload) => {
            try {
              const updated = payload?.document || payload?.data?.document || payload;
              if (updated?.id) {
                setDocs(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
              }
            } catch {}
          }}
        />
      )}

      {entregaOpen && currentDoc && (
        <ModalEntregaMatrizador
          open={entregaOpen}
          onClose={() => { setEntregaOpen(false); setCurrentDoc(null); }}
          documento={currentDoc}
          onConfirm={handleConfirmEntrega}
        />
      )}

      {reversionOpen && currentDoc && (
        <ReversionModal
          open={reversionOpen}
          onClose={() => { if (!reversionLoading) { setReversionOpen(false); setCurrentDoc(null); } }}
          documento={currentDoc}
          onConfirm={handleConfirmReversion}
          loading={reversionLoading}
        />
      )}

      <QuickGroupingModal
        open={showQuickGroupingModal}
        onClose={() => setShowQuickGroupingModal(false)}
        mainDocument={pendingGroupData.main}
        relatedDocuments={pendingGroupData.related as any}
        loading={groupingLoading}
        onConfirm={handleCreateGroup}
        onDocumentUpdated={() => {}}
      />

      <GroupInfoModal
        open={showGroupInfoModal}
        onClose={() => {
          setShowGroupInfoModal(false);
          setSelectedGroupDocument(null);
        }}
        document={selectedGroupDocument}
        onUngrouped={(result) => {
          // Actualizar lista local después de desagrupar
          if (result?.success && selectedGroupDocument) {
            setDocs(prev => prev.map(d => 
              d.id === selectedGroupDocument.id 
                ? { ...d, isGrouped: false, documentGroupId: null }
                : d
            ));
          }
        }}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


