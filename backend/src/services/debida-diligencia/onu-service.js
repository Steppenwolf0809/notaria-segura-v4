/**
 * ONU Consolidated Sanctions List Service
 * Downloads and parses the UN consolidated sanctions XML
 * Source: https://scsanctions.un.org/resources/xml/en/consolidated.xml
 * Caches locally for 24h
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UN_URL = 'https://scsanctions.un.org/resources/xml/en/consolidated.xml';
const CACHE_FILE = path.join(__dirname, '../../data/listas-control/.cache/onu-sanctions.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

let onuCache = null;
let lastFetchTime = 0;

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
 * Parse the UN XML into structured records
 */
async function parseONUXML(xmlText) {
    const records = [];

    try {
        const result = await parseStringPromise(xmlText, {
            explicitArray: false,
            ignoreAttrs: false
        });

        // The UN consolidated list has INDIVIDUALS and ENTITIES
        const consolidated = result?.CONSOLIDATED_LIST;
        if (!consolidated) return records;

        const individuals = consolidated?.INDIVIDUALS?.INDIVIDUAL;
        const entities = consolidated?.ENTITIES?.ENTITY;

        // Process individuals
        const indArray = Array.isArray(individuals) ? individuals : (individuals ? [individuals] : []);
        for (const ind of indArray) {
            const firstName = ind?.FIRST_NAME || '';
            const secondName = ind?.SECOND_NAME || '';
            const thirdName = ind?.THIRD_NAME || '';
            const fourthName = ind?.FOURTH_NAME || '';
            const fullName = [firstName, secondName, thirdName, fourthName].filter(Boolean).join(' ');

            // Extract document numbers
            const docs = ind?.INDIVIDUAL_DOCUMENT;
            const docArray = Array.isArray(docs) ? docs : (docs ? [docs] : []);
            const idNumbers = docArray
                .map(d => (d?.NUMBER || '').replace(/[-\s]/g, ''))
                .filter(Boolean);

            // Extract nationality
            const nat = ind?.NATIONALITY?.VALUE || '';

            records.push({
                tipo: 'INDIVIDUAL',
                nombre: fullName.trim(),
                nombreNormalizado: normalize(fullName),
                listaReferencia: ind?.$.LIST_REF || '',
                nacionalidad: nat,
                idNumbers,
                designacion: ind?.DESIGNATION?.VALUE || '',
                comentarios: ind?.COMMENTS1 || ''
            });
        }

        // Process entities
        const entArray = Array.isArray(entities) ? entities : (entities ? [entities] : []);
        for (const ent of entArray) {
            const name = ent?.FIRST_NAME || '';

            records.push({
                tipo: 'ENTITY',
                nombre: name.trim(),
                nombreNormalizado: normalize(name),
                listaReferencia: ent?.$.LIST_REF || '',
                nacionalidad: '',
                idNumbers: [],
                designacion: '',
                comentarios: ent?.COMMENTS1 || ''
            });
        }
    } catch (e) {
        console.error('[ONU] XML parse error:', e.message);
    }

    return records;
}

/**
 * Fetch and cache the ONU sanctions list
 */
async function fetchONUList() {
    const now = Date.now();

    if (onuCache && (now - lastFetchTime) < CACHE_TTL_MS) {
        return onuCache;
    }

    // Try file cache
    try {
        const cacheDir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        if (fs.existsSync(CACHE_FILE)) {
            const stat = fs.statSync(CACHE_FILE);
            if ((now - stat.mtimeMs) < CACHE_TTL_MS) {
                const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
                onuCache = data;
                lastFetchTime = now;
                console.log(`[ONU] Loaded ${data.length} records from file cache`);
                return data;
            }
        }
    } catch (e) {
        console.warn('[ONU] Cache read error:', e.message);
    }

    // Fetch fresh
    try {
        console.log('[ONU] Downloading UN consolidated sanctions list...');
        const response = await fetch(UN_URL, {
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlText = await response.text();
        const records = await parseONUXML(xmlText);

        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(records), 'utf-8');
        } catch (e) {
            console.warn('[ONU] Cache write error:', e.message);
        }

        onuCache = records;
        lastFetchTime = now;
        console.log(`[ONU] Loaded ${records.length} records`);
        return records;
    } catch (e) {
        console.error('[ONU] Fetch error:', e.message);
        if (onuCache) return onuCache;
        return [];
    }
}

/**
 * Search ONU sanctions list
 * @param {string} identificacion
 * @param {string} nombre
 * @returns {{ match: boolean, detalles: Array }}
 */
export async function searchONU(identificacion, nombre = '') {
    try {
        const records = await fetchONUList();
        const normalizedId = (identificacion || '').replace(/[-\s]/g, '');
        const normalizedNombre = normalize(nombre);
        const matches = [];

        for (const record of records) {
            let matched = false;

            // Match by doc number
            if (normalizedId && record.idNumbers.some(id => id.includes(normalizedId) || normalizedId.includes(id))) {
                matched = true;
            }

            // Match by name
            if (!matched && normalizedNombre && normalizedNombre.length > 3) {
                const searchWords = normalizedNombre.split(/\s+/).filter(w => w.length > 2);
                const nameWords = record.nombreNormalizado.split(/\s+/);
                const allWordsFound = searchWords.every(sw =>
                    nameWords.some(nw => nw.includes(sw) || sw.includes(nw))
                );
                if (allWordsFound && searchWords.length >= 2) {
                    matched = true;
                }
            }

            if (matched) {
                matches.push({
                    nombre: record.nombre,
                    tipo: record.tipo,
                    listaReferencia: record.listaReferencia,
                    nacionalidad: record.nacionalidad,
                    comentarios: record.comentarios
                });
            }
        }

        return { match: matches.length > 0, detalles: matches };
    } catch (e) {
        console.error('[ONU] Search error:', e.message);
        return { match: false, detalles: [], error: e.message };
    }
}

export default { searchONU };
