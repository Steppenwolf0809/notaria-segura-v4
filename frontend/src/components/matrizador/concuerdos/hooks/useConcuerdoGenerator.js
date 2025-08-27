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
    const res = await concuerdoService.uploadPDF(pdfFile)
    setUploading(false)
    if (res.success) {
      setExtractedText(res.data.text || '')
      // Extraer datos básicos automáticamente
      setExtracting(true)
      const parsed = await concuerdoService.extractData(res.data.text || '')
      setExtracting(false)
      if (parsed.success) {
        setExtractedData(parsed.data)
        setStep(1)
      }
    }
  }, [pdfFile])

  const handleExtract = useCallback(async () => {
    if (!extractedText) return
    setExtracting(true)
    const parsed = await concuerdoService.extractData(extractedText)
    setExtracting(false)
    if (parsed.success) {
      setExtractedData(parsed.data)
      setStep(1)
    }
  }, [extractedText])

  const preview = useCallback(async (data) => {
    setGenerating(true)
    const res = await concuerdoService.previewConcuerpo?.(data)
    // fallback por error tipográfico
    const response = res && res.success !== undefined ? res : await concuerdoService.previewConcuerdo(data)
    setGenerating(false)
    if (response.success) {
      setExtractedData({ ...data, previewText: response.data.previewText })
      setStep(2)
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


