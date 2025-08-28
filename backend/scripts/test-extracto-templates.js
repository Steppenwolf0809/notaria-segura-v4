/**
 * Script de prueba rápida para motor de templates de extractos
 * - Genera con inputs/poder-*.json
 * - Compara con examples/*.txt
 */
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { PoderTemplates } from '../src/services/extractos/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT = path.resolve(__dirname, '..', 'src', 'data', 'extractos-referencia')
const INPUTS = path.join(ROOT, 'inputs')
const EXAMPLES = path.join(ROOT, 'examples')

async function loadJson(name) {
  const p = path.join(INPUTS, name)
  return JSON.parse(await fs.readFile(p, 'utf8'))
}

async function loadExample(name) {
  const p = path.join(EXAMPLES, name)
  return fs.readFile(p, 'utf8')
}

function normalize(s) {
  return String(s).replace(/\r/g, '').trim()
}

async function testCase(inputFile, expectedFile) {
  const data = await loadJson(inputFile)
  const { text } = await PoderTemplates.render(data)
  const expected = await loadExample(expectedFile)
  const ok = normalize(text) === normalize(expected)
  return { ok, generated: text, expected }
}

async function main() {
  const cases = [
    { in: 'poder-natural.json', ex: 'poder-ejemplo-final.txt' },
    { in: 'poder-juridica.json', ex: 'poder-doble-beneficiario-ejemplo.txt' },
  ]
  let allOk = true
  for (const c of cases) {
    try {
      const { ok } = await testCase(c.in, c.ex)
      console.log(`Case ${c.in} vs ${c.ex}:`, ok ? 'OK' : 'DIFF')
      if (!ok) allOk = false
    } catch (e) {
      allOk = false
      console.error(`Error in case ${c.in}:`, e.message)
    }
  }
  if (!allOk) {
    console.log('\nGenerated outputs may differ from examples. Inspect diffs manually.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })

