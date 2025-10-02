# Cómo Agregar el Logo de la Notaría

El logo se mostrará en la página de verificación pública de escrituras.

## 📋 Pasos para Agregar el Logo

### 1. Preparar la Imagen del Logo

**Formato recomendado:**
- PNG con fondo transparente (preferido)
- SVG (alternativa vectorial)
- JPG (si no hay fondo transparente)

**Dimensiones recomendadas:**
- Alto: 80-120px
- Ancho: Proporcional (el sistema ajusta automáticamente)

### 2. Nombrar el Archivo

El logo debe llamarse **exactamente**:
```
logo-notaria.png
```

O si es SVG:
```
logo-notaria.svg
```

### 3. Ubicación del Archivo

#### **Para desarrollo local:**
Coloca el logo en:
```
frontend/public/logo-notaria.png
```

#### **Para producción (Railway):**
Coloca el logo en:
```
frontend/public/logo-notaria.png
```

Y luego haz commit y push:
```bash
git add frontend/public/logo-notaria.png
git commit -m "feat: Agregar logo de la notaría"
git push origin fix/pdf-parse-startup-healthz
```

## 🎨 Características del Logo en la Página

✅ **Clickeable:** Al hacer click, abre www.notaria18quito.com.ec en nueva pestaña
✅ **Efecto hover:** El header hace zoom ligeramente al pasar el mouse
✅ **Adaptativo:** Si no existe el logo, simplemente no se muestra
✅ **Filtro blanco:** El logo se convierte a blanco para contrastar con el fondo azul

## 🔄 Si Quieres Cambiar el Color del Logo

En `frontend/src/pages/VerificacionPublica.jsx`, busca esta línea:

```javascript
filter: 'brightness(0) invert(1)', // Hace el logo blanco
```

**Opciones:**
- **Logo blanco:** `filter: 'brightness(0) invert(1)'`
- **Logo original:** `filter: 'none'`
- **Logo con brillo:** `filter: 'brightness(1.2)'`

## 🔗 Si Quieres Cambiar la URL de Destino

En la misma línea del `onClick`:

```javascript
onClick={() => window.open('https://www.notaria18quito.com.ec', '_blank')}
```

Cambia la URL por la que necesites.

## 📱 Vista Responsive

El logo se adapta automáticamente en:
- 📱 Móviles
- 💻 Tablets
- 🖥️ Escritorio

---

## ✅ Resultado Final

```
┌─────────────────────────────────────┐
│                                     │
│         [LOGO NOTARÍA]              │
│                                     │
│     GLENDA ZAPATA SILVA             │
│   NOTARIO DÉCIMO OCTAVO             │
│ Verificación de Escritura Notarial  │
│                                     │
│  Calle Azuay E2-231...              │
│  Tel: (02) 224-7787                 │
│                                     │
│ Click para visitar nuestro sitio    │
│                                     │
└─────────────────────────────────────┘
     ↓ (Click lleva a la web)
```

---

¿Necesitas ayuda para optimizar o convertir tu logo? ¡Avísame! 🎨

