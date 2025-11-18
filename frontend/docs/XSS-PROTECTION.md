# 🛡️ XSS Protection - Guía de Uso

## Descripción

Este proyecto implementa protección contra Cross-Site Scripting (XSS) usando DOMPurify, sanitizando automáticamente todo contenido del usuario antes de renderizarlo.

## Capas de Protección

### 1. Sanitización Automática en API Client

**Todas las respuestas del servidor se sanitizan automáticamente** antes de llegar a los componentes React.

```javascript
// api-client.js - Interceptor de respuesta
apiClient.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object') {
    response.data = sanitizeObject(response.data);
  }
  return response;
});
```

**Esto significa que:**
- ✅ No necesitas sanitizar manualmente los datos de la API
- ✅ Toda respuesta GET/POST/PUT/DELETE está protegida
- ✅ Protección transparente sin cambios en componentes existentes

### 2. Funciones de Sanitización Manual

Para casos especiales donde necesites sanitizar datos locales:

```javascript
import { sanitize, sanitizeRichText, sanitizeObject } from '../utils/sanitize';

// Texto plano (elimina TODO el HTML)
const safeName = sanitize('<script>alert("XSS")</script>Juan Pérez');
// Resultado: 'Juan Pérez'

// HTML rico (permite solo etiquetas seguras: b, i, em, strong, p, br, ul, ol, li)
const safeDescription = sanitizeRichText('<p>Hola <b>mundo</b></p><script>alert(1)</script>');
// Resultado: '<p>Hola <b>mundo</b></p>'

// Objeto completo (recursivo)
const safeObject = sanitizeObject({
  nombre: '<img src=x onerror=alert(1)>Juan',
  direccion: {
    calle: '<script>alert(1)</script>Main St'
  }
});
// Resultado: { nombre: 'Juan', direccion: { calle: 'Main St' } }
```

### 3. Componente React SafeText

Para renderizar texto del usuario de forma segura:

```jsx
import { SafeText } from '../utils/sanitize';

function UserProfile({ user }) {
  return (
    <div>
      {/* Renderiza texto plano sanitizado */}
      <h1>
        <SafeText value={user.name} />
      </h1>

      {/* Renderiza HTML rico sanitizado */}
      <div>
        <SafeText value={user.bio} richText />
      </div>
    </div>
  );
}
```

### 4. Hook useSanitize

Para sanitización reactiva en componentes:

```jsx
import { useSanitize } from '../utils/sanitize';

function CommentDisplay({ comment }) {
  const safeComment = useSanitize(comment.text);
  const safeBio = useSanitize(comment.author.bio, true); // allowRichText

  return (
    <div>
      <p>{safeComment}</p>
      <div dangerouslySetInnerHTML={{ __html: safeBio }} />
    </div>
  );
}
```

### 5. Validación Anti-XSS

Para validar inputs antes de enviar al servidor:

```javascript
import { isXSSFree } from '../utils/sanitize';

function handleSubmit(formData) {
  if (!isXSSFree(formData.name)) {
    alert('Nombre contiene caracteres no permitidos');
    return;
  }

  // Continuar con el envío...
}
```

### 6. Sanitización de URLs

Para parámetros de URL o hrefs dinámicos:

```javascript
import { sanitizeURLParam } from '../utils/sanitize';

const userId = sanitizeURLParam(params.id);
const safeHref = `/user/${sanitizeURLParam(user.slug)}`;
```

## Patrones de XSS Bloqueados

La sanitización detecta y elimina los siguientes patrones de ataque:

- ❌ `<script>` tags
- ❌ `javascript:` URLs
- ❌ Event handlers (`onclick`, `onerror`, `onload`, etc.)
- ❌ `<iframe>`, `<object>`, `<embed>` tags
- ❌ `eval()`, `expression()` functions
- ❌ Data URLs maliciosos
- ❌ HTML entities peligrosos

## Ejemplo Completo: Formulario de Usuario

```jsx
import React, { useState } from 'react';
import { sanitize, isXSSFree } from '../utils/sanitize';
import apiClient from '../services/api-client';

function UserForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validar en tiempo real
    if (!isXSSFree(value)) {
      setErrors(prev => ({
        ...prev,
        [name]: 'Caracteres no permitidos detectados'
      }));
      return;
    }

    // Sanitizar antes de guardar en estado
    setFormData(prev => ({
      ...prev,
      [name]: sanitize(value)
    }));

    // Limpiar error
    setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // La respuesta del servidor ya vendrá sanitizada automáticamente
    const response = await apiClient.post('/api/users', formData);

    // response.data.user.name ya está sanitizado ✅
    console.log('Usuario creado:', response.data.user);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Nombre"
      />
      {errors.name && <span className="error">{errors.name}</span>}

      <button type="submit">Guardar</button>
    </form>
  );
}
```

## Consideraciones de Rendimiento

### ¿La sanitización afecta el rendimiento?

**No significativamente.** DOMPurify es extremadamente eficiente:

- Sanitiza ~10,000 strings/segundo en navegadores modernos
- La sanitización automática solo se ejecuta en respuestas de API (no en cada render)
- El overhead es < 1ms en la mayoría de respuestas

### Desactivar sanitización en endpoints específicos

Si necesitas datos sin sanitizar (ej: administración de plantillas HTML):

```javascript
// En el endpoint específico, puedes agregar un flag
const response = await apiClient.get('/api/admin/templates', {
  skipSanitization: true // Custom config
});
```

Luego modifica el interceptor para respetar este flag:

```javascript
apiClient.interceptors.response.use((response) => {
  if (!response.config.skipSanitization && response.data) {
    response.data = sanitizeObject(response.data);
  }
  return response;
});
```

## Testing

### Test de Sanitización

```javascript
import { sanitize, isXSSFree } from '../utils/sanitize';

describe('XSS Protection', () => {
  test('elimina scripts maliciosos', () => {
    const input = '<script>alert("XSS")</script>Hola';
    const output = sanitize(input);
    expect(output).toBe('Hola');
  });

  test('elimina event handlers', () => {
    const input = '<img src=x onerror=alert(1)>Juan';
    const output = sanitize(input);
    expect(output).toBe('Juan');
  });

  test('detecta XSS en validación', () => {
    expect(isXSSFree('Juan Pérez')).toBe(true);
    expect(isXSSFree('<script>alert(1)</script>')).toBe(false);
    expect(isXSSFree('javascript:void(0)')).toBe(false);
  });
});
```

## Buenas Prácticas

### ✅ DO

- Confía en la sanitización automática del api-client
- Usa `SafeText` component para renderizar contenido del usuario
- Valida inputs con `isXSSFree()` antes de enviar al servidor
- Sanitiza parámetros de URL con `sanitizeURLParam()`

### ❌ DON'T

- No uses `dangerouslySetInnerHTML` sin sanitizar primero
- No confíes ciegamente en datos de localStorage (pueden ser manipulados)
- No desactives la sanitización sin una razón muy justificada
- No permitas HTML arbitrario sin sanitizar con `sanitizeRichText()`

## Recursos

- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## Soporte

Si encuentras un caso donde la sanitización causa problemas:

1. Verifica que realmente necesitas HTML sin sanitizar
2. Usa `sanitizeRichText()` si solo necesitas formato básico
3. Si es un endpoint de admin, considera agregar `skipSanitization: true`
4. Documenta el caso y consulta con el equipo de seguridad
