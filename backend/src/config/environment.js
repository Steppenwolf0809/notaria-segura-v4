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
,

  // Integración Microservicio Python PDF Extractor (opcionales)
  PDF_EXTRACTOR_BASE_URL: z
    .string()
    .url('PDF_EXTRACTOR_BASE_URL debe ser una URL válida')
    .optional(),
  PDF_EXTRACTOR_TOKEN: z
    .string()
    .optional(),
  PDF_EXTRACTOR_TIMEOUT: z
    .string()
    .optional()
    .default('30000')
,

  // Flags Concuerdos / LLM (opcionales con defaults)
  // LLM_ROUTER_ENABLED: habilita un router que decide estrategias LLM/Node
  LLM_ROUTER_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform(val => val === 'true'),

  // LLM_STRATEGY: selecciona la estrategia de extracción
  //  - "hibrido" | "solo_gemini" | "solo_node"
  LLM_STRATEGY: z
    .enum(['hibrido', 'solo_gemini', 'solo_node'])
    .optional()
    .default('hibrido'),

  // Flags legacy opcionales (para compatibilidad)
  GEMINI_ENABLED: z
    .enum(['true','false'])
    .optional()
    .transform(v => v ? v === 'true' : undefined),
  EXTRACT_HYBRID: z
    .enum(['true','false'])
    .optional()
    .transform(v => v ? v === 'true' : undefined),
  FORCE_PYTHON_EXTRACTOR: z
    .enum(['true','false'])
    .optional()
    .transform(v => v ? v === 'true' : undefined),
  GEMINI_PRIORITY: z
    .enum(['true','false'])
    .optional()
    .transform(v => v ? v === 'true' : undefined),

  // PROMPT_FORCE_TEMPLATE: fuerza el template estructural base
  //  - "auto" | "A" | "B" | "C"
  PROMPT_FORCE_TEMPLATE: z
    .enum(['auto', 'A', 'B', 'C'])
    .optional()
    .default('auto'),

  // STRUCTURE_ROUTER_ENABLED: activa el enrutador de estructura (A/B/C)
  STRUCTURE_ROUTER_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform(val => val === 'true'),

  // TEMPLATE_MODE: modo de plantillas (structural/family)
  TEMPLATE_MODE: z
    .enum(['structural', 'family'])
    .optional()
    .default('structural'),

  // GEMINI_JSON_MODE: obliga a respuesta JSON strict en Gemini
  GEMINI_JSON_MODE: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform(val => val === 'true')
  ,

  // Google API (requerido en producción; opcional en otros entornos)
  GOOGLE_API_KEY: z.string().optional()
});

/**
 * Valida las variables de entorno al inicio de la aplicación
 * @returns {Object} Variables validadas y parseadas
 */
let printedOnce = false;

