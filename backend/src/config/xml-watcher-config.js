import path from 'path'

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue
  const v = String(value).toLowerCase().trim()
  return v === 'true' || v === '1' || v === 'yes'
}

function parseNumber(value, defaultValue) {
  const n = Number(value)
  return Number.isFinite(n) ? n : defaultValue
}

export function getXmlWatcherConfig() {
  // Rutas por defecto relativas al backend/
  const baseDir = process.cwd()
  const watchFolder = process.env.XML_WATCH_FOLDER || path.join(baseDir, 'xml-inbox')
  const processedFolder = process.env.XML_PROCESSED_FOLDER || path.join(baseDir, 'xml-processed')
  const errorFolder = process.env.XML_ERROR_FOLDER || path.join(baseDir, 'xml-errors')

  return {
    enabled: parseBoolean(process.env.XML_WATCHER_ENABLED, false),
    watchFolder,
    processedFolder,
    errorFolder,
    processDelayMs: parseNumber(process.env.XML_PROCESS_DELAY, 5000),
    retryAttempts: parseNumber(process.env.XML_RETRY_ATTEMPTS, 3),
    retryBackoffMs: parseNumber(process.env.XML_RETRY_BACKOFF_MS, 2000),
    concurrency: parseNumber(process.env.XML_CONCURRENCY, 1),
    systemUserEmail: process.env.XML_SYSTEM_USER_EMAIL || 'system@notaria.local'
  }
}

export default getXmlWatcherConfig


