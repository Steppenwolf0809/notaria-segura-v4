import { useState, useCallback, useEffect } from 'react'
import concuerdoService from '../../../../services/concuerdo-service.js'
import useAuthStore from '../../../../store/auth-store.js'

export default function useConcuerdoGenerator() {
  const userId = useAuthStore(s => s.user?.id)
  const getKey = (uid) => `concuerdo-draft:${uid || 'anon'}`

  const loadDraft = (uid) => {
    try {
      const raw = localStorage.getItem(getKey(uid))
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }
  const draft = loadDraft(userId)
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
      localStorage.setItem(getKey(userId), JSON.stringify(payload))
    } catch {}
  }, [step, extractedText, extractedData, userId])

  // Limpiar automáticamente cuando cambia de usuario (o al pasar de anon → usuario)
  useEffect(() => {
    // Resetear estado para evitar ver datos de otro usuario
    try { localStorage.removeItem('concuerdo-draft') } catch {}
    try { localStorage.removeItem(getKey(userId)) } catch {}
    // Estado limpio
    setStep(0)
    setPdfFile(null)
    setExtractedText('')
    setExtractedData({ tipoActo: '', otorgantes: [], beneficiarios: [], notario: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const handleUpload = useCallback(async () => {
    if (!pdfFile) return
    setUploading(true)
    try {
      const res = await concuerdoService.uploadPDF(pdfFile)
      if (!res.success) throw new Error(res.error || 'Error subiendo PDF')
      // Guardar objeto completo (texto + buffer base64) para permitir parser tabular en extractData
      setExtractedText(res.data)
      // Extraer datos básicos automáticamente
      setExtracting(true)
      // Pasar también el buffer base64 para habilitar extracción Python inmediata
      const buffer = res.data?.buffer || null
      const parsed = await concuerdoService.extractData(res.data.text || '', buffer)
      if (!parsed.success) throw new Error(parsed.error || 'Error extrayendo datos')
      try {
        const act0 = Array.isArray(parsed.data?.acts) ? parsed.data.acts[0] : parsed.data
        const ots = (act0?.otorgantes || []).map(o => o?.nombre).filter(Boolean)
        const bes = (act0?.beneficiarios || []).map(b => b?.nombre).filter(Boolean)
        console.log('[Concuerdo] Datos extraídos:', {
          tipoActo: act0?.tipoActo || act0?.tipo,
          otorgantes: ots,
          beneficiarios: bes
        })
      } catch {}
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
      const buffer = extractedText?.buffer || null
      const parsed = await concuerdoService.extractData(extractedText?.text || extractedText, buffer)
      if (!parsed.success) throw new Error(parsed.error || 'Error extrayendo datos')
      try {
        const act0 = Array.isArray(parsed.data?.acts) ? parsed.data.acts[0] : parsed.data
        const ots = (act0?.otorgantes || []).map(o => o?.nombre).filter(Boolean)
        const bes = (act0?.beneficiarios || []).map(b => b?.nombre).filter(Boolean)
        console.log('[Concuerdo] Datos extraídos:', {
          tipoActo: act0?.tipoActo || act0?.tipo,
          otorgantes: ots,
          beneficiarios: bes
        })
      } catch {}
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
    try { localStorage.removeItem(getKey(userId)) } catch {}
    try { localStorage.removeItem('concuerdo-draft') } catch {}
    setStep(0)
    setPdfFile(null)
    setExtractedText('')
    setExtractedData({ tipoActo: '', otorgantes: [], beneficiarios: [], notario: '' })
  }, [userId])

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

