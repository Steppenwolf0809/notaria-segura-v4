import { useState, useEffect } from 'react';

/**
 * Hook useDebounce - Implementa debouncing para mejorar performance en búsquedas
 * 
 * Características:
 * - Retrasa la ejecución de búsqueda hasta que el usuario pause
 * - Cancela búsquedas pendientes cuando hay nuevo input
 * - Optimiza performance evitando consultas excesivas
 * - Mantiene UX fluida sin bloquear el input
 * 
 * @param {string} value - Valor a ser debounced (input del usuario)
 * @param {number} delay - Delay en milisegundos (recomendado: 300-500ms)
 * @returns {string} - Valor debounced que se actualiza después del delay
 * 
 * Ejemplo de uso:
 * ```javascript
 * const [inputValue, setInputValue] = useState('');
 * const debouncedSearchTerm = useDebounce(inputValue, 400);
 * 
 * // inputValue se actualiza inmediatamente (UX fluida)
 * // debouncedSearchTerm se actualiza después de 400ms de pausa
 * ```
 */
const useDebounce = (value, delay) => {
  // Estado para almacenar el valor debounced
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configurar timeout para actualizar el valor debounced
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Función de cleanup: cancelar timeout si value cambia antes del delay
    // Esto previene ejecuciones innecesarias cuando el usuario sigue escribiendo
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo re-ejecutar si value o delay cambian

  return debouncedValue;
};

// Export as both named and default export for flexibility
export { useDebounce };
export default useDebounce;