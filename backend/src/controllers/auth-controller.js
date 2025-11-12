import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { sendSuccess, sendError, sendUnauthorized, sendValidationError, sanitizeResponse } from '../utils/http.js';
import { validatePassword, sanitizePassword } from '../utils/password-validator.js';
import { logPasswordChange, logLoginAttempt, extractRequestInfo } from '../utils/audit-logger.js';
import { log } from '../utils/logger.js';
import {
  recordFailedLogin,
  resetLoginAttempts,
  isAccountLocked,
  addPasswordToHistory,
  isPasswordReused,
  detectSuspiciousActivity
} from '../services/security-service.js';
import { sendPasswordChangedEmail } from '../services/email-service.js';
import { createRefreshToken, verifyAndRotateRefreshToken } from '../services/token-service.js';

/**
 * Roles válidos del sistema (completo con ARCHIVO)
 */
const validRoles = ['ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO'];

/**
 * Obtiene el color asociado a cada rol
 * @param {string} role - Rol del usuario
 * @returns {string} Color del rol
 */
function getRoleColor(role) {
  const roleColors = {
    ADMIN: '#ef4444',      // Rojo - Control total
    CAJA: '#22c55e',       // Verde - Gestión financiera  
    MATRIZADOR: '#3b82f6', // Azul - Creación documentos
    RECEPCION: '#06b6d4',  // Cyan - Entrega documentos
    ARCHIVO: '#f59e0b'     // Naranja/Warning - Archivo histórico
  };
  return roleColors[role] || '#6b7280';
}

