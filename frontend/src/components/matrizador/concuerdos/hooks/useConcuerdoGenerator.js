import { useState, useCallback } from 'react'
import concuerdoService from '../../../../services/concuerdo-service.js'

export default function useConcuerdoGenerator() {
  const [step, setStep] = useState(0)
  const [pdfFile, setPdfFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [extractedData, setExtractedData] = useState({ tipoActo: '', otorgantes: [], beneficiarios: [], notario: '' })

  const handleUpload = useCallback(async () => {
    if (!pdfFile) return
    setUploading(true)
    try {
      const res = await concuerdoService.uploadPDF(pdfFile)
      if (!res.success) throw new Error(res.error || 'Error subiendo PDF')
      setExtractedText(res.data.text || '')
      // Extraer datos básicos automáticamente
      setExtracting(true)
      const parsed = await concuerdoService.extractData(res.data.text || '')
      if (!parsed.success) throw new Error(parsed.error || 'Error extrayendo datos')
      setExtractedData(parsed.data)
      setStep(1)
    } finally {
      setExtracting(false)
      setUploading(false)
    }
  }, [pdfFile])

  const handleExtract = useCallback(async () => {
    if (!extractedText) return
    setExtracting(true)
    try {
      const parsed = await concuerdoService.extractData(extractedText)
      if (!parsed.success) throw new Error(parsed.error || 'Error extrayendo datos')
      setExtractedData(parsed.data)
      setStep(1)
    } finally {
      setExtracting(false)
    }
  }, [extractedText])

  const preview = useCallback(async (data) => {
    setGenerating(true)
    try {
      // Generar documentos en formato HTML como vista previa
      const numCopias = data?.numeroCopias ?? 2
      const resp = await concuerdoService.generateDocuments({
        tipoActo: data?.tipoActo,
        otorgantes: data?.otorgantes,
        beneficiarios: data?.beneficiarios,
        notario: data?.notario,
        numCopias,
        format: 'html'
      })
      if (!resp.success) throw new Error(resp.error || 'Error generando documentos')

      setExtractedData({ ...data, previewDocs: resp.data.documents })
      setStep(2)
    } finally {
      setGenerating(false)
    }
  }, [])

  return {
    step,
    setStep,
    uploading,
    extracting,
    generating,
    pdfFile,
    setPdfFile,
    extractedText,
    extractedData,
    setExtractedData,
    handleUpload,
    handleExtract,
    preview
  }
}


