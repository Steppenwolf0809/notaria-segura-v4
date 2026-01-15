/**
 * Servicio Generador de Encabezado Notarial
 * 
 * Genera una tabla estructurada con columnas alineadas para documentos notariales.
 * Output: Texto plano con formato de tabla.
 * 
 * Estructura:
 * - Título del acto (centrado)
 * - Sección OTORGANTES con columnas: NOMBRES | CÉDULA | CALIDAD
 * - Ubicación del inmueble
 * - Cuantía y Avalúo/Multa
 */

import { formatearDineroNotarial } from './notarial-text-service.js';

// Configuración de anchos de columna
const ANCHO_NOMBRE = 50;
const ANCHO_CEDULA = 20;
const ANCHO_CALIDAD = 25;
const ANCHO_TOTAL = 95;

// Mapeo de calidades con variación por género
const CALIDADES_GENERO = {
    'VENDEDOR': { M: 'VENDEDOR', F: 'VENDEDORA' },
    'COMPRADOR': { M: 'COMPRADOR', F: 'COMPRADORA' },
    'PROMITENTE_VENDEDOR': { M: 'PROMITENTE VENDEDOR', F: 'PROMITENTE VENDEDORA' },
    'PROMITENTE_COMPRADOR': { M: 'PROMITENTE COMPRADOR', F: 'PROMITENTE COMPRADORA' },
    'DONANTE': { M: 'DONANTE', F: 'DONANTE' },
    'DONATARIO': { M: 'DONATARIO', F: 'DONATARIA' },
    'DEUDOR': { M: 'DEUDOR', F: 'DEUDORA' },
    'ACREEDOR': { M: 'ACREEDOR', F: 'ACREEDORA' },
    'PERMUTANTE': { M: 'PERMUTANTE', F: 'PERMUTANTE' },
    'PODERDANTE': { M: 'PODERDANTE', F: 'PODERDANTE' },
    'APODERADO': { M: 'APODERADO', F: 'APODERADA' },
    'DEUDOR_HIPOTECARIO': { M: 'DEUDOR HIPOTECARIO', F: 'DEUDORA HIPOTECARIA' },
    'ACREEDOR_HIPOTECARIO': { M: 'ACREEDOR HIPOTECARIO', F: 'ACREEDORA HIPOTECARIA' },
    'COMPARECIENTE': { M: 'COMPARECIENTE', F: 'COMPARECIENTE' },
    'GARANTE': { M: 'GARANTE', F: 'GARANTE' },
    'FIADOR': { M: 'FIADOR', F: 'FIADORA' },
    'CEDENTE': { M: 'CEDENTE', F: 'CEDENTE' },
    'CESIONARIO': { M: 'CESIONARIO', F: 'CESIONARIA' }
};

// Tipos de acto que NO requieren encabezado (actas de reconocimiento)
const TIPOS_SIN_ENCABEZADO = ['VENTA_VEHICULO', 'RECONOCIMIENTO_VEHICULO'];

/**
 * Genera espacios en blanco
 * @param {number} n - Cantidad de espacios
 * @returns {string}
 */
function espacios(n) {
    return ' '.repeat(Math.max(0, n));
}

/**
 * Centra un texto en un ancho determinado
 * @param {string} texto - Texto a centrar
 * @param {number} ancho - Ancho total
 * @returns {string}
 */
function centrarTexto(texto, ancho) {
    const espaciosIzq = Math.floor((ancho - texto.length) / 2);
    return espacios(espaciosIzq) + texto;
}

/**
 * Formatea la calidad según el género de la persona
 * @param {string} calidad - Calidad original (VENDEDOR, COMPRADOR, etc.)
 * @param {string} genero - Género: 'M' o 'F'
 * @returns {string}
 */
export function formatearCalidad(calidad, genero) {
    const config = CALIDADES_GENERO[calidad];
    if (!config) {
        // Si no está en el mapeo, devolver la calidad original formateada
        return calidad.replace(/_/g, ' ');
    }
    return config[genero] || config['M'];
}

/**
 * Genera el título del acto formateado
 * @param {string} tipoActo - Tipo de acto (COMPRAVENTA, PROMESA_COMPRAVENTA, etc.)
 * @returns {string}
 */
function generarTituloActo(tipoActo) {
    const titulo = tipoActo.replace(/_/g, ' ');
    return centrarTexto(titulo, ANCHO_TOTAL);
}

/**
 * Genera la sección de otorgantes con columnas alineadas
 * @param {Array} participantes - Lista de participantes del protocolo
 * @returns {string}
 */
