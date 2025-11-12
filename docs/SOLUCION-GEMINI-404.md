# 🚨 SOLUCIÓN URGENTE: Gemini NO está funcionando

## ❌ **PROBLEMA DETECTADO**

Tu sistema tiene configurado `gemini-1.5-flash` que **YA NO EXISTE** (deprecado en Abril 2025).

Por eso ves este error:
```
❌ [404 Not Found] models/gemini-1.5-flash is not found
```

---

## ✅ **SOLUCIÓN INMEDIATA (5 minutos)**

### **Paso 1: Actualizar tu archivo `.env`**

Abre tu archivo `.env` y cambia:

```bash
# ❌ VIEJO (NO FUNCIONA)
GEMINI_MODEL=gemini-1.5-flash

# ✅ NUEVO (FUNCIONA)
GEMINI_MODEL=gemini-2.5-flash
```

### **Paso 2: Verificar que esté activo**

Asegúrate que estas líneas estén en tu `.env`:

```bash
GEMINI_ENABLED=true
GOOGLE_API_KEY=tu_api_key_real_aqui  # ← TU API KEY DE GOOGLE
GEMINI_MODEL=gemini-2.5-flash        # ← IMPORTANTE: 2.5, no 1.5
GEMINI_TIMEOUT=30000
USE_ENHANCED_PROMPT=true             # ← Para usar el prompt mejorado
```

### **Paso 3: Reiniciar el servidor**

```bash
# Detén el servidor (Ctrl+C si está corriendo)
# Luego:
npm run dev
```

---

## 📊 **MODELOS DISPONIBLES EN 2025**

| Modelo | Velocidad | Costo | Recomendación |
|--------|-----------|-------|---------------|
| **gemini-2.5-flash** | ⚡ Rápido | 💰 Bajo | ✅ **USAR ESTE** |
| gemini-2.0-flash | ⚡ Rápido | 💰 Bajo | OK |
| gemini-2.5-pro | 🐌 Lento | 💰💰 Alto | Para casos complejos |

**NOTA:** Todos los modelos Gemini 1.0 y 1.5 fueron **retirados en Abril 2025**.

---

## 🔍 **CÓMO VERIFICAR QUE FUNCIONA**

Después de reiniciar el servidor, intenta procesar un documento. Deberías ver:

```
✅ INTENTO 1/4 - EXTRACCIÓN GEMINI...
✅ GEMINI parse OK
✅ EXTRACCIÓN GEMINI EXITOSA en 2341ms
📊 MÉTODO UTILIZADO: GEMINI  ← ¡ESTO ES BUENO!
```

En lugar de:
```
❌ Error: models/gemini-1.5-flash is not found  ← MAL
📊 MÉTODO UTILIZADO: NODE.JS  ← Fallback (malo)
```

---

## 🐛 **SI SIGUE FALLANDO**

### **Problema: "Invalid API Key"**
```bash
# Verifica que tu API key es válida
echo $GOOGLE_API_KEY

# Si es inválida, obtén una nueva en:
# https://aistudio.google.com/app/apikey
```

### **Problema: "Quota exceeded"**
Tu API key alcanzó el límite. Opciones:
1. Espera que se resetee el límite (usualmente 24 horas)
2. Crea un nuevo proyecto en Google AI Studio
3. Actualiza a plan de pago si necesitas más cuota

### **Problema: Sigue usando Node.js en lugar de Gemini**
```bash
# Verifica que Gemini esté habilitado
cat .env | grep GEMINI

# Debe mostrar:
# GEMINI_ENABLED=true
# GEMINI_MODEL=gemini-2.5-flash
```

---

## 📋 **CHECKLIST RÁPIDO**

Antes de procesar documentos, verifica:

- [ ] Archivo `.env` tiene `GEMINI_MODEL=gemini-2.5-flash`
- [ ] `GEMINI_ENABLED=true`
- [ ] `GOOGLE_API_KEY` tiene tu API key válida
- [ ] Servidor reiniciado después de cambiar `.env`
- [ ] No hay error 404 en los logs

---

## 🎯 **DESPUÉS DE ARREGLAR GEMINI**

Una vez que Gemini funcione, el sistema debería:

1. ✅ Detectar correctamente el tipo de acto
2. ✅ Extraer otorgantes y beneficiarios con precisión
3. ✅ Separar apellidos y nombres correctamente
4. ✅ Asignar calidades según el tipo de acto

**Ejemplo con tu documento de CONSTITUCIÓN DE SOCIEDAD:**

```
✅ EXTRACCIÓN GEMINI EXITOSA
📊 MÉTODO UTILIZADO: GEMINI
🎯 TIPO ACTO: CONSTITUCIÓN DE SOCIEDAD  ← Correcto
👥 OTORGANTES:
   1. CARRILLO FLORES ROBERTO RENAN (SOCIO)
   2. MONTERO MONTERO ALFREDO (SOCIO)
🎁 BENEFICIARIOS: []  ← Correcto (en constituciones no hay beneficiarios)
```

En lugar de:
```
❌ MÉTODO UTILIZADO: NODE.JS
🎯 TIPO ACTO: PODER ESPECIAL  ← Incorrecto
👥 OTORGANTES: .SUPERCIAS.GOB.EC, NOTARÍA DÉCIMA...  ← Basura
```

---

## 📞 **¿NECESITAS AYUDA?**

Si después de estos pasos sigue sin funcionar:

1. **Copia los logs completos** del error
2. **Verifica tu archivo `.env`** (sin compartir el API key real)
3. **Copia el mensaje de error** específico de Gemini

---

## ⚡ **RESUMEN DE 30 SEGUNDOS**

```bash
# 1. Edita tu .env
GEMINI_MODEL=gemini-2.5-flash  # Cambiar de 1.5 a 2.5

# 2. Reinicia servidor
npm run dev

# 3. Prueba un documento

# ✅ Debería funcionar inmediatamente
```

---

**Última actualización:** Enero 2025
**Razón:** Gemini 1.5 deprecado en Abril 2025
**Acción requerida:** Actualizar a Gemini 2.5 inmediatamente
