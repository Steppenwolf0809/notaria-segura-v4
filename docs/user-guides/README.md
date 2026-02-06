# 📖 Guías de Usuario - Sistema de Trazabilidad Notarial

Bienvenido al manual de usuario del Sistema de Trazabilidad Documental Notarial. Selecciona tu rol para ver la guía específica:

---

## 🎯 Selecciona tu Rol

| Rol | Guía | Descripción |
|-----|------|-------------|
| 👨‍💼 **ADMIN** | [GUIA-ADMIN.md](./GUIA-ADMIN.md) | Gestión completa del sistema, usuarios y configuración |
| 💰 **CAJA** | [GUIA-CAJA.md](./GUIA-CAJA.md) | Importación de facturas, reportes financieros |
| 📝 **MATRIZADOR** | [GUIA-MATRIZADOR.md](./GUIA-MATRIZADOR.md) | Procesamiento de documentos y notificaciones |
| 🖥️ **RECEPCIÓN** | [GUIA-RECEPCION.md](./GUIA-RECEPCION.md) | Entrega de documentos y atención al cliente |
| 📁 **ARCHIVO** | [GUIA-ARCHIVO.md](./GUIA-ARCHIVO.md) | Supervisión y control de documentos |

---

## 📚 Contenido General

### [FAQ - Preguntas Frecuentes](./FAQ.md)
Respuestas a las preguntas más comunes de todos los usuarios.

### [Glosario](./GLOSARIO.md)
Términos técnicos y del negocio explicados de forma sencilla.

---

## 🚀 Primeros Pasos (Todos los Roles)

### 1. Acceder al Sistema

1. Abre tu navegador (Chrome, Firefox, Edge recomendados)
2. Ve a: `https://notaria-segura.railway.app`
3. Ingresa tu correo y contraseña
4. Si es tu primer login, **deberás cambiar tu contraseña**

### 2. Navegación Básica

```
┌─────────────────────────────────────────────────────┐
│  🏠 Logo        Búsqueda Global    👤 Mi Cuenta  🔔 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📋 Panel Principal                                 │
│     ├── Documentos asignados a ti                   │
│     ├── Acciones rápidas                            │
│     └── Estadísticas del día                        │
│                                                     │
│  📑 Menú Lateral (según tu rol)                     │
│     ├── Documentos                                  │
│     ├── Facturas                                    │
│     ├── Reportes                                    │
│     └── Configuración (solo Admin)                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3. Elementos Comunes de la Interfaz

| Elemento | Descripción |
|----------|-------------|
| 🔍 **Búsqueda Global** | Busca documentos por nombre, protocolo o factura |
| 🔔 **Notificaciones** | Alertas de documentos listos, pagos, etc. |
| 👤 **Mi Cuenta** | Cambiar contraseña, ver perfil |
| 📱 **WhatsApp** | Indicador de estado de notificaciones enviadas |

---

## 🎨 Guía Visual de Estados

### Estados de Documento

| Estado | Color | Significado | Próximo Paso |
|--------|-------|-------------|--------------|
| 🟡 **CREADO** | Amarillo | Documento registrado | Asignar a matrizador |
| 🔵 **EN PROCESO** | Azul | En preparación | Esperar a que esté listo |
| 🟢 **LISTO** | Verde | Listo para entrega | Notificar al cliente |
| 💰 **PENDIENTE PAGO** | Naranja | Esperando pago | Confirmar pago |
| 🟣 **PAGO CONFIRMADO** | Morado | Pagado, listo para entregar | Entregar documento |
| ⚫ **ENTREGADO** | Gris | Documento entregado | - |

### Estados de Factura

| Estado | Icono | Significado |
|--------|-------|-------------|
| **PENDIENTE** | ⏳ | Sin pagos registrados |
| **PARCIAL** | 💳 | Pagado parcialmente |
| **PAGADO** | ✅ | Pagado completamente |

---

## ⚡ Acciones Rápidas por Rol

### ADMIN
- Crear usuarios → [Ver guía](./GUIA-ADMIN.md#crear-usuarios)
- Ver todos los documentos → [Ver guía](./GUIA-ADMIN.md#panel-de-control)
- Configurar sistema → [Ver guía](./GUIA-ADMIN.md#configuración)

### CAJA
- Importar facturas XML → [Ver guía](./GUIA-CAJA.md#importar-facturas)
- Ver reportes de pagos → [Ver guía](./GUIA-CAJA.md#reportes)
- Consultar estado de facturas → [Ver guía](./GUIA-CAJA.md#consultar-facturas)

### MATRIZADOR
- Ver mis documentos → [Ver guía](./GUIA-MATRIZADOR.md#mi-portafolio)
- Cambiar estado a LISTO → [Ver guía](./GUIA-MATRIZADOR.md#marcar-como-listo)
- Enviar notificación WhatsApp → [Ver guía](./GUIA-MATRIZADOR.md#notificaciones)

### RECEPCIÓN
- Buscar documento del cliente → [Ver guía](./GUIA-RECEPCION.md#buscar-documento)
- Entregar documento → [Ver guía](./GUIA-RECEPCION.md#entregar-documento)
- Validar código de verificación → [Ver guía](./GUIA-RECEPCION.md#validar-código)

### ARCHIVO
- Ver todos los documentos → [Ver guía](./GUIA-ARCHIVO.md#supervisión)
- Filtrar por estado → [Ver guía](./GUIA-ARCHIVO.md#filtros)
- Generar reportes → [Ver guía](./GUIA-ARCHIVO.md#reportes)

---

## 🔧 Solución de Problemas Comunes

### No puedo iniciar sesión
1. Verifica que estés usando el correo correcto
2. Verifica mayúsculas/minúsculas en la contraseña
3. Si olvidaste la contraseña, contacta al **ADMIN**

### No veo mis documentos
- Verifica que estés en la sección correcta según tu rol
- Recarga la página (F5)
- Contacta al ADMIN si el problema persiste

### Error al subir archivo XML
- Verifica que sea formato XML válido
- El archivo no debe estar corrupto
- El tamaño máximo es 10MB

### No se envía la notificación WhatsApp
- Verifica que el número del cliente esté correcto
- El número debe incluir código de país (ej: +593)
- El cliente debe tener WhatsApp activo

---

## 📞 Soporte

¿Necesitas ayuda adicional?

1. **Consulta primero** la guía específica de tu rol
2. **Revisa** las [Preguntas Frecuentes](./FAQ.md)
3. **Contacta** al administrador del sistema con:
   - Tu nombre de usuario
   - Descripción del problema
   - Screenshot del error (si aplica)

---

## 🔄 Actualizaciones del Sistema

El sistema se actualiza automáticamente. Las nuevas funcionalidades se anunciarán en:
- El panel de notificaciones (🔔)
- Correo electrónico (para cambios importantes)

---

*Última actualización: Febrero 2025*
