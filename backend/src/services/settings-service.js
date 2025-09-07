import prisma from '../db.js';

// Caché simple en memoria con TTL corto para evitar hits constantes
const memoryCache = {
  data: new Map(),
  ttlMs: 10_000, // 10s conservador
  get(key) {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  },
  set(key, value) {
    this.data.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  },
  invalidate(key) {
    this.data.delete(key);
  }
};

const DEFAULTS = {
  whatsappEnabled: true,
  emailEnabled: false,
  autoRetryEnabled: true,
  maxRetryAttempts: 3,
  retryIntervalMinutes: 30
};

function parseValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function stringifyValue(val) {
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

async function getSetting(key) {
  const cached = memoryCache.get(key);
  if (cached !== null) return cached;

  const row = await prisma.systemSetting.findUnique({ where: { key } }).catch(() => null);
  const value = row ? parseValue(row.value) : DEFAULTS[key];
  memoryCache.set(key, value);
  return value;
}

async function setSetting(key, value) {
  const str = stringifyValue(value);
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: str },
    create: { key, value: str }
  });
  memoryCache.invalidate(key);
  return true;
}

async function getAllSettings() {
  // Primero ver si tenemos todas las claves básicas en caché
  const keys = Object.keys(DEFAULTS);
  const result = {};
  let allCached = true;
  for (const k of keys) {
    const cached = memoryCache.get(k);
    if (cached === null) { allCached = false; break; }
    result[k] = cached;
  }
  if (allCached) return result;

  const rows = await prisma.systemSetting.findMany().catch(() => []);
  for (const k of keys) {
    const row = rows.find(r => r.key === k);
    result[k] = row ? parseValue(row.value) : DEFAULTS[k];
    memoryCache.set(k, result[k]);
  }
  return result;
}

async function updateSettings(partial) {
  const allowed = Object.keys(DEFAULTS);
  for (const [key, val] of Object.entries(partial || {})) {
    if (!allowed.includes(key)) continue;
    await setSetting(key, val);
  }
  return getAllSettings();
}

export default {
  getSetting,
  setSetting,
  getAllSettings,
  updateSettings
};


