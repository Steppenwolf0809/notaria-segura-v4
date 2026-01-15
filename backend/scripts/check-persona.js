import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPersona() {
    const cedula = '0603123340';

    try {
        const persona = await prisma.personaRegistrada.findUnique({
            where: { numeroIdentificacion: cedula },
            select: {
                numeroIdentificacion: true,
                tipoPersona: true,
                completado: true,
                datosPersonaNatural: true
            }
        });

        if (!persona) {
            console.log('❌ Persona NO encontrada en base de datos');
            return;
        }

        console.log('═══════════════════════════════════════════');
        console.log('         VERIFICACIÓN DE PERSONA');
        console.log('═══════════════════════════════════════════\n');

        console.log('Cédula:', persona.numeroIdentificacion);
        console.log('Tipo:', persona.tipoPersona);
        console.log('Completado (campo en BD):', persona.completado ? '✅ SÍ' : '❌ NO');
        console.log('');

        const datos = persona.datosPersonaNatural || {};

        console.log('=== DATOS PERSONALES ===');
        console.log('Nombres:', datos.datosPersonales?.nombres || '❌ FALTA');
        console.log('Apellidos:', datos.datosPersonales?.apellidos || '❌ FALTA');
        console.log('Género:', datos.datosPersonales?.genero || '❌ FALTA');
        console.log('Estado Civil:', datos.datosPersonales?.estadoCivil || '❌ FALTA');
        console.log('Nacionalidad:', datos.datosPersonales?.nacionalidad || '❌ FALTA');
        console.log('Fecha Nacimiento:', datos.datosPersonales?.fechaNacimiento || '❌ FALTA');
        console.log('');

        console.log('=== CONTACTO ===');
        console.log('Email:', datos.contacto?.email || '❌ FALTA');
        console.log('Celular:', datos.contacto?.celular || '❌ FALTA');
        console.log('');

        console.log('=== DIRECCIÓN ===');
        console.log('Calle Principal:', datos.direccion?.callePrincipal || '❌ FALTA');
        console.log('Número:', datos.direccion?.numero || '(opcional)');
        console.log('Calle Secundaria:', datos.direccion?.calleSecundaria || '(opcional)');
        console.log('Parroquia:', datos.direccion?.parroquia || '❌ FALTA');
        console.log('Cantón:', datos.direccion?.canton || '❌ FALTA');
        console.log('Provincia:', datos.direccion?.provincia || '(opcional)');
        console.log('');

        console.log('=== INFORMACIÓN LABORAL ===');
        console.log('Profesión/Ocupación:', datos.informacionLaboral?.profesionOcupacion || '❌ FALTA');
        console.log('Actividad Económica:', datos.informacionLaboral?.actividadEconomica || '❌ FALTA');
        console.log('');

        // Buscar participaciones
        const participaciones = await prisma.personaProtocolo.findMany({
            where: { personaCedula: cedula },
            select: {
                id: true,
                completado: true,
                estadoCompletitud: true,
                porcentajeCompletitud: true,
                camposFaltantes: true,
                protocolo: { select: { numeroProtocolo: true } }
            }
        });

        console.log('=== PARTICIPACIONES EN PROTOCOLOS ===');
        if (participaciones.length === 0) {
            console.log('No hay participaciones');
        } else {
            participaciones.forEach(p => {
                console.log('');
                console.log('Protocolo:', p.protocolo.numeroProtocolo);
                console.log('  Completado (PersonaProtocolo):', p.completado ? '✅ SÍ' : '❌ NO');
                console.log('  Estado Completitud:', p.estadoCompletitud);
                console.log('  Porcentaje:', p.porcentajeCompletitud + '%');
                if (p.camposFaltantes && Array.isArray(p.camposFaltantes) && p.camposFaltantes.length > 0) {
                    console.log('  Campos Faltantes:', p.camposFaltantes.join(', '));
                }
            });
        }

    } finally {
        await prisma.$disconnect();
    }
}

checkPersona().catch(console.error);
