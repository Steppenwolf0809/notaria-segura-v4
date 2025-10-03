/**
 * Servicio para subir fotos al cPanel vía FTP
 * Maneja la conexión FTP, upload de imágenes y generación de URLs públicas
 */

import { Client } from 'basic-ftp';

/**
 * Configuración FTP desde variables de entorno
 */
const FTP_CONFIG = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  port: parseInt(process.env.FTP_PORT || '21'),
  basePath: process.env.FTP_BASE_PATH || '/public_html/fotos-escrituras',
  publicBaseURL: process.env.PUBLIC_FOTOS_URL || 'https://notaria18quito.com.ec/fotos-escrituras',
  secure: false, // cPanel usa FTP estándar, no FTPS
};

/**
 * Valida que las credenciales FTP estén configuradas
 */
function validateFTPConfig() {
  const requiredVars = ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Configuración FTP incompleta. Faltan variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Sube una foto al servidor FTP de cPanel
 * 
 * @param {Buffer} imageBuffer - Buffer de la imagen a subir
 * @param {string} filename - Nombre del archivo (ej: "TOKEN123.jpg")
 * @param {number} maxRetries - Número máximo de reintentos (default: 3)
 * @returns {Promise<string>} URL pública de la imagen subida
 * 
 * @throws {Error} Si falla después de todos los reintentos
 * 
 * @example
 * const fotoURL = await uploadPhotoToFTP(buffer, 'ABC12345.jpg');
 * console.log(fotoURL); // https://notaria18quito.com.ec/fotos-escrituras/ABC12345.jpg
 */
export async function uploadPhotoToFTP(imageBuffer, filename, maxRetries = 3) {
  // Validar configuración
  validateFTPConfig();
  
  // Validar parámetros
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error('imageBuffer debe ser un Buffer válido');
  }
  
  if (!filename || typeof filename !== 'string') {
    throw new Error('filename debe ser un string válido');
  }
  
  let lastError = null;
  
  // Intentar subir con reintentos
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = new Client();
    client.ftp.timeout = 30000; // Timeout de 30 segundos
    
    try {
      console.log(`[FTP] Intento ${attempt}/${maxRetries} - Conectando a ${FTP_CONFIG.host}...`);
      
      // Conectar al servidor FTP
      await client.access({
        host: FTP_CONFIG.host,
        user: FTP_CONFIG.user,
        password: FTP_CONFIG.password,
        port: FTP_CONFIG.port,
        secure: FTP_CONFIG.secure
      });
      
      console.log(`[FTP] Conectado exitosamente. Navegando a ${FTP_CONFIG.basePath}...`);
      
      // Navegar a la carpeta destino
      // Intentar crear la carpeta si no existe
      try {
        await client.ensureDir(FTP_CONFIG.basePath);
      } catch (dirError) {
        console.warn(`[FTP] Advertencia al crear/navegar directorio: ${dirError.message}`);
        // Intentar cambiar directamente
        await client.cd(FTP_CONFIG.basePath);
      }
      
      console.log(`[FTP] Subiendo archivo ${filename}...`);
      
      // Subir el archivo desde el buffer
      const { Readable } = await import('stream');
      const stream = Readable.from(imageBuffer);
      await client.uploadFrom(stream, filename);
      
      console.log(`[FTP] ✅ Archivo subido exitosamente: ${filename}`);
      
      // Cerrar conexión
      client.close();
      
      // Generar URL pública
      const publicURL = `${FTP_CONFIG.publicBaseURL}/${filename}`;
      console.log(`[FTP] URL pública generada: ${publicURL}`);
      
      return publicURL;
      
    } catch (error) {
      lastError = error;
      console.error(`[FTP] ❌ Error en intento ${attempt}/${maxRetries}:`, error.message);
      
      // Asegurar que la conexión se cierre
      try {
        client.close();
      } catch (closeError) {
        console.warn('[FTP] Error al cerrar conexión:', closeError.message);
      }
      
      // Si no es el último intento, esperar antes de reintentar
      if (attempt < maxRetries) {
        const waitTime = attempt * 1000; // 1s, 2s, 3s...
        console.log(`[FTP] Esperando ${waitTime}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  console.error('[FTP] ❌ Todos los intentos de subida fallaron');
  throw new Error(
    `No se pudo subir la foto después de ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}`
  );
}

/**
 * Elimina una foto del servidor FTP (función auxiliar para futuro uso)
 * 
 * @param {string} filename - Nombre del archivo a eliminar
 * @returns {Promise<boolean>} true si se eliminó exitosamente
 */
export async function deletePhotoFromFTP(filename) {
  validateFTPConfig();
  
  const client = new Client();
  client.ftp.timeout = 30000;
  
  try {
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      port: FTP_CONFIG.port,
      secure: FTP_CONFIG.secure
    });
    
    await client.cd(FTP_CONFIG.basePath);
    await client.remove(filename);
    
    console.log(`[FTP] Archivo eliminado: ${filename}`);
    client.close();
    
    return true;
  } catch (error) {
    console.error('[FTP] Error eliminando archivo:', error.message);
    
    try {
      client.close();
    } catch (closeError) {
      // Ignorar error al cerrar
    }
    
    throw error;
  }
}

/**
 * Verifica que la configuración FTP sea correcta y el servidor esté accesible
 * 
 * @returns {Promise<Object>} Resultado de la verificación
 */
export async function testFTPConnection() {
  validateFTPConfig();
  
  const client = new Client();
  client.ftp.timeout = 10000; // 10 segundos para test
  
  try {
    const startTime = Date.now();
    
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      port: FTP_CONFIG.port,
      secure: FTP_CONFIG.secure
    });
    
    const connectionTime = Date.now() - startTime;
    
    // Intentar listar directorio
    await client.cd(FTP_CONFIG.basePath);
    const list = await client.list();
    
    client.close();
    
    return {
      success: true,
      message: 'Conexión FTP exitosa',
      connectionTime,
      filesInDirectory: list.length,
      config: {
        host: FTP_CONFIG.host,
        port: FTP_CONFIG.port,
        basePath: FTP_CONFIG.basePath,
        publicBaseURL: FTP_CONFIG.publicBaseURL
      }
    };
  } catch (error) {
    try {
      client.close();
    } catch (closeError) {
      // Ignorar
    }
    
    return {
      success: false,
      message: 'Error en conexión FTP',
      error: error.message
    };
  }
}

export default {
  uploadPhotoToFTP,
  deletePhotoFromFTP,
  testFTPConnection
};

