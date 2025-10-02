/**
 * ============================================
 * 🔐 SCRIPT DE RESET DE CONTRASEÑAS
 * ============================================
 * 
 * PROPÓSITO: Resetear contraseñas de usuarios existentes a una contraseña conocida
 * 
 * USO:
 *   node backend/scripts/reset-passwords.js
 *   
 * CONTRASEÑA NUEVA: Notaria123.
 * USUARIOS AFECTADOS: TODOS (13 usuarios)
 * 
 * ============================================
 * CONCEPTOS EDUCATIVOS:
 * ============================================
 * 
 * 1. ¿QUÉ ES BCRYPT?
 *    - Librería para hashear contraseñas de forma segura
 *    - Convierte "Notaria123." en algo como "$2a$10$abc123..."
 *    - ES UNIDIRECCIONAL: No se puede revertir el hash
 * 
 * 2. ¿QUÉ ES UN HASH?
 *    - Una "huella digital" única de la contraseña
 *    - Cada vez que hasheas, genera un resultado diferente (gracias al "salt")
 *    - Pero bcrypt.compare() puede verificar si coinciden
 * 
 * 3. ¿POR QUÉ NO GUARDAMOS CONTRASEÑAS EN TEXTO PLANO?
 *    - Si alguien accede a la DB, vería todas las contraseñas
 *    - Con hash, solo ven strings sin sentido
 *    - Bcrypt es especialmente seguro porque es "lento" (previene ataques de fuerza bruta)
 * 
 * 4. FLUJO DE ESTE SCRIPT:
 *    a) Conectar a base de datos con Prisma
 *    b) Hashear la contraseña "Notaria123." UNA VEZ
 *    c) Actualizar TODOS los usuarios con ese hash
 *    d) Loggear resultados
 *    e) Desconectar limpiamente
 * 
 * ============================================
 */

// ============================================
// IMPORTACIONES
// ============================================

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { getPrismaClient, closePrismaClient } from '../src/db.js';

// Cargar variables de entorno desde .env
dotenv.config();

// ============================================
// CONFIGURACIÓN
// ============================================

const NEW_PASSWORD = 'Notaria123.';
const BCRYPT_ROUNDS = 10; // Número de "rondas" de hashing (mayor = más seguro pero más lento)

