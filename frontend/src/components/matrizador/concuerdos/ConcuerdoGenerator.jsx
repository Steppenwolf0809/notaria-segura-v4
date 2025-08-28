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
    generating
  } = useConcuerdoGenerator()

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
          />
        )}

        {step === 2 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Vista previa de copias</Typography>
            <Divider sx={{ mb: 2 }} />
            {extractedData?.engine && (
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip size="small" label={`Acto: ${extractedData.engine.acto}`} color="primary" />
                <Chip size="small" label={`Template: ${extractedData.engine.template}`} variant="outlined" />
              </Box>
            )}
            {(extractedData?.notario || extractedData?.notariaNumero) && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Datos de notaría</Typography>
                {extractedData?.notario && (
                  <Typography variant="body2">Notario: {extractedData.notario}</Typography>
                )}
                {extractedData?.notariaNumero && (
                  <Typography variant="body2">Notaría N° {extractedData.notariaNumero}</Typography>
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
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button variant="outlined" onClick={() => setStep(1)} disabled={generating}>Editar</Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  )
}


