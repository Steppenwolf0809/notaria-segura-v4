
# Documentación de la API - Notaría Segura

Esta documentación describe los endpoints de la API RESTful del sistema Notaría Segura.

## Autenticación

La mayoría de los endpoints requieren autenticación mediante un Token JWT. El token debe ser enviado en la cabecera `Authorization` con el prefijo `Bearer `.

**URL Base**: `/api`

---

## Endpoints de Autenticación (`/auth`)

### `POST /auth/login`

Inicia sesión de un usuario.

- **Request Body**:
  - `username` (string, required): Nombre de usuario.
  - `password` (string, required): Contraseña.
- **Response (Success)**:
  - `token` (string): Token JWT.
  - `user` (object): Información del usuario.

### `POST /auth/register`

Registra un nuevo usuario. **Requiere rol de `ADMIN`**.

- **Request Body**:
  - `username` (string, required)
  - `password` (string, required)
  - `role` (string, required): Uno de `CAJA`, `MATRIZADOR`, `RECEPCION`, `ARCHIVO`.
- **Response (Success)**:
  - `message` (string)
  - `user` (object)

### `GET /auth/profile`

Obtiene el perfil del usuario autenticado.

- **Response (Success)**:
  - `user` (object)

### `POST /auth/refresh`

Refresca un token JWT existente.

- **Response (Success)**:
  - `token` (string): Nuevo token JWT.

---

## Endpoints de Documentos (`/documents`)

### `POST /documents/upload-xml`

Sube y procesa un único archivo XML. **Requiere rol de `CAJA`**.

- **Request Body**: `multipart/form-data` con un campo `xmlFile`.

### `POST /documents/upload-xml-batch`

Sube y procesa múltiples archivos XML. **Requiere rol de `CAJA`**.

- **Request Body**: `multipart/form-data` con un campo `xmlFiles` (hasta 20 archivos).

### `GET /documents/all`

Obtiene todos los documentos. **Requiere rol de `CAJA` o `ADMIN`**.

### `PUT /documents/:id/assign`

Asigna un documento a un matrizador. **Requiere rol de `CAJA`**.

- **URL Params**: `id` (ID del documento).
- **Request Body**:
  - `matrizadorId` (integer, required)

### `GET /documents/my-documents`

Obtiene los documentos asignados al matrizador autenticado. **Requiere rol de `MATRIZADOR`**.

### `PUT /documents/:id/status`

Actualiza el estado de un documento. **Requiere rol de `MATRIZADOR`**.

- **URL Params**: `id` (ID del documento).
- **Request Body**:
  - `status` (string, required): Nuevo estado del documento.

### `POST /documents/:id/deliver`

Entrega un documento. **Requiere rol de `RECEPCION`**.

- **URL Params**: `id` (ID del documento).

### `GET /documents/matrizadores`

Obtiene la lista de matrizadores disponibles. **Requiere rol de `CAJA` o `ADMIN`**.

### `GET /documents/:id`

Obtiene los detalles de un documento específico.

- **URL Params**: `id` (ID del documento).

### `POST /documents/detect-groupable`

Detecta documentos que se pueden agrupar por cliente.

- **Request Body**:
  - `cliente` (string, required)

### `POST /documents/create-group`

Crea un grupo de documentos.

- **Request Body**:
  - `documentIds` (array of integers, required)

### `POST /documents/deliver-group`

Entrega un grupo de documentos.

- **Request Body**:
  - `groupId` (integer, required)

---

## Endpoints de Recepción (`/reception`)

### `GET /reception/documentos/todos`

Lista todos los documentos para la vista de recepción. **Requiere rol de `RECEPCION`**.

### `POST /reception/documentos/:id/marcar-listo`

Marca un documento como listo para ser recogido. **Requiere rol de `RECEPCION`**.

- **URL Params**: `id` (ID del documento).

### `POST /reception/documentos/marcar-grupo-listo`

Marca un grupo de documentos como listos. **Requiere rol de `RECEPCION`**.

- **Request Body**:
  - `documentIds` (array of integers, required)

### `GET /reception/matrizadores`

Obtiene la lista de matrizadores. **Requiere rol de `RECEPCION`**.

---

## Endpoints de Archivo (`/archivo`)

### `GET /archivo/dashboard`

Obtiene los datos para el dashboard del rol de archivo. **Requiere rol de `ARCHIVO`**.

### `GET /archivo/mis-documentos`

Lista los documentos asignados al usuario de archivo. **Requiere rol de `ARCHIVO`**.

### `POST /archivo/documentos/:id/estado`

Cambia el estado de un documento. **Requiere rol de `ARCHIVO`**.

- **URL Params**: `id` (ID del documento).
- **Request Body**:
  - `nuevoEstado` (string, required)

### `GET /archivo/supervision/todos`

Vista de supervisión de todos los documentos. **Requiere rol de `ARCHIVO`**.

### `GET /archivo/supervision/resumen`

Obtiene un resumen general del sistema. **Requiere rol de `ARCHIVO`**.

### `GET /archivo/supervision/matrizadores`

Obtiene la lista de matrizadores para la supervisión. **Requiere rol de `ARCHIVO`**.

### `GET /archivo/documentos/:id`

Obtiene los detalles de un documento. **Requiere rol de `ARCHIVO`**.
