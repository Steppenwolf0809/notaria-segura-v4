import React, { useEffect, useMemo, useState } from 'react'
import { Box, TextField, Button, Grid, Typography, Stack, FormControlLabel, Checkbox, Tabs, Tab, Divider } from '@mui/material'

export default function ExtractedDataForm({ data, setData, loading, onBack, onPreview, onNew }) {
  const [actIndex, setActIndex] = useState(data?.uiActIndex || 0)

  const acts = Array.isArray(data?.acts) && data.acts.length > 0
    ? data.acts
    : [{ tipoActo: data?.tipoActo || '', otorgantes: data?.otorgantes || [], beneficiarios: data?.beneficiarios || [] }]

  const currentAct = acts[Math.min(actIndex, acts.length - 1)] || acts[0]

  const handleChange = (field) => (e) => {
    setData({ ...data, [field]: e.target.value })
  }

  const updateAct = (updates) => {
    const newActs = acts.map((a, idx) => idx === actIndex ? { ...a, ...updates } : a)
    setData({ ...data, acts: newActs })
  }

  // Limpieza ligera y helpers de UI para personas
  const normalizeEntities = (arr) => {
    const list = Array.isArray(arr) ? arr : []
    const mapped = list.map((e) => {
      if (!e) return null
      if (typeof e === 'string') return { nombre: e.trim() }
      if (typeof e === 'object') return { ...e, nombre: String(e.nombre || e.fullname || e.text || '').trim() }
      return null
    }).filter(Boolean)
    // Deduplicar por nombre (case-insensitive)
    const seen = new Set()
    const out = []
    for (const p of mapped) {
      const key = (p.nombre || '').toUpperCase()
      if (p.nombre && !seen.has(key)) { seen.add(key); out.push(p) }
    }
    return out
  }

  const ots = normalizeEntities(currentAct?.otorgantes)
  const bes = normalizeEntities(currentAct?.beneficiarios)

  const changeEntity = (type, index, value) => {
    const arr = type === 'otorgantes' ? [...ots] : [...bes]
    arr[index] = { ...(arr[index] || {}), nombre: value }
    updateAct({ [type]: arr })
  }

  const addEntity = (type) => () => {
    const arr = type === 'otorgantes' ? [...ots] : [...bes]
    arr.push({ nombre: '' })
    updateAct({ [type]: arr })
  }

  const removeEntity = (type, index) => () => {
    const arr = type === 'otorgantes' ? [...ots] : [...bes]
    arr.splice(index, 1)
    updateAct({ [type]: arr })
  }

  // Inicializar selección por acto (por defecto todos incluidos)
  const selectedActs = Array.isArray(data?.selectedActs) && data.selectedActs.length === acts.length
    ? data.selectedActs
    : Array.from({ length: acts.length }, () => true)

  const toggleSelected = (idx) => (e) => {
    const next = selectedActs.map((v, i) => (i === idx ? e.target.checked : v))
    setData({ ...data, selectedActs: next })
  }

  // Persistir UI: pestaña activa en el estado global (para que sobreviva al paso)
  useEffect(() => {
    setData(prev => ({ ...prev, uiActIndex: actIndex }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actIndex])

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>Revisar y editar datos extraídos</Typography>
      {acts.length > 1 ? (
        <Box sx={{ mb: 2 }}>
          <Tabs value={actIndex} onChange={(_, v) => setActIndex(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
            {acts.map((a, i) => (
              <Tab key={i} label={`Acto ${i + 1}`} />
            ))}
          </Tabs>
          <Divider sx={{ mt: 1 }} />
          <Box sx={{ mt: 1 }}>
            {acts.map((a, i) => (
              <FormControlLabel
                key={`chk-${i}`}
                control={<Checkbox checked={selectedActs[i]} onChange={toggleSelected(i)} />}
                label={`Incluir en concuerdo (Acto ${i + 1}: ${a?.tipoActo || a?.tipo || '—'})`}
              />
            ))}
          </Box>
        </Box>
      ) : null}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Tipo de Acto"
            value={currentAct?.tipoActo || currentAct?.tipo || ''}
            onChange={(e) => updateAct({ tipoActo: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Notario (opcional)"
            value={data?.notario || ''}
            onChange={handleChange('notario')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Notaría (texto)"
            placeholder="Ej.: DÉCIMA OCTAVA DEL CANTÓN QUITO"
            value={data?.notariaNumero || ''}
            onChange={(e) => setData({ ...data, notariaNumero: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={<Checkbox checked={Boolean(data?.notarioSuplente)} onChange={(e) => setData({ ...data, notarioSuplente: e.target.checked })} />}
            label="Notario(a) suplente"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            inputProps={{ min: 1, max: 10 }}
            label="Número de copias (por defecto 2)"
            value={data?.numeroCopias ?? 2}
            onChange={(e) => setData({ ...data, numeroCopias: Math.max(1, parseInt(e.target.value || 2)) })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Otorgantes</Typography>
            {ots.map((p, idx) => (
              <Stack key={`ot-${idx}`} direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  label={`Otorgante ${idx + 1}`}
                  value={p?.nombre || ''}
                  onChange={(e) => changeEntity('otorgantes', idx, e.target.value)}
                />
                <Button variant="outlined" color="error" onClick={removeEntity('otorgantes', idx)}>Eliminar</Button>
              </Stack>
            ))}
            <Button variant="text" onClick={addEntity('otorgantes')}>Agregar otorgante</Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Beneficiarios</Typography>
            {bes.map((p, idx) => (
              <Stack key={`be-${idx}`} direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  label={`Beneficiario ${idx + 1}`}
                  value={p?.nombre || ''}
                  onChange={(e) => changeEntity('beneficiarios', idx, e.target.value)}
                />
                <Button variant="outlined" color="error" onClick={removeEntity('beneficiarios', idx)}>Eliminar</Button>
              </Stack>
            ))}
            <Button variant="text" onClick={addEntity('beneficiarios')}>Agregar beneficiario</Button>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Representante(s) de otorgante(s) jurídica(s) (opcional, uno por línea)"
            value={(data?.representantes || []).join('\n')}
            onChange={(e) => setData({ ...data, representantes: e.target.value.split('\n').filter(Boolean) })}
            helperText="Si el otorgante es una compañía/entidad, indique su(s) representante(s)."
            multiline
            minRows={3}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button variant="outlined" onClick={onBack} disabled={loading}>Volver</Button>
        <Button variant="text" color="error" onClick={onNew} disabled={loading}>Nuevo</Button>
        <Button
          variant="contained"
          onClick={() => onPreview({
            tipoActo: currentAct?.tipoActo || currentAct?.tipo,
            otorgantes: currentAct?.otorgantes || [],
            beneficiarios: currentAct?.beneficiarios || [],
            notario: data?.notario,
            notariaNumero: data?.notariaNumero,
            notarioSuplente: data?.notarioSuplente,
            representantes: data?.representantes,
            numeroCopias: data?.numeroCopias ?? 2
          })}
          disabled={loading || !(currentAct?.tipoActo || currentAct?.tipo) || !((currentAct?.otorgantes || []).length)}
        >
          Generar vista previa (acto actual)
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => onPreview({
            acts: acts
              .map((a, i) => ({ a, i }))
              .filter(({ i }) => selectedActs[i])
              .map(({ a }) => ({ 
                tipoActo: a?.tipoActo || a?.tipo, 
                otorgantes: a?.otorgantes || [], 
                beneficiarios: a?.beneficiarios || [] 
              })),
            notario: data?.notario,
            notariaNumero: data?.notariaNumero,
            notarioSuplente: data?.notarioSuplente,
            representantes: data?.representantes,
            numeroCopias: data?.numeroCopias ?? 2,
            combine: true
          })}
          disabled={loading || !(selectedActs.some(Boolean))}
        >
          Vista previa combinada
        </Button>
      </Box>
    </Box>
  )}