/**
 * Genera token JWT para el usuario
 * @param {Object} user - Datos del usuario
 * @returns {string} Token JWT
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

/**
 * Registro de nuevo usuario (solo ADMIN puede crear usuarios)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function register(req, res) {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Validar que todos los campos están presentes
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    // Validar rol válido
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol no válido'
      });
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role
      }
    });

    // Generar token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          roleColor: getRoleColor(user.role)
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Inicio de sesión de usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const requestInfo = extractRequestInfo(req);

    // Validar campos obligatorios
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son obligatorios'
      });
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      log.warn('Login attempt for non-existent user', { email, ipAddress: requestInfo.ipAddress });
      return sendUnauthorized(res, 'Credenciales inválidas');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      log.warn('Login attempt for inactive user', { userId: user.id, email });
      return sendUnauthorized(res, 'Usuario desactivado');
    }

    // Verificar si la cuenta está bloqueada
    if (isAccountLocked(user)) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      log.warn('Login attempt for locked account', {
        userId: user.id,
        email,
        lockedUntil: user.lockedUntil,
        ipAddress: requestInfo.ipAddress
      });

      return res.status(429).json({
        success: false,
        message: `Cuenta bloqueada temporalmente. Intenta nuevamente en ${minutesLeft} minutos.`,
        lockedUntil: user.lockedUntil
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Registrar intento fallido
      await recordFailedLogin(user.id, requestInfo.ipAddress, requestInfo.userAgent);

      // Log intento fallido
      logLoginAttempt({
        userId: user.id,
        userEmail: email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Contraseña incorrecta'
      });

      return sendUnauthorized(res, 'Credenciales inválidas');
    }

    // Login exitoso - resetear intentos y actualizar último login
    await resetLoginAttempts(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        lastLoginIp: requestInfo.ipAddress
      }
    });

    // Log login exitoso
    logLoginAttempt({
      userId: user.id,
      userEmail: email,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: true
    });

    log.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      ipAddress: requestInfo.ipAddress
    });

    // Generar tokens
    const accessToken = generateToken(user);
    const refreshToken = await createRefreshToken(user.id, requestInfo.ipAddress, requestInfo.userAgent);

    return sendSuccess(res, {
      message: 'Inicio de sesión exitoso',
      data: {
        user: sanitizeResponse({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          roleColor: getRoleColor(user.role),
          emailVerified: user.emailVerified
        }),
        token: accessToken,
        refreshToken
      }
    });

  } catch (error) {
    log.error('Error in login', error);
    return sendError(res);
  }
}

/**
 * Obtiene el perfil del usuario autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getUserProfile(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          roleColor: getRoleColor(user.role)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Refresca el token JWT del usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function refreshToken(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }

    const newToken = generateToken(user);

    res.json({
      success: true,
      message: 'Token refrescado exitosamente',
      data: {
        token: newToken
      }
    });

  } catch (error) {
    console.error('Error refrescando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * ENDPOINT TEMPORAL: Crea usuarios iniciales
 * ⚠️ Solo funciona si no hay usuarios en la base de datos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function initUsers(req, res) {
  try {
    // Verificar si ya existen usuarios
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existen usuarios en el sistema. Endpoint no disponible.',
        data: { userCount }
      });
    }
    
    // Usuarios iniciales
    const INITIAL_USERS = [
      {
        email: 'admin@notaria.com',
        password: 'admin123',
        firstName: 'Administrador',
        lastName: 'Sistema',
        role: 'ADMIN'
      },
      {
        email: 'caja@notaria.com',
        password: 'caja123',
        firstName: 'Usuario',
        lastName: 'Caja',
        role: 'CAJA'
      },
      {
        email: 'matrizador@notaria.com',
        password: 'matrizador123',
        firstName: 'Juan',
        lastName: 'Pérez',
        role: 'MATRIZADOR'
      },
      {
        email: 'recepcion@notaria.com',
        password: 'recepcion123',
        firstName: 'María',
        lastName: 'García',
        role: 'RECEPCION'
      }
    ];
    
    const createdUsers = [];
    
    for (const userData of INITIAL_USERS) {
      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role
        }
      });
      
      createdUsers.push({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        // ⚠️ Solo para desarrollo: contraseña sin hashear
        plainPassword: userData.password
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Usuarios iniciales creados exitosamente',
      data: {
        usersCreated: createdUsers.length,
        users: createdUsers,
        instructions: [
          'Ir a http://localhost:5173',
          'Probar login con cada usuario',
          'Verificar dashboard muestra rol correcto',
          'Confirmar logout funciona'
        ]
      }
    });
    
  } catch (error) {
    console.error('Error creando usuarios iniciales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Cambiar contraseña del usuario autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const requestInfo = extractRequestInfo(req);

    // Validar que todos los campos están presentes
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
        details: {
          required: ['currentPassword', 'newPassword', 'confirmPassword']
        }
      });
    }

    // Verificar que las nuevas contraseñas coincidan
    if (newPassword !== confirmPassword) {
      logPasswordChange({
        userId,
        userEmail: req.user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Confirmación de contraseña no coincide'
      });

      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña y su confirmación no coinciden'
      });
    }

    // Sanitizar y validar nueva contraseña
    const sanitizedNewPassword = sanitizePassword(newPassword);
    const passwordValidation = validatePassword(sanitizedNewPassword);

    if (!passwordValidation.isValid) {
      logPasswordChange({
        userId,
        userEmail: req.user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Nueva contraseña no cumple criterios de seguridad'
      });

      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña no cumple los criterios de seguridad',
        details: {
          errors: passwordValidation.errors,
          requirements: passwordValidation.requirements,
          strength: passwordValidation.strength
        }
      });
    }

    // Buscar usuario actual
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      logPasswordChange({
        userId,
        userEmail: req.user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Usuario no encontrado o desactivado'
      });

      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      logPasswordChange({
        userId,
        userEmail: user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Contraseña actual incorrecta'
      });

      return res.status(401).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(sanitizedNewPassword, user.password);
    if (isSamePassword) {
      logPasswordChange({
        userId,
        userEmail: user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Nueva contraseña igual a la actual'
      });

      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Verificar que no reutilice contraseñas anteriores
    const isReused = await isPasswordReused(userId, sanitizedNewPassword);
    if (isReused) {
      logPasswordChange({
        userId,
        userEmail: user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Intento de reutilizar contraseña anterior'
      });

      return res.status(400).json({
        success: false,
        message: 'No puedes usar una contraseña que hayas utilizado recientemente'
      });
    }

    // Detectar actividad sospechosa
    await detectSuspiciousActivity(userId, requestInfo.ipAddress, 'PASSWORD_CHANGE');

    // Guardar contraseña anterior en historial
    await addPasswordToHistory(userId, user.password);

    // Encriptar nueva contraseña
    const hashedNewPassword = await bcrypt.hash(sanitizedNewPassword, 12);

    // Actualizar contraseña en la base de datos
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    // Log cambio exitoso
    logPasswordChange({
      userId,
      userEmail: user.email,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: true
    });

    log.info('Password changed successfully', {
      userId,
      email: user.email,
      ipAddress: requestInfo.ipAddress
    });

    // Enviar email de notificación
    try {
      await sendPasswordChangedEmail(user.email, user.firstName, requestInfo.ipAddress);
    } catch (emailError) {
      log.error('Failed to send password changed email', emailError);
      // No fallar la operación por error de email
    }

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        passwordStrength: passwordValidation.strength,
        changedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    
    // Log error
    const requestInfo = extractRequestInfo(req);
    logPasswordChange({
      userId: req.user?.id || 'unknown',
      userEmail: req.user?.email || 'unknown',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: false,
      reason: `Error interno: ${error.message}`
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Refresh token con rotación automática
 * POST /api/auth/refresh-token
 */
async function refreshTokenWithRotation(req, res) {
  try {
    const { refreshToken: token } = req.body;
    const requestInfo = extractRequestInfo(req);

    if (!token) {
      return sendValidationError(res, 'Refresh token no proporcionado');
    }

    // Verificar y rotar el refresh token
    const result = await verifyAndRotateRefreshToken(
      token,
      requestInfo.ipAddress,
      requestInfo.userAgent
    );

    if (!result) {
      log.warn('Invalid or revoked refresh token used', {
        token: token.substring(0, 8),
        ipAddress: requestInfo.ipAddress
      });

      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido o revocado'
      });
    }

    const { user, newToken } = result;

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario desactivado'
      });
    }

    // Generar nuevo access token
    const accessToken = generateToken(user);

    log.info('Tokens refreshed successfully', {
      userId: user.id,
      email: user.email
    });

    return sendSuccess(res, {
      message: 'Tokens actualizados exitosamente',
      data: {
        token: accessToken,
        refreshToken: newToken,
        user: sanitizeResponse({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          roleColor: getRoleColor(user.role)
        })
      }
    });

  } catch (error) {
    log.error('Error in refreshTokenWithRotation', error);
    return sendError(res);
  }
}

export {
  register,
  login,
  getUserProfile,
  refreshToken,
  refreshTokenWithRotation,
  initUsers,
  changePassword
}; 