import React, { useEffect, useState } from 'react';
import { Box, Accordion, AccordionSummary, AccordionDetails, Typography, Paper } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchBar from '../Documents/SearchBar';
import SearchResults from '../Documents/SearchResults';
import DocRow from '../Documents/DocRow';
import DeliverModal from '../Documents/DeliverModal';
import docsService from '../../services/docs-service';
import { FLAGS } from '../../utils/flags';

const RecepcionGrouped = () => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('context');
  const [expanded, setExpanded] = useState({ proceso: true, listo: true, entregado: false });
  const [contextHits, setContextHits] = useState([]);
  const [globalPreview, setGlobalPreview] = useState(null);
  const [deliverDoc, setDeliverDoc] = useState(null);

  // Load visible groups by default
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!query) {
        const states = [];
        if (expanded.proceso) states.push('proceso');
        if (expanded.listo) states.push('listo');
        const results = [];
        for (const st of states) {
          const resp = await docsService.list({ state: st, limit: 25 });
          results.push(...(resp?.data?.documents || []));
        }
        if (!cancelled) setContextHits(results);
        setGlobalPreview(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [expanded, query]);

  // Smart-scope search with optional toggle (Alt+A)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!query) return;
      const mixedState = expanded.proceso && expanded.listo && !expanded.entregado ? 'proceso' : (expanded.proceso ? 'proceso' : (expanded.listo ? 'listo' : 'any'));
      const resp = await docsService.search({ query, scope, state: mixedState });
      if (cancelled) return;
      const ctxHits = resp?.data?.context?.hits || [];
      setContextHits(ctxHits);
      if (ctxHits.length <= 2 || scope === 'all') {
        setGlobalPreview(resp?.data?.global?.groups || []);
      } else {
        setGlobalPreview(null);
      }
    };
    const t = setTimeout(run, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, scope, expanded]);

  const onListo = async (doc) => {
    setContextHits((prev) => prev.map((d) => d.id === doc.id ? { ...d, status: 'LISTO', _tempUpdated: true } : d));
    setTimeout(async () => {
      await docsService.patchState(doc.id, { state: 'LISTO' });
      setContextHits((prev) => prev.filter((d) => !(d.id === doc.id && expanded.proceso)));
    }, 2400);
  };

  const onEntregar = async (doc) => setDeliverDoc(doc);

  const confirmDeliver = async (payload) => {
    const id = deliverDoc.id;
    setDeliverDoc(null);
    setContextHits((prev) => prev.map((d) => d.id === id ? { ...d, status: 'ENTREGADO', _tempUpdated: true } : d));
    setTimeout(async () => {
      await docsService.patchState(id, { state: 'ENTREGADO', payload });
      setContextHits((prev) => prev.filter((d) => !(d.id === id && (expanded.proceso || expanded.listo))));
    }, 2500);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Buscar (grupos visibles)"
        scope={scope}
        onScopeChange={setScope}
        showScopeToggle={FLAGS.DOCS_SEARCH_TOGGLE_RECEPCION}
      />
      <Box sx={{ mt: 1 }}>
        <Accordion expanded={expanded.proceso} onChange={() => setExpanded((e) => ({ ...e, proceso: !e.proceso }))}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>En proceso</Typography></AccordionSummary>
          <AccordionDetails>
            <Paper variant="outlined" sx={{ p: 1 }}>
              {(query && (globalPreview?.length || 0) > 0) ? (
                <SearchResults contextHits={contextHits} globalGroups={globalPreview} onVerTodos={() => setExpanded({ proceso: true, listo: true, entregado: true })} onListo={onListo} onEntregar={onEntregar} />
              ) : (
                contextHits.filter((d) => d.status === 'EN_PROCESO').map((d) => (
                  <DocRow key={d.id} doc={d} onListo={onListo} onEntregar={onEntregar} />
                ))
              )}
            </Paper>
          </AccordionDetails>
        </Accordion>
        <Accordion expanded={expanded.listo} onChange={() => setExpanded((e) => ({ ...e, listo: !e.listo }))}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>Listo</Typography></AccordionSummary>
          <AccordionDetails>
            <Paper variant="outlined" sx={{ p: 1 }}>
              {contextHits.filter((d) => d.status === 'LISTO').map((d) => (
                <DocRow key={d.id} doc={d} onListo={onListo} onEntregar={onEntregar} />
              ))}
            </Paper>
          </AccordionDetails>
        </Accordion>
        <Accordion expanded={expanded.entregado} onChange={() => setExpanded((e) => ({ ...e, entregado: !e.entregado }))}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>Entregado</Typography></AccordionSummary>
          <AccordionDetails>
            <Paper variant="outlined" sx={{ p: 1 }}>
              {expanded.entregado && (
                contextHits.filter((d) => d.status === 'ENTREGADO').map((d) => (
                  <DocRow key={d.id} doc={d} />
                ))
              )}
            </Paper>
          </AccordionDetails>
        </Accordion>
      </Box>
      <DeliverModal open={!!deliverDoc} role="RECEPCION" onClose={() => setDeliverDoc(null)} onConfirm={confirmDeliver} />
    </Box>
  );
};

export default RecepcionGrouped;

