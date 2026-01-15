/**
 * Servicio Generador de Comparecencia Notarial
 * 
 * Genera el texto de comparecencia con formato HTML para negritas.
 * 
 * Negritas aplicadas a:
 * - Fecha notarial completa
 * - Nombre de la notaria
 * - Nombres de todos los comparecientes
 * 
 * Maneja casos especiales:
 * - Cónyuges compareciendo juntos (sociedad conyugal/bienes)
 * - Apoderados (representación)
 * - Estados civiles diversos
 */

import {
    convertirNumeroALetras,
    convertirFechaNotarial,
    formatearDireccionNotarial,
    formatearTelefonoNotarial
} from './notarial-text-service.js';

// Tipos de acto que NO requieren comparecencia (actas de reconocimiento)
const TIPOS_SIN_COMPARECENCIA = ['VENTA_VEHICULO', 'RECONOCIMIENTO_VEHICULO'];

// Texto fijo de la notaria
const NOTARIA_TEXTO = 'DOCTORA GLENDA ZAPATA SILVA, NOTARIA DÉCIMA OCTAVA DEL CANTÓN QUITO';

/**
 * Aplica negritas según el formato solicitado
 * @param {string} texto - Texto a poner en negritas
 * @param {boolean} formatoHtml - Si usar HTML o texto plano
 * @returns {string}
 */
function negrita(texto, formatoHtml = true) {
    return formatoHtml ? `<strong>${texto}</strong>` : texto;
}

/**
 * Obtiene el tratamiento según género
 * @param {string} genero - 'M' o 'F'
 * @returns {string}
 */
function obtenerTratamiento(genero) {
    return genero === 'F' ? 'la señora' : 'el señor';
}

/**
 * Obtiene el tratamiento plural para cónyuges
 * @returns {string}
 */
function obtenerTratamientoPlural() {
    return 'los señores';
}

/**
 * Formatea el estado civil para el texto de comparecencia
 * @param {string} estadoCivil - Estado civil de la base de datos
 * @param {string} genero - Género de la persona
 * @returns {string}
 */
function formatearEstadoCivil(estadoCivil, genero) {
    const esFemenino = genero === 'F';

    const estados = {
        'SOLTERO': esFemenino ? 'soltera' : 'soltero',
        'CASADO': esFemenino ? 'casada' : 'casado',
        'CASADO_CON_DISOLUCION': esFemenino ? 'casada con disolución de la sociedad conyugal' : 'casado con disolución de la sociedad conyugal',
        'DIVORCIADO': esFemenino ? 'divorciada' : 'divorciado',
        'VIUDO': esFemenino ? 'viuda' : 'viudo',
        'UNION_LIBRE': 'en unión de hecho'
    };

    return estados[estadoCivil] || estadoCivil?.toLowerCase() || 'soltero';
}

/**
 * Formatea la calidad según género
 * @param {string} calidad - Calidad (VENDEDOR, COMPRADOR, etc.)
 * @param {string} genero - Género de la persona
 * @returns {string}
 */
function formatearCalidadComparecencia(calidad, genero) {
    const esFemenino = genero === 'F';

    const calidades = {
        'VENDEDOR': esFemenino ? 'vendedora' : 'vendedor',
        'COMPRADOR': esFemenino ? 'compradora' : 'comprador',
        'PROMITENTE_VENDEDOR': esFemenino ? 'promitente vendedora' : 'promitente vendedor',
        'PROMITENTE_COMPRADOR': esFemenino ? 'promitente compradora' : 'promitente comprador',
        'DONANTE': 'donante',
        'DONATARIO': esFemenino ? 'donataria' : 'donatario',
        'DEUDOR': esFemenino ? 'deudora' : 'deudor',
        'ACREEDOR': esFemenino ? 'acreedora' : 'acreedor',
        'PERMUTANTE': 'permutante',
        'PODERDANTE': 'poderdante',
        'APODERADO': esFemenino ? 'apoderada' : 'apoderado',
        'GARANTE': 'garante',
        'FIADOR': esFemenino ? 'fiadora' : 'fiador',
        'CESIONARIO': esFemenino ? 'cesionaria' : 'cesionario',
        'CEDENTE': 'cedente'
    };

    return calidades[calidad] || calidad?.toLowerCase().replace(/_/g, ' ') || 'compareciente';
}

