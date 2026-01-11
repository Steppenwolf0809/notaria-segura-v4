import { getPrismaClient } from '../db.js';

const prisma = getPrismaClient();

/**
 * Servicio para generar y validar códigos de retiro únicos
 * Implementa algoritmos seguros y verificación de unicidad
 */
class CodigoRetiroService {

    /**
     * Generar código numérico de 4 dígitos
     * Evita códigos fáciles de adivinar (0000, 1111, 1234, etc.)
     */
    static generar() {
        let codigo;
        do {
            codigo = Math.floor(1000 + Math.random() * 9000).toString();
        } while (this.esCodigoDebil(codigo));

        return codigo;
    }

    /**
     * Verificar si un código es considerado débil o predecible
     */
    static esCodigoDebil(codigo) {
        // Códigos con todos los dígitos iguales (0000, 1111, 2222, etc.)
        if (/^(\d)\1{3}$/.test(codigo)) {
            return true;
        }

        // Secuencias ascendentes (1234, 2345, etc.)
        if (this.esSecuenciaAscendente(codigo)) {
            return true;
        }

        // Secuencias descendentes (4321, 5432, etc.)
        if (this.esSecuenciaDescendente(codigo)) {
            return true;
        }

        // Códigos comunes débiles
        const codigosDebiles = ['0000', '1111', '2222', '3333', '4444', '5555',
            '6666', '7777', '8888', '9999', '1234', '4321',
            '0123', '3210', '1010', '2020'];
        if (codigosDebiles.includes(codigo)) {
            return true;
        }

        return false;
    }

    /**
     * Verificar si es secuencia ascendente
     */
    static esSecuenciaAscendente(codigo) {
        for (let i = 0; i < codigo.length - 1; i++) {
            if (parseInt(codigo[i + 1]) !== parseInt(codigo[i]) + 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * Verificar si es secuencia descendente
     */
    static esSecuenciaDescendente(codigo) {
        for (let i = 0; i < codigo.length - 1; i++) {
            if (parseInt(codigo[i + 1]) !== parseInt(codigo[i]) - 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * Verificar que código sea válido (4 dígitos numéricos)
     */
    static validar(codigo) {
        return /^\d{4}$/.test(codigo);
    }

    /**
     * Generar código único verificando contra la base de datos
     * Utiliza el campo existente 'codigoRetiro' en la tabla Document
     */
    static async generarUnico(maxIntentos = 10) {
        let codigo;
        let existe = true;
        let intentos = 0;

        while (existe && intentos < maxIntentos) {
            codigo = this.generar();

            try {
                // Verificar si el código ya existe en documentos activos
                const documentoExistente = await prisma.document.findFirst({
                    where: {
                        codigoRetiro: codigo,
                        // Solo verificar contra documentos que aún no han sido entregados
                        status: {
                            in: ['LISTO'] // Solo documentos listos pueden tener conflicto
                        }
                    }
                });

                existe = !!documentoExistente;
                intentos++;

                if (existe) {
                    console.log(`⚠️ Código ${codigo} ya existe, generando nuevo... (intento ${intentos})`);
                }
            } catch (error) {
                console.error('Error verificando unicidad del código:', error);
                // En caso de error de BD, continuar con el código generado
                existe = false;
            }
        }

        if (intentos >= maxIntentos) {
            throw new Error(`No se pudo generar código único después de ${maxIntentos} intentos`);
        }

        console.log(`✅ Código único generado: ${codigo} (${intentos} intentos)`);
        return codigo;
    }

    /**
     * Generar código único para grupos de documentos (Obsoleto)
     * Redirigido a generarUnico para compatibilidad
     */
    static async generarUnicoGrupo(maxIntentos = 10) {
        return this.generarUnico(maxIntentos);
    }

    /**
     * Validar código de retiro contra la base de datos
     * Retorna información del documento asociado si es válido
     */
    static async validarCodigo(codigo) {
        if (!this.validar(codigo)) {
            return {
                valido: false,
                error: 'Formato de código inválido'
            };
        }

        try {
            // Buscar documento con este código
            const documento = await prisma.document.findFirst({
                where: {
                    codigoRetiro: codigo,
                    status: 'LISTO'
                },
                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            if (!documento) {
                return {
                    valido: false,
                    error: 'Código no encontrado o documento no disponible para retiro'
                };
            }

            return {
                valido: true,
                documento: {
                    id: documento.id,
                    numeroDocumento: documento.protocolNumber,
                    tipoDocumento: documento.tipoDocumento,
                    clienteNombre: documento.clientName,
                    clienteTelefono: documento.clientPhone,
                    fechaCreacion: documento.createdAt,
                    asignadoA: documento.assignedTo
                }
            };
        } catch (error) {
            console.error('Error validando código:', error);
            return {
                valido: false,
                error: 'Error interno validando código'
            };
        }
    }

    /**
     * Obtener estadísticas de códigos activos
     */
    static async obtenerEstadisticas() {
        try {
            const [individuales, grupales, entregados] = await Promise.all([
                prisma.document.count({
                    where: {
                        status: 'LISTO'
                    }
                }),
                prisma.document.count({
                    where: {
                        status: 'LISTO'
                    }
                }),
                prisma.document.count({
                    where: {
                        status: 'ENTREGADO'
                    }
                })
            ]);

            return {
                codigosIndividualesActivos: individuales,
                codigosGrupalesActivos: grupales,
                documentosEntregados: entregados,
                totalActivos: individuales + grupales
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {
                error: 'Error obteniendo estadísticas'
            };
        }
    }

    /**
     * Limpiar códigos expirados (opcional, para mantenimiento)
     * Códigos de documentos entregados hace más de X días
     */
    static async limpiarCodigosExpirados(diasExpiracion = 30) {
        try {
            const fechaExpiracion = new Date();
            fechaExpiracion.setDate(fechaExpiracion.getDate() - diasExpiracion);

            const documentosLimpiados = await prisma.document.updateMany({
                where: {
                    status: 'ENTREGADO',
                    updatedAt: {
                        lt: fechaExpiracion
                    },
                    codigoRetiro: {
                        not: null
                    }
                },
                data: {
                    codigoRetiro: null
                }
            });

            console.log(`🧹 Limpiados ${documentosLimpiados.count} códigos expirados`);
            return documentosLimpiados.count;
        } catch (error) {
            console.error('Error limpiando códigos expirados:', error);
            return 0;
        }
    }
}

export default CodigoRetiroService;