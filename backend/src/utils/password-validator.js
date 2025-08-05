/**
 * Utilidades para validación de contraseñas
 * Implementa validaciones de seguridad para contraseñas fuertes
 */

/**
 * Valida si una contraseña cumple con los criterios de seguridad
 * @param {string} password - Contraseña a validar
 * @returns {Object} Resultado de la validación
 */
function validatePassword(password) {
  const errors = [];
  const requirements = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  };

  // Verificar longitud mínima (8 caracteres)
  if (!password || password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  } else {
    requirements.minLength = true;
  }

  // Verificar mayúscula
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  } else {
    requirements.hasUppercase = true;
  }

  // Verificar minúscula
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  } else {
    requirements.hasLowercase = true;
  }

  // Verificar número
  if (!/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  } else {
    requirements.hasNumber = true;
  }

  // Verificar carácter especial (opcional pero recomendado)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    // No es obligatorio, pero se recomienda
    requirements.hasSpecialChar = false;
  } else {
    requirements.hasSpecialChar = true;
  }

  // Verificar que no contenga espacios
  if (/\s/.test(password)) {
    errors.push('La contraseña no debe contener espacios');
  }

  const isValid = errors.length === 0;
  const strength = calculateStrength(requirements);

  return {
    isValid,
    errors,
    requirements,
    strength,
    message: isValid ? 'Contraseña válida' : 'Contraseña no cumple los requisitos'
  };
}

/**
 * Calcula la fortaleza de la contraseña
 * @param {Object} requirements - Requisitos cumplidos
 * @returns {Object} Información de fortaleza
 */
function calculateStrength(requirements) {
  let score = 0;
  let level = 'weak';
  let color = '#ef4444'; // Rojo

  // Puntuación basada en requisitos
  if (requirements.minLength) score += 2;
  if (requirements.hasUppercase) score += 1;
  if (requirements.hasLowercase) score += 1;
  if (requirements.hasNumber) score += 1;
  if (requirements.hasSpecialChar) score += 1;

  // Determinar nivel de fortaleza
  if (score >= 5) {
    level = 'strong';
    color = '#22c55e'; // Verde
  } else if (score >= 4) {
    level = 'medium';
    color = '#f59e0b'; // Amarillo
  }

  return {
    score,
    maxScore: 6,
    level,
    color,
    percentage: Math.round((score / 6) * 100)
  };
}

/**
 * Genera sugerencias para mejorar la contraseña
 * @param {string} password - Contraseña a evaluar
 * @returns {Array} Array de sugerencias
 */
function getPasswordSuggestions(password) {
  const suggestions = [];
  const validation = validatePassword(password);

  if (!validation.requirements.minLength) {
    suggestions.push('Aumenta la longitud a al menos 8 caracteres');
  }

  if (!validation.requirements.hasUppercase) {
    suggestions.push('Agrega al menos una letra mayúscula (A-Z)');
  }

  if (!validation.requirements.hasLowercase) {
    suggestions.push('Agrega al menos una letra minúscula (a-z)');
  }

  if (!validation.requirements.hasNumber) {
    suggestions.push('Incluye al menos un número (0-9)');
  }

  if (!validation.requirements.hasSpecialChar) {
    suggestions.push('Considera agregar un carácter especial (!@#$%^&*)');
  }

  if (suggestions.length === 0) {
    suggestions.push('¡Excelente! Tu contraseña cumple todos los requisitos');
  }

  return suggestions;
}

/**
 * Verifica si dos contraseñas coinciden
 * @param {string} password - Contraseña original
 * @param {string} confirmPassword - Confirmación de contraseña
 * @returns {Object} Resultado de la verificación
 */
function validatePasswordMatch(password, confirmPassword) {
  const isMatch = password === confirmPassword;
  
  return {
    isMatch,
    message: isMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'
  };
}

/**
 * Sanitiza la entrada de contraseña (remueve espacios extra)
 * @param {string} password - Contraseña a sanitizar
 * @returns {string} Contraseña sanitizada
 */
function sanitizePassword(password) {
  if (!password) return '';
  return password.trim();
}

export {
  validatePassword,
  calculateStrength,
  getPasswordSuggestions,
  validatePasswordMatch,
  sanitizePassword
};