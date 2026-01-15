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
 * - Agrupación por Calidad (Todos los Vendedores juntos, luego todos los Compradores)
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
    if (!texto) return '';
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

    return estados[estadoCivil] || (estadoCivil ? estadoCivil.toLowerCase() : 'soltero');
}

/**
 * Formatea la calidad según género y pluralidad
 * @param {string} calidad - Calidad (VENDEDOR, COMPRADOR, etc.)
 * @param {string} genero - Género de la persona (M/F) - Relevante si es singular
 * @param {boolean} esPlural - Si hay múltiples personas con esta calidad
 * @returns {string}
 */
function formatearCalidadComparecencia(calidad, genero, esPlural = false) {
    const esFemenino = genero === 'F';
    const c = calidad || 'COMPARECIENTE';

    // Diccionario base (singular masculino)
    const base = {
        'VENDEDOR': { singF: 'vendedora', plur: 'vendedores' },
        'COMPRADOR': { singF: 'compradora', plur: 'compradores' },
        'PROMITENTE_VENDEDOR': { singF: 'promitente vendedora', plur: 'promitentes vendedores' },
        'PROMITENTE_COMPRADOR': { singF: 'promitente compradora', plur: 'promitentes compradores' },
        'DONANTE': { singF: 'donante', plur: 'donantes' },
        'DONATARIO': { singF: 'donataria', plur: 'donatarios' },
        'DEUDOR': { singF: 'deudora', plur: 'deudores' },
        'ACREEDOR': { singF: 'acreedora', plur: 'acreedores' },
        'PERMUTANTE': { singF: 'permutante', plur: 'permutantes' },
        'PODERDANTE': { singF: 'poderdante', plur: 'poderdantes' },
        'APODERADO': { singF: 'apoderada', plur: 'apoderados' },
        'GARANTE': { singF: 'garante', plur: 'garantes' },
        'FIADOR': { singF: 'fiadora', plur: 'fiadores' },
        'CESIONARIO': { singF: 'cesionaria', plur: 'cesionarios' },
        'CEDENTE': { singF: 'cedente', plur: 'cedentes' }
    };

    // Transformar calidad a formato legible (minusculas y espacios) si no está en diccionario
    const defaultLegible = c.toLowerCase().replace(/_/g, ' ');

    if (!base[c]) {
        return esPlural ? defaultLegible + 's' : defaultLegible; // Pluralización básica
    }

    if (esPlural) {
        return base[c].plur;
    } else {
        return esFemenino ? base[c].singF : defaultLegible;
    }
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
 * Obtiene los datos personales de una persona de forma segura
 * @param {Object} participante - PersonaProtocolo
 * @returns {Object}
 */
function obtenerDatosPersonales(participante) {
    const persona = participante.persona;

    if (!persona) {
        // Fallback si la persona no está populada
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
                cedula: conyuge.numeroIdentificacion,
                profesion: conyuge.profesionOcupacion || null
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
            tipoPersona: 'JURIDICA',
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
 * Se asegura de poner negritas a la fecha y al nombre de la notaria
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
 * Formatea un compareciente individual (Persona Natural o Jurídica)
 */
function formatearComparecienteIndividual(participante, formatoHtml = true) {
    const datos = obtenerDatosPersonales(participante);

    // CASO PERSONA JURÍDICA
    if (datos.tipoPersona === 'JURIDICA') {
        let texto = `la compañía ${negrita(datos.nombre, formatoHtml)}, legalmente representada por el señor(a) ${datos.representanteLegal.nombre}`;
        texto += `, con RUC número ${conversorRUC(datos.cedula)}`;
        return texto;
    }

    // CASO PERSONA NATURAL
    const tratamiento = obtenerTratamiento(datos.genero);

    let texto = `${tratamiento} ${negrita(datos.nombre || '[NOMBRE PENDIENTE]', formatoHtml)}, `;
    texto += `de estado civil ${formatearEstadoCivil(datos.estadoCivil, datos.genero)}`;

    // Si está casado/unión libre pero comparece solo, mencionar al cónyuge
    if ((datos.estadoCivil === 'CASADO' || datos.estadoCivil === 'UNION_LIBRE') && datos.conyuge && !participante.compareceConyugeJunto) {
        texto += ` con ${datos.conyuge.nombre}`;
    }

    // Profesión (obligatoria para notarial)
    const ocupacion = datos.profesion ? datos.profesion.toLowerCase() : '[PENDIENTE]';
    texto += `, de ocupación ${ocupacion}`;

    // Cédula
    const cedulaLetras = convertirNumeroALetras(datos.cedula, 'cedula');
    texto += `, con cédula de ciudadanía número ${cedulaLetras}`;

    // Tipo de representación / derechos
    if (participante.actuaPor === 'REPRESENTANDO_SOCIEDAD_CONYUGAL') {
        texto += ', por sus propios y personales derechos y por los que representa de la sociedad conyugal que tienen formada';
    } else if (participante.actuaPor === 'REPRESENTANDO_SOCIEDAD_BIENES') {
        texto += ', por sus propios y personales derechos y por los que representa de la sociedad de bienes que tienen formada';
    } else if (participante.actuaPor === 'REPRESENTANDO_A') {
        // Representación de otro (mandante)
        const nombreMandante = participante.mandanteNombre || '[MANDANTE PENDIENTE]';
        texto += `, en representación de ${negrita(nombreMandante.toUpperCase(), formatoHtml)}`;
        if (participante.mandanteCedula) {
            const cedulaMandanteLetras = convertirNumeroALetras(participante.mandanteCedula, 'cedula');
            texto += `, con cédula de ciudadanía número ${cedulaMandanteLetras}`;
        }
        texto += ', según poder que se agrega como habilitante';
    } else {
        texto += ', por sus propios y personales derechos';
    }

    return texto;
}

/**
 * Helper simple para RUC (no convierte a letras dígito a dígito usualmente, o sí?)
 * Para consistencia con cedula, si se quiere letras: convertirNumeroALetras(ruc, 'ruc')
 */
function conversorRUC(ruc) {
    if (!ruc) return '[RUC PENDIENTE]';
    return ruc; // Por ahora retorna números, usualmente RUC se ponen números
}

/**
 * Formatea una pareja de cónyuges compareciendo juntos
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

        // Profesiones
        const o1 = datos1.profesion ? datos1.profesion.toLowerCase() : '[pendiente]';
        const o2 = datos2.profesion ? datos2.profesion.toLowerCase() : '[pendiente]';

        texto += `de ocupación ${o1} y ${o2} respectivamente, `;

        // Cédulas
        texto += `con cédulas de ciudadanía números ${convertirNumeroALetras(datos1.cedula, 'cedula')} `;
        texto += `y ${convertirNumeroALetras(datos2.cedula, 'cedula')}, respectivamente, `;

        texto += 'por sus propios y personales derechos y por los que representan de la sociedad de bienes que tienen formada';
    } else if (tieneDisolucion) {
        texto += `${negrita(datos1.nombre, formatoHtml)} y ${negrita(datos2.nombre, formatoHtml)}, `;
        texto += 'casados entre sí, con disolución de la sociedad conyugal, ';

        // Profesiones
        const o1 = datos1.profesion ? datos1.profesion.toLowerCase() : '[pendiente]';
        const o2 = datos2.profesion ? datos2.profesion.toLowerCase() : '[pendiente]';
        texto += `de ocupación ${o1} y ${o2} respectivamente, `;

        // Cédulas
        texto += `con cédulas de ciudadanía números ${convertirNumeroALetras(datos1.cedula, 'cedula')} `;
        texto += `y ${convertirNumeroALetras(datos2.cedula, 'cedula')}, respectivamente, `;

        texto += 'por sus propios y personales derechos';
    } else {
        // Casados sin disolución - sociedad conyugal vigente
        texto += `cónyuges ${negrita(datos1.nombre, formatoHtml)}`;
        if (datos1.profesion) texto += `, de ocupación ${datos1.profesion.toLowerCase()}`;

        texto += ` y ${negrita(datos2.nombre, formatoHtml)}`;
        if (datos2.profesion) texto += `, de ocupación ${datos2.profesion.toLowerCase()}`;

        texto += `, `;

        // Cédulas
        texto += `con cédulas de ciudadanía números ${convertirNumeroALetras(datos1.cedula, 'cedula')} `;
        texto += `y ${convertirNumeroALetras(datos2.cedula, 'cedula')}, respectivamente, `;

        texto += 'por sus propios y personales derechos y por los que representan de la sociedad conyugal que tienen formada';
    }

    return texto;
}

/**
 * Formatea un compareciente con su cónyuge cuando los datos del cónyuge
 * vienen de la BD (datosPersonales.conyuge) y no como participante del protocolo
 */
function formatearConConyugeDesdeDB(participante, formatoHtml = true) {
    const datos = obtenerDatosPersonales(participante);
    const conyugeData = datos.conyuge;

    if (!conyugeData) {
        return formatearComparecienteIndividual(participante, formatoHtml);
    }

    const esUnionLibre = datos.estadoCivil === 'UNION_LIBRE';
    const tieneDisolucion = datos.estadoCivil === 'CASADO_CON_DISOLUCION';

    let texto = `${obtenerTratamientoPlural()} `;

    // Nombre cónyuge
    const nombreConyuge = conyugeData.nombre || '[CÓNYUGE PENDIENTE]';

    if (esUnionLibre) {
        texto += `${negrita(datos.nombre, formatoHtml)} y ${negrita(nombreConyuge, formatoHtml)}, `;
        texto += 'de estado civil en unión de hecho, ';
    } else if (tieneDisolucion) {
        texto += `${negrita(datos.nombre, formatoHtml)} y ${negrita(nombreConyuge, formatoHtml)}, `;
        texto += 'casados entre sí, con disolución de la sociedad conyugal, ';
    } else {
        texto += `cónyuges ${negrita(datos.nombre, formatoHtml)} y ${negrita(nombreConyuge, formatoHtml)}, `;
    }

    // Profesiones - Cónyuge desde DB generalmente no tiene ocupación guardada, poner pendiente si falta
    const o1 = datos.profesion ? datos.profesion.toLowerCase() : '[pendiente]';
    const o2 = conyugeData.profesion ? conyugeData.profesion.toLowerCase() : '[pendiente]';
    texto += `de ocupación ${o1} y ${o2} respectivamente, `;

    // Cédulas
    const cedula1 = convertirNumeroALetras(datos.cedula, 'cedula');
    texto += `con cédulas de ciudadanía números ${cedula1} y `;

    if (conyugeData.cedula || conyugeData.numeroIdentificacion) {
        const c2 = conyugeData.cedula || conyugeData.numeroIdentificacion;
        texto += `${convertirNumeroALetras(c2, 'cedula')}, respectivamente, `;
    } else {
        texto += `[CÉDULA CÓNYUGE PENDIENTE], respectivamente, `;
    }

    // Derechos
    if (esUnionLibre) {
        texto += 'por sus propios y personales derechos y por los que representan de la sociedad de bienes que tienen formada';
    } else if (tieneDisolucion) {
        texto += 'por sus propios y personales derechos';
    } else {
        texto += 'por sus propios y personales derechos y por los que representan de la sociedad conyugal que tienen formada';
    }

    return texto;
}

/**
 * Formatea un apoderado con su mandante
 */
function formatearApoderado(apoderado, formatoHtml = true) {
    const datosApoderado = obtenerDatosPersonales(apoderado);
    const tratamiento = obtenerTratamiento(datosApoderado.genero);
    const nombreMandante = apoderado.mandanteNombre || '[MANDANTE PENDIENTE]';
    const cedulaMandante = apoderado.mandanteCedula || '';

    // Primero el compareciente (apoderado)
    let texto = `${tratamiento} ${negrita(datosApoderado.nombre || '[NOMBRE PENDIENTE]', formatoHtml)}, `;
    texto += `de estado civil ${formatearEstadoCivil(datosApoderado.estadoCivil, datosApoderado.genero)}`;

    if (datosApoderado.profesion) {
        texto += `, de ocupación ${datosApoderado.profesion.toLowerCase()}`;
    } else {
        texto += `, de ocupación [PENDIENTE]`;
    }

    // Cédula del apoderado
    texto += `, con cédula de ciudadanía número ${convertirNumeroALetras(datosApoderado.cedula, 'cedula')}`;

    // Representación
    texto += `, en representación de ${negrita(nombreMandante.toUpperCase(), formatoHtml)}`;

    if (cedulaMandante) {
        texto += `, con cédula de ciudadanía número ${convertirNumeroALetras(cedulaMandante, 'cedula')}`;
    }

    texto += ', según poder que se agrega como habilitante';

    return texto;
}

/**
 * Genera la sección de domicilios unificados (agrupa cónyuges)
 */
function generarDomicilios(participantes, formatoHtml = true) {
    let texto = 'Los comparecientes declaran ser de nacionalidad ecuatoriana, mayores de edad, ';
    texto += 'domiciliados en esta ciudad de Quito de la siguiente manera: ';

    // Usar la misma lógica de agrupación para no repetir domicilios de cónyuges
    const grupos = agruparSubParticipantes(participantes);
    const domicilios = [];

    grupos.forEach(grupo => {
        let dom = '';
        const p1 = grupo.participantes[0];
        const datos1 = obtenerDatosPersonales(p1);

        // Si es pareja, formatear juntos
        if (grupo.tipo === 'PAREJA_CONYUGE' || grupo.tipo === 'CONYUGE_DESDE_BD') {
            let nombre2 = '';
            if (grupo.tipo === 'PAREJA_CONYUGE') {
                nombre2 = obtenerDatosPersonales(grupo.participantes[1]).nombre;
            } else {
                nombre2 = datos1.conyuge?.nombre || '[CÓNYUGE]';
            }

            dom = `los cónyuges ${negrita(datos1.nombre, formatoHtml)} y ${negrita(nombre2, formatoHtml)}`;
        } else {
            // Individual o apoderado
            const tratamiento = obtenerTratamiento(datos1.genero);
            dom = `${tratamiento} ${negrita(datos1.nombre || '[NOMBRE]', formatoHtml)}`;
        }

        // Dirección
        if (datos1.direccion && datos1.direccion.callePrincipal) {
            dom += `, ${formatearDireccionNotarial(datos1.direccion)}`;
        } else {
            dom += `, [DIRECCIÓN PENDIENTE]`;
        }

        // Teléfono
        if (datos1.telefono) {
            dom += `, teléfono ${formatearTelefonoNotarial(datos1.telefono)}`;
        }

        // Email
        if (datos1.email) {
            dom += `, correo electrónico ${datos1.email}`;
        }

        domicilios.push(dom);
    });

    texto += domicilios.join('; ') + '; ';
    return texto;
}


/**
 * Estructura de Prioridad para Ordenar los Grupos de Calidad
 */
const PRIORIDAD_CALIDAD = {
    'VENDEDOR': 1,
    'PROMITENTE_VENDEDOR': 1,
    'DONANTE': 1,
    'CEDENTE': 1,
    'PODERDANTE': 1,

    'COMPRADOR': 2,
    'PROMITENTE_COMPRADOR': 2,
    'DONATARIO': 2,
    'CESIONARIO': 2,
    'APODERADO': 2,

    // Default 3 para otros
};

/**
 * Agrupa participantes en subgrupos lógicos (Parejas vs Individuales)
 * SIN separar por calidades globalmente aún
 */
function agruparSubParticipantes(participantes) {
    const subgrupos = [];
    const procesados = new Set();
    const listaOrdenada = [...participantes].sort((a, b) => (a.orden || 0) - (b.orden || 0));

    for (const p of listaOrdenada) {
        if (procesados.has(p.id)) continue;

        // Caso PAREJA EN PROTOCOLO
        if (p.compareceConyugeJunto) {
            const conyuge = listaOrdenada.find(
                c => c.id !== p.id &&
                    c.calidad === p.calidad &&
                    c.compareceConyugeJunto &&
                    !procesados.has(c.id)
            );

            if (conyuge) {
                subgrupos.push({ tipo: 'PAREJA_CONYUGE', participantes: [p, conyuge], calidad: p.calidad });
                procesados.add(p.id);
                procesados.add(conyuge.id);
                continue;
            } else {
                // Caso PAREJA CON DATOS DB
                subgrupos.push({ tipo: 'CONYUGE_DESDE_BD', participantes: [p], calidad: p.calidad });
                procesados.add(p.id);
                continue;
            }
        }

        // Caso APODERADO
        if (p.actuaPor === 'REPRESENTANDO_A') {
            subgrupos.push({ tipo: 'APODERADO', participantes: [p], calidad: p.calidad });
            procesados.add(p.id);
            continue;
        }

        // Caso INDIVIDUAL DEFAULT
        subgrupos.push({ tipo: 'INDIVIDUAL', participantes: [p], calidad: p.calidad });
        procesados.add(p.id);
    }
    return subgrupos;
}

/**
 * Genera la sección completa de comparecientes
 * Agrupa por CALIDAD para que VENDEDORES salgan juntos, etc.
 */
function generarSeccionComparecientes(participantes, formatoHtml = true) {
    // 1. Obtener subgrupos básicos (Parejas, individuos)
    const subgrupos = agruparSubParticipantes(participantes);

    // 2. Agrupar subgrupos por CALIDAD (Macro-Agrupación)
    const gruposPorCalidad = {};

    subgrupos.forEach(grupo => {
        const calidad = grupo.calidad || 'COMPARECIENTE';
        if (!gruposPorCalidad[calidad]) {
            gruposPorCalidad[calidad] = [];
        }
        gruposPorCalidad[calidad].push(grupo);
    });

    // 3. Ordenar las calidades por prioridad (Vendedor > Comprador)
    const calidadesOrdenadas = Object.keys(gruposPorCalidad).sort((a, b) => {
        const pA = PRIORIDAD_CALIDAD[a] || 3;
        const pB = PRIORIDAD_CALIDAD[b] || 3;
        return pA - pB;
    });

    // 4. Generar texto por cada bloque de calidad
    const bloquesTexto = [];

    calidadesOrdenadas.forEach((calidad, index) => {
        const gruposDeEstaCalidad = gruposPorCalidad[calidad];

        // Conector de inicio de bloque
        const esPrimero = index === 0;
        let textoBloque = esPrimero ? 'por una parte, ' : 'y por otra parte, ';

        // Generar texto de nombres
        const descripciones = gruposDeEstaCalidad.map(grupo => {
            if (grupo.tipo === 'PAREJA_CONYUGE') {
                return formatearParejaConyuge(grupo.participantes[0], grupo.participantes[1], formatoHtml);
            } else if (grupo.tipo === 'CONYUGE_DESDE_BD') {
                return formatearConConyugeDesdeDB(grupo.participantes[0], formatoHtml);
            } else if (grupo.tipo === 'APODERADO') {
                return formatearApoderado(grupo.participantes[0], formatoHtml);
            } else {
                return formatearComparecienteIndividual(grupo.participantes[0], formatoHtml);
            }
        });

        // Unir nombres con punto y coma si son varios grupos distintos
        textoBloque += descripciones.join('; ');

        // Agregar la calidad pluralizada al final del bloque
        // Calcular total de personas en este bloque de calidad para pluralizar
        let totalPersonas = 0;
        let generoPrincipal = 'M'; // Default

        gruposDeEstaCalidad.forEach(g => {
            totalPersonas += (g.tipo === 'PAREJA_CONYUGE') ? 2 :
                (g.tipo === 'CONYUGE_DESDE_BD') ? 2 : 1;

            // Intentar detectar genero del primero para single singular
            if (g.participantes[0] && g.participantes[0].persona &&
                g.participantes[0].persona.datosPersonaNatural &&
                g.participantes[0].persona.datosPersonaNatural.datosPersonales) {
                generoPrincipal = g.participantes[0].persona.datosPersonaNatural.datosPersonales.genero || 'M';
            }
        });

        const esPlural = totalPersonas > 1;
        const calidadTexto = formatearCalidadComparecencia(calidad, generoPrincipal, esPlural);

        textoBloque += `, en calidad de ${calidadTexto}`;

        bloquesTexto.push(textoBloque);
    });

    return bloquesTexto.join('; ') + '.- ';
}

/**
 * Genera el cierre
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
 */
export function generarComparecencia(protocolo, participantes, opciones = {}) {
    const { formatoHtml = true } = opciones;

    try {
        if (TIPOS_SIN_COMPARECENCIA.includes(protocolo.tipoActo)) {
            return {
                success: false,
                comparecencia: null,
                comparecenciaHtml: null,
                error: `El tipo de acto ${protocolo.tipoActo} no requiere comparecencia (es un acta de reconocimiento)`
            };
        }

        if (!participantes || participantes.length === 0) {
            return {
                success: false,
                comparecencia: null,
                comparecenciaHtml: null,
                error: 'No hay participantes en el protocolo'
            };
        }

        // Ya no ordenamos simplemente por orden para generar texto, 
        // ahora `generarSeccionComparecientes` hace el ordenamiento por calidad.
        // Pero pasamos lista completa para que la función la procese.

        let texto = '';

        // 1. Apertura
        texto += generarApertura(protocolo.fecha, formatoHtml);

        // 2. Comparecientes (Agrupados y Ordenados)
        texto += generarSeccionComparecientes(participantes, formatoHtml);

        // 3. Domicilios
        texto += generarDomicilios(participantes, formatoHtml);

        // 4. Cierre
        texto += generarCierre();

        // Generar versión sin HTML
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
