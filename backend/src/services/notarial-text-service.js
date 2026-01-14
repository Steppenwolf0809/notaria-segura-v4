/**
 * Servicio de Conversión a Formato Notarial
 * 
 * Convierte números, fechas y textos a formato notarial ecuatoriano
 * para su uso en documentos legales.
 */

// Mapeo de números a letras
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const ESPECIALES = {
    10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
    16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve'
};

const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MESES = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

// Tabla de abreviaturas de direcciones
const ABREVIATURAS = {
    'av.': 'Avenida',
    'av': 'Avenida',
    'calle': 'calle',
    'c.': 'calle',
    'nro.': 'número',
    'nro': 'número',
    'no.': 'número',
    'n°': 'número',
    '#': 'número',
    'n.': 'número',
    'urb.': 'Urbanización',
    'conj.': 'Conjunto',
    'edif.': 'Edificio',
    'dept.': 'Departamento',
    'dpto.': 'Departamento',
    'km.': 'kilómetro',
    'km': 'kilómetro',
    'oe': 'OE',
    's/n': 'sin número',
    'esq.': 'esquina',
    'int.': 'interior',
    'loc.': 'local',
    'piso': 'piso',
    'mz.': 'Manzana',
    'mz': 'Manzana',
    'lt.': 'Lote',
    'lt': 'Lote',
    'villa': 'Villa',
    'sector': 'sector',
    'barrio': 'Barrio',
    'cdla.': 'Ciudadela',
    'cdla': 'Ciudadela'
};

/**
 * Convierte un número de 0-99 a letras
 */
function convertirMenorACien(numero) {
    if (numero < 10) return UNIDADES[numero];
    if (numero >= 10 && numero < 20) return ESPECIALES[numero];

    const decena = Math.floor(numero / 10);
    const unidad = numero % 10;

    if (unidad === 0) return DECENAS[decena];
    if (decena === 2) return 'veinti' + UNIDADES[unidad];

    return DECENAS[decena] + ' y ' + UNIDADES[unidad];
}

/**
 * Convierte un número de 0-999 a letras
 */
function convertirMenorAMil(numero) {
    if (numero < 100) return convertirMenorACien(numero);

    const centena = Math.floor(numero / 100);
    const resto = numero % 100;

    let texto = '';
    if (centena === 1) {
        texto = resto === 0 ? 'cien' : 'ciento';
    } else if (centena === 5) {
        texto = 'quinientos';
    } else if (centena === 7) {
        texto = 'setecientos';
    } else if (centena === 9) {
        texto = 'novecientos';
    } else {
        texto = UNIDADES[centena] + 'cientos';
    }

    if (resto > 0) {
        texto += ' ' + convertirMenorACien(resto);
    }

    return texto;
}

/**
 * Convierte un número completo a letras
 */
function numeroALetras(numero) {
    if (numero === 0) return 'cero';
    if (numero < 1000) return convertirMenorAMil(numero);

    const miles = Math.floor(numero / 1000);
    const resto = numero % 1000;

    let texto = '';
    if (miles === 1) {
        texto = 'mil';
    } else {
        texto = convertirMenorAMil(miles) + ' mil';
    }

    if (resto > 0) {
        texto += ' ' + convertirMenorAMil(resto);
    }

    return texto;
}

/**
 * Convierte número a formato notarial según el tipo
 * 
 * @param {string|number} numero - Número a convertir
 * @param {string} tipo - Tipo: "cedula", "telefono", "direccion", "dinero"
 * @returns {string} - Número en formato notarial
 */
export function convertirNumeroALetras(numero, tipo = 'direccion') {
    if (!numero) return '';

    const numeroStr = String(numero).trim();

    switch (tipo) {
        case 'cedula':
        case 'telefono':
            // Dígito por dígito
            return numeroStr
                .split('')
                .map(digito => {
                    if (digito === '0') return 'cero';
                    if (digito >= '1' && digito <= '9') return UNIDADES[parseInt(digito)];
                    return digito;
                })
                .join(' ') + ` (${numeroStr})`;

        case 'direccion':
            // Manejar casos especiales como "N70-294"
            if (/^[A-Z]\d/.test(numeroStr)) {
                // Formato: N70-294
                const partes = numeroStr.match(/^([A-Z]+)(\d+)-?(\d+)?$/);
                if (partes) {
                    const letra = partes[1];
                    const num1 = parseInt(partes[2]);
                    const num2 = partes[3] ? parseInt(partes[3]) : null;

                    let resultado = letra + ' ' + numeroALetras(num1);
                    if (num2) {
                        resultado += ' guion ' + numeroALetras(num2);
                    }
                    resultado += ` (${numeroStr})`;
                    return resultado;
                }
            }

            // Manejar formato "64-204"
            if (numeroStr.includes('-')) {
                const partes = numeroStr.split('-');
                if (partes.length === 2 && /^\d+$/.test(partes[0]) && /^\d+$/.test(partes[1])) {
                    const num1 = parseInt(partes[0]);
                    const num2 = parseInt(partes[1]);
                    return `${numeroALetras(num1)} guion ${numeroALetras(num2)} (${numeroStr})`;
                }
            }

            // Número simple
            const num = parseInt(numeroStr.replace(/\D/g, ''));
            if (!isNaN(num)) {
                return `${numeroALetras(num)} (${numeroStr})`;
            }

            return numeroStr;

        case 'dinero':
            const monto = parseFloat(numeroStr.replace(/[^\d.]/g, ''));
            if (isNaN(monto)) return numeroStr;

            const entero = Math.floor(monto);
            const centavos = Math.round((monto - entero) * 100);

            let texto = numeroALetras(entero);
            if (centavos > 0) {
                texto += ` con ${numeroALetras(centavos)} centavos`;
            }
            texto += ` (${monto.toFixed(2)})`;

            return texto;

        default:
            return numeroStr;
    }
}

