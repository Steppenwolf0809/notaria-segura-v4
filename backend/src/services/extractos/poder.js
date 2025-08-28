// Módulo de trámite: Poder (universal)
// Delegamos mayormente al motor genérico; aquí vivirán ajustes propios de PODER

import ExtractoTemplateEngine from './engine.js'

const PoderTemplates = {
  async render(data) {
    // Por ahora todos los poderes usan el template universal
    return ExtractoTemplateEngine.renderPoderUniversal(data)
  }
}

export default PoderTemplates

