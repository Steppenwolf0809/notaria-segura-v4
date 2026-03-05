/**
 * INTERPOL Red Notices API Service
 * Queries the INTERPOL public Red Notices API
 * API: https://ws-public.interpol.int/notices/v1/red
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
 * Search INTERPOL Red Notices by name
 * @param {string} identificacion - Not used directly by INTERPOL API
 * @param {string} nombre - Person's name to search
 * @returns {{ match: boolean, detalles: Array }}
 */
export async function searchINTERPOL(identificacion, nombre = '') {
    try {
        if (!nombre || nombre.trim().length < 3) {
            return { match: false, detalles: [] };
        }

        // Split name into parts for INTERPOL API (expects forename and name)
        const parts = nombre.trim().split(/\s+/);
        let forename = '';
        let familyName = '';

        if (parts.length >= 3) {
            // Typical EC format: LASTNAME1 LASTNAME2 FIRSTNAME1 FIRSTNAME2
            familyName = parts.slice(0, 2).join(' ');
            forename = parts.slice(2).join(' ');
        } else if (parts.length === 2) {
            familyName = parts[0];
            forename = parts[1];
        } else {
            familyName = parts[0];
        }

        const params = new URLSearchParams({
            resultPerPage: '20',
            page: '1'
        });

        if (forename) params.set('forename', forename);
        if (familyName) params.set('name', familyName);
        // INTERPOL API can filter by nationality
        params.set('nationality', 'EC');

        const url = `https://ws-public.interpol.int/notices/v1/red?${params.toString()}`;

        console.log(`[INTERPOL] Searching: ${url}`);
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
            if (response.status === 404) {
                return { match: false, detalles: [] };
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const notices = data?._embedded?.notices || [];

        if (notices.length === 0) {
            // Also try general (non-EC) search 
            params.delete('nationality');
            const url2 = `https://ws-public.interpol.int/notices/v1/red?${params.toString()}`;
            const response2 = await fetch(url2, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(15000)
            });

            if (response2.ok) {
                const data2 = await response2.json();
                const notices2 = data2?._embedded?.notices || [];

                const matches = notices2
                    .filter(n => {
                        const noticeNorm = normalize(`${n.name} ${n.forename}`);
                        const searchNorm = normalize(nombre);
                        const searchWords = searchNorm.split(/\s+/).filter(w => w.length > 2);
                        return searchWords.every(sw => noticeNorm.includes(sw));
                    })
                    .map(n => ({
                        nombre: `${n.forename} ${n.name}`.trim(),
                        nacionalidad: n.country_of_birth_id || '',
                        fechaNacimiento: n.date_of_birth || '',
                        entityId: n.entity_id || '',
                        link: n._links?.self?.href || ''
                    }));

                return { match: matches.length > 0, detalles: matches };
            }
        }

        const matches = notices.map(n => ({
            nombre: `${n.forename || ''} ${n.name || ''}`.trim(),
            nacionalidad: n.country_of_birth_id || '',
            fechaNacimiento: n.date_of_birth || '',
            entityId: n.entity_id || '',
            link: n._links?.self?.href || ''
        }));

        return { match: matches.length > 0, detalles: matches };
    } catch (e) {
        console.error('[INTERPOL] Search error:', e.message);
        return { match: false, detalles: [], error: e.message };
    }
}

export default { searchINTERPOL };