/**
 * Convierte fecha a formato notarial
 * "MIÉRCOLES TRES (03) DE SEPTIEMBRE DEL DOS MIL VEINTICINCO (2025)"
 * 
 * @param {Date|string} fecha - Fecha a convertir
 * @returns {string} - Fecha en formato notarial
 */
export function convertirFechaNotarial(fecha) {
    let date;

    if (fecha instanceof Date) {
        date = fecha;
    } else if (typeof fecha === 'string') {
        // Si es string, parsearlo considerando zona horaria de Ecuador (GMT-5)
        // Para evitar problemas de timezone, usar la fecha directamente sin convertir a UTC
        const partes = fecha.split(/[-T]/);
        if (partes.length >= 3) {
            date = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        } else {
            date = new Date(fecha);
        }
    } else {
        date = new Date(fecha);
    }

    if (isNaN(date.getTime())) {
        throw new Error('Fecha inválida');
    }

    const diaSemana = DIAS_SEMANA[date.getDay()];
    const dia = date.getDate();
    const mes = MESES[date.getMonth()];
    const anio = date.getFullYear();

    // Convertir año a letras
    const miles = Math.floor(anio / 1000);
    const restoAnio = anio % 1000;

    let anioLetras = 'dos mil';
    if (restoAnio > 0) {
        anioLetras += ' ' + numeroALetras(restoAnio);
    }

    const diaLetras = numeroALetras(dia);
    const diaNum = String(dia).padStart(2, '0');

    return `${diaSemana} ${diaLetras.toUpperCase()} (${diaNum}) DE ${mes} DEL ${anioLetras.toUpperCase()} (${anio})`;
}

/**
 * Expande abreviaturas en direcciones
 * 
 * @param {string} texto - Texto con posibles abreviaturas
 * @returns {string} - Texto con abreviaturas expandidas
 */
export function expandirAbreviaturasDireccion(texto) {
    if (!texto) return '';

    let resultado = texto;

    // Ordenar por longitud descendente para evitar reemplazos parciales
    const abrevOrdenadas = Object.keys(ABREVIATURAS).sort((a, b) => b.length - a.length);

    for (const abrev of abrevOrdenadas) {
        const expansion = ABREVIATURAS[abrev];
        // Buscar la abreviatura con word boundaries
        // Escapar el punto en la regex
        const abrevEscaped = abrev.replace(/\./g, '\\.');
        const regex = new RegExp('\\b' + abrevEscaped + '(?=\\s|$)', 'gi');
        resultado = resultado.replace(regex, expansion);
    }

    return resultado;
}

/**
 * Formatea dirección completa a formato notarial
 * 
 * @param {Object} direccion - Objeto con campos de dirección
 * @param {string} direccion.callePrincipal
 * @param {string} direccion.numero
 * @param {string} direccion.calleSecundaria
 * @param {string} direccion.parroquia
 * @param {string} direccion.canton
 * @param {string} direccion.provincia
 * @returns {string} - Dirección formateada
 */
export function formatearDireccionNotarial(direccion) {
    if (!direccion) return '';

    const partes = [];

    // Calle principal
    if (direccion.callePrincipal) {
        let calle = expandirAbreviaturasDireccion(direccion.callePrincipal);
        partes.push(`en la ${calle}`);
    }

    // Número
    if (direccion.numero) {
        const numeroFormateado = convertirNumeroALetras(direccion.numero, 'direccion');
        partes.push(`número ${numeroFormateado}`);
    }

    // Calle secundaria
    if (direccion.calleSecundaria) {
        let calleSecundaria = expandirAbreviaturasDireccion(direccion.calleSecundaria);
        partes.push(`y ${calleSecundaria}`);
    }

    // Ubicación geográfica
    const ubicacion = [];
    if (direccion.parroquia) ubicacion.push(`Parroquia ${direccion.parroquia}`);
    if (direccion.canton) ubicacion.push(`Cantón ${direccion.canton}`);
    if (direccion.provincia) ubicacion.push(`Provincia de ${direccion.provincia}`);

    if (ubicacion.length > 0) {
        partes.push(ubicacion.join(', '));
    }

    return partes.join(', ');
}

/**
 * Formatea teléfono a formato notarial (dígito por dígito)
 * 
 * @param {string} telefono - Número de teléfono
 * @returns {string} - Teléfono formateado
 */
export function formatearTelefonoNotarial(telefono) {
    if (!telefono) return '';
    return convertirNumeroALetras(telefono, 'telefono');
}

/**
 * Formatea monto de dinero a formato notarial
 * 
 * @param {number|string} monto - Monto a formatear
 * @returns {string} - Monto formateado
 */
export function formatearDineroNotarial(monto) {
    if (!monto) return '';
    return convertirNumeroALetras(monto, 'dinero');
}

export default {
    convertirNumeroALetras,
    convertirFechaNotarial,
    expandirAbreviaturasDireccion,
    formatearDireccionNotarial,
    formatearTelefonoNotarial,
    formatearDineroNotarial
};
