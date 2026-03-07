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

// Labels legibles para los campos faltantes
const LABELS_CAMPOS = {
    apellidos: 'Apellidos',
    nombres: 'Nombres',
    genero: 'Genero',
    estadoCivil: 'Estado civil',
    nacionalidad: 'Nacionalidad',
    celular: 'Celular',
    correo: 'Correo electronico',
    callePrincipal: 'Calle principal',
    numeroCasa: 'Numero de casa',
    provincia: 'Provincia',
    canton: 'Canton',
    parroquia: 'Parroquia',
    situacionLaboral: 'Situacion laboral',
    profesion: 'Profesion/Ocupacion',
    ingresoMensual: 'Ingreso mensual',
    conyugeApellidos: 'Apellidos conyuge',
    conyugeNombres: 'Nombres conyuge',
    conyugeNumeroId: 'Cedula conyuge',
    pep: 'Declaracion PEP',
    razonSocial: 'Razon social',
    ruc: 'RUC',
    objetoSocial: 'Objeto social',
    contactoCompania: 'Contacto compania',
    repApellidos: 'Apellidos representante',
    repNombres: 'Nombres representante',
    repNumeroId: 'Cedula representante',
    repGenero: 'Genero representante',
    repEstadoCivil: 'Estado civil representante',
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

    // 2. Campos debida diligencia (no bloquean reporte)
    checkField('genero', personales.genero, false);
    checkField('estadoCivil', personales.estadoCivil, false);
    checkField('celular', contacto.celular, false);
    checkField('correo', contacto.correoElectronico || contacto.correo, false);

    // 3. Dirección - debida diligencia
    checkField('callePrincipal', direccion.callePrincipal, false);
    checkField('numeroCasa', direccion.numero, false);
    checkField('provincia', direccion.provincia, false);
    checkField('canton', direccion.canton, false);
    checkField('parroquia', direccion.parroquia, false);

    // 4. Información laboral - debida diligencia
    checkField('situacionLaboral', laboral.situacion, false);
    checkField('profesion', laboral.profesionOcupacion, false);

    // 5. PEP - debida diligencia
    checkField('pep', declaracion.esPEP != null ? String(declaracion.esPEP) : null, false);

    // 6. Si es casado o unión libre, cónyuge - debida diligencia
    if (personales.estadoCivil === 'CASADO' || personales.estadoCivil === 'UNION_LIBRE') {
        checkField('conyugeApellidos', conyuge.apellidos, false);
        checkField('conyugeNombres', conyuge.nombres, false);
        checkField('conyugeNumeroId', conyuge.numeroIdentificacion, false);
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
        esCasado: personales.estadoCivil === 'CASADO' || personales.estadoCivil === 'UNION_LIBRE',
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
    const representante = juridica.representanteLegal || {};
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

    // UAFE obligatorio
    checkField('razonSocial', compania.razonSocial, true);
    checkField('ruc', compania.ruc, true);

    // Debida diligencia
    checkField('objetoSocial', compania.objetoSocial, false);
    checkField('parroquia', compania.parroquia, false);

    // Al menos un contacto - DD
    camposTotal++;
    if (compania.emailCompania || compania.telefonoCompania || compania.celularCompania) {
        camposLlenos++;
    } else {
        const label = labelCampo('contactoCompania');
        resultado.camposFaltantes.push(label);
        resultado.camposDDFaltantes.push(label);
    }

    // Representante legal - UAFE obligatorio
    checkField('repApellidos', representante.apellidos, true);
    checkField('repNombres', representante.nombres, true);
    checkField('repNumeroId', representante.numeroIdentificacion, true);

    // DD
    checkField('repGenero', representante.genero, false);
    checkField('repEstadoCivil', representante.estadoCivil, false);

    // Si representante es casado, validar cónyuge (DD)
    if (representante.estadoCivil === 'CASADO' || representante.estadoCivil === 'UNION_LIBRE') {
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
        repEsCasado: representante.estadoCivil === 'CASADO' || representante.estadoCivil === 'UNION_LIBRE',
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

export default {
    calcularCompletitudPersonaNatural,
    calcularCompletitudPersonaJuridica,
    sincronizarCompletitudProtocolo,
    obtenerEstadoGeneralProtocolo,
    calcularYActualizarCompletitud
};
