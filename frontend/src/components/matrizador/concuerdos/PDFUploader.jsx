import React, { useCallback } from 'react'
import { Box, Button, Typography, LinearProgress } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

export default function PDFUploader({ file, setFile, onUpload, loading, onExtract, canExtract }) {
  const onFileChange = useCallback((e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }, [setFile])

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Subir PDF del extracto notarial</Typography>
      <input
        type="file"
        accept="application/pdf"
        onChange={onFileChange}
        style={{ display: 'none' }}
        id="pdf-input"
      />
      <label htmlFor="pdf-input">
        <Button variant="contained" component="span" startIcon={<CloudUploadIcon />} disabled={loading}>
          {file ? 'Cambiar archivo' : 'Seleccionar PDF'}
        </Button>
      </label>

      {file && (
        <Typography variant="body2" sx={{ mt: 1 }}>Archivo seleccionado: {file.name}</Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button onClick={() => onUpload()} variant="contained" disabled={!file || loading}>
          Subir y extraer texto
        </Button>
        <Button onClick={() => onExtract()} variant="outlined" disabled={!canExtract || loading}>
          Reintentar extracción
        </Button>
      </Box>

      {loading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  )
}