function validateEnvironment() {
  try {
    console.log('🔍 Validando variables de entorno...');
    
    const result = environmentSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Error en validación de variables de entorno:');

      // Debug defensivo para evitar crash si la estructura del error cambia
      const zodError = result.error;
      const issues = zodError && Array.isArray(zodError.issues) ? zodError.issues : [];

      // Debug mínimo y seguro
      console.log('🔍 Detalle de validación (seguro):');
      console.log('   • issues length:', Array.isArray(issues) ? issues.length : 'N/A');

      if (issues.length > 0) {
        issues.forEach(issue => {
          const path = Array.isArray(issue.path) ? issue.path.join('.') : '(sin ruta)';
          console.error(`   • ${path}: ${issue.message}`);
        });
      } else {
        // Fallback: loguear el error completo serializado
        console.error('   • Error de validación no desglosado');
      }
      
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
      pdfExtractor: {
        baseUrl: process.env.PDF_EXTRACTOR_BASE_URL || 'http://localhost:8001',
        token: process.env.PDF_EXTRACTOR_TOKEN || '',
        timeout: parseInt(process.env.PDF_EXTRACTOR_TIMEOUT || '30000', 10)
      },
      concuerdos: {
        // Defaults seguros para flags nuevos
        llmRouterEnabled: String(process.env.LLM_ROUTER_ENABLED || 'false') === 'true',
        llmStrategy: ['hibrido', 'solo_gemini', 'solo_node'].includes(String(process.env.LLM_STRATEGY))
          ? String(process.env.LLM_STRATEGY)
          : 'hibrido',
        promptForceTemplate: ['auto', 'A', 'B', 'C'].includes(String(process.env.PROMPT_FORCE_TEMPLATE))
          ? String(process.env.PROMPT_FORCE_TEMPLATE)
          : 'auto',
        structureRouterEnabled: String(process.env.STRUCTURE_ROUTER_ENABLED || 'true') === 'true',
        templateMode: ['structural', 'family'].includes(String(process.env.TEMPLATE_MODE))
          ? String(process.env.TEMPLATE_MODE)
          : 'structural',
        geminiJsonMode: String(process.env.GEMINI_JSON_MODE || 'true') === 'true'
      }
    };
  }
  
  // Construir configuración extendida
  // Resolver estrategia efectiva y compatibilidad con flags legacy (sin imprimir valores)
  const resolveStrategy = (env) => {
    let strategy = env.LLM_STRATEGY || 'hibrido';
    // Si no se definió estrategia, inferir desde flags legacy si existen
    if (!process.env.LLM_STRATEGY) {
      const legacyGeminiEnabled = typeof env.GEMINI_ENABLED === 'boolean' ? env.GEMINI_ENABLED : undefined;
      const legacyHybrid = typeof env.EXTRACT_HYBRID === 'boolean' ? env.EXTRACT_HYBRID : undefined;
      if (legacyGeminiEnabled === false) strategy = 'solo_node';
      else if (legacyHybrid === true) strategy = 'hibrido';
      else if (legacyHybrid === false) strategy = 'solo_gemini';
      // FORCE_PYTHON_EXTRACTOR no mapea inequívocamente; no altera strategy si solo aparece este flag
    }
    return strategy;
  };

  const effectiveStrategy = resolveStrategy(validatedEnv);

  // Derivar flags legacy desde la estrategia para compatibilidad:
  const derivedLegacy = {
    geminiEnabled: effectiveStrategy !== 'solo_node',
    extractHybrid: effectiveStrategy === 'hibrido'
  };

  const cfg = {
    ...validatedEnv,
    pdfExtractor: {
      baseUrl: validatedEnv.PDF_EXTRACTOR_BASE_URL || 'http://localhost:8001',
      token: validatedEnv.PDF_EXTRACTOR_TOKEN || '',
      timeout: parseInt(validatedEnv.PDF_EXTRACTOR_TIMEOUT || '30000', 10)
    },
    concuerdos: {
      // Flags agrupados para el sistema de concuerdos
      llmRouterEnabled: validatedEnv.LLM_ROUTER_ENABLED,
      llmStrategy: effectiveStrategy,
      promptForceTemplate: validatedEnv.PROMPT_FORCE_TEMPLATE,
      structureRouterEnabled: validatedEnv.STRUCTURE_ROUTER_ENABLED,
      templateMode: validatedEnv.TEMPLATE_MODE,
      geminiJsonMode: validatedEnv.GEMINI_JSON_MODE,
      // Compatibilidad legacy derivada
      derived: {
        GEMINI_ENABLED: derivedLegacy.geminiEnabled,
        EXTRACT_HYBRID: derivedLegacy.extractHybrid
      }
    }
  };
  
  // Impresión única de advertencias y tabla de configuración efectiva
  if (!printedOnce) {
    printedOnce = true;
    try {
      // Warnings por flags deprecados presentes
      const deprecated = ['CONCUERDOS_USE_GEMINI_FIRST','EXTRACT_HYBRID','FORCE_PYTHON_EXTRACTOR','GEMINI_PRIORITY'];
      const present = deprecated.filter(k => typeof process.env[k] !== 'undefined');
      if (present.length) {
        console.warn('⚠️ Flags deprecados detectados. Usa LLM_STRATEGY en su lugar:');
        present.forEach(k => console.warn(`   • ${k} (usar LLM_STRATEGY)`));
      }

      // Fail fast adicional en producción por claves críticas
      if (cfg.NODE_ENV === 'production') {
        const criticalMissing = [];
        if (!cfg.DATABASE_URL) criticalMissing.push('DATABASE_URL');
        if (!cfg.JWT_SECRET) criticalMissing.push('JWT_SECRET');
        if (!process.env.GOOGLE_API_KEY) criticalMissing.push('GOOGLE_API_KEY');
        if (criticalMissing.length) {
          console.error('❌ Variables críticas faltantes en producción:', criticalMissing.join(', '));
          process.exit(1);
        }
      }

      // Tabla segura de configuración efectiva (solo nombres/estado, sin valores)
      const names = [
        'NODE_ENV','DATABASE_URL','JWT_SECRET','GOOGLE_API_KEY','LLM_STRATEGY','GEMINI_ENABLED(derived)','EXTRACT_HYBRID(derived)','STRUCTURE_ROUTER_ENABLED','PROMPT_FORCE_TEMPLATE','TEMPLATE_MODE','GEMINI_JSON_MODE','WHATSAPP_ENABLED','PDF_EXTRACTOR_BASE_URL','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_FROM'
      ];
      console.log('📋 Effective settings (nombres, sin valores):');
      console.log('| Setting | Status |');
      console.log('|---|---|');
      const statusOf = (k) => {
        switch (k) {
          case 'GEMINI_ENABLED(derived)': return cfg.concuerdos.derived.GEMINI_ENABLED ? 'SET' : 'UNSET';
          case 'EXTRACT_HYBRID(derived)': return cfg.concuerdos.derived.EXTRACT_HYBRID ? 'SET' : 'UNSET';
          default: return process.env[k.replace(/\(derived\)/,'')] ? 'SET' : 'UNSET';
        }
      };
      names.forEach(n => console.log(`| ${n} | ${statusOf(n)} |`));
    } catch {}
  }

  return cfg;
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
    if (config.pdfExtractor) {
      console.log('   PDF_EXTRACTOR_BASE_URL:', config.pdfExtractor.baseUrl || '[NO CONFIGURADA]');
      console.log('   PDF_EXTRACTOR_TIMEOUT:', config.pdfExtractor.timeout);
      console.log('   PDF_EXTRACTOR_TOKEN:', config.pdfExtractor.token ? '[CONFIGURADO]' : '[FALTANTE]');
    }
  }
}

export {
  environmentSchema,
  validateEnvironment,
  getConfig,
  isConfigurationComplete,
  debugConfiguration
};
