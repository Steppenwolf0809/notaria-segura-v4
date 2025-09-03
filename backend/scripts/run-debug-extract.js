// Ejecuta el endpoint de diagnóstico para uno o más PDFs
// Uso: node scripts/run-debug-extract.js [ruta1.pdf] [ruta2.pdf] ...
// Requiere: AUTH_TOKEN en env (JWT con rol MATRIZADOR)

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''

async function fileToFormData(filePath) {
  const buf = await fs.readFile(filePath)
  const name = path.basename(filePath)
  const blob = new Blob([buf], { type: 'application/pdf' })
  const fd = new FormData()
  fd.append('pdfFile', blob, name)
  return fd
}

async function runOne(filePath) {
  const url = `${BASE_URL}/api/concuerdos/debug-extract?ocrFirst=1&return=all`
  const form = await fileToFormData(filePath)
  const headers = {}
  if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`
  const res = await fetch(url, { method: 'POST', body: form, headers })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`)
  }
  const json = await res.json()
  const outDir = path.dirname(filePath)
  const base = path.basename(filePath).replace(/\.pdf$/i, '')
  const outPath = path.join(outDir, `${base}.debug.json`)
  await fs.writeFile(outPath, JSON.stringify(json, null, 2), 'utf8')
  console.log(`✅ Guardado: ${outPath}`)
}

async function main() {
  const args = process.argv.slice(2)
  const defaultFiles = [
    path.resolve(process.cwd(), 'tests', 'fixtures', 'ActoNotarial-48018343.pdf'),
    path.resolve(process.cwd(), 'tests', 'fixtures', 'ActoNotarial-47179730.pdf')
  ]
  const files = args.length ? args : defaultFiles

  for (const f of files) {
    try {
      await fs.access(f)
    } catch {
      console.error(`❌ No existe el archivo: ${f}`)
      continue
    }
    try {
      await runOne(f)
    } catch (e) {
      console.error(`❌ Error procesando ${f}:`, e.message)
    }
  }
}

main().catch((e) => {
  console.error('Error inesperado:', e)
  process.exit(1)
})


