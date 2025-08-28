import React from 'react'
import { Box, TextField, Button, Grid, Typography, Chip, Stack, FormControlLabel, Checkbox } from '@mui/material'

export default function ExtractedDataForm({ data, setData, loading, onBack, onPreview }) {
  const handleChange = (field) => (e) => {
    setData({ ...data, [field]: e.target.value })
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>Revisar y editar datos extraídos</Typography>
      {data?.tipoActo && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={`Acto detectado: ${data.tipoActo}`} color="primary" size="small" />
          <Chip label="Template: Poder universal" variant="outlined" size="small" />
        </Stack>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Tipo de Acto"
            value={data?.tipoActo || ''}
            onChange={handleChange('tipoActo')}
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
            value={(data?.otorgantes || []).join('\n')}
            onChange={(e) => setData({ ...data, otorgantes: e.target.value.split('\n') })}
            multiline
            minRows={4}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Beneficiarios (uno por línea)"
            value={(data?.beneficiarios || []).join('\n')}
            onChange={(e) => setData({ ...data, beneficiarios: e.target.value.split('\n') })}
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
        <Button variant="contained" onClick={() => onPreview(data)} disabled={loading || !data?.tipoActo || !(data?.otorgantes?.length)}>
          Generar vista previa
        </Button>
      </Box>
    </Box>
  )}


