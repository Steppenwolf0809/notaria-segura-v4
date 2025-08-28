import { useState, useCallback, useEffect } from 'react'
import concuerdoService from '../../../../services/concuerdo-service.js'

export default function useConcuerdoGenerator() {
  const loadDraft = () => {
    try {
      const raw = localStorage.getItem('concuerdo-draft')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }
  const draft = loadDraft()
  const [step, setStep] = useState(draft?.step || 0)
  const [pdfFile, setPdfFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [extractedText, setExtractedText] = useState(draft?.extractedText || '')
  const [extractedData, setExtractedData] = useState(draft?.extractedData || { tipoActo: '', otorgantes: [], beneficiarios: [], notario: '' })

  // Persist to localStorage
  useEffect(() => {
    try {
      const payload = { step, extractedText, extractedData }
      localStorage.setItem('concuerdo-draft', JSON.stringify(payload))
    } catch {}
  }, [step, extractedText, extractedData])

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
      // Pasar el buffer del PDF si está disponible para el parser tabular
      const buffer = extractedText.buffer || null
      const parsed = await concuerdoService.extractData(extractedText.text || extractedText, buffer)
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
        notariaNumero: data?.notariaNumero,
        notarioSuplente: Boolean(data?.notarioSuplente),
        acts: Array.isArray(data?.acts) ? data.acts : undefined,
        representantes: data?.representantes,
        numCopias,
        format: 'html'
      })
      if (!resp.success) throw new Error(resp.error || 'Error generando documentos')

      setExtractedData({ ...data, previewDocs: resp.data.documents, engine: resp.data.engine })
      setStep(2)
    } finally {
      setGenerating(false)
    }
  }, [])

  const reset = useCallback(() => {
    try { localStorage.removeItem('concuerdo-draft') } catch {}
    setStep(0)
    setPdfFile(null)
    setExtractedText('')
    setExtractedData({ tipoActo: '', otorgantes: [], beneficiarios: [], notario: '' })
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
    , reset
  }
}

// Persistencia básica de estado
// Nota: este hook corre en cliente; guardamos cada cambio relevante
if (typeof window !== 'undefined') {
  // Monkey-patch setState to persist; en entorno real se podría usar useEffect
}


