# 🚀 GUÍA PASO A PASO: CONFIGURAR TWILIO WHATSAPP SANDBOX

## 🎯 OBJETIVO
Activar las notificaciones WhatsApp en tu sistema de notaría usando el sandbox gratuito de Twilio.

---

## 📋 PASO 1: CREAR CUENTA TWILIO

### 1.1 Registro
1. Ve a https://www.twilio.com/
2. Click en **"Start building for free"** o **"Sign up"**
3. Completa el formulario:
   - **Email**: Tu email personal o de trabajo
   - **Password**: Contraseña segura
   - **First Name**: Tu nombre
   - **Last Name**: Tu apellido

### 1.2 Verificación
1. **Verifica tu email** (revisa bandeja de spam)
2. **Verifica tu número de teléfono** con el código SMS que envían
3. **Completa el onboarding** (puedes omitir preguntas opcionales)

---

## 📱 PASO 2: CONFIGURAR WHATSAPP SANDBOX

### 2.1 Acceder al Sandbox
1. En el **Twilio Console**, ve al menú lateral izquierdo
2. Click en **"Messaging"**
3. Click en **"Try it out"**
4. Click en **"Send a WhatsApp message"**

### 2.2 Obtener tu código sandbox
En la página del sandbox verás algo como:
```
Join your sandbox by sending "join carefully-helped" to +1 415 523 8886
```

**Tu código será diferente** (ejemplo: `join orange-monkey`, `join happy-cloud`, etc.)

### 2.3 Unir tu teléfono al sandbox
1. **Desde tu WhatsApp personal**, envía un mensaje a: **+1 415 523 8886**
2. **Texto del mensaje**: `join tu-codigo-aqui` (ejemplo: `join carefully-helped`)
3. **Deberías recibir una confirmación** como:
   ```
   Joined carefully-helped
   You can now send messages to the Sandbox number from this device.
   ```

### 2.4 ¡Importante!
- **Guarda tu código sandbox** (ej: `carefully-helped`)
- **Solo números que hagan "join" pueden recibir mensajes**
- **Máximo 5 números en sandbox gratuito**

---

## 🔑 PASO 3: OBTENER CREDENCIALES

### 3.1 Encontrar credenciales
1. En **Twilio Console**, ve al **Dashboard principal**
2. Verás una sección **"Account Info"** con:
   - **Account SID**: Empieza con `AC...` (32 caracteres)
   - **Auth Token**: Click **"Show"** para revelarlo (32 caracteres)

### 3.2 Ejemplo de credenciales
```
Account SID: AC1234567890abcdef1234567890abcdef
Auth Token:  ef1234567890abcdef1234567890abcdef
```

**⚠️ IMPORTANTES:**
- **Account SID** es público, no es secreto
- **Auth Token** es secreto, no lo compartas
- **Ambos son necesarios** para que funcione

---

## ⚙️ PASO 4: CONFIGURAR TU SISTEMA

### 4.1 Editar archivo .env
1. Ve a la carpeta `backend` de tu proyecto
2. Abre el archivo `.env`
3. **Reemplaza estas líneas**:

```bash
# ANTES (valores de ejemplo)
TWILIO_ACCOUNT_SID=tu_account_sid_aqui
TWILIO_AUTH_TOKEN=tu_auth_token_aqui

# DESPUÉS (con tus valores reales)
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcdef
TWILIO_AUTH_TOKEN=ef1234567890abcdef1234567890abcdef
```

### 4.2 Verificar otras configuraciones
Asegúrate de que estas líneas estén correctas:
```bash
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_ENABLED=true
NODE_ENV=development
```

**📝 Notas:**
- `TWILIO_WHATSAPP_FROM` siempre es `+14155238886` en sandbox
- `WHATSAPP_ENABLED=true` activa las notificaciones
- `NODE_ENV=development` activa el modo de pruebas

---

## 🧪 PASO 5: PROBAR LA CONFIGURACIÓN

### 5.1 Ejecutar pruebas
1. **Abre terminal** en la carpeta `backend`
2. **Ejecuta el comando**:
   ```bash
   npm run test:whatsapp
   ```

### 5.2 Resultado esperado
Deberías ver algo como:
```
🧪 ═══════════════════════════════════════
🏛️  PRUEBAS DE CONFIGURACIÓN TWILIO WHATSAPP
🧪 ═══════════════════════════════════════

🔧 PRUEBA 1: Verificando configuración...
📋 Estado: active
💬 Mensaje: Configuración válida y funcional

🔢 PRUEBA 2: Generando códigos de retiro...
✅ Todos los códigos son únicos

📱 PRUEBA 3: Enviando mensaje "documento listo"...
✅ Mensaje enviado exitosamente

🏁 ════════════════════════════════════════
📊 RESUMEN DE PRUEBAS
🏁 ════════════════════════════════════════
✅ Pruebas exitosas: 6/6
❌ Pruebas fallidas: 0/6

🎉 ¡TODAS LAS PRUEBAS PASARON! WhatsApp está listo.
```

### 5.3 ¿Qué hace cada prueba?
1. **Configuración**: Verifica que Twilio responda
2. **Códigos**: Genera códigos únicos de retiro
3. **Números**: Valida formato de teléfonos ecuatorianos  
4. **Mensajes**: Envía ejemplos de notificaciones
5. **Simulación**: Muestra mensajes en consola

---

## 📞 PASO 6: CONFIGURAR NÚMEROS DE PRUEBA

