/**
 * Mapa de símbolos seguros (ASCII/Simples) para evitar problemas de codificación.
 * Se reemplazaron los emojis por caracteres de texto estándar a petición del usuario
 * dado que el entorno de producción corrompe los caracteres Unicode complejos.
 */
export const EMOJIS = {
    NOTARIA: '>>',       // Antes: 🏛️
    DOCUMENTO: '>',      // Antes: 📄
    CODIGO: '>',         // Antes: 🔢
    ESCRITURA: '>',      // Antes: 📋
    IMPORTANTE: '(!)',   // Antes: ⚠️
    DIRECCION: '>',      // Antes: 📍
    HORARIO: '>',        // Antes: ⏰
    RELOJ: '>',          // Antes: ⏰
    CHECK: 'OK',         // Antes: ✅
    USUARIO: '>',        // Antes: 👤
    CALENDARIO: '>'      // Antes: 📅
};

export default EMOJIS;
