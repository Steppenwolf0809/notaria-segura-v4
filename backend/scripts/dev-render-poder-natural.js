import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { PoderTemplates } from '../src/services/extractos/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..', 'src', 'data', 'extractos-referencia')

const inp = path.join(ROOT, 'inputs', 'poder-natural.json')
const example = path.join(ROOT, 'examples', 'poder-ejemplo-final.txt')

const data = JSON.parse(await fs.readFile(inp, 'utf8'))
const { text } = await PoderTemplates.render(data)
const expected = await fs.readFile(example, 'utf8')

console.log('--- GENERATED ---')
console.log(text)
console.log('--- EXPECTED ---')
console.log(expected)