### 6.1 Actualizar número de prueba
1. Abre `backend/scripts/test-whatsapp.js`
2. Busca la línea:
   ```javascript
   clientPhone: '+593987654321' // CAMBIAR POR TU NÚMERO
   ```
3. **Cambia por tu número real** (el que hiciste "join"):
   ```javascript
   clientPhone: '+593998123456' // Tu número real aquí
   ```

### 6.2 Formatos válidos de números
El sistema acepta estos formatos ecuatorianos:
- `+593987654321` ✅ (Recomendado)
- `593987654321` ✅
- `0987654321` ✅  
- `987654321` ✅
- `09 8765 4321` ✅ (con espacios)

### 6.3 Probar con tu número
1. **Guarda los cambios** en el archivo
2. **Ejecuta otra vez**:
   ```bash
   npm run test:whatsapp
   ```
3. **Deberías recibir un WhatsApp** en tu teléfono con:
   ```
   🏛️ NOTARÍA PRIMERA DEL CANTÓN AMBATO
   
   Estimado/a Juan Carlos Pérez,
   
   Su documento está listo para retiro:
   📄 Documento: Escritura de Compraventa
   🔢 Código de retiro: 9876
   
   📍 Dirección: Calle Sucre y Tomás Sevilla
   ⏰ Horario: Lunes a Viernes 8:00-17:00
   ```

---

## 🔧 PASO 7: ACTIVAR EN PRODUCCIÓN

### 7.1 Probar en el sistema real
1. **Inicia el servidor**:
   ```bash
   npm run dev
   ```
2. **Ve al sistema web** (frontend)
3. **Marca un documento como "LISTO"**
4. **El cliente debería recibir WhatsApp automáticamente**

### 7.2 ¿Dónde se activa?
- **Recepción**: Al marcar documento individual como listo
- **Recepción**: Al marcar grupo de documentos como listo  
- **Archivo**: Al cambiar estado a "LISTO" en kanban

### 7.3 ¿Qué pasa si falla?
- **El sistema sigue funcionando normal**
- **Solo no se envía el WhatsApp**
- **Se registra el error en logs del servidor**
- **El frontend no se entera del error**

---

## ❌ PASO 8: RESOLUCIÓN DE PROBLEMAS

### 8.1 Error: "WhatsApp deshabilitado"
**Causa**: Variable `WHATSAPP_ENABLED` no está en `true`
**Solución**: En `.env` cambiar a `WHATSAPP_ENABLED=true`

### 8.2 Error: "Credenciales faltantes"
**Causa**: `TWILIO_ACCOUNT_SID` o `TWILIO_AUTH_TOKEN` vacíos
**Solución**: Verificar que copiaste bien las credenciales de Twilio

### 8.3 Error: "Error validando credenciales"
**Causa**: Credenciales incorrectas o cuenta suspendida
**Solución**: 
1. Verificar que copiaste Account SID y Auth Token correctos
2. Verificar que tu cuenta Twilio esté activa

### 8.4 Error: "Número de teléfono inválido"
**Causa**: Número no está en formato válido
**Solución**: Usar formato `+593987654321`

### 8.5 No recibo WhatsApp
**Posibles causas**:
1. **No hiciste "join"** → Envía `join tu-codigo` al +1 415 523 8886
2. **Número diferente** → Usa el mismo número que hizo "join"
3. **Cuenta sandbox expirada** → Renueva en Twilio Console

### 8.6 "Cannot find module" errors
**Solución**: 
```bash
cd backend
npm install
```

---

## 🎉 PASO 9: ¡LISTO PARA USAR!

### 9.1 Funcionalidades activadas
✅ **Notificación automática** cuando documento esté listo  
✅ **Códigos de retiro únicos** generados automáticamente  
✅ **Mensajes profesionales** con datos de la notaría  
✅ **Soporte para grupos** de documentos del mismo cliente  
✅ **Números ecuatorianos** formateados automáticamente  
✅ **Modo seguro** que no rompe el sistema si falla  

### 9.2 Próximos pasos opcionales
- **Agregar más números** al sandbox (hasta 5 total)
- **Configurar notificaciones de entrega** (ya implementado)  
- **Personalizar mensajes** editando el servicio
- **Migrar a número real** comprando WhatsApp Business API

### 9.3 Para migrar a producción real
1. **Comprar número WhatsApp Business** en Twilio (~$25/mes)
2. **Cambiar** `TWILIO_WHATSAPP_FROM` por tu número comprado
3. **Cambiar** `NODE_ENV=production`
4. **Ya no necesitas sandbox** ni códigos "join"

---

## 📞 SOPORTE

### ¿Necesitas ayuda?
1. **Revisa los logs** en terminal donde corre el servidor
2. **Ejecuta las pruebas** con `npm run test:whatsapp`
3. **Verifica tu cuenta Twilio** en https://console.twilio.com/
4. **Consulta documentación Twilio** en https://www.twilio.com/docs/whatsapp

### Información importante
- **Sandbox es gratuito** pero limitado a 5 números
- **Mensajes en sandbox** incluyen "[Sent from your Twilio trial account]"
- **Para uso real** necesitas migrar a cuenta de pago
- **Ecuador requiere** verificación adicional para números reales

---

## ✅ CONFIGURACIÓN COMPLETADA

**¡Felicitaciones! Tu sistema de notaría ahora envía notificaciones automáticas por WhatsApp cuando los documentos están listos para retiro.**

**El sistema es robusto y no afectará las operaciones normales aunque WhatsApp falle.**