# 🔐 Guía de Configuración Auth0 (Fase 2)

Para completar la integración, necesitas configurar tu cuenta de Auth0. Sigue estos pasos exactos:

## 1. Crear Cuenta y Tenant
1. Ve a [Auth0.com](https://auth0.com/) y crea una cuenta gratuita.
2. Crea un **Tenant Domain** (ej: `notaria-segura-prod.us.auth0.com`).
3. Selecciona región **US**.

## 2. Crear API (Backend)
1. Ve a **Applications > APIs**.
2. Click en **+ Create API**.
3. **Name**: `Notaria Segura API`
4. **Identifier**: `https://api.notariasegura.com`.
   - ⚠️ **IMPORTANTE**: Este valor será tu `AUTH0_AUDIENCE` en el `.env`.
5. Click **Create** y salta el tutorial.

## 3. Crear Aplicación (Frontend)
1. Ve a **Applications > Applications**.
2. Click **+ Create Application**.
3. Nombre: `Notaria Segura App`.
4. Tipo: **Single Page Web Applications**.
5. Click **Create**.
6. Ve a la pestaña **Settings** y baja hasta "Application URIs".
7. Configura:
   - **Allowed Callback URLs**: `http://localhost:5173, https://notaria18quito.com.ec`
   - **Allowed Logout URLs**: `http://localhost:5173, https://notaria18quito.com.ec`
   - **Allowed Web Origins**: `http://localhost:5173, https://notaria18quito.com.ec`
8. Guarda los cambios (Save Changes al final).

## 4. Configurar Lazy Migration (Crucial para usuarios antiguos)
Esta parte permite que tus usuarios actuales entren con su clave de siempre.

1. Ve a **Authentication > Database**.
2. Crea una nueva conexión DB llamada `notaria-db-connection` (Click en **+ Create DB Connection**).
3. Entra a la conexión creada y ve a la pestaña **Custom Database**.
4. Activa el toggle **Use my own database**.
5. En la sección **Login Script**, borra todo y pega esto:

   ```javascript
   function login(email, password, callback) {
     const request = require('request');

     // ⚠️ CAMBIA ESTO POR TU URL REAL DE RAILWAY
     // Ejemplo: https://notaria-segura-v4-production.up.railway.app/api/auth/migration/login
     const migrationEndpoint = 'TU_URL_DE_RAILWAY_AQUI/api/auth/migration/login';

     request.post({
       url: migrationEndpoint,
       json: { email: email, password: password },
       headers: { 'x-migration-secret': configuration.MIGRATION_SECRET },
       timeout: 5000
     }, function (err, response, body) {
       if (err) return callback(new Error(err));
       if (response.statusCode === 401) return callback(new WrongUsernameOrPasswordError(email));
       if (response.statusCode !== 200) return callback(new Error('Migration error'));

       callback(null, {
         user_id: body.user_id,
         email: body.email,
         name: body.name,
         given_name: body.given_name,
         family_name: body.family_name,
         email_verified: body.email_verified,
         app_metadata: body.app_metadata
       });
     });
   }
   ```

6. Baja un poco más hasta la sección **Settings** (dentro del script editor, a veces está abajo). Busca donde dice "Key / Value" para variables de configuración.
7. Agrega una variable:
   - **Key**: `MIGRATION_SECRET`
   - **Value**: (Inventa una clave larga y segura aquí, ej: `mig_sec_9988776655`)
8. Click en **Save**.
9. **IMPORTANTE**: Guarda esa misma clave `mig_sec_...` para ponerla en tu `.env`.

## 5. Obtener Credenciales
Ahora recolecta estos datos para enviármelos o ponerlos en tu `.env`:

| Variable en .env | Dónde encontrarla |
|------------------|-------------------|
| `AUTH0_DOMAIN` | Settings de la App (ej: `dev-xyz.us.auth0.com`) |
| `AUTH0_AUDIENCE` | `https://api.notariasegura.com` (lo que pusiste en paso 2) |
| `AUTH0_CLIENT_ID` | Settings de la Application |
| `AUTH0_MIGRATION_SECRET` | La clave que inventaste en el paso 4.7 |

---

### Siguiente paso:
Una vez tengas los datos, avísame para configurar el backend.
