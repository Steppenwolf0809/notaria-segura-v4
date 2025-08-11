import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: './.env' });

/**
 * Schema de validación para variables de entorno críticas
 * Usando Zod para validación robusta y type safety
 */
const environmentSchema = z.object({
  // Base de datos - Obligatorio
  DATABASE_URL: z
    .string({
      required_error: 'DATABASE_URL es obligatorio',
      invalid_type_error: 'DATABASE_URL debe ser una string'
    })
    .refine(val => val.startsWith('postgresql://') || val.startsWith('file:'), 'DATABASE_URL debe ser PostgreSQL o SQLite'),

  // JWT Secret - Obligatorio, mínimo 32 caracteres
  JWT_SECRET: z
    .string({
      required_error: 'JWT_SECRET es obligatorio',
      invalid_type_error: 'JWT_SECRET debe ser una string'
    })
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres para seguridad'),

  // Twilio - Obligatorios para WhatsApp
  TWILIO_ACCOUNT_SID: z
    .string({
      required_error: 'TWILIO_ACCOUNT_SID es obligatorio',
      invalid_type_error: 'TWILIO_ACCOUNT_SID debe ser una string'
    })
    .min(10, 'TWILIO_ACCOUNT_SID debe tener al menos 10 caracteres'),

  TWILIO_AUTH_TOKEN: z
    .string({
      required_error: 'TWILIO_AUTH_TOKEN es obligatorio',
      invalid_type_error: 'TWILIO_AUTH_TOKEN debe ser una string'
    })
    .min(10, 'TWILIO_AUTH_TOKEN debe tener al menos 10 caracteres'),

  TWILIO_WHATSAPP_FROM: z
    .string({
      required_error: 'TWILIO_WHATSAPP_FROM es obligatorio',
      invalid_type_error: 'TWILIO_WHATSAPP_FROM debe ser una string'
    })
    .min(10, 'TWILIO_WHATSAPP_FROM debe tener formato válido'),

  // Entorno - Con valores válidos específicos
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'staging'], {
      required_error: 'NODE_ENV es obligatorio',
      invalid_type_error: 'NODE_ENV debe ser development, production, test o staging'
    })
    .default('development'),

  // Puerto - Opcional con default
  PORT: z
    .string()
    .optional()
    .default('3001')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val < 65536, 'PORT debe ser un número entre 1 y 65535'),

  // URLs del frontend - Opcionales pero importantes
  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL debe ser una URL válida')
    .optional(),

  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform(val => val ? val.split(',').map(url => url.trim()) : []),

  ALLOWED_ORIGINS_DEV: z
    .string()
    .optional()
    .transform(val => val ? val.split(',').map(url => url.trim()) : []),

  // WhatsApp habilitado - Opcional
  WHATSAPP_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform(val => val === 'true'),

  // Base URL para webhooks - Opcional
  BASE_URL: z
    .string()
    .url('BASE_URL debe ser una URL válida')
    .optional()
});

/**
 * Valida las variables de entorno al inicio de la aplicación
 * @returns {Object} Variables validadas y parseadas
 */
function validateEnvironment() {
  try {
    console.log('🔍 Validando variables de entorno...');
    
    const result = environmentSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Error en validación de variables de entorno:');
      result.error.errors.forEach(error => {
        console.error(`   • ${error.path.join('.')}: ${error.message}`);
      });
      
      // En producción, fallar inmediatamente
      if (process.env.NODE_ENV === 'production') {
        console.error('💥 La aplicación no puede iniciar en producción con configuración inválida');
        process.exit(1);
      }
      
      // En desarrollo, mostrar advertencia pero continuar
      console.warn('⚠️  La aplicación continuará en modo desarrollo, pero algunas funciones pueden fallar');
      return null;
    }
    
    console.log('✅ Variables de entorno validadas correctamente');
    console.log(`   • Entorno: ${result.data.NODE_ENV}`);
    console.log(`   • Puerto: ${result.data.PORT}`);
    console.log(`   • Base de datos: ${result.data.DATABASE_URL ? '✓ Configurada' : '✗ No configurada'}`);
    console.log(`   • JWT: ${result.data.JWT_SECRET ? '✓ Configurado' : '✗ No configurado'}`);
    console.log(`   • Twilio: ${result.data.TWILIO_ACCOUNT_SID ? '✓ Configurado' : '✗ No configurado'}`);
    console.log(`   • WhatsApp: ${result.data.WHATSAPP_ENABLED ? '✓ Habilitado' : '✗ Deshabilitado'}`);
    
    return result.data;
    
  } catch (error) {
    console.error('💥 Error crítico validando environment:', error);
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    return null;
  }
}

/**
 * Obtiene configuración validada
 * @returns {Object} Configuración de la aplicación
 */
function getConfig() {
  const validatedEnv = validateEnvironment();
  
  // Si la validación falló, usar valores por defecto seguros
  if (!validatedEnv) {
    console.warn('⚠️  Usando configuración de fallback');
    return {
      NODE_ENV: 'development',
      PORT: 3001,
      DATABASE_URL: process.env.DATABASE_URL || '',
      JWT_SECRET: process.env.JWT_SECRET || '',
      WHATSAPP_ENABLED: false,
      // Otros valores por defecto...
    };
  }
  
  return validatedEnv;
}

/**
 * Verifica si todas las dependencias críticas están configuradas
 * @param {Object} config - Configuración de la aplicación
 * @returns {boolean} True si la configuración es completa
 */
function isConfigurationComplete(config) {
  const criticalVars = ['DATABASE_URL', 'JWT_SECRET'];
  
  return criticalVars.every(varName => {
    const hasValue = config[varName] && config[varName].length > 0;
    if (!hasValue) {
      console.error(`❌ Variable crítica faltante: ${varName}`);
    }
    return hasValue;
  });
}

/**
 * Logs de configuración para debugging
 * @param {Object} config - Configuración a debuggear
 */
function debugConfiguration(config) {
  if (config.NODE_ENV !== 'production') {
    console.log('🔧 DEBUG: Configuración actual:');
    console.log('   NODE_ENV:', config.NODE_ENV);
    console.log('   PORT:', config.PORT);
    console.log('   DATABASE_URL:', config.DATABASE_URL ? '[CONFIGURADA]' : '[FALTANTE]');
    console.log('   JWT_SECRET:', config.JWT_SECRET ? '[CONFIGURADO]' : '[FALTANTE]');
    console.log('   WHATSAPP_ENABLED:', config.WHATSAPP_ENABLED);
    console.log('   FRONTEND_URL:', config.FRONTEND_URL || '[NO CONFIGURADA]');
  }
}

export {
  environmentSchema,
  validateEnvironment,
  getConfig,
  isConfigurationComplete,
  debugConfiguration
};