/**
 * Obtiene el nombre completo de una persona
 * @param {Object} persona - Datos de PersonaRegistrada
 * @returns {string}
 */
function obtenerNombreCompleto(persona) {
    if (!persona) return 'NOMBRE NO DISPONIBLE';

    if (persona.tipoPersona === 'NATURAL') {
        const datos = persona.datosPersonaNatural?.datosPersonales || {};
        return `${datos.nombres || ''} ${datos.apellidos || ''}`.trim().toUpperCase() || 'NOMBRE NO DISPONIBLE';
    } else {
        // Persona jurídica - retornar razón social
        return (persona.datosPersonaJuridica?.compania?.razonSocial || 'EMPRESA NO DISPONIBLE').toUpperCase();
    }
}

/**
 * Obtiene los datos personales de una persona
 * @param {Object} participante - PersonaProtocolo
 * @returns {Object}
 */
function obtenerDatosPersonales(participante) {
    const persona = participante.persona;

    if (!persona) {
        return {
            nombre: participante.nombreTemporal || `CÉDULA: ${participante.personaCedula}`,
            genero: 'M',
            estadoCivil: 'SOLTERO',
            cedula: participante.personaCedula,
            profesion: null,
            direccion: null,
            telefono: null,
            email: null,
            conyuge: null
        };
    }

    if (persona.tipoPersona === 'NATURAL') {
        const datos = persona.datosPersonaNatural || {};
        const personales = datos.datosPersonales || {};
        const contacto = datos.contacto || {};
        const direccion = datos.direccion || {};
        const laboral = datos.informacionLaboral || {};
        const conyuge = datos.conyuge || {};

        return {
            nombre: `${personales.nombres || ''} ${personales.apellidos || ''}`.trim().toUpperCase(),
            genero: personales.genero || 'M',
            estadoCivil: personales.estadoCivil || 'SOLTERO',
            cedula: persona.numeroIdentificacion,
            profesion: laboral.profesionOcupacion,
            direccion: {
                callePrincipal: direccion.callePrincipal,
                numero: direccion.numero,
                calleSecundaria: direccion.calleSecundaria,
                parroquia: direccion.parroquia,
                canton: direccion.canton || 'QUITO',
                provincia: direccion.provincia || 'PICHINCHA'
            },
            telefono: contacto.celular || contacto.telefono,
            email: contacto.email,
            conyuge: conyuge.nombres ? {
                nombre: `${conyuge.nombres || ''} ${conyuge.apellidos || ''}`.trim().toUpperCase(),
                cedula: conyuge.numeroIdentificacion
            } : null
        };
    } else {
        // Persona Jurídica
        const datos = persona.datosPersonaJuridica || {};
        const compania = datos.compania || {};
        const representante = datos.representanteLegal || {};

        return {
            nombre: (compania.razonSocial || '').toUpperCase(),
            genero: representante.genero || 'M',
            estadoCivil: representante.estadoCivil || 'SOLTERO',
            cedula: persona.numeroIdentificacion,
            profesion: null,
            direccion: {
                callePrincipal: compania.direccion,
                parroquia: compania.parroquia,
                canton: 'QUITO',
                provincia: 'PICHINCHA'
            },
            telefono: compania.celularCompania || compania.telefonoCompania,
            email: compania.emailCompania,
            representanteLegal: {
                nombre: `${representante.nombres || ''} ${representante.apellidos || ''}`.trim().toUpperCase(),
                cedula: representante.numeroIdentificacion
            },
            conyuge: null
        };
    }
}

/**
 * Genera el texto de apertura de la comparecencia
 * @param {Date|string} fecha - Fecha del documento
 * @param {boolean} formatoHtml - Si usar HTML
 * @returns {string}
 */
function generarApertura(fecha, formatoHtml = true) {
    const fechaFormateada = convertirFechaNotarial(fecha);

    let texto = 'En la ciudad de San Francisco de Quito, Capital de la República del Ecuador, ';
    texto += `hoy día ${negrita(fechaFormateada, formatoHtml)}, `;
    texto += `ante mí, ${negrita(NOTARIA_TEXTO, formatoHtml)}, `;
    texto += 'comparecen con plena capacidad, libertad y conocimiento, ';
    texto += 'a la celebración de la presente escritura pública, ';

    return texto;
}

/**
 * Formatea un compareciente individual
 * @param {Object} participante - PersonaProtocolo
 * @param {boolean} formatoHtml - Si usar HTML
 * @returns {string}
 */
