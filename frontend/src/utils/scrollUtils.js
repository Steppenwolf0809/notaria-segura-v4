/**
 * Utilidades para manejo de scroll y posicionamiento
 * Conserva la posición del usuario durante operaciones de carga
 */

/**
 * Preserva la posición de scroll durante actualizaciones
 * @param {Element} container - Contenedor con scroll
 * @param {Function} updateFunction - Función que actualiza el contenido
 */
export const preserveScrollPosition = async (container, updateFunction) => {
  if (!container) return updateFunction();
  
  const scrollTop = container.scrollTop;
  const scrollLeft = container.scrollLeft;
  
  await updateFunction();
  
  // Restaurar posición después de un pequeño delay para que el DOM se actualice
  requestAnimationFrame(() => {
    if (container) {
      container.scrollTop = scrollTop;
      container.scrollLeft = scrollLeft;
    }
  });
};

/**
 * Scroll suave hacia un elemento específico
 * @param {Element} container - Contenedor con scroll
 * @param {Element} targetElement - Elemento objetivo
 * @param {Object} options - Opciones de scroll
 */
export const smoothScrollToElement = (container, targetElement, options = {}) => {
  if (!container || !targetElement) return;
  
  const {
    behavior = 'smooth',
    block = 'nearest',
    inline = 'nearest'
  } = options;
  
  targetElement.scrollIntoView({
    behavior,
    block,
    inline
  });
};

/**
 * Detecta si un elemento está visible en el viewport del contenedor
 * @param {Element} element - Elemento a verificar
 * @param {Element} container - Contenedor con scroll
 * @returns {boolean} - True si está visible
 */
export const isElementVisible = (element, container) => {
  if (!element || !container) return false;
  
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  return (
    elementRect.top >= containerRect.top &&
    elementRect.bottom <= containerRect.bottom &&
    elementRect.left >= containerRect.left &&
    elementRect.right <= containerRect.right
  );
};

/**
 * Scroll suave hacia el final del contenedor
 * @param {Element} container - Contenedor con scroll
 */
export const scrollToBottom = (container) => {
  if (!container) return;
  
  container.scrollTo({
    top: container.scrollHeight,
    behavior: 'smooth'
  });
};