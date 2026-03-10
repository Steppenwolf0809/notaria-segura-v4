/**
 * Servicio de Validación de Completitud de Datos
 *
 * Calcula qué tan completos están los datos de una persona
 * para determinar el estado del semáforo (🔴 🟡 🟢)
 *
 * OLA 3: Validación flexible
 * - Campos UAFE obligatorios: nombre, cédula, nacionalidad, calidad (bloquean verde)
 * - Campos debida diligencia: dirección, laboral, PEP, cónyuge (no bloquean reporte)
 */

import prisma from '../db.js';

// Labels legibles para los campos faltantes (alineados con formulario Word)
const LABELS_CAMPOS = {
    // Persona Natural - Datos personales
    apellidos: 'Apellidos',
    nombres: 'Nombres',
    genero: 'Genero',
    estadoCivil: 'Estado civil',
    nacionalidad: 'Nacionalidad',
    nivelEstudio: 'Nivel de estudio',
    // Contacto
    celular: 'Celular',
    correo: 'Correo electronico',
    // Direccion
    callePrincipal: 'Calle principal',
    numeroCasa: 'Numero de casa',
    calleSecundaria: 'Calle secundaria',
    provincia: 'Provincia',
    canton: 'Canton',
    parroquia: 'Parroquia',
    sector: 'Sector',
    // Laboral
    situacionLaboral: 'Situacion laboral',
    profesion: 'Profesion/Ocupacion',
    entidadLaboral: 'Entidad donde trabaja',
    cargoLaboral: 'Cargo laboral',
    ingresoMensual: 'Ingreso mensual',
    // Conyuge
    conyugeApellidos: 'Apellidos conyuge',
    conyugeNombres: 'Nombres conyuge',
    conyugeTipoId: 'Tipo ID conyuge',
    conyugeNumeroId: 'Cedula conyuge',
    conyugeNacionalidad: 'Nacionalidad conyuge',
    // PEP
    pep: 'Declaracion PEP',
    // Persona Juridica - Compania
    razonSocial: 'Razon social',
    ruc: 'RUC',
    objetoSocial: 'Objeto social',
    contactoCompania: 'Contacto compania',
    dirCompCallePrincipal: 'Calle principal compania',
    dirCompProvincia: 'Provincia compania',
    dirCompCanton: 'Canton compania',
    dirCompParroquia: 'Parroquia compania',
    // Representante legal
    repApellidos: 'Apellidos representante',
    repNombres: 'Nombres representante',
    repTipoId: 'Tipo ID representante',
    repNumeroId: 'Cedula representante',
    repGenero: 'Genero representante',
    repEstadoCivil: 'Estado civil representante',
    repNivelEstudio: 'Nivel estudio representante',
    repCelular: 'Celular representante',
    repCorreo: 'Correo representante',
    dirRepCallePrincipal: 'Calle principal representante',
    dirRepProvincia: 'Provincia representante',
    dirRepCanton: 'Canton representante',
    dirRepParroquia: 'Parroquia representante',
    // Conyuge representante
    conyugeRepApellidos: 'Apellidos conyuge representante',
    conyugeRepNombres: 'Nombres conyuge representante',
    conyugeRepNumeroId: 'Cedula conyuge representante',
};

function labelCampo(campo) {
    return LABELS_CAMPOS[campo] || campo;
}

/**
 * Calcula la completitud de datos de una Persona Natural
 *
 * @param {Object} datos - Datos de persona natural desde PersonaRegistrada
 * @returns {Object} - { estado, porcentaje, camposFaltantes, camposUafeFaltantes, camposDDFaltantes, detalles }
 */
