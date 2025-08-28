import React, { useMemo, useState } from 'react'
import { Box, TextField, Button, Grid, Typography, Stack, FormControlLabel, Checkbox, Tabs, Tab, Divider } from '@mui/material'

export default function ExtractedDataForm({ data, setData, loading, onBack, onPreview }) {
  const [actIndex, setActIndex] = useState(0)

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
          <TextField
            fullWidth
            label="Otorgantes (uno por línea)"
            value={Array.isArray(currentAct?.otorgantes) ? currentAct.otorgantes.join('\n') : ''}
            onChange={(e) => updateAct({ otorgantes: e.target.value.split('\n').filter(Boolean) })}
            multiline
            minRows={4}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Beneficiarios (uno por línea)"
            value={Array.isArray(currentAct?.beneficiarios) ? currentAct.beneficiarios.join('\n') : ''}
            onChange={(e) => updateAct({ beneficiarios: e.target.value.split('\n').filter(Boolean) })}
            multiline
            minRows={4}
          />
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
      </Box>
    </Box>
  )}


