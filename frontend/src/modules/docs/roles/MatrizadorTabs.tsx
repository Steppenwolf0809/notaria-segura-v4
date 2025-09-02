import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Avatar, Typography, IconButton, Chip } from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import TabsUI from '../ui/Tabs';
import { fetchTrabajoMatrizador, fetchListoMatrizador, fetchEntregadoMatrizador, PAGE_SIZE } from '../services/docsQuery';
import DocumentDetailModal from '../../../components/Documents/DocumentDetailModal';
import useDebounce from '../../../hooks/useDebounce';

function formatLocalDate(dateString?: string) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const getInitials = (name?: string) => {
  if (!name) return '?';
  const names = name.trim().split(' ').filter(n => n.length > 0);
  if (names.length === 0) return '?';
  const firstInitial = names[0][0];
  const secondInitial = names.length > 1 ? names[1][0] : '';
  return `${firstInitial}${secondInitial}`.toUpperCase();
};

type TabKey = 'trabajo' | 'listo' | 'entregado';

export default function MatrizadorTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>('trabajo');
  const [inputValue, setInputValue] = useState<string>('');
  const search = useDebounce(inputValue, 500) as string;
  const [pageTrabajo, setPageTrabajo] = useState<number>(1);
  const [pageListo, setPageListo] = useState<number>(1);
  const [pageEntregado, setPageEntregado] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(PAGE_SIZE);
  const [totalTrabajo, setTotalTrabajo] = useState<number>(0);
  const [totalListo, setTotalListo] = useState<number>(0);
  const [totalEntregado, setTotalEntregado] = useState<number>(0);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [detailDoc, setDetailDoc] = useState<any>(null);
  const [loadedTabs, setLoadedTabs] = useState<Record<TabKey, boolean>>({ trabajo: true, listo: false, entregado: false });

  const currentPage = activeTab === 'trabajo' ? pageTrabajo : activeTab === 'listo' ? pageListo : pageEntregado;
  const totalPages = activeTab === 'trabajo'
    ? Math.max(1, Math.ceil(totalTrabajo / rowsPerPage))
    : activeTab === 'listo'
    ? Math.max(1, Math.ceil(totalListo / rowsPerPage))
    : Math.max(1, Math.ceil(totalEntregado / rowsPerPage));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (activeTab === 'trabajo') {
          const res = await fetchTrabajoMatrizador({ page: pageTrabajo, limit: rowsPerPage, search });
          setDocs(res.documents);
          setTotalTrabajo(res.total);
        } else if (activeTab === 'listo') {
          const res = await fetchListoMatrizador({ page: pageListo, limit: rowsPerPage, search });
          setDocs(res.documents);
          setTotalListo(res.total);
        } else {
          const res = await fetchEntregadoMatrizador({ page: pageEntregado, limit: rowsPerPage, search });
          setDocs(res.documents);
          setTotalEntregado(res.total);
        }
      } finally {
        setLoading(false);
      }
    };
    // Lazy: no cargar pestaña hasta que entre
    if (!loadedTabs[activeTab]) {
      setLoadedTabs(prev => ({ ...prev, [activeTab]: true }));
    }
    load();
  }, [activeTab, pageTrabajo, pageListo, pageEntregado, rowsPerPage, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/') {
        e.preventDefault();
        const input = document.getElementById('matrizador-docs-search') as HTMLInputElement | null;
        input?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleOpenDetails = (doc: any) => {
    setDetailDoc(doc);
    setDetailOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <TabsUI
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
        }}
        search={inputValue}
        onSearchChange={(v) => {
          setInputValue(v);
          setPageTrabajo(1);
          setPageListo(1);
          setPageEntregado(1);
        }}
        inputId="matrizador-docs-search"
        page={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => {
          if (activeTab === 'trabajo') setPageTrabajo(p);
          else if (activeTab === 'listo') setPageListo(p);
          else setPageEntregado(p);
        }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Cliente / Documento</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Matrizador</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Fecha Creación</TableCell>
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
                  <TableRow key={documento.id} hover>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, textDecoration: 'underline', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const term = documento.clientName || '';
                            setInputValue(term);
                            const el = document.getElementById('matrizador-docs-search') as HTMLInputElement | null;
                            el?.focus();
                          }}
                        >
                          {documento.clientName}
                        </Typography>
                        <Typography variant="caption" component="div" sx={{ fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#4b5563' }}>
                          Doc: <span
                            style={{ textDecoration: 'underline', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const term = documento.protocolNumber || '';
                              setInputValue(term);
                              const el = document.getElementById('matrizador-docs-search') as HTMLInputElement | null;
                              el?.focus();
                            }}
                          >{documento.protocolNumber}</span> | {documento.documentType}
                        </Typography>
                        {/* Acto principal */}
                        {(documento.actoPrincipalDescripcion || documento.acto?.descripcion) && (
                          <Typography variant="caption" component="div" sx={{ mt: 0.25, color: (theme) => theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280' }}>
                            Acto: {documento.actoPrincipalDescripcion || documento.acto?.descripcion}
                          </Typography>
                        )}
                        {documento.isGrouped && (
                          <Chip label="⚡ Parte de un grupo" size="small" variant="outlined" color="primary" sx={{ cursor: 'default', fontSize: '0.65rem', height: '20px', '& .MuiChip-label': { px: 1 }, mt: 0.5 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={documento.matrizador}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'primary.light' }}>
                          {getInitials(documento.matrizador)}
                        </Avatar>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#e2e8f0' : '#374151' }}>
                        {formatLocalDate(documento.fechaCreacion)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2">{documento.status}</Typography>
                        {documento.isGrouped && (
                          <Chip label="🔗 Agrupado" size="small" variant="filled" color="primary" sx={{ fontSize: '0.65rem', height: '20px', '& .MuiChip-label': { px: 1 } }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton size="small" aria-label="ver detalles" onClick={() => handleOpenDetails(documento)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {detailOpen && detailDoc && (
        <DocumentDetailModal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          document={detailDoc}
          onDocumentUpdated={() => {
            // mantener paginación/scroll sin reset
          }}
        />
      )}
    </Box>
  );
}


