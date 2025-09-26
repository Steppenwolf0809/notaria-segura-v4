/**
 * Generador de tokens únicos para escrituras QR
 * Genera tokens alfanuméricos de 8 caracteres
 */

/**
 * Genera un token único de 8 caracteres alfanuméricos
 * @returns {string} Token único
 */
export function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return token;
}

/**
 * Valida el formato de un token
 * @param {string} token - Token a validar
 * @returns {boolean} True si el token es válido
 */
export function validateTokenFormat(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Debe ser exactamente 8 caracteres alfanuméricos
  const tokenRegex = /^[A-Za-z0-9]{8}$/;
  return tokenRegex.test(token);
}

/**
 * Genera un token único verificando que no exista en la base de datos
 * @param {Object} prisma - Cliente de Prisma
 * @returns {Promise<string>} Token único garantizado
 */
export async function generateUniqueToken(prisma) {
  let token;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    token = generateToken();
    attempts++;
    
    // Verificar si el token ya existe
    const existing = await prisma.escrituraQR.findUnique({
      where: { token }
    });
    
    if (!existing) {
      return token;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('No se pudo generar un token único después de múltiples intentos');
    }
  } while (true);
}