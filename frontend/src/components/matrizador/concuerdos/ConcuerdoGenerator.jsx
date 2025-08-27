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
            {generating && 'Generando vista previa...'}
            {!generating && Array.isArray(extractedData?.previewDocs) && extractedData.previewDocs.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                {extractedData.previewDocs.map((doc) => (
                  <Paper key={doc.index} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>{doc.title}</Typography>
                    <div dangerouslySetInnerHTML={{ __html: atob(doc.contentBase64) }} />
                  </Paper>
                ))}
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


