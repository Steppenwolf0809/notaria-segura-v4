
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSpouseData() {
    try {
        const cedulaStefania = '1307186831';
        console.log(`Buscando registro principal de Stefania (${cedulaStefania})...`);

        const estefania = await prisma.personaRegistrada.findUnique({
            where: { numeroIdentificacion: cedulaStefania }
        });

        if (estefania) {
            console.log('✅ Registro encontrado de Stefania:', estefania.id);
            console.log('Has Data:', !!estefania.datosPersonaNatural);
            if (estefania.datosPersonaNatural) {
                console.log('Profesión:', estefania.datosPersonaNatural.informacionLaboral?.profesionOcupacion);
                console.log('Nombres:', estefania.datosPersonaNatural.datosPersonales?.nombres);
            }
        } else {
            console.log('❌ Stefania no tiene registro propio.');
        }

        // SIMULACIÓN LOGICA BACKEND
        console.log('\n========================================');
        console.log('🧪 PROBANDO LOGICA DE AUTO-POPULACION (Backen simulation)');

        if (!estefania?.datosPersonaNatural) {
            console.log('Stefania no tiene datos. Buscando en registros de esposos...');

            // Esto simula la query que pusimos en el controlador:
            // datosPersonaNatural -> conyuge -> numeroIdentificacion
            // Como no podemos correr query real con filtro JSON complejo aqui facilmente sin raw query,
            // haremos busqueda manual en la ID del esposo conocido para validar la estructura.

            const esposo = await prisma.personaRegistrada.findFirst({
                where: {
                    numeroIdentificacion: '0603123340' // ID del esposo conocido
                }
            });

            if (esposo) {
                const conyugeData = esposo.datosPersonaNatural.conyuge;
                if (conyugeData && conyugeData.numeroIdentificacion === cedulaStefania) {
                    console.log('✅ MATCH ENCONTRADO! Stefania aparece en el registro de:', esposo.numeroIdentificacion);
                    console.log('Datos extraíbles para auto-popular:', {
                        nombres: conyugeData.nombres,
                        apellidos: conyugeData.apellidos,
                        email: conyugeData.email,
                        celular: conyugeData.celular,
                        profesion: conyugeData.profesionOcupacion
                    });
                } else {
                    console.log('❌ El esposo existe pero los datos de cónyuge no coinciden con Stefania.');
                }
            } else {
                console.log('❌ No se encontró al esposo (simulación fallida).');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugSpouseData();
