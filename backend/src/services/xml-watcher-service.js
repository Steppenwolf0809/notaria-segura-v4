import chokidar from 'chokidar'
import path from 'path'
import fs from 'fs'
import XmlAutoProcessor from './xml-auto-processor.js'
import { getXmlWatcherConfig } from '../config/xml-watcher-config.js'

/**
 * Servicio de monitoreo de carpeta para archivos XML
 * - Usa chokidar para observar creaciones/modificaciones
 * - Aplica delay para evitar archivos parciales
 * - Cola de procesamiento con concurrencia configurable
 */
export class XmlWatcherService {
  constructor(config = getXmlWatcherConfig()) {
    this.config = config
    this.watcher = null
    this.processor = new XmlAutoProcessor({
      processedFolder: this.config.processedFolder,
      errorFolder: this.config.errorFolder,
      systemUserEmail: this.config.systemUserEmail
    })
    this.queue = []
    this.activeCount = 0
    this.timers = new Map() // filename -> timeoutId
    this.stopped = false
  }

  shouldIgnore(filePath) {
    const lower = filePath.toLowerCase()
    // Ignorar temporales comunes
    if (lower.endsWith('.tmp') || lower.endsWith('.partial') || lower.endsWith('.crdownload')) return true
    // Solo XML
    if (!lower.endsWith('.xml')) return true
    return false
  }

  scheduleProcess(filePath) {
    if (this.shouldIgnore(filePath)) return
    if (this.timers.has(filePath)) {
      clearTimeout(this.timers.get(filePath))
    }
    const timer = setTimeout(() => {
      this.enqueue(filePath)
      this.timers.delete(filePath)
    }, this.config.processDelayMs)
    this.timers.set(filePath, timer)
  }

  enqueue(filePath) {
    this.queue.push(filePath)
    this.drain()
  }

  async drain() {
    if (this.activeCount >= this.config.concurrency) return
    const next = this.queue.shift()
    if (!next) return
    this.activeCount++
    try {
      await this.safeProcess(next)
    } finally {
      this.activeCount--
      // Procesar siguiente
      setImmediate(() => this.drain())
    }
  }

  async safeProcess(filePath) {
    let attempts = 0
    while (attempts <= this.config.retryAttempts) {
      try {
        // Validar que el archivo ya no está creciendo (tamaño estable)
        const stable = await this.isFileStable(filePath)
        if (!stable) {
          attempts++
          await this.delay(this.config.retryBackoffMs)
          continue
        }
        return await this.processor.processFile(filePath)
      } catch (error) {
        attempts++
        if (attempts > this.config.retryAttempts) {
          console.error(`❌ Falló procesamiento tras ${attempts} intentos: ${path.basename(filePath)}`)
          // Delegado: el processor moverá a errores en su catch
          return
        }
        console.warn(`🔁 Reintentando (${attempts}) ${path.basename(filePath)}: ${error.message}`)
        await this.delay(this.config.retryBackoffMs)
      }
    }
  }

  async isFileStable(filePath) {
    try {
      const stat1 = await fs.promises.stat(filePath)
      await this.delay(500)
      const stat2 = await fs.promises.stat(filePath)
      return stat1.size === stat2.size
    } catch {
      return false
    }
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)) }

  start() {
    if (!this.config.enabled) {
      console.log('⏸️ XML Watcher deshabilitado por configuración')
      return null
    }
    if (this.watcher) return this.watcher

    console.log('👀 Iniciando XML Watcher:')
    console.log(`   Carpeta: ${this.config.watchFolder}`)
    console.log(`   Delay: ${this.config.processDelayMs}ms  Concurrencia: ${this.config.concurrency}`)

    // Asegurar carpeta de entrada
    try { fs.mkdirSync(this.config.watchFolder, { recursive: true }) } catch {}

    this.watcher = chokidar.watch(this.config.watchFolder, {
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: this.config.processDelayMs,
        pollInterval: 200
      },
      depth: 0,
      persistent: true
    })

    this.watcher.on('add', (file) => this.scheduleProcess(file))
    this.watcher.on('change', (file) => this.scheduleProcess(file))
    this.watcher.on('error', (err) => console.error('Watcher error:', err))

    this.stopped = false
    return this.watcher
  }

  async stop() {
    this.stopped = true
    for (const t of this.timers.values()) clearTimeout(t)
    this.timers.clear()
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
    // Esperar a que termine lo activo
    const waitUntilIdle = async () => {
      if (this.activeCount === 0) return
      await this.delay(100)
      return waitUntilIdle()
    }
    await waitUntilIdle()
    console.log('🛑 XML Watcher detenido')
  }
}

const xmlWatcherService = new XmlWatcherService()
export default xmlWatcherService


