import React, { useCallback, useState } from 'react'
import { Box, Button, Typography, LinearProgress } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

export default function PDFUploader({ file, setFile, onUpload, loading, onExtract, canExtract }) {
  const [dragActive, setDragActive] = useState(false)

  const onFileChange = useCallback((e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }, [setFile])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer?.files?.[0]
    if (f && f.type === 'application/pdf') setFile(f)
  }, [setFile])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

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

      <Box
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        sx={{
          mt: 2,
          p: 3,
          border: '2px dashed',
          borderRadius: 2,
          borderColor: dragActive ? 'primary.main' : 'divider',
          backgroundColor: dragActive ? 'action.hover' : 'transparent',
          textAlign: 'center',
          transition: 'all 0.15s ease-in-out'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Arrastra y suelta aquí tu archivo PDF
        </Typography>
        <Typography variant="caption" color="text.disabled">o usa el botón “Seleccionar PDF”</Typography>
      </Box>

      {file && (
        <Typography variant="body2" sx={{ mt: 1 }}>Archivo seleccionado: {file.name}</Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button onClick={async () => {
          try {
            await onUpload()
          } catch (e) {
            alert(e?.message || 'Error subiendo PDF')
          }
        }} variant="contained" disabled={!file || loading}>
          Subir y extraer texto
        </Button>
        <Button onClick={async () => {
          try {
            await onExtract()
          } catch (e) {
            alert(e?.message || 'Error extrayendo datos')
          }
        }} variant="outlined" disabled={!canExtract || loading}>
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


