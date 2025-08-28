import React from 'react'
import { Box, Stepper, Step, StepLabel, Paper, Typography, Divider, Button } from '@mui/material'
import PDFUploader from './PDFUploader.jsx'
import ExtractedDataForm from './ExtractedDataForm.jsx'
import useConcuerdoGenerator from './hooks/useConcuerdoGenerator.js'

const steps = ['Subir PDF', 'Revisar datos', 'Generar']

export default function ConcuerdoGenerator() {
  const {
    step,
    setStep,
    uploading,
    extracting,
    pdfFile,
    setPdfFile,
    extractedText,
    extractedData,
    setExtractedData,
    handleUpload,
    handleExtract,
    preview,
    generating,
    reset
  } = useConcuerdoGenerator()

  const buildPayload = () => {
    const data = extractedData || {}
    const numCopias = data?.numeroCopias ?? 2
    const base = {
      notario: data?.notario,
      notariaNumero: data?.notariaNumero,
      notarioSuplente: Boolean(data?.notarioSuplente),
      representantes: data?.representantes,
      numCopias,
    }
    if (Array.isArray(data?.acts) && data.acts.length > 0) {
      return { ...base, acts: data.acts }
    }
    return {
      ...base,
      tipoActo: data?.tipoActo,
      otorgantes: data?.otorgantes,
      beneficiarios: data?.beneficiarios,
    }
  }

  const handleDownload = async (format = 'rtf') => {
    try {
      const payload = { ...buildPayload(), format, bundle: true }
      const resp = await (await import('../../../services/concuerdo-service.js')).default.generateDocuments(payload)
      if (!resp.success) throw new Error(resp.error || 'Error generando documentos')
      const docs = resp.data.documents || []
      let warnedFallback = false
      for (const d of docs) {
        if (format === 'docx' && d?.mimeType && d.mimeType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && !warnedFallback) {
          alert('DOCX no disponible en el servidor. Se descargará en formato RTF como alternativa.')
          warnedFallback = true
        }
        const byteChars = atob(d.contentBase64)
        const byteNumbers = new Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: d.mimeType || 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = d.filename || 'document'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      alert(e.message || String(e))
    }
  }

  const handlePrint = async () => {
    try {
      const payload = { ...buildPayload(), format: 'html', bundle: true }
      const resp = await (await import('../../../services/concuerdo-service.js')).default.generateDocuments(payload)
      if (!resp.success) throw new Error(resp.error || 'Error generando documentos')
      const docs = resp.data.documents || []
      // Abrir la primera copia en una ventana para imprimir (el usuario puede guardar como PDF o Word desde allí)
      const first = docs[0]
      if (!first) return
      const html = atob(first.contentBase64)
      const w = window.open('', '_blank')
      if (!w) return alert('Bloqueado por el navegador. Habilita pop-ups para imprimir.')
      w.document.open()
      w.document.write(html)
      w.document.close()
      w.focus()
      // Dar un pequeño delay para que cargue estilos antes de imprimir
      setTimeout(() => {
        w.print()
      }, 200)
    } catch (e) {
      alert(e.message || String(e))
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Generador de Concuerdos</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={step} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Paper sx={{ p: 2 }}>
        {step === 0 && (
          <PDFUploader
            file={pdfFile}
            setFile={setPdfFile}
            onUpload={handleUpload}
            loading={uploading}
            onExtract={handleExtract}
            canExtract={Boolean(extractedText)}
          />
        )}

        {step === 1 && (
          <ExtractedDataForm
            data={extractedData}
            setData={setExtractedData}
            loading={extracting || generating}
            onBack={() => setStep(0)}
            onPreview={preview}
            onNew={reset}
          />
        )}

        {step === 2 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Vista previa de copias</Typography>
            <Divider sx={{ mb: 2 }} />
            {extractedData?.engine && (
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <span className="badge bg-primary">Acto principal: {extractedData.engine.acto}</span>
                <span className="badge bg-secondary">Actos detectados: {extractedData.engine.actosCount || 1}</span>
                <span className="badge bg-light text-dark">Template: {extractedData.engine.template}</span>
              </Box>
            )}
            {(extractedData?.notario || extractedData?.notariaNumero) && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Datos de notaría</Typography>
                {extractedData?.notario && (
                  <Typography variant="body2">{extractedData?.notarioSuplente ? 'Notario(a) suplente:' : 'Notario(a):'} {extractedData.notario}</Typography>
                )}
                {extractedData?.notariaNumero && (
                  <Typography variant="body2">Notaría: {extractedData.notariaNumero}</Typography>
                )}
              </Box>
            )}
            {generating && 'Generando vista previa...'}
            {!generating && Array.isArray(extractedData?.previewDocs) && extractedData.previewDocs.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                {extractedData.previewDocs.map((doc) => {
                  // Decodificar base64 como UTF-8
                  const decodeBase64Utf8 = (b64) => {
                    try {
                      const binStr = atob(b64);
                      const len = binStr.length;
                      const bytes = new Uint8Array(len);
                      for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
                      return new TextDecoder('utf-8').decode(bytes);
                    } catch (e) {
                      try { return atob(b64); } catch { return ''; }
                    }
                  };
                  const content = decodeBase64Utf8(doc.contentBase64 || '');
                  const isPlain = String(doc.mimeType || '').startsWith('text/plain');
                  return (
                    <Paper key={doc.index} variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>{doc.title}</Typography>
                      {isPlain ? (
                        <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', m: 0 }}>
                          {content}
                        </Typography>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: content }} />
                      )}
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2">Sin vista previa</Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => setStep(1)} disabled={generating}>Editar</Button>
              <Button variant="contained" color="primary" onClick={() => handleDownload('docx')} disabled={generating}>Descargar DOCX</Button>
              <Button variant="outlined" color="primary" onClick={() => handleDownload('rtf')} disabled={generating}>Descargar RTF (Word)</Button>
              <Button variant="outlined" color="secondary" onClick={() => handleDownload('txt')} disabled={generating}>Descargar TXT</Button>
              <Button variant="outlined" onClick={handlePrint} disabled={generating}>Imprimir / Guardar PDF</Button>
              <Button variant="text" color="error" onClick={reset} disabled={generating}>Nuevo</Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
