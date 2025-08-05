import dotenv from 'dotenv';
import whatsappService from '../src/services/whatsapp-service.js';
import CodigoRetiroService from '../src/utils/codigo-retiro.js';

// Cargar variables de entorno
dotenv.config();

console.log('🧪 ═══════════════════════════════════════════════════════════');
console.log('🏛️  PRUEBAS DE CONFIGURACIÓN TWILIO WHATSAPP SANDBOX');
console.log('🧪 ═══════════════════════════════════════════════════════════');

/**
 * Datos de prueba para testing
 */
const DATOS_PRUEBA = {
  cliente: {
    clientName: 'Juan Carlos Pérez',
    clientPhone: '+593987654321' // CAMBIAR POR TU NÚMERO HABILITADO EN SANDBOX
  },
  documento: {
    tipoDocumento: 'Escritura de Compraventa de Bien Inmueble',
    protocolNumber: '2025001742'
  },
  documentoGrupo: [
    {
      tipoDocumento: 'Escritura de Compraventa',
      protocolNumber: '2025001742'
    },
    {
      tipoDocumento: 'Certificación de Libertad y Tradición',
      protocolNumber: '2025001743'
    }
  ],
  datosEntrega: {
    entregado_a: 'Ana María González',
    deliveredTo: 'Ana María González',
    deliveryNotes: 'Entregado con cédula de identidad'
  }
};

/**
 * Prueba 1: Verificar configuración del servicio
 */
async function probarConfiguracion() {
  console.log('\n🔧 PRUEBA 1: Verificando configuración...');
  
  try {
    const config = await whatsappService.verificarConfiguracion();
    
    console.log('📋 Estado:', config.status);
    console.log('💬 Mensaje:', config.message);
    
    if (config.config) {
      console.log('⚙️ Configuración:');
      console.log('   - Habilitado:', config.config.enabled);
      console.log('   - Credenciales:', config.config.hasCredentials);
      console.log('   - Cliente inicializado:', config.config.clientInitialized);
      console.log('   - Entorno:', config.config.environment);
      console.log('   - Número origen:', config.config.fromNumber);
      
      if (config.config.accountName) {
        console.log('   - Cuenta Twilio:', config.config.accountName);
      }
    }
    
    if (config.error) {
      console.log('❌ Error:', config.error);
    }
    
    return config.status === 'active' || config.status === 'disabled';
  } catch (error) {
    console.error('❌ Error verificando configuración:', error.message);
    return false;
  }
}

/**
 * Prueba 2: Generar códigos de retiro únicos
 */
