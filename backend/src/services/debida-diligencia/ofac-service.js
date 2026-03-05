/**
 * OFAC SDN List Service
 * Downloads and parses the OFAC Specially Designated Nationals (SDN) list
 * Source: https://www.treasury.gov/ofac/downloads/sdn.csv
 * Caches locally for 24h to avoid repeated downloads
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SDN_URL = 'https://www.treasury.gov/ofac/downloads/sdn.csv';
const CACHE_FILE = path.join(__dirname, '../../data/listas-control/.cache/ofac-sdn.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let sdnCache = null;
let lastFetchTime = 0;

/**
 * Normalize a string for comparison (uppercase, remove accents, trim)
 */
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
 * Parse the SDN CSV lines into structured records
 * CSV format: ent_num, SDN_Name, SDN_Type, Program, Title, Call_Sign, Vess_type, Tonnage, GRT, Vess_flag, Vess_owner, Remarks
 */
function parseSDNCSV(csvText) {
    const lines = csvText.split('\n');
    const records = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        // Basic CSV parsing (OFAC CSV uses quoted fields)
        const parts = line.split('","').map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length < 3) continue;

        const [entNum, sdnName, sdnType, program, title, , , , , , , remarks] = parts;

        // Extract ID numbers from remarks (e.g., "DOC #: CE-1309022935")
        const idMatches = (remarks || '').match(/(?:DOC\s*#?\s*[:=]?\s*|ID\s*[:=]?\s*|Cedula\s*No\.?\s*[:=]?\s*|PASSPORT\s*[:=]?\s*|C\.?I\.?\s*[:=]?\s*)([A-Z0-9-]+)/gi) || [];
        const idNumbers = idMatches.map(m => {
            const match = m.match(/([A-Z0-9-]+)$/i);
            return match ? match[1].replace(/-/g, '') : '';
        }).filter(Boolean);

        records.push({
            entNum: entNum?.trim(),
            nombre: sdnName?.trim(),
            tipo: sdnType?.trim(),
            programa: program?.trim(),
            titulo: title?.trim(),
            remarks: remarks?.trim(),
            idNumbers,
            nombreNormalizado: normalize(sdnName)
        });
    }

    return records;
}

/**
 * Fetch and cache the SDN list
 */
async function fetchSDNList() {
    const now = Date.now();

    // Return cached if still valid
    if (sdnCache && (now - lastFetchTime) < CACHE_TTL_MS) {
        return sdnCache;
    }

    // Try to load from file cache
    try {
        const cacheDir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        if (fs.existsSync(CACHE_FILE)) {
            const stat = fs.statSync(CACHE_FILE);
            if ((now - stat.mtimeMs) < CACHE_TTL_MS) {
                const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
                sdnCache = data;
                lastFetchTime = now;
                console.log(`[OFAC] Loaded ${data.length} records from file cache`);
                return data;
            }
        }
    } catch (e) {
        console.warn('[OFAC] Cache read error:', e.message);
    }

    // Fetch fresh from OFAC
    try {
        console.log('[OFAC] Downloading SDN list from treasury.gov...');
        const response = await fetch(SDN_URL, {
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();
        const records = parseSDNCSV(csvText);

        // Save to file cache
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(records), 'utf-8');
        } catch (e) {
            console.warn('[OFAC] Cache write error:', e.message);
        }

        sdnCache = records;
        lastFetchTime = now;
        console.log(`[OFAC] Loaded ${records.length} records from treasury.gov`);
        return records;
    } catch (e) {
        console.error('[OFAC] Fetch error:', e.message);

        // Fallback to stale cache if available
        if (sdnCache) {
            console.warn('[OFAC] Using stale cache');
            return sdnCache;
        }

        return [];
    }
}

/**
 * Search the OFAC SDN list by identification number and/or name
 * @param {string} identificacion - CI/RUC/Passport number
 * @param {string} nombre - Person's name (optional)
 * @returns {{ match: boolean, detalles: Array }}
 */
export async function searchOFAC(identificacion, nombre = '') {
    try {
        const records = await fetchSDNList();
        const normalizedId = (identificacion || '').replace(/[-\s]/g, '');
        const normalizedNombre = normalize(nombre);
        const matches = [];

        for (const record of records) {
            let matched = false;

            // Check by ID number
            if (normalizedId && record.idNumbers.some(id => id.includes(normalizedId) || normalizedId.includes(id))) {
                matched = true;
            }

            // Check by name (fuzzy: all words of the search name must appear)
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
                    programa: record.programa,
                    titulo: record.titulo,
                    observaciones: record.remarks
                });
            }
        }

        return {
            match: matches.length > 0,
            detalles: matches
        };
    } catch (e) {
        console.error('[OFAC] Search error:', e.message);
        return { match: false, detalles: [], error: e.message };
    }
}

export default { searchOFAC };
