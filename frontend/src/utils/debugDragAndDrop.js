/**
 * 🐛 UTILIDADES DE DEBUG PARA DRAG & DROP
 * Funciones para diagnosticar problemas de drag & drop
 */

export const debugDragAndDrop = {
  /**
   * Verificar si el navegador soporta drag & drop
   */
  checkDragSupport() {
    const isSupported = 'draggable' in document.createElement('div');
    console.log('🔍 Soporte Drag & Drop:', isSupported ? '✅ SI' : '❌ NO');
    return isSupported;
  },

  /**
   * Verificar eventos de drag en un elemento
   */
  addDebugListeners(element, name = 'Element') {
    if (!element) {
      console.log('❌ Elemento no encontrado para debug');
      return;
    }

    // Eventos de arrastre
    element.addEventListener('dragstart', (e) => {
      console.log(`🚀 ${name} - DRAGSTART:`, {
        target: e.target.tagName,
        draggable: e.target.draggable,
        effectAllowed: e.dataTransfer?.effectAllowed
      });
    });

    element.addEventListener('drag', (e) => {
      console.log(`🔄 ${name} - DRAG (en movimiento)`);
    });

    element.addEventListener('dragend', (e) => {
      console.log(`🏁 ${name} - DRAGEND`);
    });

    // Eventos de drop zones
    element.addEventListener('dragenter', (e) => {
      console.log(`📥 ${name} - DRAGENTER`);
    });

    element.addEventListener('dragover', (e) => {
      console.log(`📋 ${name} - DRAGOVER`);
    });

    element.addEventListener('dragleave', (e) => {
      console.log(`📤 ${name} - DRAGLEAVE`);
    });

    element.addEventListener('drop', (e) => {
      console.log(`🎯 ${name} - DROP:`, {
        data: e.dataTransfer?.getData('text/plain')
      });
    });

    console.log(`🐛 Debug listeners añadidos a: ${name}`);
  },

  /**
   * Verificar si hay conflictos CSS que bloqueen drag & drop
   */
  checkCSSConflicts(element) {
    if (!element) return;

    const styles = window.getComputedStyle(element);
    const problems = [];

    // Verificar propiedades que pueden bloquear drag & drop
    if (styles.pointerEvents === 'none') {
      problems.push('pointer-events: none');
    }

    if (styles.userSelect !== 'none') {
      problems.push('user-select debe ser "none" para drag & drop');
    }

    if (styles.touchAction !== 'none') {
      problems.push('touch-action puede interferir en dispositivos táctiles');
    }

    if (problems.length > 0) {
      console.log('⚠️ Posibles problemas CSS:', problems);
    } else {
      console.log('✅ CSS compatible con drag & drop');
    }

    return problems;
  },

  /**
   * Verificar atributos HTML necesarios
   */
  checkHTMLAttributes(element) {
    if (!element) return;

    const issues = [];

    if (!element.hasAttribute('draggable')) {
      issues.push('Falta atributo draggable');
    } else if (element.getAttribute('draggable') !== 'true') {
      issues.push('draggable debe ser "true"');
    }

    if (issues.length > 0) {
      console.log('⚠️ Problemas HTML:', issues);
    } else {
      console.log('✅ Atributos HTML correctos');
    }

    return issues;
  },

  /**
   * Test completo de drag & drop
   */
  runFullDiagnostic() {
    console.log('🔍 === DIAGNÓSTICO COMPLETO DRAG & DROP ===');
    
    // 1. Soporte del navegador
    this.checkDragSupport();

    // 2. Encontrar elementos draggable
    const draggableElements = document.querySelectorAll('[draggable="true"]');
    console.log(`📄 Elementos draggable encontrados: ${draggableElements.length}`);

    draggableElements.forEach((el, index) => {
      console.log(`\n🔍 Elemento ${index + 1}:`);
      console.log('   Clase:', el.className);
      console.log('   Contenido:', el.textContent?.substring(0, 50) + '...');
      
      this.checkHTMLAttributes(el);
      this.checkCSSConflicts(el);
    });

    // 3. Encontrar drop zones
    const dropZones = document.querySelectorAll('[data-drop-zone], .drop-zone');
    console.log(`🎯 Drop zones encontradas: ${dropZones.length}`);

    // 4. Verificar librerías que pueden interferir
    const potentialConflicts = [];
    if (window.jQuery) potentialConflicts.push('jQuery');
    if (window.Sortable) potentialConflicts.push('SortableJS');
    if (window.Hammer) potentialConflicts.push('HammerJS');

    if (potentialConflicts.length > 0) {
      console.log('⚠️ Librerías que pueden interferir:', potentialConflicts);
    }

    console.log('🔍 === FIN DIAGNÓSTICO ===\n');
  }
};

// Auto-ejecutar diagnóstico en desarrollo
if (process.env.NODE_ENV === 'development') {
  // Ejecutar después de que el DOM se cargue
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => debugDragAndDrop.runFullDiagnostic(), 2000);
    });
  } else {
    setTimeout(() => debugDragAndDrop.runFullDiagnostic(), 2000);
  }
}

export default debugDragAndDrop;