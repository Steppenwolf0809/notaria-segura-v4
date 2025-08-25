import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

function resolveConfigPaths() {
  const candidates = [];
  // 1) Directorio del ejecutable (pkg/nexe)
  try {
    const execDir = path.dirname(process.execPath);
    candidates.push(path.join(execDir, 'config.json'));
  } catch {}
  // 2) Directorio de trabajo actual
  try {
    candidates.push(path.resolve(process.cwd(), 'config.json'));
  } catch {}
  // 3) Directorio del proyecto (modo dev)
  try {
    const moduleDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
    candidates.push(path.join(moduleDir, 'config.json'));
  } catch {}
  return candidates;
}

export function loadConfig(overrides = {}) {
  let raw = {};
  const candidates = resolveConfigPaths();
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        raw = fs.readJsonSync(p);
        break;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`No se pudo leer ${p}: ${err.message}`);
    }
  }

  const env = {
    apiUrl: process.env.API_URL,
    email: process.env.SERVICE_EMAIL,
    password: process.env.SERVICE_PASSWORD
  };

  const merged = {
    apiUrl: env.apiUrl || raw.apiUrl || 'http://localhost:3001/api',
    credentials: {
      email: env.email || raw.credentials?.email || '',
      password: env.password || raw.credentials?.password || ''
    },
    folders: {
      watch: raw.folders?.watch || 'C:/xmlcopiados',
      processed: raw.folders?.processed || 'C:/xmlcopiados/processed',
      errors: raw.folders?.errors || 'C:/xmlcopiados/errors',
      archived: raw.folders?.archived || 'C:/xmlcopiados/archived'
    },
    settings: {
      watchDelay: raw.settings?.watchDelay ?? 5000,
      batchSize: raw.settings?.batchSize ?? 20,
      retryAttempts: raw.settings?.retryAttempts ?? 3,
      retryBackoffMs: raw.settings?.retryBackoffMs ?? 1500,
      maxConcurrent: raw.settings?.maxConcurrent ?? 5,
      maxFileSizeMB: raw.settings?.maxFileSizeMB ?? 5,
      logLevel: raw.settings?.logLevel || 'INFO',
      cleanup: {
        enabled: raw.settings?.cleanup?.enabled ?? true,
        keepProcessedDays: raw.settings?.cleanup?.keepProcessedDays ?? 30,
        keepErrorsDays: raw.settings?.cleanup?.keepErrorsDays ?? 90,
        compressOldFiles: raw.settings?.cleanup?.compressOldFiles ?? true,
        cleanupHour: raw.settings?.cleanup?.cleanupHour ?? 2
      }
    }
  };

  if (overrides && Object.keys(overrides).length) {
    return deepMerge(merged, overrides);
  }

  return merged;
}

function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}


