# Sistema Notaría Segura v4

Sistema de trazabilidad documental notarial moderno con automatización XML y notificaciones WhatsApp.

## Descripción General

Notaría Segura es un sistema integral para la gestión y seguimiento de documentos en un entorno notarial. Permite la carga de documentos a través de archivos XML, la asignación de estos a diferentes roles de usuario (Caja, Matrizador, Recepción, Archivo), y el seguimiento del estado de cada documento a lo largo de su ciclo de vida. El sistema también incluye notificaciones por WhatsApp para mantener informados a los clientes sobre el estado de sus trámites.

## Características Principales

- **Gestión de Documentos por Roles**: Flujos de trabajo diferenciados para Caja, Matrizador, Recepción y Archivo.
- **Carga de Documentos XML**: Carga individual y por lotes de documentos en formato XML.
- **Trazabilidad Completa**: Seguimiento del estado de cada documento en tiempo real.
- **Notificaciones por WhatsApp**: Envío de notificaciones a los clientes sobre el estado de sus documentos.
- **Agrupación de Documentos**: Agrupación de documentos por cliente para una gestión más eficiente.
- **Dashboard Kanban**: Visualización del flujo de trabajo mediante un tablero Kanban.
- **Modo Oscuro**: Interfaz de usuario con tema oscuro y claro.

## Arquitectura del Proyecto

El proyecto sigue una arquitectura cliente-servidor:

- **Frontend**: Una aplicación de una sola página (SPA) construida con React, que consume la API del backend.
- **Backend**: Una API RESTful construida con Node.js y Express, que gestiona la lógica de negocio y la comunicación con la base de datos.
- **Base de Datos**: Una base de datos PostgreSQL gestionada con el ORM Prisma.

### Stack Tecnológico

- **Frontend**:
  - React
  - Vite
  - Material-UI (MUI)
  - Zustand (manejo de estado)
  - Axios (cliente HTTP)
- **Backend**:
  - Node.js
  - Express
  - Prisma (ORM)
  - PostgreSQL
  - JSON Web Tokens (JWT) para autenticación
  - Twilio (para notificaciones por WhatsApp)
- **Herramientas de Desarrollo**:
  - Nodemon (para recarga en caliente del servidor)
  - ESLint (linting de código)

## Estructura de Directorios

```
notaria-segura/
├── backend/         # API de Node.js y Express
│   ├── src/
│   ├── prisma/
│   └── ...
├── frontend/        # Aplicación de React
│   ├── src/
│   └── ...
├── .env             # Variables de entorno (no versionado)
├── package.json     # Scripts y dependencias del workspace
└── README.md        # Este archivo
```

## Configuración y Puesta en Marcha

### Prerrequisitos

- Node.js (v18 o superior)
- npm (v9 o superior)
- PostgreSQL

### Pasos de Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd notaria-segura
   ```

2. **Instalar dependencias**:
   Este comando instalará las dependencias tanto para el frontend como para el backend.
   ```bash
   npm run install:all
   ```

3. **Configurar variables de entorno**:
   - **Backend**: Copia `backend/.env.example` a `backend/.env` y rellena las variables:
     - `DATABASE_URL`: Cadena de conexión a tu base de datos PostgreSQL.
     - `JWT_SECRET`: Un secreto para firmar los tokens JWT.
     - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`: Credenciales de Twilio (remitente WhatsApp en formato `whatsapp:+14155238886`).
   - **Frontend**: Copia `frontend/.env.example` a `frontend/.env` y rellena la variable:
     - `VITE_API_URL`: La URL de tu backend (p. ej., `http://localhost:3001/api`).

4. **Aplicar las migraciones de la base de datos**:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

5. **Iniciar los servidores de desarrollo**:
   - **Backend**:
     ```bash
     npm run dev:backend
     ```
   - **Frontend**:
     ```bash
     npm run dev:frontend
     ```

La aplicación frontend estará disponible en `http://localhost:5173` y el backend en `http://localhost:3001`.

### Usuarios de Prueba

Para empezar a probar la aplicación, puedes usar los siguientes usuarios:

| Rol        | Email                  | Contraseña   |
|------------|------------------------|--------------|
| ADMIN      | admin@notaria.com      | admin123     |
| CAJA       | caja@notaria.com       | caja123      |
| MATRIZADOR | matrizador@notaria.com | matrizador123|
| RECEPCION  | recepcion@notaria.com  | recepcion123 |
| ARCHIVO    | archivo@notaria.com    | archivo123   |

## Documentación Adicional

- **[Documentación de la API](backend/API_DOCUMENTATION.md)**: Detalles de los endpoints del backend.
- **[Guía de Configuración de Twilio](docs/TWILIO_SETUP_GUIDE.md)**: Cómo configurar las notificaciones de WhatsApp.
- **[Documentación de Funcionalidades](docs/features/)**: Explicaciones detalladas de las características clave del sistema.
- **[Notas de Desarrollo](docs/dev_notes/)**: Registro histórico de correcciones y mejoras.
