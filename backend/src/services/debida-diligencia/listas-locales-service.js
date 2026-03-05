/**
 * Local Control Lists Service
 * Handles: PEPs, Sentenciados, Observados, Providencias, Más Buscados,
 *          Empresas Fantasmas, Homónimos
 * 
 * Reads from JSON seed files in backend/src/data/listas-control/
 * Provides fuzzy name matching + exact ID matching
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data/listas-control');

// In-memory caches
const listCaches = {};
const cacheTimestamps = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (local files change rarely)

function normalize(str) {
    if (!str) return '';
    return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9\s]/g, '')
        .trim();
}

/**
 * Load a JSON list file, with in-memory caching
 */
function loadList(filename) {
    const now = Date.now();
    if (listCaches[filename] && (now - (cacheTimestamps[filename] || 0)) < CACHE_TTL_MS) {
        return listCaches[filename];
    }

    const filePath = path.join(DATA_DIR, filename);
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`[LISTAS] File not found: ${filename}`);
            return [];
        }
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        listCaches[filename] = Array.isArray(data) ? data : [];
        cacheTimestamps[filename] = now;
        return listCaches[filename];
    } catch (e) {
        console.error(`[LISTAS] Error loading ${filename}:`, e.message);
        return [];
    }
}

/**
 * Generic search in a local list
 * @param {Array} list - The list of records
 * @param {string} identificacion - CI/RUC to match
 * @param {string} nombre - Name to match (fuzzy)
 * @returns {Array} - Matching records
 */
function searchInList(list, identificacion, nombre = '') {
    const normalizedId = (identificacion || '').replace(/[-\s]/g, '');
    const normalizedNombre = normalize(nombre);
    const matches = [];

    for (const record of list) {
        let matched = false;

        // Exact ID match
        const recordId = (record.identificacion || record.ruc || record.cedula || '').replace(/[-\s]/g, '');
        if (normalizedId && recordId && recordId === normalizedId) {
            matched = true;
        }

        // Name match (all words of query must appear in record name)
        if (!matched && normalizedNombre && normalizedNombre.length > 3) {
            const recordNombre = normalize(record.nombres || record.nombre || record.razonSocial || '');
            if (recordNombre) {
                const searchWords = normalizedNombre.split(/\s+/).filter(w => w.length > 2);
                const nameWords = recordNombre.split(/\s+/);
                const allWordsFound = searchWords.every(sw =>
                    nameWords.some(nw => nw.includes(sw) || sw.includes(nw))
                );
                if (allWordsFound && searchWords.length >= 2) {
                    matched = true;
                }
            }
        }

        if (matched) {
            matches.push(record);
        }
    }

    return matches;
}

// ============================================
// Individual list search functions
// ============================================

/**
 * Search PEPs (Personas Expuestas Políticamente)
 */
export function searchPEPs(identificacion, nombre = '') {
    const list = loadList('peps.json');
    const matches = searchInList(list, identificacion, nombre);
    return {
        match: matches.length > 0,
        detalles: matches.map(m => ({
            nombres: m.nombres || m.nombre,
            cargo: m.cargo,
            institucion: m.institucion,
            fechaDesignacion: m.fechaDesignacion,
            estado: m.estado || 'ACTIVO'
        }))
    };
}

/**
 * Search Sentenciados (convicted persons)
 */
export function searchSentenciados(identificacion, nombre = '') {
    const list = loadList('sentenciados.json');
    const matches = searchInList(list, identificacion, nombre);
    return {
        match: matches.length > 0,
        detalles: matches.map(m => ({
            nombres: m.nombres || m.nombre,
            delito: m.delito,
            sentencia: m.sentencia,
            juzgado: m.juzgado,
            fecha: m.fecha
        }))
    };
}

/**
 * Search Observados (watched persons)
 */
