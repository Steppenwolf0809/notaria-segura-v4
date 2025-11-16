# XML Watcher Service - Notaría Segura v4

Servicio standalone para monitoreo automático de archivos XML y subida al sistema de Notaría Segura.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Requisitos del Sistema](#requisitos-del-sistema)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Características Avanzadas](#características-avanzadas)
- [Monitoreo y Logs](#monitoreo-y-logs)
- [Solución de Problemas](#solución-de-problemas)
- [Preguntas Frecuentes](#preguntas-frecuentes)

---

## ✨ Características

### Principales
- ✅ **Monitoreo Automático**: Detecta archivos XML en tiempo real
- ✅ **Validación de XML**: Verifica la estructura antes de subir
- ✅ **Procesamiento por Lotes**: Sube hasta 20 archivos simultáneamente
- ✅ **Sistema de Reintentos**: Reintenta automáticamente archivos con error
- ✅ **Organización Automática**: Mueve archivos a carpetas por fecha
- ✅ **Limpieza Programada**: Elimina archivos antiguos automáticamente

### Avanzadas
- 📧 **Notificaciones por Email**: Alertas de errores y resúmenes diarios
- 🔄 **Reintentos Inteligentes**: Sistema de reintentos con backoff exponencial
- 📊 **Logging Detallado**: Logs rotativos con múltiples niveles
- 🔐 **Autenticación Automática**: Re-autenticación automática en caso de expiración
- 📦 **Compresión de Archivos**: Comprime archivos antiguos para ahorrar espacio
- ⚡ **Alta Disponibilidad**: Puede instalarse como servicio de Windows

---

## 💻 Requisitos del Sistema

### Software Requerido
- **Windows**: 10 o superior (64-bit)
- **Node.js**: v18.0.0 o superior
- **npm**: v8.0.0 o superior

### Software Opcional
- **NSSM**: Para instalar como servicio de Windows ([Descargar](https://nssm.cc/download))
- **Cliente de Email**: Si deseas usar notificaciones por email

### Requisitos de Red
- Conexión a Internet para comunicarse con la API
- Acceso a: `https://notaria-segura-v4-production.up.railway.app`

---

## 🚀 Instalación

### Método 1: Instalación Automatizada (Recomendado)

#### Usando PowerShell (Recomendado)

1. **Abre PowerShell como Administrador**
   - Clic derecho en el menú Inicio
   - Selecciona "Windows PowerShell (Administrador)"

2. **Navega al directorio del proyecto**
   ```powershell
   cd ruta\a\xml-watcher-service
   ```

3. **Ejecuta el script de instalación**
   ```powershell
   .\install-windows.ps1
   ```

4. **Sigue las instrucciones en pantalla**
   - El script instalará dependencias
   - Creará carpetas necesarias
   - Construirá el ejecutable
   - (Opcional) Instalará como servicio de Windows

#### Usando CMD

1. **Abre CMD como Administrador**

2. **Navega al directorio del proyecto**
   ```cmd
   cd ruta\a\xml-watcher-service
   ```

3. **Ejecuta el script de instalación**
   ```cmd
   install-windows.bat
   ```

### Método 2: Instalación Manual

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Crear carpetas necesarias**
   ```bash
   mkdir C:\Users\admlocal\Desktop\xmlcopiados
   mkdir C:\Users\admlocal\Desktop\xmlcopiados\processed
   mkdir C:\Users\admlocal\Desktop\xmlcopiados\errors
   mkdir C:\Users\admlocal\Desktop\xmlcopiados\archived
   ```

3. **Construir ejecutable**
   ```bash
   npm run build:pkg
   ```

4. **Copiar configuración**
   ```bash
   copy config.json dist\config.json
   ```

---

## ⚙️ Configuración

### Archivo de Configuración: `config.json`

Edita el archivo `dist\config.json` después de la instalación:

```json
{
  "apiUrl": "https://notaria-segura-v4-production.up.railway.app/api",
  "credentials": {
    "email": "sistema-caja@notaria.local",
    "password": "TuContraseñaSegura"
  },
  "folders": {
    "watch": "C:\\Users\\admlocal\\Desktop\\xmlcopiados",
    "processed": "C:\\Users\\admlocal\\Desktop\\xmlcopiados\\processed",
    "errors": "C:\\Users\\admlocal\\Desktop\\xmlcopiados\\errors",
    "archived": "C:\\Users\\admlocal\\Desktop\\xmlcopiados\\archived"
  },
  "settings": {
    "watchDelay": 5000,
    "batchSize": 20,
    "retryAttempts": 3,
    "retryBackoffMs": 1500,
    "maxFileSizeMB": 5,
    "logLevel": "INFO",
    "cleanup": {
      "enabled": true,
      "keepProcessedDays": 30,
      "keepErrorsDays": 90,
      "compressOldFiles": true,
      "cleanupHour": 2
    },
    "autoRetry": {
      "enabled": true,
      "intervalHours": 6,
      "maxAttempts": 3,
      "deleteAfterMaxAttempts": false
    }
  },
  "notifications": {
    "email": {
      "enabled": false,
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "user": "tu-email@gmail.com",
        "password": "tu-app-password"
      },
      "from": "XML Watcher Service <tu-email@gmail.com>",
      "recipients": [
        "admin@notaria.local",
        "it@notaria.local"
      ],
      "sendOnError": true,
      "sendDailySummary": true,
      "sendOnStartup": false
    }
  }
}
```

### Parámetros Importantes

#### Credenciales
- `email`: Email del usuario del sistema (rol CAJA)
- `password`: Contraseña del usuario

#### Carpetas
- `watch`: Carpeta que el servicio monitoreará
- `processed`: Donde se mueven los archivos exitosos
- `errors`: Donde se mueven los archivos con error
- `archived`: Donde se almacenan archivos comprimidos

#### Configuración General
- `watchDelay`: Tiempo de espera (ms) para asegurar que el archivo terminó de escribirse
- `batchSize`: Máximo de archivos a subir en un lote (máx: 20)
- `retryAttempts`: Intentos de reintento al subir
- `maxFileSizeMB`: Tamaño máximo de archivo XML (máx: 5MB)
- `logLevel`: Nivel de logging (`DEBUG`, `INFO`, `WARN`, `ERROR`)

#### Limpieza Automática
- `enabled`: Habilitar limpieza automática
- `keepProcessedDays`: Días a mantener archivos procesados
- `keepErrorsDays`: Días a mantener archivos con error
- `compressOldFiles`: Comprimir antes de eliminar
- `cleanupHour`: Hora del día para ejecutar limpieza (0-23)

#### Reintentos Automáticos
- `enabled`: Habilitar reintentos automáticos
- `intervalHours`: Cada cuántas horas reintentar
- `maxAttempts`: Máximo de intentos por archivo
- `deleteAfterMaxAttempts`: Eliminar archivo después de máximos intentos

#### Notificaciones por Email
- `enabled`: Habilitar notificaciones
- `smtp.host`: Servidor SMTP (ej: smtp.gmail.com)
- `smtp.port`: Puerto SMTP (587 para TLS, 465 para SSL)
- `smtp.user`: Usuario del email
- `smtp.password`: Contraseña de aplicación (para Gmail: [Crear contraseña de aplicación](https://myaccount.google.com/apppasswords))
- `recipients`: Lista de emails que recibirán notificaciones
- `sendOnError`: Enviar email cuando hay errores
- `sendDailySummary`: Enviar resumen diario
- `sendOnStartup`: Enviar email cuando el servicio inicia

### Configurar Gmail para Notificaciones

1. **Activar verificación en 2 pasos**
   - Ve a [Cuenta de Google](https://myaccount.google.com)
   - Seguridad → Verificación en 2 pasos

2. **Crear contraseña de aplicación**
   - Ve a [Contraseñas de aplicación](https://myaccount.google.com/apppasswords)
   - Selecciona "Correo" y "Otro (nombre personalizado)"
   - Ingresa "XML Watcher Service"
   - Usa la contraseña generada en `config.json`

---

## 🎯 Uso

### Ejecución Manual

Para ejecutar el servicio manualmente:

```bash
cd dist
xml-service.exe
```

### Instalar como Servicio de Windows

#### Usando NSSM

1. **Instalar NSSM**
   - Descarga desde [nssm.cc](https://nssm.cc/download)
   - Extrae y agrega al PATH

2. **Instalar servicio**
   ```cmd
   nssm install XmlWatcherService "C:\ruta\a\dist\xml-service.exe"
   nssm set XmlWatcherService AppDirectory "C:\ruta\a\dist"
   nssm set XmlWatcherService DisplayName "XML Watcher Service - Notaría Segura"
   nssm set XmlWatcherService Start SERVICE_AUTO_START
   ```

3. **Iniciar servicio**
   ```cmd
   nssm start XmlWatcherService
   ```

### Comandos del Servicio

```cmd
# Iniciar
nssm start XmlWatcherService

# Detener
nssm stop XmlWatcherService

# Reiniciar
nssm restart XmlWatcherService

# Ver estado
nssm status XmlWatcherService

# Desinstalar
nssm remove XmlWatcherService confirm
```

### Uso Básico

1. **Inicia el servicio** (manual o como servicio de Windows)

2. **Copia archivos XML** a la carpeta monitoreada:
   ```
   C:\Users\admlocal\Desktop\xmlcopiados\
   ```

3. **El servicio automáticamente**:
   - Detecta el archivo
   - Espera 5 segundos para asegurar que terminó de escribirse
   - Valida la estructura XML
   - Sube a la API
   - Mueve a `processed` (si exitoso) o `errors` (si falló)

---

## 🔧 Características Avanzadas

### Validación de XML

El servicio valida cada archivo antes de subirlo:

- ✅ Verifica que sea XML válido
- ✅ Confirma estructura de `<factura>`
- ✅ Valida campos obligatorios
- ✅ Verifica formato del número de libro
- ✅ Detecta archivos corruptos o incompletos

Archivos inválidos se mueven a `errors` con un archivo `.error.txt` explicando el problema.

### Sistema de Reintentos Automáticos

Archivos que fallan al subir se reintentan automáticamente:

1. **Cada 6 horas** (configurable)
2. **Máximo 3 intentos** por archivo
3. **Metadata de reintentos** guardada en `.retry.json`
4. **Backoff exponencial** entre intentos

### Organización por Fecha

Archivos se organizan automáticamente:

```
processed/
  ├── 2025-01-15/
  │   ├── factura001.xml
  │   └── factura002.xml
  └── 2025-01-16/
      └── factura003.xml

errors/
  ├── 2025-01-15/
  │   ├── factura-error.xml
  │   ├── factura-error.xml.error.txt
  │   └── factura-error.xml.retry.json
  └── 2025-01-16/
```

### Limpieza Automática

Ejecuta diariamente a las 2:00 AM:

1. **Archivos procesados**: Elimina después de 30 días
2. **Archivos con error**: Elimina después de 90 días
3. **Compresión**: Crea archivos ZIP mensuales antes de eliminar
4. **Archivos comprimidos**: Se guardan en `archived/`

### Notificaciones Inteligentes

- **Errores individuales**: Email inmediato cuando falla un archivo
- **Alertas críticas**: Email urgente después de 5 errores consecutivos
- **Resumen diario**: Estadísticas del día
- **Notificación de inicio**: Confirma que el servicio inició

---

## 📊 Monitoreo y Logs

### Archivos de Log

Los logs se guardan en:

```
C:\Users\admlocal\Desktop\xmlcopiados\xml-service-YYYY-MM-DD.log
```

#### Rotación de Logs
- Nuevo archivo cada día
- Máximo 10MB por archivo
- Se mantienen 30 días
- Formato timestamp + nivel + mensaje

### Niveles de Log

- `DEBUG`: Información detallada para diagnóstico
- `INFO`: Operaciones normales (por defecto)
- `WARN`: Advertencias que no detienen el proceso
- `ERROR`: Errores que requieren atención

### Ejemplo de Log

```log
2025-01-15 14:23:10 INFO  XML Watcher Service - Notaría iniciado
2025-01-15 14:23:10 INFO  API: https://notaria-segura-v4-production.up.railway.app/api
2025-01-15 14:23:11 INFO  Servicio iniciado - Vigilando: C:\Users\admlocal\Desktop\xmlcopiados
2025-01-15 14:25:32 INFO  Archivo detectado: factura001.xml
2025-01-15 14:25:37 INFO  ✓ Validación exitosa: factura001.xml
2025-01-15 14:25:37 INFO  Procesando 1 archivo(s)...
2025-01-15 14:25:39 INFO  Upload exitoso: 1 archivo(s)
```

### Monitorear en Tiempo Real

#### Windows PowerShell
```powershell
Get-Content "C:\Users\admlocal\Desktop\xmlcopiados\xml-service-$(Get-Date -Format 'yyyy-MM-dd').log" -Wait
```

#### CMD
```cmd
tail -f C:\Users\admlocal\Desktop\xmlcopiados\xml-service-2025-01-15.log
```

---

## 🔍 Solución de Problemas

### El servicio no detecta archivos

1. **Verifica que el servicio está corriendo**
   ```cmd
   nssm status XmlWatcherService
   ```

2. **Verifica la carpeta de monitoreo**
   - Confirma que la ruta en `config.json` es correcta
   - Asegúrate que la carpeta existe

3. **Revisa los logs**
   - Busca mensajes de error en el log del día

### Error de autenticación

```log
ERROR: No se pudo autenticar al inicio
```

**Solución:**
1. Verifica credenciales en `config.json`
2. Confirma que el usuario tiene rol CAJA
3. Verifica conectividad a la API

### Archivos van a errors

1. **Revisa el archivo `.error.txt`** junto al XML:
   ```
   errors/2025-01-15/factura.xml.error.txt
   ```

2. **Errores comunes:**
   - **XML mal formado**: Verifica estructura del XML
   - **Número de libro inválido**: Verifica formato `XXXXXXXXXXXPXXXXX`
   - **Protocolo duplicado**: El número de protocolo ya existe

### Notificaciones no llegan

1. **Verifica configuración SMTP**
   - Host y puerto correctos
   - Credenciales válidas

2. **Para Gmail:**
   - Usa contraseña de aplicación, no contraseña normal
   - Verifica que 2FA está activado

3. **Revisa logs**
   ```log
   ERROR: Error enviando notificación: ...
   ```

### El servicio se detiene solo

1. **Revisa logs del servicio**
   ```
   dist\service-stderr.log
   dist\service-stdout.log
   ```

2. **Verifica eventos de Windows**
   - Abre "Visor de Eventos"
   - Revisa "Registros de Windows" → "Aplicación"

3. **Reinstala el servicio**
   ```cmd
   nssm stop XmlWatcherService
   nssm remove XmlWatcherService confirm
   # Vuelve a instalar
   ```

---

## ❓ Preguntas Frecuentes

### ¿Puedo cambiar la carpeta de monitoreo?

Sí, edita `folders.watch` en `config.json` y reinicia el servicio.

### ¿Qué pasa si hay un corte de luz?

Si instalaste como servicio con `SERVICE_AUTO_START`, el servicio iniciará automáticamente al encender la PC.

### ¿Cuántos archivos puede procesar simultáneamente?

El servicio agrupa archivos detectados en una ventana de 1.5 segundos y los sube en lotes de hasta 20 archivos.

### ¿Los archivos procesados se pueden eliminar manualmente?

Sí, puedes eliminar archivos de `processed` en cualquier momento sin afectar el servicio.

### ¿Puedo ver estadísticas de procesamiento?

Sí, el servicio genera:
- Resumen semanal en logs (domingos 8:00 AM)
- Resumen diario por email (si está habilitado)

### ¿Es seguro guardar credenciales en config.json?

Para mayor seguridad:
1. Configura permisos del archivo para que solo Administrador pueda leer
2. Usa una cuenta de sistema dedicada con permisos mínimos
3. Considera usar variables de entorno (próxima versión incluirá encriptación)

### ¿Funciona con otros tipos de archivos?

No, el servicio solo procesa archivos `.xml` con estructura de factura electrónica.

### ¿Puedo monitorear múltiples carpetas?

Actualmente solo soporta una carpeta. Para monitorear múltiples carpetas, instala múltiples instancias del servicio.

---

## 📝 Notas de Versión

### v1.1.0 (Actual)
- ✅ Validación de XML antes de subir
- ✅ Sistema de notificaciones por email
- ✅ Reintentos automáticos para archivos en errors
- ✅ Scripts de instalación automatizados
- ✅ Logs mejorados con más detalles
- ✅ Alertas críticas por errores consecutivos

### v1.0.0
- Monitoreo básico de carpetas
- Subida a API
- Organización por fechas
- Limpieza automática

---

## 🤝 Soporte

Para problemas o preguntas:

1. **Revisa los logs** para información de diagnóstico
2. **Consulta esta documentación** para soluciones comunes
3. **Contacta al equipo de IT** de la Notaría

---

## 📜 Licencia

Uso interno de Notaría Segura. Todos los derechos reservados.


