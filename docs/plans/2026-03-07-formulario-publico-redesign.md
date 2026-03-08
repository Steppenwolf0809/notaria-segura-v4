# Formulario Publico UAFE - Rediseno

Fecha: 2026-03-07
Branch: feature/formulario-uafe-reportes

## Problema

El formulario publico actual requiere un link unico por compareciente (protocolo + cedula en la URL).
En una compraventa con 15 comparecientes, el matrizador debe copiar y enviar 15 links distintos.
Ademas, los datos de la persona son universales (no dependen del protocolo), asi que no tiene sentido
vincular el formulario a un protocolo especifico.

## Diseno

### Link unico global

**URL:** `/formulario-uafe`

Un solo link para siempre. Se puede:
- Imprimir en tarjetas de la notaria
- Poner en la firma del correo
- Generar un QR para recepcion
- Redirect desde `notaria18quito.com.ec/registro` (cPanel `.htaccess`)

### Flujo del usuario

1. Ingresa cedula
2. Si no existe -> crear cuenta (elige su propio PIN de 6 digitos)
3. Si existe y `pinCreado: false` -> cambio obligatorio de PIN (el temporal no sirve para login)
4. Si existe y `pinCreado: true` -> login con PIN
5. Ve formulario con datos existentes pre-cargados (persona natural o juridica segun tipo)
6. Edita/completa sus datos
7. Guarda -> actualiza `PersonaRegistrada`
8. Completitud se recalcula automaticamente en TODOS los protocolos donde participe

### Multi-tenant

Los datos de la persona son independientes de la notaria. Si Juan llena sus datos, sirven
para Notaria 18, Notaria 5, cualquiera. El link global es correcto para multi-tenant.

### Seguridad

**PIN temporal:**
- Cuando el matrizador crea un protocolo via wizard, el sistema genera un PIN temporal
  (ultimos 6 digitos de la cedula) con `pinCreado: false`
- Este PIN temporal NO permite login al formulario publico
- Solo sirve como semilla: en el primer acceso, el usuario debe crear su propio PIN

**Cambio obligatorio en primer login:**
- Si `pinCreado: false` -> mostrar pantalla de cambio de PIN
- Validaciones: 6 digitos, no secuencias (123456), no repeticiones (111111)
- Al confirmar, se hashea con bcrypt y se guarda con `pinCreado: true`

**Rate limiting:**
- Maximo 5 intentos de PIN por cedula
- Bloqueo temporal de 30 minutos tras exceder intentos
- Previene brute force por script

**Reset de PIN:**
- El funcionario (matrizador/admin) puede resetear el PIN desde el panel
- Resetea a ultimos 6 digitos de cedula + marca `pinCreado: false`
- El usuario debe cambiar el PIN en el proximo acceso
- Mensaje al usuario: "Acerquese a la Notaria con su cedula para resetear su PIN"

### Backend

Reusar endpoints existentes de `/api/personal/*`:
- `GET /personal/verificar-cedula/:cedula` - verificar si existe
- `POST /personal/registrar` - crear cuenta con PIN
- `POST /personal/login` - login con PIN
- `PUT /personal/mi-informacion` - guardar datos
- `GET /personal/mi-informacion` - cargar datos existentes

Agregar:
- `PUT /personal/cambiar-pin` - cambio de PIN (primer login o voluntario)
- `PUT /admin/reset-pin/:cedula` - reset de PIN por funcionario (matrizador/admin)

### Frontend

Reescribir `FormularioUAFEPublico.jsx` basandose en el formulario de cPanel
(`docs/Uafe/formulariocpanel.html`) pero en React/MUI.

**Pantallas:**
1. Login (cedula + tipo persona)
2. Crear cuenta (PIN + confirmar PIN)
3. Cambiar PIN (si pinCreado: false)
4. Formulario (tabs con progreso)
5. Exito

**Persona Natural - 5 tabs:**
1. Datos Personales: apellidos, nombres, genero, estadoCivil, nivelEstudio, nacionalidad
2. Contacto y Direccion: celular, email, callePrincipal, calleSecundaria, numero, provincia, canton, parroquia
3. Laboral: situacion, profesionOcupacion, entidad, cargo, ingresoMensual
4. Conyuge (condicional): apellidos, nombres, numeroIdentificacion, nacionalidad, email, celular
5. PEP: esPEP, esFamiliarPEP, esColaboradorPEP

**Persona Juridica - 5 tabs:**
1. Compania: razonSocial, RUC, objetoSocial, direccion (calle/numero/provincia/canton/parroquia), contacto (email/tel/cel)
2. Representante Legal: apellidos, nombres, tipoId, numeroId, nacionalidad, genero, estadoCivil, nivelEstudio, contacto, direccion
3. Conyuge Rep. Legal (condicional): apellidos, nombres, identificacion, nacionalidad, contacto
4. Socios: tabla dinamica (agregar/eliminar)
5. PEP: esPEP, esFamiliarPEP, esColaboradorPEP

**Campos eliminados vs formulario cPanel (optimizacion):**
- Telefono fijo (celular basta)
- Relacion de dependencia (redundante con situacion laboral)
- Direccion de empresa + provincia/canton empresa
- Fecha de ingreso laboral
- Situacion laboral y profesion del conyuge

**Campos agregados vs formulario cPanel:**
- Ninguno

### Se elimina del sistema actual

- Logica de sesion por protocolo (`verifyFormularioUAFESession`)
- Parametros `?protocolo=X&cedula=Y` en la URL
- Boton "Copiar enlace" por cada compareciente en el detalle del protocolo
- Header `x-session-token`
- Tabla/modelo de sesiones de formulario

### Boton refrescar en detalle de protocolo

Ya implementado. El matrizador puede refrescar los datos del protocolo para ver
cuando un compareciente completa su informacion, sin salir al dashboard.

### Implementacion

1. Reescribir `FormularioUAFEPublico.jsx` con el nuevo flujo (sin protocolo)
2. Agregar endpoint `PUT /personal/cambiar-pin`
3. Agregar endpoint `PUT /admin/reset-pin/:cedula` o boton en panel matrizador
4. Agregar rate limiting al login (5 intentos / 30 min bloqueo)
5. Actualizar `App.jsx` (quitar parametros de URL)
6. Eliminar codigo de sesion por protocolo que ya no se usa