export function calcularCompletitudPersonaNatural(datos) {
    const resultado = {
        estado: 'pendiente',
        porcentaje: 0,
        camposFaltantes: [],
        camposUafeFaltantes: [],  // Obligatorios UAFE (bloquean verde)
        camposDDFaltantes: [],    // Debida diligencia (no bloquean reporte)
        detalles: {}
    };

    if (!datos || !datos.datosPersonaNatural) {
        resultado.camposFaltantes = ['No hay datos registrados'];
        resultado.camposUafeFaltantes = ['No hay datos registrados'];
        return resultado;
    }

    const personales = datos.datosPersonaNatural.datosPersonales || {};
    const contacto = datos.datosPersonaNatural.contacto || {};
    const direccion = datos.datosPersonaNatural.direccion || {};
    const laboral = datos.datosPersonaNatural.informacionLaboral || {};
    const conyuge = datos.datosPersonaNatural.conyuge || {};
    const declaracion = datos.datosPersonaNatural.declaracionPEP || {};

    let camposTotal = 0;
    let camposLlenos = 0;

    const checkField = (campo, valor, esUafe) => {
        camposTotal++;
        const lleno = valor && String(valor).trim() !== '';
        if (lleno) {
            camposLlenos++;
        } else {
            const label = labelCampo(campo);
            resultado.camposFaltantes.push(label);
            if (esUafe) {
                resultado.camposUafeFaltantes.push(label);
            } else {
                resultado.camposDDFaltantes.push(label);
            }
        }
    };

    // 1. Campos UAFE obligatorios (nombre, nacionalidad)
    checkField('apellidos', personales.apellidos, true);
    checkField('nombres', personales.nombres, true);
    checkField('nacionalidad', personales.nacionalidad, true);

    // 2. Datos personales (aparecen en Word)
    checkField('genero', personales.genero, false);
    checkField('estadoCivil', personales.estadoCivil, false);
    checkField('nivelEstudio', personales.nivelEstudio, false);

    // 3. Contacto
    checkField('celular', contacto.celular, false);
    checkField('correo', contacto.correoElectronico || contacto.correo, false);

    // 4. Dirección completa (todos aparecen en Word)
    checkField('callePrincipal', direccion.callePrincipal, false);
    checkField('numeroCasa', direccion.numero, false);
    checkField('calleSecundaria', direccion.calleSecundaria, false);
    checkField('provincia', direccion.provincia, false);
    checkField('canton', direccion.canton, false);
    checkField('parroquia', direccion.parroquia, false);
    checkField('sector', direccion.sector, false);

    // 5. Información laboral completa (todos aparecen en Word)
    checkField('situacionLaboral', laboral.situacion || laboral.situacionLaboral, false);
    checkField('profesion', laboral.profesionOcupacion, false);
    checkField('entidadLaboral', laboral.entidad || laboral.nombreEmpresa, false);
    checkField('cargoLaboral', laboral.cargo, false);
    checkField('ingresoMensual', laboral.ingresoMensual, false);

    // 6. PEP
    checkField('pep', declaracion.esPEP != null ? String(declaracion.esPEP) : null, false);

    // 7. Si es casado o unión libre, cónyuge completo (todos aparecen en Word)
    const esCasado = ['CASADO', 'UNION_LIBRE', 'CASADO_CON_DISOLUCION', 'UNION_LIBRE_CON_SEPARACION'].includes(personales.estadoCivil);
    if (esCasado) {
        checkField('conyugeApellidos', conyuge.apellidos, false);
        checkField('conyugeNombres', conyuge.nombres, false);
        checkField('conyugeTipoId', conyuge.tipoIdentificacion, false);
        checkField('conyugeNumeroId', conyuge.numeroIdentificacion, false);
        checkField('conyugeNacionalidad', conyuge.nacionalidad, false);
    }

    // Calcular porcentaje
    if (camposTotal > 0) {
        resultado.porcentaje = Math.round((camposLlenos / camposTotal) * 100);
    }

    // Determinar estado: ROJO si faltan campos UAFE, AMARILLO si faltan DD, VERDE si todo OK
    if (resultado.camposUafeFaltantes.length > 0) {
        resultado.estado = resultado.porcentaje === 0 ? 'pendiente' : 'incompleto';
    } else if (resultado.camposDDFaltantes.length > 0) {
        resultado.estado = 'incompleto'; // AMARILLO pero no bloquea reporte
    } else {
        resultado.estado = 'completo';
    }

    // Override: si no hay absolutamente nada, es pendiente
    if (resultado.porcentaje === 0) {
        resultado.estado = 'pendiente';
    }

    resultado.detalles = {
        camposTotal,
        camposLlenos,
        esCasado,
        uafeCompleto: resultado.camposUafeFaltantes.length === 0,
    };

    return resultado;
}