function formatearComparecienteIndividual(participante, formatoHtml = true) {
    const datos = obtenerDatosPersonales(participante);
    const tratamiento = obtenerTratamiento(datos.genero);

    let texto = `${tratamiento} ${negrita(datos.nombre || '[NOMBRE PENDIENTE]', formatoHtml)}, `;
    texto += `de estado civil ${formatearEstadoCivil(datos.estadoCivil, datos.genero)}`;

    // Si está casado/unión libre pero comparece solo, mencionar al cónyuge
    if ((datos.estadoCivil === 'CASADO' || datos.estadoCivil === 'UNION_LIBRE') && datos.conyuge && !participante.compareceConyugeJunto) {
        texto += ` con ${datos.conyuge.nombre}`;
    }

    // Profesión (obligatoria para notarial)
    if (datos.profesion) {
        texto += `, ${datos.profesion}`;
    } else {
        texto += `, [PROFESIÓN PENDIENTE]`;
    }

    // Cédula en formato notarial
    const cedulaLetras = convertirNumeroALetras(datos.cedula, 'cedula');
    texto += `, con cédula de ciudadanía número ${cedulaLetras}`;

    // Tipo de representación
    if (participante.actuaPor === 'REPRESENTANDO_SOCIEDAD_CONYUGAL') {
        texto += ', por sus propios y personales derechos y por los que representa de la sociedad conyugal';
    } else if (participante.actuaPor === 'REPRESENTANDO_SOCIEDAD_BIENES') {
        texto += ', por sus propios y personales derechos y por los que representa de la sociedad de bienes que tienen formada';
    } else {
        texto += ', por sus propios y personales derechos';
    }

    return texto;
}

/**
 * Formatea una pareja de cónyuges compareciendo juntos
 * @param {Object} p1 - Primer participante
 * @param {Object} p2 - Segundo participante
 * @param {boolean} formatoHtml - Si usar HTML
 * @returns {string}
 */
function formatearParejaConyuge(p1, p2, formatoHtml = true) {
    const datos1 = obtenerDatosPersonales(p1);
    const datos2 = obtenerDatosPersonales(p2);

    // Determinar tipo de unión
    const esUnionLibre = datos1.estadoCivil === 'UNION_LIBRE';
    const tieneDisolucion = datos1.estadoCivil === 'CASADO_CON_DISOLUCION';

    let texto = `${obtenerTratamientoPlural()} `;

    if (esUnionLibre) {
        texto += `${negrita(datos1.nombre, formatoHtml)} y ${negrita(datos2.nombre, formatoHtml)}, `;
        texto += 'de estado civil en unión de hecho, ';

        // Cédulas
        texto += `con cédulas de ciudadanía números ${convertirNumeroALetras(datos1.cedula, 'cedula')} `;
        texto += `y ${convertirNumeroALetras(datos2.cedula, 'cedula')}, respectivamente, `;

        texto += 'por sus propios y personales derechos y por los que representan de la sociedad de bienes que tienen formada';
    } else if (tieneDisolucion) {
        texto += `${negrita(datos1.nombre, formatoHtml)} y ${negrita(datos2.nombre, formatoHtml)}, `;
        texto += 'casados entre sí, con disolución de la sociedad conyugal, ';

        // Cédulas
        texto += `con cédulas de ciudadanía números ${convertirNumeroALetras(datos1.cedula, 'cedula')} `;
        texto += `y ${convertirNumeroALetras(datos2.cedula, 'cedula')}, respectivamente, `;

        texto += 'por sus propios y personales derechos';
    } else {
        // Casados sin disolución - sociedad conyugal vigente
        texto += `cónyuges ${negrita(datos1.nombre, formatoHtml)} y ${negrita(datos2.nombre, formatoHtml)}, `;

        // Cédulas
        texto += `con cédulas de ciudadanía números ${convertirNumeroALetras(datos1.cedula, 'cedula')} `;
        texto += `y ${convertirNumeroALetras(datos2.cedula, 'cedula')}, respectivamente, `;

        texto += 'por sus propios y personales derechos y por los que representan de la sociedad conyugal que tienen formada';
    }

    return texto;
}

/**
 * Formatea un apoderado con su mandante
 * @param {Object} apoderado - Participante que actúa como apoderado
 * @param {boolean} formatoHtml - Si usar HTML
 * @returns {string}
 */
