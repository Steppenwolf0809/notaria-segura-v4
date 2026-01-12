/**
 * Mapa de emojis seguros usando String.fromCodePoint
 * Esta es la forma más "nuclear" de asegurar que no hay problemas de encoding
 * ya que generamos el string en tiempo de ejecución desde números.
 */
export const EMOJIS = {
    NOTARIA: String.fromCodePoint(0x1F3DB, 0xFE0F),   // 🏛️
    DOCUMENTO: String.fromCodePoint(0x1F4C4),         // 📄
    CODIGO: String.fromCodePoint(0x1F522),            // 🔢
    ESCRITURA: String.fromCodePoint(0x1F4CB),         // 📋
    IMPORTANTE: String.fromCodePoint(0x26A0, 0xFE0F), // ⚠️
    DIRECCION: String.fromCodePoint(0x1F4CD),         // 📍
    HORARIO: String.fromCodePoint(0x23F0),            // ⏰
    RELOJ: String.fromCodePoint(0x23F0),              // ⏰
    CHECK: String.fromCodePoint(0x2705),              // ✅
    USUARIO: String.fromCodePoint(0x1F464),           // 👤
    CALENDARIO: String.fromCodePoint(0x1F4C5)         // 📅
};

export default EMOJIS;
