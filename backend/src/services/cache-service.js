import crypto from 'crypto';

/**
 * Servicio de caché con backend Redis opcional y fallback en memoria (Map).
 * - Diseñado para respuestas de búsqueda (listas paginadas) de documentos.
 * - Incluye etiquetas (tags) para invalidación masiva y métricas de hit rate.
 */
class CacheService {
  constructor() {
    this.enabled = process.env.CACHE_ENABLED !== 'false';
    this.defaultTtlMs = parseInt(process.env.CACHE_TTL_MS || '60000', 10); // 60s
    this.backend = 'memory';
    this.redis = null; // cliente redis si está disponible
    // Almacenamiento en memoria
    this.store = new Map(); // key -> { value, expiresAt }
    this.tagIndex = new Map(); // tag -> Set(keys)
    // Métricas
    this.metrics = {
      gets: 0,
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      lastError: null,
      startedAt: Date.now()
    };
  }

  // Conectar Redis si hay configuración disponible. No lanza si falla; hace fallback a memoria.
  async connectRedisIfConfigured() {
    if (this.redis || !this.enabled) return false;
    const url = process.env.REDIS_URL;
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT;
    const password = process.env.REDIS_PASSWORD;
    const shouldTry = !!url || !!host;
    if (!shouldTry) return false;
    try {
      // Importación dinámica para no requerir dependencia si no se usa
      const mod = await import('redis').catch(() => null);
      if (!mod) {
        this.metrics.lastError = 'Paquete redis no instalado; usando memoria';
        return false;
      }
      const client = mod.createClient({
        url: url || `redis://${host || '127.0.0.1'}:${port || '6379'}`,
        password: password || undefined
      });
      client.on('error', (err) => {
        // No romper la app si Redis falla; usar memoria
        this.metrics.lastError = `Redis error: ${err?.message || err}`;
      });
      await client.connect();
      this.redis = client;
      this.backend = 'redis';
      return true;
    } catch (err) {
      this.metrics.lastError = `No se pudo conectar a Redis: ${err?.message || err}`;
      this.redis = null;
      this.backend = 'memory';
      return false;
    }
  }

  _now() { return Date.now(); }

  _isExpired(entry) {
    return !entry || (typeof entry.expiresAt === 'number' && entry.expiresAt <= this._now());
  }

  _addKeyToTags(key, tags) {
    if (!Array.isArray(tags)) return;
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag).add(key);
    }
  }

  _removeKeyFromAllTags(key) {
    for (const [tag, set] of this.tagIndex.entries()) {
      if (set.has(key)) {
        set.delete(key);
        if (set.size === 0) this.tagIndex.delete(tag);
      }
    }
  }

  // Hash para claves largas (ej. JSON.stringify de query)
  key(input) {
    if (!input) return 'k:empty';
    const str = typeof input === 'string' ? input : JSON.stringify(input);
    // Prefijo para búsquedas de documentos
    const digest = crypto.createHash('sha1').update(str).digest('hex');
    return `search:doc:${digest}`;
  }

  async get(key) {
    if (!this.enabled) return null;
    this.metrics.gets++;
    try {
      if (this.redis) {
        const raw = await this.redis.get(key);
        if (raw == null) { this.metrics.misses++; return null; }
        this.metrics.hits++;
        return JSON.parse(raw);
      }
      const entry = this.store.get(key);
      if (!entry || this._isExpired(entry)) {
        if (entry) {
          this.store.delete(key);
          this._removeKeyFromAllTags(key);
        }
        this.metrics.misses++;
        return null;
      }
      this.metrics.hits++;
      return entry.value;
    } catch (err) {
      this.metrics.lastError = `get error: ${err?.message || err}`;
      return null;
    }
  }

  async set(key, value, opts = {}) {
    if (!this.enabled) return false;
    const ttlMs = typeof opts.ttlMs === 'number' ? opts.ttlMs : this.defaultTtlMs;
    const tags = opts.tags || [];
    try {
      if (this.redis) {
        const seconds = Math.max(1, Math.ceil(ttlMs / 1000));
        await this.redis.set(key, JSON.stringify(value), { EX: seconds });
        // Índice de tags se maneja localmente
        this._addKeyToTags(key, tags);
      } else {
        const expiresAt = this._now() + ttlMs;
        this.store.set(key, { value, expiresAt });
        this._addKeyToTags(key, tags);
      }
      this.metrics.sets++;
      return true;
    } catch (err) {
      this.metrics.lastError = `set error: ${err?.message || err}`;
      return false;
    }
  }

  async del(key) {
    try {
      if (this.redis) await this.redis.del(key);
      this.store.delete(key);
      this._removeKeyFromAllTags(key);
      this.metrics.deletes++;
      return true;
    } catch (err) {
      this.metrics.lastError = `del error: ${err?.message || err}`;
      return false;
    }
  }

  async invalidateByTag(tag) {
    const keys = Array.from(this.tagIndex.get(tag) || []);
    if (keys.length === 0) return 0;
    try {
      if (this.redis && keys.length) {
        // Mejor eliminar en lotes pequeños para evitar bloquear
        const chunkSize = 50;
        for (let i = 0; i < keys.length; i += chunkSize) {
          const slice = keys.slice(i, i + chunkSize);
          await this.redis.del(slice);
        }
      }
    } catch (err) {
      this.metrics.lastError = `invalidate redis error: ${err?.message || err}`;
    }
    // Limpiar memoria e índice
    for (const k of keys) {
      this.store.delete(k);
      this._removeKeyFromAllTags(k);
    }
    this.metrics.invalidations += keys.length;
    return keys.length;
  }

  // Helper de conveniencia para envolver una función asincrónica con caché
  async wrap(key, fetcher, opts = {}) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) return cached;
    const value = await fetcher();
    await this.set(key, value, opts);
    return value;
  }

  // Exponer métricas
  getStats() {
    const reads = this.metrics.gets;
    const hits = this.metrics.hits;
    const hitRate = reads > 0 ? +(hits / reads * 100).toFixed(2) : 0;
    return {
      enabled: this.enabled,
      backend: this.backend,
      defaultTtlMs: this.defaultTtlMs,
      reads,
      hits,
      misses: this.metrics.misses,
      hitRate,
      sets: this.metrics.sets,
      deletes: this.metrics.deletes,
      invalidations: this.metrics.invalidations,
      memoryKeys: this.store.size,
      tags: Array.from(this.tagIndex.keys()),
      lastError: this.metrics.lastError,
      uptimeMs: Date.now() - this.metrics.startedAt
    };
  }
}

const cache = new CacheService();

export default cache;
export { CacheService };