/**
 * Calcula la completitud de datos de una Persona Jurídica
 * 
 * @param {Object} datos - Datos de persona jurídica desde PersonaRegistrada
 * @returns {Object} - { estado, porcentaje, camposFaltantes, detalles }
 */
export function calcularCompletitudPersonaJuridica(datos) {
    const resultado = {
        estado: 'pendiente',
        porcentaje: 0,
        camposFaltantes: [],
        camposUafeFaltantes: [],
        camposDDFaltantes: [],
        detalles: {}
    };

    if (!datos || !datos.datosPersonaJuridica) {
        resultado.camposFaltantes = ['No hay datos registrados'];
        resultado.camposUafeFaltantes = ['No hay datos registrados'];
        return resultado;
    }

    const juridica = datos.datosPersonaJuridica;
    const compania = juridica.compania || {};
    const dirComp = compania.direccion || {};
    const representante = juridica.representanteLegal || {};
    const dirRep = representante.direccion || {};
    const conyugeRep = juridica.conyugeRepresentante || {};

    let camposTotal = 0;
    let camposLlenos = 0;

    const checkField = (campo, valor, esUafe) => {
        camposTotal++;
        const lleno = valor && String(valor).trim() !== '';
        if (lleno) {
            camposLlenos++;
        } else {
            const label = labelCampo(campo);
            resultado.camposFaltantes.push(label);
            if (esUafe) {
                resultado.camposUafeFaltantes.push(label);
            } else {
                resultado.camposDDFaltantes.push(label);
            }
        }
    };

    // 1. Compania - UAFE obligatorio
    checkField('razonSocial', compania.razonSocial, true);
    checkField('ruc', compania.ruc, true);

    // 2. Compania - debida diligencia
    checkField('objetoSocial', compania.objetoSocial, false);

    // 3. Contacto compania
    camposTotal++;
    if (compania.emailCompania || compania.telefonoCompania || compania.celularCompania) {
        camposLlenos++;
    } else {
        const label = labelCampo('contactoCompania');
        resultado.camposFaltantes.push(label);
        resultado.camposDDFaltantes.push(label);
    }

    // 4. Direccion compania (aparece en Word)
    checkField('dirCompCallePrincipal', dirComp.callePrincipal, false);
    checkField('dirCompProvincia', dirComp.provincia, false);
    checkField('dirCompCanton', dirComp.canton, false);
    checkField('dirCompParroquia', dirComp.parroquia, false);

    // 5. Representante legal - UAFE obligatorio
    checkField('repApellidos', representante.apellidos, true);
    checkField('repNombres', representante.nombres, true);
    checkField('repTipoId', representante.tipoIdentificacion, false);
    checkField('repNumeroId', representante.numeroIdentificacion, true);

    // 6. Representante - debida diligencia
    checkField('repGenero', representante.genero, false);
    checkField('repEstadoCivil', representante.estadoCivil, false);
    checkField('repNivelEstudio', representante.nivelEstudio, false);
    checkField('repCelular', representante.celular, false);
    checkField('repCorreo', representante.correoElectronico, false);

    // 7. Direccion representante (aparece en Word)
    checkField('dirRepCallePrincipal', dirRep.callePrincipal, false);
    checkField('dirRepProvincia', dirRep.provincia, false);
    checkField('dirRepCanton', dirRep.canton, false);
    checkField('dirRepParroquia', dirRep.parroquia, false);

    // 8. PEP
    const pep = juridica.declaracionPEP || {};
    checkField('pep', pep.esPEP != null ? String(pep.esPEP) : null, false);

    // 9. Si representante es casado, validar cónyuge
    const repEsCasado = ['CASADO', 'UNION_LIBRE', 'CASADO_CON_DISOLUCION', 'UNION_LIBRE_CON_SEPARACION'].includes(representante.estadoCivil);
    if (repEsCasado) {
        checkField('conyugeRepApellidos', conyugeRep.apellidos, false);
        checkField('conyugeRepNombres', conyugeRep.nombres, false);
        checkField('conyugeRepNumeroId', conyugeRep.numeroIdentificacion, false);
    }

    // Calcular porcentaje
    if (camposTotal > 0) {
        resultado.porcentaje = Math.round((camposLlenos / camposTotal) * 100);
    }

    // Determinar estado
    if (resultado.camposUafeFaltantes.length > 0) {
        resultado.estado = resultado.porcentaje === 0 ? 'pendiente' : 'incompleto';
    } else if (resultado.camposDDFaltantes.length > 0) {
        resultado.estado = 'incompleto';
    } else {
        resultado.estado = 'completo';
    }

    if (resultado.porcentaje === 0) {
        resultado.estado = 'pendiente';
    }

    resultado.detalles = {
        camposTotal,
        camposLlenos,
        repEsCasado,
        uafeCompleto: resultado.camposUafeFaltantes.length === 0,
    };

    return resultado;
}