// Lista completa de usuarios (según especificación)
const USUARIOS_A_RESETEAR = [
  { id: 1, email: 'admin@notaria.com', role: 'ADMIN' },
  { id: 2, email: 'cindy.pazmino@notaria.com', role: 'CAJA' },
  { id: 3, email: 'mayra.corella@notaria.com', role: 'MATRIZADOR' },
  { id: 4, email: 'karol.velastegui@notaria.com', role: 'MATRIZADOR' },
  { id: 5, email: 'jose.zapata@notaria.com', role: 'MATRIZADOR' },
  { id: 6, email: 'gissela.velastegui@notaria.com', role: 'MATRIZADOR' },
  { id: 7, email: 'francisco.proano@notaria.com', role: 'MATRIZADOR' },
  { id: 8, email: 'recepcion@notaria.com', role: 'RECEPCION' },
  { id: 9, email: 'maria.diaz@notaria.com', role: 'ARCHIVO' },
  { id: 10, email: 'mauricio.quinga@notaria.com', role: 'CAJA' },
  { id: 11, email: 'gisserecepcion@notaria.com', role: 'RECEPCION' },
  { id: 12, email: 'sistema-caja@notaria.local', role: 'CAJA' },
  { id: 13, email: 'edgar.chalan@notaria.com', role: 'RECEPCION' }
];

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function resetPasswords() {
  const prisma = getPrismaClient();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 INICIANDO RESET DE CONTRASEÑAS');
    console.log('='.repeat(60) + '\n');
    
    // ============================================
    // PASO 1: HASHEAR LA NUEVA CONTRASEÑA
    // ============================================
    console.log(`🔑 Hasheando contraseña: "${NEW_PASSWORD}"`);
    console.log(`   (usando ${BCRYPT_ROUNDS} rondas de bcrypt)\n`);
    
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, BCRYPT_ROUNDS);
    
    console.log('✅ Hash generado correctamente');
    console.log(`   Hash: ${hashedPassword.substring(0, 30)}...`);
    console.log('   (mostrando solo primeros 30 caracteres por seguridad)\n');
    
    // ============================================
    // PASO 2: VERIFICAR CONEXIÓN A BASE DE DATOS
    // ============================================
    console.log('🔌 Verificando conexión a base de datos...');
    
    const userCount = await prisma.user.count();
    console.log(`✅ Conexión exitosa - ${userCount} usuarios en la base de datos\n`);
    
    if (userCount === 0) {
      console.log('⚠️  ADVERTENCIA: No hay usuarios en la base de datos');
      console.log('   Este script no tiene nada que actualizar.\n');
      return;
    }
    
    // ============================================
    // PASO 3: ACTUALIZAR USUARIOS
    // ============================================
    console.log('📝 Actualizando usuarios:\n');
    
    let actualizados = 0;
    let errores = 0;
    
    for (let i = 0; i < USUARIOS_A_RESETEAR.length; i++) {
      const usuario = USUARIOS_A_RESETEAR[i];
      const numero = i + 1;
      const total = USUARIOS_A_RESETEAR.length;
      
      try {
        // Buscar usuario por email (más confiable que por ID)
        const existeUsuario = await prisma.user.findUnique({
          where: { email: usuario.email }
        });
        
        if (!existeUsuario) {
          console.log(`⚠️  [${numero}/${total}] ${usuario.email} - NO ENCONTRADO (saltando)`);
          continue;
        }
        
        // Actualizar contraseña
        await prisma.user.update({
          where: { email: usuario.email },
          data: { password: hashedPassword }
        });
        
        console.log(`✅ [${numero}/${total}] ${usuario.email} (${usuario.role})`);
        actualizados++;
        
      } catch (error) {
        console.log(`❌ [${numero}/${total}] ${usuario.email} - ERROR: ${error.message}`);
        errores++;
      }
    }
    
    // ============================================
    // PASO 4: RESUMEN FINAL
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE EJECUCIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Usuarios actualizados: ${actualizados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📋 Total procesados: ${USUARIOS_A_RESETEAR.length}`);
    console.log('='.repeat(60) + '\n');
    
    if (actualizados > 0) {
      console.log('✨ Reset completado exitosamente\n');
      console.log('🔐 CREDENCIALES DE ACCESO:');
      console.log('   Email: (cualquiera de los usuarios actualizados)');
      console.log(`   Password: ${NEW_PASSWORD}\n`);
      console.log('💡 IMPORTANTE:');
      console.log('   - Todos los usuarios tienen la MISMA contraseña');
      console.log('   - Se recomienda que cada usuario cambie su contraseña después del primer login');
      console.log('   - Este script NO debe commitearse a Git con contraseñas hardcodeadas\n');
    } else {
      console.log('⚠️  No se actualizó ningún usuario\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:');
    console.error('   ' + error.message);
    console.error('\n📋 Detalles técnicos:');
    console.error(error);
    console.log('\n💡 POSIBLES CAUSAS:');
    console.log('   - Variables de entorno no configuradas (DATABASE_URL)');
    console.log('   - Base de datos no accesible');
    console.log('   - Problema de permisos\n');
    process.exit(1);
    
  } finally {
    // ============================================
    // PASO 5: LIMPIEZA Y CIERRE
    // ============================================
    console.log('🔌 Cerrando conexión a base de datos...');
    await closePrismaClient();
    console.log('✅ Desconexión exitosa\n');
  }
}

// ============================================
// EJECUCIÓN
// ============================================

console.log('\n🚀 Ejecutando script de reset de contraseñas...\n');

resetPasswords()
  .then(() => {
    console.log('✅ Script finalizado correctamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error inesperado al ejecutar el script:');
    console.error(error);
    process.exit(1);
  });

// ============================================
// NOTAS ADICIONALES PARA EL DESARROLLADOR
// ============================================

/**
 * PREGUNTAS FRECUENTES:
 * 
 * 1. ¿Por qué hashear solo una vez y no para cada usuario?
 *    - Bcrypt es computacionalmente costoso (eso es bueno para seguridad)
 *    - Como todos tendrán la misma contraseña, podemos reutilizar el hash
 *    - El hash incluye un "salt" único, pero eso no importa porque:
 *      * Cada hash puede verificar la misma contraseña
 *      * No afecta la seguridad en este caso de uso
 * 
 * 2. ¿Qué pasa si un usuario no existe?
 *    - El script lo detecta y lo salta
 *    - Continúa con el resto de usuarios
 *    - No genera error crítico
 * 
 * 3. ¿Puedo cambiar la contraseña?
 *    - Sí, modifica la constante NEW_PASSWORD
 *    - Asegúrate de que cumpla los requisitos de seguridad:
 *      * Mínimo 8 caracteres
 *      * Al menos una mayúscula
 *      * Al menos una minúscula
 *      * Al menos un número
 *      * Al menos un carácter especial (recomendado)
 * 
 * 4. ¿Es seguro tener la contraseña en el código?
 *    - NO para producción real
 *    - Este script es para desarrollo/recuperación
 *    - En producción, usarías: process.env.ADMIN_PASSWORD
 *    - NUNCA commitees este archivo a Git si tiene contraseñas reales
 * 
 * 5. ¿Por qué no usar prisma.user.updateMany()?
 *    - Se podría hacer, pero este enfoque es más educativo
 *    - Muestra el progreso de cada usuario
 *    - Permite detectar usuarios faltantes
 *    - Para 13 usuarios, la diferencia de velocidad es insignificante
 * 
 * EJEMPLO DE VERSIÓN CON updateMany() (más rápida):
 * 
 *   const result = await prisma.user.updateMany({
 *     data: { password: hashedPassword }
 *   });
 *   console.log(`✅ ${result.count} usuarios actualizados`);
 * 
 * Pero pierde el feedback individual que es valioso para aprender.
 */

