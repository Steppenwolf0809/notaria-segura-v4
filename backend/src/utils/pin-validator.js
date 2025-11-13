/**
 * Valida formato y seguridad de un PIN
 *
 * Requisitos de seguridad:
 * - Exactamente 6 dígitos numéricos
 * - No puede ser secuencia (123456, 654321, etc.)
 * - No puede tener todos los dígitos iguales (111111, 222222, etc.)
 *
 * @param {string} pin - PIN a validar
 * @returns {object} { valid: boolean, error?: string }
 */
export function validarPIN(pin) {
  // Validación 1: Solo números, exactamente 6 dígitos
  if (!/^\d{6}$/.test(pin)) {
    return {
      valid: false,
      error: 'El PIN debe contener exactamente 6 dígitos numéricos'
    };
  }

  // Validación 2: No secuencias ascendentes o descendentes
  // Ejemplo: 123456, 234567, 654321, etc.
  const sequences = [
    '012345', '123456', '234567', '345678', '456789',
    '543210', '654321', '765432', '876543', '987654'
  ];

  if (sequences.includes(pin)) {
    return {
      valid: false,
      error: 'El PIN no puede ser una secuencia de números'
    };
  }

  // Validación 3: No todos los dígitos iguales
  // Ejemplo: 111111, 222222, etc.
  if (/^(\d)\1{5}$/.test(pin)) {
    return {
      valid: false,
      error: 'El PIN no puede tener todos los dígitos repetidos'
    };
  }

  return { valid: true };
}

/**
 * Genera un token de sesión único usando UUID v4
 * Esto garantiza que sea imposible de adivinar
 *
 * @returns {string} Token UUID
 */
export function generarTokenSesion() {
  return crypto.randomUUID();
}
