import React, { useEffect, useMemo, useState } from 'react';
import { Box, Tabs, Tab, Paper, Divider, Checkbox } from '@mui/material';
import SearchBar from '../documents/SearchBar';
import SearchResults from '../documents/SearchResults';
import DocRow from '../documents/DocRow';
import BulkBar from '../documents/BulkBar';
import DeliverModal from '../documents/DeliverModal';
import docsService from '../../services/docs-service';
import { markAction } from '../../utils/telemetry';

const TABS = [
  { key: 'trabajo', label: 'Trabajo' },
  { key: 'proceso', label: 'En proceso' },
  { key: 'listo', label: 'Listo' },
  { key: 'entregado', label: 'Entregado' },
];

const MatrizadorTabs = ({ role }) => {
  const [active, setActive] = useState('trabajo');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('context');
  const [contextResults, setContextResults] = useState([]);
  const [globalPreview, setGlobalPreview] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverDoc, setDeliverDoc] = useState(null);

  const stateForContext = useMemo(() => {
    if (active === 'proceso') return 'proceso';
    if (active === 'listo') return 'listo';
    if (active === 'entregado') return 'entregado';
    return 'trabajo';
  }, [active]);

  // Load context list minimal when no query
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!query) {
        const states = stateForContext === 'trabajo' ? ['proceso', 'listo'] : [stateForContext];
        const results = [];
        for (const st of states) {
          const resp = await docsService.list({ state: st, limit: 25 });
          results.push(...(resp?.data?.documents || []));
        }
        if (!cancelled) setContextResults(results);
        setGlobalPreview(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [stateForContext, query]);

  // Smart-scope search
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!query) return;
      const ctxResp = await docsService.search({ query, scope: 'context', state: stateForContext === 'trabajo' ? 'proceso' : stateForContext });
      if (cancelled) return;
      const ctxHits = ctxResp?.data?.context?.hits || [];
      setContextResults(ctxHits);
      if (ctxHits.length <= 2) {
        const glob = ctxResp?.data?.global?.groups || [];
        setGlobalPreview(glob);
      } else {
        setGlobalPreview(null);
      }
    };
    const t = setTimeout(run, 150); // debounce 120–180ms
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, stateForContext]);

  const onListo = async (doc) => {
    markAction('mark_listo');
    // Behavior B: optimistically mark, delay 2–3s before moving
    setContextResults((prev) => prev.map((d) => d.id === doc.id ? { ...d, status: 'LISTO', _tempUpdated: true } : d));
    setTimeout(async () => {
      await docsService.patchState(doc.id, { state: 'LISTO' });
      setContextResults((prev) => prev.filter((d) => !(d.id === doc.id && active === 'proceso')));
    }, 2400);
  };

  const onEntregar = async (doc) => {
    setDeliverDoc(doc);
    setDeliverOpen(true);
  };

  const confirmDeliver = async (payload) => {
    markAction('deliver');
    const id = deliverDoc.id;
    setDeliverOpen(false);
    setDeliverDoc(null);
    setContextResults((prev) => prev.map((d) => d.id === id ? { ...d, status: 'ENTREGADO', _tempUpdated: true } : d));
    setTimeout(async () => {
      await docsService.patchState(id, { state: 'ENTREGADO', payload });
      setContextResults((prev) => prev.filter((d) => !(d.id === id && active !== 'entregado')));
    }, 2500);
  };

  const toggleSel = (id) => {
    setSelected((s) => {
      const ns = new Set(s);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  };

  const markBulkListo = async () => {
    markAction('bulk_listo');
    const ids = Array.from(selected);
    setSelected(new Set());
    setContextResults((prev) => prev.map((d) => ids.includes(d.id) ? { ...d, status: 'LISTO', _tempUpdated: true } : d));
    setTimeout(async () => {
      await docsService.patchBulkState({ ids, state: 'LISTO' });
      if (active === 'proceso') setContextResults((prev) => prev.filter((d) => !ids.includes(d.id)));
    }, 2300);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs value={active} onChange={(e, v) => setActive(v)} sx={{ mb: 1 }}>
        {TABS.map((t) => (
          <Tab key={t.key} value={t.key} label={t.label} />
        ))}
      </Tabs>
      <SearchBar value={query} onChange={setQuery} placeholder={active === 'entregado' ? 'Buscar (Entregado lazy)' : 'Buscar (pestaña actual)'} />
      <Paper variant="outlined" sx={{ mt: 1, p: 1, flex: 1, overflow: 'auto' }}>
        {query ? (
          <SearchResults
            contextHits={contextResults}
            globalGroups={globalPreview || []}
            onVerTodos={(state) => setActive(state === 'proceso' ? 'proceso' : state)}
            onListo={onListo}
            onEntregar={onEntregar}
          />
        ) : (
          <Box>
            {contextResults.map((d) => (
              <Box key={d.id} sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox size="small" checked={selected.has(d.id)} onChange={() => toggleSel(d.id)} />
                <DocRow doc={d} onListo={onListo} onEntregar={onEntregar} />
              </Box>
            ))}
          </Box>
        )}
      </Paper>
      <BulkBar count={selected.size} onMarkListo={markBulkListo} />
      <DeliverModal open={deliverOpen} role={role} onClose={() => setDeliverOpen(false)} onConfirm={confirmDeliver} />
    </Box>
  );
};

export default MatrizadorTabs;

