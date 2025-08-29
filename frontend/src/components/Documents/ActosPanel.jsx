import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Chip, Stack, Table, TableHead, TableRow, TableCell, TableBody, Divider, Alert, Switch, FormControlLabel, TextField, CircularProgress, Button } from '@mui/material';
import documentService from '../../services/document-service';

const ActosPanel = ({ document }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [acts, setActs] = useState([]);
  const [parties, setParties] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [useDates, setUseDates] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);
  const [applying, setApplying] = useState(false);

  const needsDateByType = useMemo(() => {
    const t = (document?.documentType || '').toUpperCase();
    // Protocolización y flujos de marginaciones/copias podrían requerir fecha
    return t.includes('PROTOCOL') || false;
  }, [document?.documentType]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setError(null);
      const resp = await documentService.extractActs(document.id);
      if (!mounted) return;
      setLoading(false);
      if (resp.success) {
        setEnabled(!!resp.data?.enabled);
        setActs(resp.data?.acts || []);
        setParties(resp.data?.parties || []);
      } else {
        setError(resp.error || 'No se pudo extraer actos');
      }
    })();
    return () => { mounted = false; };
  }, [document?.id]);

  useEffect(() => {
    // si el tipo requiere fecha, activar el toggle automáticamente
    if (needsDateByType) setUseDates(true);
  }, [needsDateByType]);

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Analizando actos…</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="warning">{error}</Alert>;
  }

  if (!enabled) {
    return <Alert severity="info">Extracción avanzada desactivada</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Actos detectados</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={<Switch checked={useDates} onChange={(e) => setUseDates(e.target.checked)} />}
            label="Usar fechas"
          />
          <Button size="small" variant="contained" disabled={saving} onClick={async () => {
            setSaving(true); setInfoMsg(null);
            const resp = await documentService.extractActs(document.id, undefined, { saveSnapshot: true });
            setSaving(false);
            if (resp.success) setInfoMsg('Snapshot guardado en historial.');
            else setError(resp.error || 'No se pudo guardar snapshot');
          }}>
            {saving ? 'Guardando…' : 'Guardar snapshot'}
          </Button>
          {/* Aplicar al documento solo si alta confianza y hay algo útil para completar */}
          {acts.length > 0 && (typeof (document?.actoPrincipalDescripcion || '') === 'string' ? (document.actoPrincipalDescripcion || '').trim().length === 0 : true) && (
            <Button size="small" color="success" variant="outlined" disabled={applying} onClick={async () => {
              setApplying(true); setInfoMsg(null);
              const resp = await documentService.applyExtraction(document.id);
              setApplying(false);
              if (resp.success) setInfoMsg('Sugerencias aplicadas.');
              else setError(resp.error || 'No se pudo aplicar');
            }}>
              {applying ? 'Aplicando…' : 'Aplicar al documento'}
            </Button>
          )}
        </Stack>
      </Stack>

      {infoMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>{infoMsg}</Alert>
      )}

      {useDates && (
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Fecha del acto"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            helperText={needsDateByType ? 'Requerida para Protocolización/Marginaciones' : 'Opcional'}
          />
        </Box>
      )}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
        {acts.length === 0 && <Typography variant="body2">No se detectaron actos.</Typography>}
        {acts.map((a, idx) => (
          <Chip key={idx} color="primary" variant="outlined" label={(a.actType || 'ACTO').substring(0, 80)} />
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Comparecientes y representación</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Rol</TableCell>
            <TableCell>Representación</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {parties.length === 0 && (
            <TableRow>
              <TableCell colSpan={3}>
                <Typography variant="body2">Sin datos detectados.</Typography>
              </TableCell>
            </TableRow>
          )}
          {parties.map((p, i) => (
            <TableRow key={i}>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.role || '-'}</TableCell>
              <TableCell>
                {p.capacity ? `${p.capacity}` : ''}
                {p.represents ? `${p.capacity ? ' — ' : ''}Representa a: ${p.represents}` : ''}
                {!p.capacity && !p.represents ? '-' : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default ActosPanel;