function formatearApoderado(apoderado, formatoHtml = true) {
    const datosApoderado = obtenerDatosPersonales(apoderado);
    const nombreMandante = apoderado.mandanteNombre || 'EL MANDANTE';
    const cedulaMandante = apoderado.mandanteCedula || '';

    let texto = `${obtenerTratamiento(datosApoderado.genero)} ${negrita(nombreMandante.toUpperCase(), formatoHtml)}, `;

    if (cedulaMandante) {
        texto += `con cédula de ciudadanía número ${convertirNumeroALetras(cedulaMandante, 'cedula')}, `;
    }

    texto += `debidamente representado por ${negrita(datosApoderado.nombre, formatoHtml)}, `;
    texto += `con cédula de ciudadanía número ${convertirNumeroALetras(datosApoderado.cedula, 'cedula')}, `;
    texto += 'según consta en el poder que se agrega como habilitante';

    return texto;
}

/**
 * Agrupa participantes por rol y detecta parejas de cónyuges
 * @param {Array} participantes - Lista de PersonaProtocolo
 * @returns {Array} Grupos de participantes
 */
function agruparParticipantes(participantes) {
    const grupos = [];
    const procesados = new Set();

    // Ordenar por orden y calidad
    const ordenados = [...participantes].sort((a, b) => {
        if (a.orden !== b.orden) return a.orden - b.orden;
        return (a.calidad || '').localeCompare(b.calidad || '');
    });

    for (const p of ordenados) {
        if (procesados.has(p.id)) continue;

        // Verificar si es cónyuge compareciendo junto
        if (p.compareceConyugeJunto) {
            // Buscar al cónyuge con la misma calidad
            const conyuge = ordenados.find(
                c => c.id !== p.id &&
                    c.calidad === p.calidad &&
                    c.compareceConyugeJunto &&
                    !procesados.has(c.id)
            );

            if (conyuge) {
                grupos.push({
                    tipo: 'PAREJA_CONYUGE',
                    participantes: [p, conyuge],
                    calidad: p.calidad
                });
                procesados.add(p.id);
                procesados.add(conyuge.id);
                continue;
            }
        }

        // Verificar si es apoderado
        if (p.esApoderado) {
            grupos.push({
                tipo: 'APODERADO',
                participantes: [p],
                calidad: p.calidad
            });
            procesados.add(p.id);
            continue;
        }

        // Participante individual
        grupos.push({
            tipo: 'INDIVIDUAL',
            participantes: [p],
            calidad: p.calidad
        });
        procesados.add(p.id);
    }

    return grupos;
}

/**
 * Genera la sección de comparecientes
 * @param {Array} participantes - Lista de PersonaProtocolo
 * @param {boolean} formatoHtml - Si usar HTML
 * @returns {string}
 */
function generarSeccionComparecientes(participantes, formatoHtml = true) {
    const grupos = agruparParticipantes(participantes);
    const partes = [];

    grupos.forEach((grupo, index) => {
        const esUltimo = index === grupos.length - 1;
        const conector = index === 0 ? 'por una parte, ' : 'y por otra parte, ';

        let parteTexto = conector;

        if (grupo.tipo === 'PAREJA_CONYUGE') {
            parteTexto += formatearParejaConyuge(grupo.participantes[0], grupo.participantes[1], formatoHtml);
        } else if (grupo.tipo === 'APODERADO') {
            parteTexto += formatearApoderado(grupo.participantes[0], formatoHtml);
        } else {
            parteTexto += formatearComparecienteIndividual(grupo.participantes[0], formatoHtml);
        }

        // Calidad
        const datos = obtenerDatosPersonales(grupo.participantes[0]);
        const calidad = formatearCalidadComparecencia(grupo.calidad, datos.genero);
        parteTexto += `, en calidad de ${calidad}`;

        partes.push(parteTexto);
    });

    return partes.join('; ') + '.- ';
}

/**
 * Genera la sección de domicilios
 * @param {Array} participantes - Lista de PersonaProtocolo
 * @param {boolean} formatoHtml - Si usar HTML
 * @returns {string}
 */