/**
 * Sincroniza la completitud de todos los participantes de un protocolo
 * 
 * @param {string} protocoloId - ID del protocolo
 * @returns {Promise<Object>} - Resumen de la sincronización
 */
export async function sincronizarCompletitudProtocolo(protocoloId) {
    try {
        // Obtener todas las personas del protocolo
        const participantes = await prisma.personaProtocolo.findMany({
            where: { protocoloId },
            include: {
                persona: true
            }
        });

        const actualizaciones = [];

        for (const participante of participantes) {
            let completitud;

            if (!participante.persona) {
                // Persona no registrada aún
                completitud = {
                    estado: 'pendiente',
                    porcentaje: 0,
                    camposFaltantes: ['Persona no registrada']
                };
            } else {
                // Calcular según tipo de persona
                if (participante.persona.tipoPersona === 'NATURAL') {
                    completitud = calcularCompletitudPersonaNatural(participante.persona);
                } else {
                    completitud = calcularCompletitudPersonaJuridica(participante.persona);
                }
            }

            // Actualizar en BD
            await prisma.personaProtocolo.update({
                where: { id: participante.id },
                data: {
                    estadoCompletitud: completitud.estado,
                    porcentajeCompletitud: completitud.porcentaje,
                    camposFaltantes: completitud.camposFaltantes
                }
            });

            actualizaciones.push({
                personaCedula: participante.personaCedula,
                estadoAnterior: participante.estadoCompletitud,
                estadoNuevo: completitud.estado,
                porcentaje: completitud.porcentaje
            });
        }

        return {
            success: true,
            protocoloId,
            totalParticipantes: participantes.length,
            actualizaciones
        };
    } catch (error) {
        console.error('Error sincronizando completitud:', error);
        throw error;
    }
}

/**
 * Obtiene el estado general de completitud de un protocolo
 * Verifica si todos los participantes tienen semáforo verde
 * 
 * @param {string} protocoloId - ID del protocolo
 * @returns {Promise<Object>} - Estado general y detalles
 */
export async function obtenerEstadoGeneralProtocolo(protocoloId) {
    try {
        const participantes = await prisma.personaProtocolo.findMany({
            where: { protocoloId },
            include: {
                persona: true
            },
            orderBy: { orden: 'asc' }
        });

        if (participantes.length === 0) {
            return {
                estadoGeneral: 'pendiente',
                puedeGenerar: false,
                mensaje: 'No hay participantes agregados',
                participantes: []
            };
        }

        const detalles = participantes.map(p => ({
            id: p.id,
            cedulaRuc: p.personaCedula,
            nombreCompleto: p.persona ?
                (p.persona.tipoPersona === 'NATURAL' ?
                    `${p.persona.datosPersonaNatural?.datosPersonales?.apellidos || ''} ${p.persona.datosPersonaNatural?.datosPersonales?.nombres || ''}`.trim() :
                    p.persona.datosPersonaJuridica?.compania?.razonSocial || ''
                ) : null,
            nombreTemporal: p.nombreTemporal,
            calidad: p.calidad,
            estado: p.estadoCompletitud,
            porcentaje: p.porcentajeCompletitud,
            camposFaltantes: p.camposFaltantes || []
        }));

        // Determinar si todos están completos
        const todosCompletos = participantes.every(p => p.estadoCompletitud === 'completo');
        const algunoPendiente = participantes.some(p => p.estadoCompletitud === 'pendiente');

        let estadoGeneral;
        if (todosCompletos) {
            estadoGeneral = 'completo';
        } else if (algunoPendiente) {
            estadoGeneral = 'pendiente';
        } else {
            estadoGeneral = 'incompleto';
        }

        return {
            estadoGeneral,
            puedeGenerar: todosCompletos,
            totalParticipantes: participantes.length,
            completados: participantes.filter(p => p.estadoCompletitud === 'completo').length,
            incompletos: participantes.filter(p => p.estadoCompletitud === 'incompleto').length,
            pendientes: participantes.filter(p => p.estadoCompletitud === 'pendiente').length,
            participantes: detalles
        };
    } catch (error) {
        console.error('Error obteniendo estado general:', error);
        throw error;
    }
}

