/**
 * Servicio de Validación de Completitud de Datos
 * 
 * Calcula qué tan completos están los datos de una persona
 * para determinar el estado del semáforo (🔴 🟡 🟢)
 */

import prisma from '../db.js';

/**
 * Calcula la completitud de datos de una Persona Natural
 * 
 * @param {Object} datos - Datos de persona natural desde PersonaRegistrada
 * @returns {Object} - { estado, porcentaje, camposFaltantes, detalles }
 */
export function calcularCompletitudPersonaNatural(datos) {
    const resultado = {
        estado: 'pendiente',
        porcentaje: 0,
        camposFaltantes: [],
        detalles: {}
    };

    if (!datos || !datos.datosPersonaNatural) {
        resultado.camposFaltantes = ['No hay datos registrados'];
        return resultado;
    }

    const personales = datos.datosPersonaNatural.datosPersonales || {};
    const contacto = datos.datosPersonaNatural.contacto || {};
    const direccion = datos.datosPersonaNatural.direccion || {};
    const laboral = datos.datosPersonaNatural.informacionLaboral || {};
    const conyuge = datos.datosPersonaNatural.conyuge || {};

    let camposTotal = 0;
    let camposLlenos = 0;

    // 1. Validar datos personales obligatorios
    const obligatoriosPersonales = [
        { campo: 'apellidos', valor: personales.apellidos },
        { campo: 'nombres', valor: personales.nombres },
        { campo: 'genero', valor: personales.genero },
        { campo: 'estadoCivil', valor: personales.estadoCivil },
        { campo: 'celular', valor: contacto.celular }
    ];

    obligatoriosPersonales.forEach(item => {
        camposTotal++;
        if (item.valor && String(item.valor).trim() !== '') {
            camposLlenos++;
        } else {
            resultado.camposFaltantes.push(item.campo);
        }
    });

    // 2. Validar dirección obligatoria
    const obligatoriosDireccion = [
        { campo: 'callePrincipal', valor: direccion.callePrincipal },
        { campo: 'numeroCasa', valor: direccion.numero },
        { campo: 'provincia', valor: direccion.provincia },
        { campo: 'canton', valor: direccion.canton },
        { campo: 'parroquia', valor: direccion.parroquia }
    ];

    obligatoriosDireccion.forEach(item => {
        camposTotal++;
        if (item.valor && String(item.valor).trim() !== '') {
            camposLlenos++;
        } else {
            resultado.camposFaltantes.push(item.campo);
        }
    });

    // 3. Validar información laboral mínima
    camposTotal += 2;
    if (laboral.situacion) {
        camposLlenos++;
    } else {
        resultado.camposFaltantes.push('situacionLaboral');
    }

    if (laboral.profesionOcupacion) {
        camposLlenos++;
    } else {
        resultado.camposFaltantes.push('profesion');
    }

    // 4. Si es casado o unión libre, validar cónyuge
    if (personales.estadoCivil === 'CASADO' || personales.estadoCivil === 'UNION_LIBRE') {
        const obligatoriosConyuge = [
            { campo: 'conyugeApellidos', valor: conyuge.apellidos },
            { campo: 'conyugeNombres', valor: conyuge.nombres },
            { campo: 'conyugeNumeroId', valor: conyuge.numeroIdentificacion }
        ];

        obligatoriosConyuge.forEach(item => {
            camposTotal++;
            if (item.valor && String(item.valor).trim() !== '') {
                camposLlenos++;
            } else {
                resultado.camposFaltantes.push(item.campo);
            }
        });
    }

    // Calcular porcentaje
    if (camposTotal > 0) {
        resultado.porcentaje = Math.round((camposLlenos / camposTotal) * 100);
    }

    // Determinar estado
    if (resultado.porcentaje === 0) {
        resultado.estado = 'pendiente';  // 🔴
    } else if (resultado.porcentaje < 100) {
        resultado.estado = 'incompleto'; // 🟡
    } else {
        resultado.estado = 'completo';   // 🟢
    }

    resultado.detalles = {
        camposTotal,
        camposLlenos,
        esCasado: personales.estadoCivil === 'CASADO' || personales.estadoCivil === 'UNION_LIBRE'
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
        detalles: {}
    };

    if (!datos || !datos.datosPersonaJuridica) {
        resultado.camposFaltantes = ['No hay datos registrados'];
        return resultado;
    }

    const juridica = datos.datosPersonaJuridica;
    const compania = juridica.compania || {};
    const representante = juridica.representanteLegal || {};
    const conyugeRep = juridica.conyugeRepresentante || {};

    let camposTotal = 0;
    let camposLlenos = 0;

    // 1. Validar datos de la compañía
    const obligatoriosCompania = [
        { campo: 'razonSocial', valor: compania.razonSocial },
        { campo: 'ruc', valor: compania.ruc },
        { campo: 'objetoSocial', valor: compania.objetoSocial },
        { campo: 'parroquia', valor: compania.parroquia }
    ];

    obligatoriosCompania.forEach(item => {
        camposTotal++;
        if (item.valor && String(item.valor).trim() !== '') {
            camposLlenos++;
        } else {
            resultado.camposFaltantes.push(item.campo);
        }
    });

    // Al menos un contacto
    camposTotal++;
    if (compania.emailCompania || compania.telefonoCompania || compania.celularCompania) {
        camposLlenos++;
    } else {
        resultado.camposFaltantes.push('contactoCompania');
    }

    // 2. Validar representante legal
    const obligatoriosRepresentante = [
        { campo: 'repApellidos', valor: representante.apellidos },
        { campo: 'repNombres', valor: representante.nombres },
        { campo: 'repNumeroId', valor: representante.numeroIdentificacion },
        { campo: 'repGenero', valor: representante.genero },
        { campo: 'repEstadoCivil', valor: representante.estadoCivil }
    ];

    obligatoriosRepresentante.forEach(item => {
        camposTotal++;
        if (item.valor && String(item.valor).trim() !== '') {
            camposLlenos++;
        } else {
            resultado.camposFaltantes.push(item.campo);
        }
    });

    // 3. Si representante es casado, validar cónyuge
    if (representante.estadoCivil === 'CASADO' || representante.estadoCivil === 'UNION_LIBRE') {
        const obligatoriosConyuge = [
            { campo: 'conyugeRepApellidos', valor: conyugeRep.apellidos },
            { campo: 'conyugeRepNombres', valor: conyugeRep.nombres },
            { campo: 'conyugeRepNumeroId', valor: conyugeRep.numeroIdentificacion }
        ];

        obligatoriosConyuge.forEach(item => {
            camposTotal++;
            if (item.valor && String(item.valor).trim() !== '') {
                camposLlenos++;
            } else {
                resultado.camposFaltantes.push(item.campo);
            }
        });
    }

    // Calcular porcentaje
    if (camposTotal > 0) {
        resultado.porcentaje = Math.round((camposLlenos / camposTotal) * 100);
    }

    // Determinar estado
    if (resultado.porcentaje === 0) {
        resultado.estado = 'pendiente';  // 🔴
    } else if (resultado.porcentaje < 100) {
        resultado.estado = 'incompleto'; // 🟡
    } else {
        resultado.estado = 'completo';   // 🟢
    }

    resultado.detalles = {
        camposTotal,
        camposLlenos,
        repEsCasado: representante.estadoCivil === 'CASADO' || representante.estadoCivil === 'UNION_LIBRE'
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