function generarSeccionOtorgantes(participantes) {
    let output = '';

    // Header de la sección
    output += centrarTexto('OTORGANTES:', ANCHO_TOTAL) + '\n';

    // Header de columnas
    const headerNombres = 'APELLIDOS Y NOMBRES';
    const headerCedula = 'CEDULA';
    const headerCalidad = 'CALIDAD';

    output += headerNombres + espacios(ANCHO_NOMBRE - headerNombres.length);
    output += headerCedula + espacios(ANCHO_CEDULA - headerCedula.length);
    output += headerCalidad + '\n\n';

    // Filas de participantes
    for (const p of participantes) {
        // Obtener nombre completo
        let nombre = '';
        if (p.persona) {
            if (p.persona.tipoPersona === 'NATURAL') {
                const datos = p.persona.datosPersonaNatural?.datosPersonales || {};
                nombre = `${datos.apellidos || ''} ${datos.nombres || ''}`.trim().toUpperCase();
            } else {
                // Persona jurídica - usar razón social
                nombre = (p.persona.datosPersonaJuridica?.compania?.razonSocial || '').toUpperCase();
            }
        }

        // Si no hay nombre, usar cédula como identificador
        if (!nombre) {
            nombre = p.nombreTemporal || `CÉDULA: ${p.personaCedula}`;
        }

        const cedula = p.personaCedula || '';

        // Obtener género para formatear calidad
        let genero = 'M';
        if (p.persona?.tipoPersona === 'NATURAL') {
            genero = p.persona.datosPersonaNatural?.datosPersonales?.genero || 'M';
        } else if (p.persona?.tipoPersona === 'JURIDICA') {
            // Para persona jurídica, usar género del representante legal
            genero = p.persona.datosPersonaJuridica?.representanteLegal?.genero || 'M';
        }

        const calidad = formatearCalidad(p.calidad, genero);

        // Truncar nombre si es muy largo
        const nombreTruncado = nombre.length > ANCHO_NOMBRE - 2
            ? nombre.substring(0, ANCHO_NOMBRE - 5) + '...'
            : nombre;

        output += nombreTruncado + espacios(ANCHO_NOMBRE - nombreTruncado.length);
        output += cedula + espacios(ANCHO_CEDULA - cedula.length);
        output += calidad + '\n';
    }

    return output;
}

/**
 * Genera la sección de ubicación del inmueble
 * @param {Object} protocolo - Datos del protocolo
 * @returns {string}
 */
function generarUbicacionInmueble(protocolo) {
    let output = '\n' + centrarTexto('UBICACIÓN DEL INMUEBLE:', ANCHO_TOTAL) + '\n\n';

    // Descripción del inmueble
    let ubicacion = protocolo.ubicacionDescripcion || protocolo.bienInmuebleDescripcion || '';

    // Agregar parroquia, cantón, provincia si existen
    const partes = [];
    if (protocolo.ubicacionParroquia) partes.push(`PARROQUIA ${protocolo.ubicacionParroquia}`);
    if (protocolo.ubicacionCanton) partes.push(`CANTÓN ${protocolo.ubicacionCanton}`);
    if (protocolo.ubicacionProvincia) partes.push(`PROVINCIA DE ${protocolo.ubicacionProvincia}`);

    if (partes.length > 0) {
        if (ubicacion) {
            ubicacion += ', ';
        }
        ubicacion += partes.join(', ');
    }

    // Si no hay ubicación definida, usar ubicación legacy
    if (!ubicacion && protocolo.bienInmuebleUbicacion) {
        ubicacion = protocolo.bienInmuebleUbicacion;
    }

    output += ubicacion || 'A DEFINIR';

    return output;
}

/**
 * Formatea un valor monetario para el encabezado
 * @param {number|string} valor - Valor a formatear
 * @returns {string}
 */
function formatearMoneda(valor) {
    if (!valor && valor !== 0) return '0.00';
    const num = parseFloat(valor);
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Genera la sección de cuantía y avalúo/multa
 * @param {Object} protocolo - Datos del protocolo
 * @returns {string}
 */
function generarCuantia(protocolo) {
    let output = '\n\n';

    // Cuantía (valor del contrato)
    const cuantia = `CUANTÍA: USD $ ${formatearMoneda(protocolo.valorContrato)}`;
    output += centrarTexto(cuantia, ANCHO_TOTAL) + '\n';

    // Avalúo o Multa según tipo de acto
    if (protocolo.tipoActo === 'PROMESA_COMPRAVENTA' && protocolo.multa) {
        const multa = `MULTA: USD $ ${formatearMoneda(protocolo.multa)}`;
        output += centrarTexto(multa, ANCHO_TOTAL) + '\n';
    } else if (protocolo.avaluoMunicipal) {
        const avaluo = `AVALÚO: USD $ ${formatearMoneda(protocolo.avaluoMunicipal)}`;
        output += centrarTexto(avaluo, ANCHO_TOTAL) + '\n';
    }

    return output;
}

/**
 * Genera el encabezado completo del protocolo
 * 
 * @param {Object} protocolo - Datos del protocolo UAFE
 * @param {Array} participantes - Lista de PersonaProtocolo con datos de persona
 * @returns {Object} - { success, encabezado, error }
 */
export function generarEncabezado(protocolo, participantes) {
    try {
        // Verificar si el tipo de acto requiere encabezado
        if (TIPOS_SIN_ENCABEZADO.includes(protocolo.tipoActo)) {
            return {
                success: false,
                encabezado: null,
                error: `El tipo de acto ${protocolo.tipoActo} no requiere encabezado (es un acta de reconocimiento)`
            };
        }

        // Verificar que hay participantes
        if (!participantes || participantes.length === 0) {
            return {
                success: false,
                encabezado: null,
                error: 'No hay participantes en el protocolo'
            };
        }

        let output = '';

        // 1. Título del acto
        output += generarTituloActo(protocolo.tipoActo || protocolo.actoContrato || 'COMPRAVENTA');
        output += '\n\n';

        // 2. Sección de otorgantes
        output += generarSeccionOtorgantes(participantes);

        // 3. Ubicación del inmueble (solo si no es vehículo)
        output += generarUbicacionInmueble(protocolo);

        // 4. Cuantía y Avalúo/Multa
        output += generarCuantia(protocolo);

        return {
            success: true,
            encabezado: output.trim(),
            error: null
        };

    } catch (error) {
        console.error('Error generando encabezado:', error);
        return {
            success: false,
            encabezado: null,
            error: error.message
        };
    }
}

export default {
    generarEncabezado,
    formatearCalidad,
    TIPOS_SIN_ENCABEZADO
};
