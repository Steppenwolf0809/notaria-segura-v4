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
      
      console.log(`[FTP] Conectado exitosamente. Directorio actual: ${await client.pwd()}`);
      
      // Si basePath no es "/" navegar a la carpeta
      if (FTP_CONFIG.basePath && FTP_CONFIG.basePath !== '/') {
        console.log(`[FTP] Navegando a ${FTP_CONFIG.basePath}...`);
        try {
          await client.cd(FTP_CONFIG.basePath);
          console.log(`[FTP] ✅ En directorio: ${await client.pwd()}`);
        } catch (cdError) {
          console.log(`[FTP] Carpeta no existe, creando ${FTP_CONFIG.basePath}...`);
          await client.mkdir(FTP_CONFIG.basePath);
          await client.cd(FTP_CONFIG.basePath);
          console.log(`[FTP] ✅ Carpeta creada y navegada: ${await client.pwd()}`);
        }
      } else {
        console.log(`[FTP] Usando directorio raíz: ${await client.pwd()}`);
      }
      
      console.log(`[FTP] Subiendo archivo ${filename}...`);
      
      // Subir el archivo desde el buffer
      const { Readable } = await import('stream');
      const stream = Readable.from(imageBuffer);
      await client.uploadFrom(stream, filename);
      
      // Establecer permisos de lectura pública (644)
      try {
        await client.send('SITE CHMOD 644 ' + filename);
        console.log(`[FTP] Permisos establecidos (644) para: ${filename}`);
      } catch (chmodError) {
        console.warn(`[FTP] No se pudieron establecer permisos automáticamente: ${chmodError.message}`);
        console.warn('[FTP] Verifica manualmente que el archivo tenga permisos 644');
      }
      
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

/**
 * Configuración para carpeta de PDFs
 * NOTA: Usamos la misma carpeta que las fotos para evitar problemas de navegación FTP
 * Los PDFs se distinguen por extensión .pdf
 */
const PDF_CONFIG = {
  basePath: FTP_CONFIG.basePath, // Usar la misma ruta que fotos
  publicBaseURL: FTP_CONFIG.publicBaseURL, // Usar la misma URL base
  maxFileSize: 10 * 1024 * 1024 // 10MB
};

/**
 * Valida que un archivo sea un PDF real verificando magic bytes
 * 
 * @param {Buffer} pdfBuffer - Buffer del archivo a validar
 * @returns {boolean} true si es un PDF válido
 */