export function searchObservados(identificacion, nombre = '') {
    const list = loadList('observados.json');
    const matches = searchInList(list, identificacion, nombre);
    return {
        match: matches.length > 0,
        detalles: matches.map(m => ({
            nombres: m.nombres || m.nombre,
            motivo: m.motivo,
            entidad: m.entidad,
            fecha: m.fecha
        }))
    };
}

/**
 * Search Providencias (judicial orders / providencias)
 */
export function searchProvidencias(identificacion, nombre = '') {
    const list = loadList('providencias.json');
    const matches = searchInList(list, identificacion, nombre);

    // Flatten registros from matching records
    const detalles = [];
    for (const m of matches) {
        if (m.registros && Array.isArray(m.registros)) {
            for (const r of m.registros) {
                detalles.push({
                    nombres: m.nombres || m.nombre,
                    fecha: r.fecha,
                    ciudad: r.ciudad,
                    accion: r.accion,
                    valor: r.valor,
                    nroJuicio: r.nroJuicio,
                    entidad: r.entidad,
                    tipo: r.tipo
                });
            }
        } else {
            detalles.push({
                nombres: m.nombres || m.nombre,
                fecha: m.fecha,
                accion: m.accion,
                tipo: m.tipo
            });
        }
    }

    // Build summary categories
    const categorias = {};
    for (const d of detalles) {
        const tipo = d.tipo || 'OTRO';
        categorias[tipo] = (categorias[tipo] || 0) + 1;
    }

    return {
        match: detalles.length > 0,
        detalles,
        categorias
    };
}

/**
 * Search Empresas Fantasmas (ghost companies from SRI)
 */
export function searchEmpresasFantasmas(identificacion, nombre = '') {
    const list = loadList('empresas-fantasmas.json');
    const matches = searchInList(list, identificacion, nombre);
    return {
        match: matches.length > 0,
        detalles: matches.map(m => ({
            ruc: m.ruc || m.identificacion,
            razonSocial: m.razonSocial || m.nombres || m.nombre,
            estado: m.estado,
            resolucion: m.resolucion,
            fechaResolucion: m.fechaResolucion
        }))
    };
}

/**
 * Search Más Buscados (most wanted)
 */
export function searchMasBuscados(identificacion, nombre = '') {
    const list = loadList('mas-buscados.json');
    const matches = searchInList(list, identificacion, nombre);
    return {
        match: matches.length > 0,
        detalles: matches.map(m => ({
            nombres: m.nombres || m.nombre,
            delito: m.delito,
            recompensa: m.recompensa,
            entidadEmisora: m.entidadEmisora
        }))
    };
}

/**
 * Search Homónimos (homonyms — same name but different person)
 * This checks if the name appears in any list but with a DIFFERENT ID
 */
export function searchHomonimos(identificacion, nombre = '') {
    if (!nombre || !identificacion) {
        return { match: false, detalles: [] };
    }

    const normalizedId = identificacion.replace(/[-\s]/g, '');
    const normalizedNombre = normalize(nombre);
    const allLists = ['peps.json', 'sentenciados.json', 'observados.json', 'mas-buscados.json'];
    const matches = [];

    for (const filename of allLists) {
        const list = loadList(filename);
        for (const record of list) {
            const recordId = (record.identificacion || record.ruc || record.cedula || '').replace(/[-\s]/g, '');
            const recordNombre = normalize(record.nombres || record.nombre || '');

            // Same name but DIFFERENT ID = homónimo
            if (recordId && recordId !== normalizedId && recordNombre === normalizedNombre) {
                matches.push({
                    nombres: record.nombres || record.nombre,
                    lista: filename.replace('.json', ''),
                    nota: 'Homónimo detectado — misma coincidencia de nombre con diferente identificación'
                });
            }
        }
    }

    return {
        match: matches.length > 0,
        detalles: matches
    };
}

export default {
    searchPEPs,
    searchSentenciados,
    searchObservados,
    searchProvidencias,
    searchEmpresasFantasmas,
    searchMasBuscados,
    searchHomonimos
};
