import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { sendSuccess, sendError, sendUnauthorized, sanitizeResponse } from '../utils/http.js';
import { validatePassword, sanitizePassword } from '../utils/password-validator.js';
import { logPasswordChange, logLoginAttempt, extractRequestInfo } from '../utils/audit-logger.js';
import { withTenantContext, withLoginEmailContext } from '../utils/tenant-context.js';

const validRoles = ['SUPER_ADMIN', 'ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO'];
const PILOT_NOTARY_CODE = 'N18';

function getRoleColor(role) {
  const roleColors = {
    SUPER_ADMIN: '#8b5cf6',
    ADMIN: '#ef4444',
    CAJA: '#22c55e',
    MATRIZADOR: '#3b82f6',
    RECEPCION: '#06b6d4',
    ARCHIVO: '#f59e0b'
  };

  return roleColors[role] || '#6b7280';
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      notaryId: user.notaryId || null,
      isSuperAdmin: user.role === 'SUPER_ADMIN'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

function getAuthenticatedTenantContext(req) {
  return {
    notaryId: req?.user?.activeNotaryId || req?.user?.notaryId || null,
    isSuperAdmin: Boolean(req?.user?.isSuperAdmin || req?.user?.role === 'SUPER_ADMIN')
  };
}

async function ensurePilotNotary() {
  return prisma.notary.upsert({
    where: { code: PILOT_NOTARY_CODE },
    update: {
      slug: 'n18',
      name: 'Notaria 18 del Canton Quito',
      isActive: true,
      deletedAt: null
    },
    create: {
      code: PILOT_NOTARY_CODE,
      slug: 'n18',
      name: 'Notaria 18 del Canton Quito',
      ruc: '1768038930001',
      address: 'Av. Amazonas y Naciones Unidas',
      city: 'Quito',
      province: 'Pichincha',
      phone: '0999999999',
      email: 'info@notaria18.com.ec',
      isActive: true
    },
    select: { id: true }
  });
}

async function resolveNotaryForNewUser({ requester, role, requestedNotaryId }) {
  if (role === 'SUPER_ADMIN') {
    return null;
  }

  const trimmedRequestedNotaryId = typeof requestedNotaryId === 'string'
    ? requestedNotaryId.trim()
    : null;

  if (requester?.isSuperAdmin && trimmedRequestedNotaryId) {
    const targetNotary = await prisma.notary.findFirst({
      where: {
        id: trimmedRequestedNotaryId,
        isActive: true,
        deletedAt: null
      },
      select: { id: true }
    });

    if (targetNotary) {
      return targetNotary.id;
    }

    return null;
  }

  if (requester?.activeNotaryId) {
    return requester.activeNotaryId;
  }

  if (requester?.notaryId) {
    return requester.notaryId;
  }

  const pilotNotary = await ensurePilotNotary();
  return pilotNotary.id;
}

async function register(req, res) {
  try {
    const { email, password, firstName, lastName, role, notaryId } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol no valido'
      });
    }

    if (role === 'SUPER_ADMIN' && !req.user?.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Solo un SUPER_ADMIN puede crear otro SUPER_ADMIN'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await withLoginEmailContext(prisma, normalizedEmail, async (tx) => {
      return tx.user.findUnique({
        where: { email: normalizedEmail }
      });
    });

    if (existingUser && !existingUser.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'El email ya esta registrado'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const targetNotaryId = await resolveNotaryForNewUser({
      requester: req.user,
      role,
      requestedNotaryId: notaryId
    });

    if (role !== 'SUPER_ADMIN' && !targetNotaryId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo resolver la notaria para el usuario'
      });
    }

    const user = await withTenantContext(
      prisma,
      {
        notaryId: targetNotaryId || req.user?.activeNotaryId || req.user?.notaryId || null,
        isSuperAdmin: Boolean(req.user?.isSuperAdmin || role === 'SUPER_ADMIN')
      },
      async (tx) => {
        return tx.user.create({
          data: {
            email: normalizedEmail,
            password: hashedPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            role,
            notaryId: role === 'SUPER_ADMIN' ? null : targetNotaryId
          }
        });
      }
    );

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
          notaryId: user.notaryId,
          isSuperAdmin: user.role === 'SUPER_ADMIN',
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

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contrasena son obligatorios'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await withLoginEmailContext(prisma, normalizedEmail, async (tx) => {
      return tx.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          notaryId: true,
          isActive: true,
          deletedAt: true
        }
      });
    });

    if (!user) {
      return sendUnauthorized(res, 'Credenciales invalidas');
    }

    if (!user.isActive || user.deletedAt) {
      return sendUnauthorized(res, 'Usuario desactivado');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const requestInfo = extractRequestInfo(req);
      logLoginAttempt({
        userEmail: normalizedEmail,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Contrasena incorrecta'
      });

      return sendUnauthorized(res, 'Credenciales invalidas');
    }

    if (user.role !== 'SUPER_ADMIN' && !user.notaryId) {
      return sendUnauthorized(res, 'Usuario sin notaria asignada');
    }

    await withTenantContext(
      prisma,
      {
        notaryId: user.notaryId,
        isSuperAdmin: user.role === 'SUPER_ADMIN'
      },
      async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        });
      }
    );

    const requestInfo = extractRequestInfo(req);
    logLoginAttempt({
      userId: user.id,
      userEmail: normalizedEmail,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: true
    });

    const token = generateToken(user);

    return sendSuccess(res, {
      message: 'Inicio de sesion exitoso',
      data: {
        user: sanitizeResponse({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          notaryId: user.notaryId,
          isSuperAdmin: user.role === 'SUPER_ADMIN',
          roleColor: getRoleColor(user.role)
        }),
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return sendError(res);
  }
}

async function getUserProfile(req, res) {
  try {
    const userId = req.user.id;

    const user = await withTenantContext(
      prisma,
      getAuthenticatedTenantContext(req),
      async (tx) => {
        return tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            notaryId: true,
            isActive: true,
            deletedAt: true,
            createdAt: true,
            lastLogin: true
          }
        });
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (!user.isActive || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Usuario desactivado'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          isSuperAdmin: user.role === 'SUPER_ADMIN',
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

async function refreshToken(req, res) {
  try {
    const userId = req.user.id;

    const user = await withTenantContext(
      prisma,
      getAuthenticatedTenantContext(req),
      async (tx) => {
        return tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            role: true,
            notaryId: true,
            isActive: true,
            deletedAt: true
          }
        });
      }
    );

    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no valido'
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

async function initUsers(req, res) {
  try {
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existen usuarios en el sistema. Endpoint no disponible.',
        data: { userCount }
      });
    }

    const pilotNotary = await ensurePilotNotary();

    const initialUsers = [
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
        lastName: 'Perez',
        role: 'MATRIZADOR'
      },
      {
        email: 'recepcion@notaria.com',
        password: 'recepcion123',
        firstName: 'Maria',
        lastName: 'Garcia',
        role: 'RECEPCION'
      }
    ];

    const createdUsers = [];

    for (const userData of initialUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          notaryId: pilotNotary.id
        }
      });

      createdUsers.push({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        notaryId: user.notaryId,
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

async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const requestInfo = extractRequestInfo(req);

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
        details: {
          required: ['currentPassword', 'newPassword', 'confirmPassword']
        }
      });
    }

    if (newPassword !== confirmPassword) {
      logPasswordChange({
        userId,
        userEmail: req.user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Confirmacion de contrasena no coincide'
      });

      return res.status(400).json({
        success: false,
        message: 'La nueva contrasena y su confirmacion no coinciden'
      });
    }

    const sanitizedNewPassword = sanitizePassword(newPassword);
    const passwordValidation = validatePassword(sanitizedNewPassword);

    if (!passwordValidation.isValid) {
      logPasswordChange({
        userId,
        userEmail: req.user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Nueva contrasena no cumple criterios de seguridad'
      });

      return res.status(400).json({
        success: false,
        message: 'La nueva contrasena no cumple los criterios de seguridad',
        details: {
          errors: passwordValidation.errors,
          requirements: passwordValidation.requirements,
          strength: passwordValidation.strength
        }
      });
    }

    const user = await withTenantContext(
      prisma,
      getAuthenticatedTenantContext(req),
      async (tx) => {
        return tx.user.findUnique({
          where: { id: userId }
        });
      }
    );

    if (!user || !user.isActive || user.deletedAt) {
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

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      logPasswordChange({
        userId,
        userEmail: user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Contrasena actual incorrecta'
      });

      return res.status(401).json({
        success: false,
        message: 'La contrasena actual es incorrecta'
      });
    }

    const isSamePassword = await bcrypt.compare(sanitizedNewPassword, user.password);
    if (isSamePassword) {
      logPasswordChange({
        userId,
        userEmail: user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        success: false,
        reason: 'Nueva contrasena igual a la actual'
      });

      return res.status(400).json({
        success: false,
        message: 'La nueva contrasena debe ser diferente a la actual'
      });
    }

    const hashedNewPassword = await bcrypt.hash(sanitizedNewPassword, 12);

    await withTenantContext(
      prisma,
      getAuthenticatedTenantContext(req),
      async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            password: hashedNewPassword,
            updatedAt: new Date()
          }
        });
      }
    );

    logPasswordChange({
      userId,
      userEmail: user.email,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: true
    });

    res.json({
      success: true,
      message: 'Contrasena cambiada exitosamente',
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
    console.error('Error cambiando contrasena:', error);

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

export {
  register,
  login,
  getUserProfile,
  refreshToken,
  initUsers,
  changePassword
};