function generarDomicilios(participantes, formatoHtml = true) {
    let texto = 'Los comparecientes declaran ser de nacionalidad ecuatoriana, mayores de edad, ';
    texto += 'domiciliados en esta ciudad de Quito de la siguiente manera: ';

    const domicilios = participantes.map(p => {
        const datos = obtenerDatosPersonales(p);
        const tratamiento = obtenerTratamiento(datos.genero);

        let dom = `${tratamiento} ${negrita(datos.nombre || '[NOMBRE PENDIENTE]', formatoHtml)}`;

        // Dirección
        if (datos.direccion && datos.direccion.callePrincipal) {
            const direccionFormateada = formatearDireccionNotarial(datos.direccion);
            dom += `, ${direccionFormateada}`;
        } else {
            dom += `, [DIRECCIÓN PENDIENTE]`;
        }

        // Teléfono
        if (datos.telefono) {
            const telefonoFormateado = formatearTelefonoNotarial(datos.telefono);
            dom += `, teléfono ${telefonoFormateado}`;
        } else {
            dom += `, teléfono [PENDIENTE]`;
        }

        // Email
        if (datos.email) {
            dom += `, correo electrónico ${datos.email}`;
        }

        return dom;
    });

    texto += domicilios.join('; ') + '; ';

    return texto;
}

/**
 * Genera el texto de cierre de la comparecencia
 * @returns {string}
 */
function generarCierre() {
    return 'hábiles en derecho para contratar y contraer obligaciones; ' +
        'a quienes de conocer doy fe, en virtud de haberme exhibido sus documentos de identidad ' +
        'cuyas copias fotostáticas debidamente certificadas por mí agrego a esta escritura ' +
        'como documentos habilitantes, autorizando además, la consulta e impresión de sus ' +
        'certificados electrónicos de datos de identidad del Sistema Nacional de Identificación ' +
        'Ciudadana de la Dirección General del Registro Civil, Identificación y Cedulación, ' +
        'que también se agregan como habilitantes. Advertidos los comparecientes por mí, ' +
        'la Notaria, de los efectos y resultados de esta escritura, así como examinados ' +
        'que fueron en forma aislada y separada de que comparecen al otorgamiento de esta ' +
        'escritura sin coacción, amenazas, temor reverencial, ni promesa o seducción, ' +
        'me piden que eleve a escritura pública la siguiente minuta:';
}

/**
 * Genera la comparecencia completa del protocolo
 * 
 * @param {Object} protocolo - Datos del protocolo UAFE
 * @param {Array} participantes - Lista de PersonaProtocolo con datos de persona
 * @param {Object} opciones - { formatoHtml: boolean }
 * @returns {Object} - { success, comparecencia, comparecenciaHtml, error }
 */
export function generarComparecencia(protocolo, participantes, opciones = {}) {
    const { formatoHtml = true } = opciones;

    try {
        // Verificar si el tipo de acto requiere comparecencia
        if (TIPOS_SIN_COMPARECENCIA.includes(protocolo.tipoActo)) {
            return {
                success: false,
                comparecencia: null,
                comparecenciaHtml: null,
                error: `El tipo de acto ${protocolo.tipoActo} no requiere comparecencia (es un acta de reconocimiento)`
            };
        }

        // Verificar que hay participantes
        if (!participantes || participantes.length === 0) {
            return {
                success: false,
                comparecencia: null,
                comparecenciaHtml: null,
                error: 'No hay participantes en el protocolo'
            };
        }

        // Ordenar participantes por orden
        const participantesOrdenados = [...participantes].sort((a, b) => (a.orden || 0) - (b.orden || 0));

        let texto = '';

        // 1. Apertura con fecha
        texto += generarApertura(protocolo.fecha, formatoHtml);

        // 2. Sección de comparecientes
        texto += generarSeccionComparecientes(participantesOrdenados, formatoHtml);

        // 3. Domicilios
        texto += generarDomicilios(participantesOrdenados, formatoHtml);

        // 4. Cierre
        texto += generarCierre();

        // Generar versión sin HTML para copiar a texto plano
        const textoPlano = texto.replace(/<strong>/g, '').replace(/<\/strong>/g, '');

        return {
            success: true,
            comparecencia: textoPlano,
            comparecenciaHtml: texto,
            error: null
        };

    } catch (error) {
        console.error('Error generando comparecencia:', error);
        return {
            success: false,
            comparecencia: null,
            comparecenciaHtml: null,
            error: error.message
        };
    }
}

export default {
    generarComparecencia,
    TIPOS_SIN_COMPARECENCIA
};