export function validatePDFFile(pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    return false;
  }
  
  // Verificar magic bytes de PDF: %PDF
  const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF en hex
  
  if (pdfBuffer.length < 4) {
    return false;
  }
  
  // Comparar los primeros 4 bytes
  for (let i = 0; i < 4; i++) {
    if (pdfBuffer[i] !== pdfSignature[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sube un PDF al servidor FTP de cPanel
 * 
 * @param {Buffer} pdfBuffer - Buffer del PDF a subir
 * @param {string} filename - Nombre del archivo (ej: "TOKEN.pdf")
 * @param {number} maxRetries - Número máximo de reintentos (default: 3)
 * @returns {Promise<string>} URL pública del PDF subido
 * 
 * @throws {Error} Si falla la validación o después de todos los reintentos
 * 
 * @example
 * const pdfURL = await uploadPDFToFTP(buffer, 'C8GHIWTZ.pdf');
 * console.log(pdfURL); // https://notaria18quito.com.ec/fotos-escrituras/C8GHIWTZ.pdf
 */
export async function uploadPDFToFTP(pdfBuffer, filename, maxRetries = 3) {
  // Validar configuración
  validateFTPConfig();
  
  // Validar parámetros
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error('pdfBuffer debe ser un Buffer válido');
  }
  
  if (!filename || typeof filename !== 'string') {
    throw new Error('filename debe ser un string válido');
  }
  
  // Validar tamaño
  if (pdfBuffer.length > PDF_CONFIG.maxFileSize) {
    const sizeMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
    throw new Error(`El PDF es demasiado grande (${sizeMB}MB). Máximo permitido: 10MB`);
  }
  
  // Validar magic bytes
  if (!validatePDFFile(pdfBuffer)) {
    throw new Error('El archivo no es un PDF válido (magic bytes incorrectos)');
  }
  
  console.log(`[FTP-PDF] Validación exitosa. Tamaño: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
  
  let lastError = null;
  
  // Intentar subir con reintentos
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = new Client();
    client.ftp.timeout = 60000; // 60 segundos para PDFs (más grandes que fotos)
    
    try {
      console.log(`[FTP-PDF] Intento ${attempt}/${maxRetries} - Conectando a ${FTP_CONFIG.host}...`);
      
      // Conectar al servidor FTP
      await client.access({
        host: FTP_CONFIG.host,
        user: FTP_CONFIG.user,
        password: FTP_CONFIG.password,
        port: FTP_CONFIG.port,
        secure: FTP_CONFIG.secure
      });
      
      console.log(`[FTP-PDF] Conectado. Directorio actual: ${await client.pwd()}`);
      
      // Si basePath no es "/" navegar a la carpeta (misma lógica que fotos)
      if (PDF_CONFIG.basePath && PDF_CONFIG.basePath !== '/') {
        console.log(`[FTP-PDF] Navegando a ${PDF_CONFIG.basePath}...`);
        try {
          await client.cd(PDF_CONFIG.basePath);
          console.log(`[FTP-PDF] ✅ En directorio: ${await client.pwd()}`);
        } catch (cdError) {
          console.log(`[FTP-PDF] Carpeta no existe, creando ${PDF_CONFIG.basePath}...`);
          await client.mkdir(PDF_CONFIG.basePath);
          await client.cd(PDF_CONFIG.basePath);
          console.log(`[FTP-PDF] ✅ Carpeta creada y navegada: ${await client.pwd()}`);
        }
      } else {
        console.log(`[FTP-PDF] Usando directorio raíz: ${await client.pwd()}`);
      }
      
      console.log(`[FTP-PDF] Subiendo PDF ${filename}...`);
      
      // Subir el archivo desde el buffer
      const { Readable } = await import('stream');
      const stream = Readable.from(pdfBuffer);
      await client.uploadFrom(stream, filename);
      
      // Establecer permisos de lectura pública (644)
      try {
        await client.send('SITE CHMOD 644 ' + filename);
        console.log(`[FTP-PDF] Permisos establecidos (644) para: ${filename}`);
      } catch (chmodError) {
        console.warn(`[FTP-PDF] No se pudieron establecer permisos automáticamente: ${chmodError.message}`);
        console.warn('[FTP-PDF] Verifica manualmente que el archivo tenga permisos 644');
      }
      
      console.log(`[FTP-PDF] ✅ PDF subido exitosamente: ${filename}`);
      
      // Cerrar conexión
      client.close();
      
      // Generar URL pública
      const publicURL = `${PDF_CONFIG.publicBaseURL}/${filename}`;
      console.log(`[FTP-PDF] URL pública generada: ${publicURL}`);
      
      return publicURL;
      
    } catch (error) {
      lastError = error;
      console.error(`[FTP-PDF] ❌ Error en intento ${attempt}/${maxRetries}:`, error.message);
      
      // Asegurar que la conexión se cierre
      try {
        client.close();
      } catch (closeError) {
        console.warn('[FTP-PDF] Error al cerrar conexión:', closeError.message);
      }
      
      // Si no es el último intento, esperar antes de reintentar
      if (attempt < maxRetries) {
        const waitTime = attempt * 1500; // 1.5s, 3s, 4.5s...
        console.log(`[FTP-PDF] Esperando ${waitTime}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  console.error('[FTP-PDF] ❌ Todos los intentos de subida fallaron');
  throw new Error(
    `No se pudo subir el PDF después de ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}`
  );
}

/**
 * Descarga un PDF del servidor FTP
 * 
 * @param {string} filename - Nombre del archivo a descargar (ej: "TOKEN.pdf")
 * @returns {Promise<Buffer>} Buffer con el contenido del PDF
 * 
 * @throws {Error} Si el archivo no existe o falla la descarga
 * 
 * @example
 * const pdfBuffer = await downloadPDFFromFTP('C8GHIWTZ.pdf');
 */
export async function downloadPDFFromFTP(filename) {
  validateFTPConfig();
  
  if (!filename || typeof filename !== 'string') {
    throw new Error('filename debe ser un string válido');
  }
  
  const client = new Client();
  client.ftp.timeout = 60000; // 60 segundos
  
  try {
    console.log(`[FTP-PDF] Descargando PDF: ${filename}...`);
    
    // Conectar al servidor FTP
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      port: FTP_CONFIG.port,
      secure: FTP_CONFIG.secure
    });
    
    // Navegar a la carpeta de PDFs si no es raíz
    if (PDF_CONFIG.basePath && PDF_CONFIG.basePath !== '/') {
      await client.cd(PDF_CONFIG.basePath);
    }
    
    // Descargar a un buffer
    const { Writable } = await import('stream');
    const chunks = [];
    
    const bufferStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });
    
    await client.downloadTo(bufferStream, filename);
    
    const pdfBuffer = Buffer.concat(chunks);
    
    console.log(`[FTP-PDF] ✅ PDF descargado: ${filename} (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    
    // Cerrar conexión
    client.close();
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('[FTP-PDF] ❌ Error descargando PDF:', error.message);
    
    try {
      client.close();
    } catch (closeError) {
      // Ignorar error al cerrar
    }
    
    // Si el archivo no existe, mensaje más específico
    if (error.message.includes('No such file') || error.code === 550) {
      throw new Error(`PDF no encontrado en el servidor: ${filename}`);
    }
    
    throw error;
  }
}

/**
 * Elimina un PDF del servidor FTP
 * 
 * @param {string} filename - Nombre del archivo a eliminar
 * @returns {Promise<boolean>} true si se eliminó exitosamente
 */
export async function deletePDFFromFTP(filename) {
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
    
    // Navegar a la carpeta de PDFs si no es raíz
    if (PDF_CONFIG.basePath && PDF_CONFIG.basePath !== '/') {
      await client.cd(PDF_CONFIG.basePath);
    }
    
    await client.remove(filename);
    
    console.log(`[FTP-PDF] PDF eliminado: ${filename}`);
    client.close();
    
    return true;
  } catch (error) {
    console.error('[FTP-PDF] Error eliminando PDF:', error.message);
    
    try {
      client.close();
    } catch (closeError) {
      // Ignorar error al cerrar
    }
    
    throw error;
  }
}

/**
 * Verifica si un PDF existe en el FTP
 * 
 * @param {string} filename - Nombre del archivo a verificar
 * @returns {Promise<boolean>} true si el archivo existe
 */
export async function checkPDFExists(filename) {
  validateFTPConfig();
  
  const client = new Client();
  client.ftp.timeout = 10000;
  
  try {
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      port: FTP_CONFIG.port,
      secure: FTP_CONFIG.secure
    });
    
    // Navegar a la carpeta de PDFs si no es raíz
    if (PDF_CONFIG.basePath && PDF_CONFIG.basePath !== '/') {
      await client.cd(PDF_CONFIG.basePath);
    }
    
    const list = await client.list();
    
    const exists = list.some(item => item.name === filename);
    
    client.close();
    
    return exists;
  } catch (error) {
    console.error('[FTP-PDF] Error verificando existencia de PDF:', error.message);
    
    try {
      client.close();
    } catch (closeError) {
      // Ignorar
    }
    
    return false;
  }
}

export default {
  uploadPhotoToFTP,
  deletePhotoFromFTP,
  testFTPConnection,
  uploadPDFToFTP,
  downloadPDFFromFTP,
  deletePDFFromFTP,
  checkPDFExists,
  validatePDFFile
};

