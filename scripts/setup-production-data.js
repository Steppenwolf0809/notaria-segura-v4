#!/usr/bin/env node

/**
 * Script para configurar datos iniciales en producción
 * Crea usuario administrador inicial si no existe
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function setupProductionData() {
  console.log('🔧 Configurando datos iniciales de producción...')

  try {
    // Verificar conexión a la base de datos
    console.log('📡 Verificando conexión a la base de datos...')
    await prisma.$connect()
    console.log('✅ Conexión exitosa')

    // Verificar si ya existe un usuario administrador
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (existingAdmin) {
      console.log('✅ Usuario administrador ya existe:', existingAdmin.username)
      console.log('🎯 Datos de producción ya configurados')
      return
    }

    // Crear usuario administrador inicial
    console.log('👤 Creando usuario administrador inicial...')
    
    const adminData = {
      username: 'admin',
      email: 'admin@notaria.com',
      firstName: 'Administrador',
      lastName: 'Sistema',
      role: 'ADMIN',
      password: 'admin123', // Cambiar inmediatamente después del primer login
      isActive: true
    }

    const hashedPassword = await bcrypt.hash(adminData.password, 12)

    const adminUser = await prisma.user.create({
      data: {
        ...adminData,
        password: hashedPassword
      }
    })

    console.log('✅ Usuario administrador creado exitosamente')
    console.log('📝 Credenciales iniciales (CAMBIAR INMEDIATAMENTE):')
    console.log(`   Username: ${adminData.username}`)
    console.log(`   Password: ${adminData.password}`)
    console.log(`   Email: ${adminData.email}`)

    // Verificar templates de WhatsApp por defecto si es necesario
    const existingTemplates = await prisma.whatsAppTemplate.count()
    
    if (existingTemplates === 0) {
      console.log('📱 Creando templates de WhatsApp por defecto...')
      
      await prisma.whatsAppTemplate.createMany({
        data: [
          {
            templateType: 'DOCUMENTO_LISTO',
            title: 'Documento Listo para Retiro',
            message: `🏛️ *{notaria}*

Estimado/a {cliente},

Su documento está listo para retiro:
📄 *Documento:* {documento}
🔢 *Código de retiro:* {codigo}

⚠️ *IMPORTANTE:* Presente este código al momento del retiro.

📍 *Dirección:* Azuay E2-231 y Av Amazonas, Quito
⏰ *Horario:* Lunes a Viernes 8:00-17:00

¡Gracias por confiar en nosotros!`,
            variables: ['cliente', 'documento', 'codigo', 'notaria'],
            active: true
          },
          {
            templateType: 'DOCUMENTO_ENTREGADO',
            title: 'Confirmación de Entrega',
            message: `🏛️ *{notaria}*

Estimado/a {cliente},

✅ Confirmamos la entrega de su documento:
📄 *Documento:* {documento}
👤 *Retirado por:* {receptor_nombre}
📅 *Fecha y hora:* {fecha}

¡Gracias por confiar en nuestros servicios!`,
            variables: ['cliente', 'documento', 'receptor_nombre', 'fecha', 'notaria'],
            active: true
          }
        ]
      })
      
      console.log('✅ Templates de WhatsApp creados')
    }

    console.log('🎉 ¡Configuración inicial completada exitosamente!')
    console.log('')
    console.log('🔔 RECORDATORIOS IMPORTANTES:')
    console.log('1. Cambiar la contraseña del administrador inmediatamente')
    console.log('2. Configurar correctamente las variables de Twilio')
    console.log('3. Verificar que las notificaciones WhatsApp funcionen')
    console.log('4. Crear usuarios adicionales según necesidades')

  } catch (error) {
    console.error('❌ Error configurando datos iniciales:', error)
    console.error('')
    console.error('💡 Posibles soluciones:')
    console.error('1. Verificar que la DATABASE_URL sea correcta')
    console.error('2. Asegurarse de que las migraciones se aplicaron: npx prisma db deploy')
    console.error('3. Verificar conectividad a la base de datos')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  setupProductionData().catch(console.error)
}

export { setupProductionData }