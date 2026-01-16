/**
 * Configuración de rangos de documentos por libro y año
 * 
 * Estructura del código de barras: AAAANNNNNNNTXXXXX
 * - AAAA = Año (2025, 2026)
 * - NNNNNNN = Código notaría: 1701018
 * - T = Tipo de libro (A, C, D, P, O)
 * - XXXXX = Número secuencial (5 dígitos)
 */

export const CONFIG = {
    // Código fijo de la notaría
    CODIGO_NOTARIA: '1701018',

    // Período de análisis
    FECHA_INICIO: '2025-11-12',
    FECHA_FIN: '2026-01-14',

    // Rangos por libro y año
    RANGOS: {
        // Arrendamientos
        A: {
            nombre: 'Arrendamientos',
            2025: { inicio: 100, fin: 115 },
            2026: { inicio: 1, fin: 3 }
        },

        // Certificaciones
        C: {
            nombre: 'Certificaciones',
            2025: { inicio: 2505, fin: 2802 },
            2026: { inicio: 1, fin: 74 }
        },

        // Diligencias
        D: {
            nombre: 'Diligencias',
            2025: { inicio: 1338, fin: 1486 },
            2026: { inicio: 1, fin: 34 }
        },

        // Protocolo
        P: {
            nombre: 'Protocolo',
            2025: { inicio: 2629, fin: 3062 },
            2026: { inicio: 1, fin: 74 }
        },

        // Otros
        O: {
            nombre: 'Otros',
            2025: { inicio: 1570, fin: 1780 },
            2026: { inicio: 1, fin: 57 }
        }
    }
};

/**
 * Genera el código de barras completo
 */
export function generarCodigoBarras(anio, tipoLibro, numeroSecuencial) {
    const numeroStr = String(numeroSecuencial).padStart(5, '0');
    return `${anio}${CONFIG.CODIGO_NOTARIA}${tipoLibro}${numeroStr}`;
}

/**
 * Extrae componentes del código de barras
 */
export function parsearCodigoBarras(codigoBarras) {
    if (!codigoBarras || codigoBarras.length !== 17) {
        return null;
    }

    return {
        anio: parseInt(codigoBarras.substring(0, 4)),
        codigoNotaria: codigoBarras.substring(4, 11),
        tipoLibro: codigoBarras.substring(11, 12),
        numeroSecuencial: parseInt(codigoBarras.substring(12, 17))
    };
}
