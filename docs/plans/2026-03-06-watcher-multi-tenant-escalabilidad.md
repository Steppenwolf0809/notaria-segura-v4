# Plan: Escalabilidad del XML Watcher para Multi-Tenant

**Fecha**: 2026-03-06
**Estado**: Pendiente (implementar antes de onboardear segunda notaria)
**Prioridad**: Media

## Contexto

El `xml-watcher-service/` corre localmente en la PC de cada notaria. Vigila carpetas del SRI, copia XMLs y los sube al API via `POST /api/documents/upload-xml-batch`. Actualmente solo N18 lo usa, autenticandose con credenciales del usuario CAJA (cpazmino@notaria18quito.com.ec).

## Problema detectado (2026-03-06)

Al migrar de Clerk a JWT+bcrypt, se cambio la contrasena del usuario CAJA. El watcher local tenia la contrasena vieja en `config.json` y dejo de subir facturas silenciosamente (sin alerta). Diagnostico tomo ~30 min.

## Mejoras necesarias

### 1. API Key dedicada para M2M (Alta prioridad)

Reemplazar credenciales de usuario humano por API keys dedicadas para el watcher.

- Crear tabla `api_keys` (id, key_hash, notary_id, name, is_active, created_at, last_used_at)
- Endpoint `POST /api/auth/api-key` que valide el key y devuelva JWT con notaryId
- Middleware alternativo o flag en authenticateToken para API keys
- Beneficio: cambios de contrasena de usuarios no rompen el watcher

### 2. Heartbeat y monitoreo (Alta prioridad)

El watcher debe reportar que esta vivo. Si deja de reportar, alertar.

- Endpoint `POST /api/watcher/heartbeat` (autenticado, recibe stats basicas)
- Tabla `watcher_heartbeats` (notary_id, last_seen, files_processed, errors)
- En dashboard SUPER_ADMIN: semaforo por notaria (verde/amarillo/rojo segun ultimo heartbeat)
- Alerta si una notaria no reporta en >2 horas durante horario laboral (08:00-18:00 ECT)

### 3. Empaquetado como instalador (Media prioridad)

Distribuir el watcher como `.exe` autocontenido en vez de requerir Node.js instalado.

- Usar `pkg` o `nexe` para compilar a ejecutable Windows
- Incluir `config.json.example` con valores por defecto
- Script de instalacion como servicio Windows (ya existe `install-service.bat`)
- Documentar proceso de instalacion para nuevas notarias

### 4. Configuracion por notaria (Ya resuelto)

El `config.json` actual ya soporta configuracion independiente por instancia:
- `apiUrl`: misma URL de produccion para todos
- `credentials.email` / `credentials.password`: usuario CAJA de cada notaria
- `folders.source`: ruta local del SRI (puede variar por notaria)
- `folders.watch`: ruta local de procesamiento

## Arquitectura objetivo

```
Notaria N18 (PC local)
  xml-watcher-service
  config.json: apiKey=wk_abc123...

Notaria N25 (PC local)         -->  API Production (Railway)
  xml-watcher-service               authenticateToken (API key)
  config.json: apiKey=wk_def456     Prisma middleware: notaryId auto

Notaria N3 (PC local)
  xml-watcher-service
  config.json: apiKey=wk_ghi789
```

## Checklist de implementacion

- [ ] Disenar tabla `api_keys` en schema.prisma
- [ ] Crear endpoint de autenticacion por API key
- [ ] Agregar soporte de API key en el watcher (auth.js)
- [ ] Crear endpoint de heartbeat
- [ ] Agregar heartbeat periodico al watcher (cada 5 min)
- [ ] Panel de monitoreo en dashboard SUPER_ADMIN
- [ ] Empaquetar watcher como .exe
- [ ] Documentar proceso de onboarding de nueva notaria