/**
 * Calcula y actualize la completitud de una persona específica en un protocolo
 * 
 * @param {string} personaProtocoloId - ID de PersonaProtocolo
 * @returns {Promise<Object>} - Completitud calculada
 */
export async function calcularYActualizarCompletitud(personaProtocoloId) {
    try {
        const participante = await prisma.personaProtocolo.findUnique({
            where: { id: personaProtocoloId },
            include: { persona: true }
        });

        if (!participante) {
            throw new Error('Participante no encontrado');
        }

        let completitud;

        if (!participante.persona) {
            completitud = {
                estado: 'pendiente',
                porcentaje: 0,
                camposFaltantes: ['Persona no registrada']
            };
        } else {
            if (participante.persona.tipoPersona === 'NATURAL') {
                completitud = calcularCompletitudPersonaNatural(participante.persona);
            } else {
                completitud = calcularCompletitudPersonaJuridica(participante.persona);
            }
        }

        // Actualizar en BD
        await prisma.personaProtocolo.update({
            where: { id: personaProtocoloId },
            data: {
                estadoCompletitud: completitud.estado,
                porcentajeCompletitud: completitud.porcentaje,
                camposFaltantes: completitud.camposFaltantes
            }
        });

        return completitud;
    } catch (error) {
        console.error('Error calculando completitud:', error);
        throw error;
    }
}

/**
 * Calcula automáticamente el estado de un protocolo UAFE basado en sus datos.
 * REPORTADO es irreversible (solo lo pone reporte-uafe-generator-service).
 *
 * BORRADOR           → Falta tipoActo, valorContrato, o 0 comparecientes
 * EN_PROCESO         → Tiene datos base pero comparecientes incompletos
 * PENDIENTE_PROTOCOLO → Comparecientes completos pero falta No. protocolo
 * COMPLETO           → Todo listo para reporte
 *
 * @param {string} protocoloId
 * @returns {Promise<string>} nuevo estado
 */
export async function calcularEstadoProtocolo(protocoloId) {
    const protocolo = await prisma.protocoloUAFE.findUnique({
        where: { id: protocoloId },
        include: {
            personas: { select: { estadoCompletitud: true } }
        }
    });

    if (!protocolo) throw new Error('Protocolo no encontrado');

    // REPORTADO es irreversible
    if (protocolo.estado === 'REPORTADO') return 'REPORTADO';

    const personas = protocolo.personas || [];
    const hasTipoActo = !!protocolo.tipoActo;
    const hasCuantia = protocolo.valorContrato != null;
    const hasPersonas = personas.length > 0;
    const hasProtocolNumber = !!protocolo.numeroProtocolo;
    const allComplete = hasPersonas && personas.every(p => p.estadoCompletitud === 'completo');

    let nuevoEstado;

    if (!hasTipoActo || !hasCuantia || !hasPersonas) {
        nuevoEstado = 'BORRADOR';
    } else if (!allComplete) {
        nuevoEstado = 'EN_PROCESO';
    } else if (!hasProtocolNumber) {
        nuevoEstado = 'PENDIENTE_PROTOCOLO';
    } else {
        nuevoEstado = 'COMPLETO';
    }

    // Solo actualizar si cambió
    if (nuevoEstado !== protocolo.estado) {
        await prisma.protocoloUAFE.update({
            where: { id: protocoloId },
            data: { estado: nuevoEstado }
        });
    }

    return nuevoEstado;
}

export default {
    calcularCompletitudPersonaNatural,
    calcularCompletitudPersonaJuridica,
    sincronizarCompletitudProtocolo,
    obtenerEstadoGeneralProtocolo,
    calcularYActualizarCompletitud,
    calcularEstadoProtocolo
};