async function probarCodigosRetiro() {
  console.log('\n🔢 PRUEBA 2: Generando códigos de retiro...');
  
  try {
    console.log('Generando 5 códigos individuales...');
    const codigos = [];
    
    for (let i = 0; i < 5; i++) {
      const codigo = await CodigoRetiroService.generarUnico();
      codigos.push(codigo);
      console.log(`   ${i + 1}. ${codigo}`);
    }
    
    // Verificar que todos son únicos
    const codigosUnicos = new Set(codigos);
    if (codigosUnicos.size === codigos.length) {
      console.log('✅ Todos los códigos son únicos');
    } else {
      console.log('❌ Se encontraron códigos duplicados');
      return false;
    }
    
    // Probar código grupal
    console.log('\nGenerando código grupal...');
    const codigoGrupal = await CodigoRetiroService.generarUnicoGrupo();
    console.log(`   Código grupal: ${codigoGrupal}`);
    
    // Obtener estadísticas
    console.log('\nEstadísticas de códigos:');
    const stats = await CodigoRetiroService.obtenerEstadisticas();
    if (stats.error) {
      console.log('⚠️', stats.error);
    } else {
      console.log(`   - Códigos individuales activos: ${stats.codigosIndividualesActivos}`);
      console.log(`   - Códigos grupales activos: ${stats.codigosGrupalesActivos}`);
      console.log(`   - Documentos entregados: ${stats.documentosEntregados}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error generando códigos:', error.message);
    return false;
  }
}

/**
 * Prueba 3: Enviar mensaje de documento listo
 */
async function probarMensajeDocumentoListo() {
  console.log('\n📱 PRUEBA 3: Enviando mensaje "documento listo"...');
  
  try {
    const codigo = '9876'; // Código de prueba fijo
    
    const resultado = await whatsappService.enviarDocumentoListo(
      DATOS_PRUEBA.cliente,
      DATOS_PRUEBA.documento,
      codigo
    );
    
    console.log('✅ Mensaje enviado exitosamente');
    console.log('   - ID:', resultado.messageId);
    console.log('   - Para:', resultado.to);
    console.log('   - Simulado:', resultado.simulated || false);
    console.log('   - Timestamp:', resultado.timestamp);
    
    return true;
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.message);
    return false;
  }
}

/**
 * Prueba 4: Enviar mensaje de grupo de documentos listos
 */
async function probarMensajeGrupoListo() {
  console.log('\n📦 PRUEBA 4: Enviando mensaje "grupo de documentos listo"...');
  
  try {
    const codigo = '5432'; // Código de prueba fijo
    
    const resultado = await whatsappService.enviarGrupoDocumentosListo(
      DATOS_PRUEBA.cliente,
      DATOS_PRUEBA.documentoGrupo,
      codigo
    );
    
    console.log('✅ Mensaje grupal enviado exitosamente');
    console.log('   - ID:', resultado.messageId);
    console.log('   - Para:', resultado.to);
    console.log('   - Simulado:', resultado.simulated || false);
    console.log('   - Timestamp:', resultado.timestamp);
    
    return true;
  } catch (error) {
    console.error('❌ Error enviando mensaje grupal:', error.message);
    return false;
  }
}

/**
 * Prueba 5: Enviar mensaje de documento entregado
 */
async function probarMensajeDocumentoEntregado() {
  console.log('\n✅ PRUEBA 5: Enviando mensaje "documento entregado"...');
  
  try {
    const resultado = await whatsappService.enviarDocumentoEntregado(
      DATOS_PRUEBA.cliente,
      DATOS_PRUEBA.documento,
      DATOS_PRUEBA.datosEntrega
    );
    
    console.log('✅ Mensaje de entrega enviado exitosamente');
    console.log('   - ID:', resultado.messageId);
    console.log('   - Para:', resultado.to);
    console.log('   - Simulado:', resultado.simulated || false);
    console.log('   - Timestamp:', resultado.timestamp);
    
    return true;
  } catch (error) {
    console.error('❌ Error enviando mensaje de entrega:', error.message);
    return false;
  }
}

/**
 * Prueba 6: Validar formato de números telefónicos
 */
async function probarFormateoNumeros() {
  console.log('\n📞 PRUEBA 6: Validando formato de números telefónicos...');
  
  const numerosTest = [
    '+593987654321',  // Formato internacional correcto
    '593987654321',   // Sin + inicial
    '0987654321',     // Formato nacional con 0
    '987654321',      // Sin 0 inicial
    '09 8765 4321',   // Con espacios
    '(593) 987-654-321', // Con paréntesis y guiones
    'invalid',        // Inválido
    '12345'          // Muy corto
  ];
  
  console.log('Probando diferentes formatos de números:');
  
  for (const numero of numerosTest) {
    try {
      // Crear servicio temporal para acceder al método de formateo
      const numeroFormateado = whatsappService.formatPhoneNumber(numero);
      
      if (numeroFormateado) {
        console.log(`✅ ${numero.padEnd(18)} → ${numeroFormateado}`);
      } else {
        console.log(`❌ ${numero.padEnd(18)} → INVÁLIDO`);
      }
    } catch (error) {
      console.log(`❌ ${numero.padEnd(18)} → ERROR: ${error.message}`);
    }
  }
  
  return true;
}

/**
 * Ejecutar todas las pruebas
 */
async function ejecutarTodasLasPruebas() {
  console.log('\n🚀 Iniciando batería completa de pruebas...\n');
  
  const pruebas = [
    { nombre: 'Configuración', funcion: probarConfiguracion },
    { nombre: 'Códigos de retiro', funcion: probarCodigosRetiro },
    { nombre: 'Formateo de números', funcion: probarFormateoNumeros },
    { nombre: 'Documento listo', funcion: probarMensajeDocumentoListo },
    { nombre: 'Grupo de documentos', funcion: probarMensajeGrupoListo },
    { nombre: 'Documento entregado', funcion: probarMensajeDocumentoEntregado }
  ];
  
  const resultados = [];
  
  for (const prueba of pruebas) {
    try {
      const resultado = await prueba.funcion();
      resultados.push({ nombre: prueba.nombre, exito: resultado });
      
      if (resultado) {
        console.log(`\n✅ ${prueba.nombre}: PASÓ`);
      } else {
        console.log(`\n❌ ${prueba.nombre}: FALLÓ`);
      }
    } catch (error) {
      console.log(`\n💥 ${prueba.nombre}: ERROR - ${error.message}`);
      resultados.push({ nombre: prueba.nombre, exito: false, error: error.message });
    }
    
    // Pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumen final
  console.log('\n🏁 ═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('🏁 ═══════════════════════════════════════════════════════════');
  
  const exitosos = resultados.filter(r => r.exito).length;
  const fallidos = resultados.length - exitosos;
  
  console.log(`✅ Pruebas exitosas: ${exitosos}/${resultados.length}`);
  console.log(`❌ Pruebas fallidas: ${fallidos}/${resultados.length}`);
  
  if (fallidos > 0) {
    console.log('\n❌ Pruebas que fallaron:');
    resultados.filter(r => !r.exito).forEach(r => {
      console.log(`   - ${r.nombre}${r.error ? `: ${r.error}` : ''}`);
    });
  }
  
  console.log('\n📱 CONFIGURACIÓN DE SANDBOX:');
  console.log('1. Ve a https://console.twilio.com/');
  console.log('2. Ve a Messaging > Try it out > Send a WhatsApp message');
  console.log('3. Envía "join <tu-codigo-sandbox>" al +1 415 523 8886 desde tu teléfono');
  console.log('4. Actualiza DATOS_PRUEBA.cliente.clientPhone con tu número habilitado');
  console.log('5. Ejecuta: npm run test:whatsapp');
  
  if (exitosos === resultados.length) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! WhatsApp está listo para usar.');
  } else {
    console.log('\n⚠️ Algunas pruebas fallaron. Revisa la configuración.');
  }
  
  return exitosos === resultados.length;
}

// Ejecutar las pruebas
if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarTodasLasPruebas()
    .then(exito => {
      process.exit(exito ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error fatal en las pruebas:', error);
      process.exit(1);
    });
}

export {
  probarConfiguracion,
  probarCodigosRetiro,
  probarMensajeDocumentoListo,
  probarMensajeGrupoListo,
  probarMensajeDocumentoEntregado,
  probarFormateoNumeros,
  ejecutarTodasLasPruebas
};