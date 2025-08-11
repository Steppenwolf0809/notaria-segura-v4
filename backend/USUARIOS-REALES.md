# USUARIOS REALES DE LA NOTARÍA

Este documento contiene la información de los 9 usuarios reales de la notaría que deben ser creados en el sistema.

## 📊 LISTA DE USUARIOS

| Email | Nombre Completo | Rol |
|-------|-----------------|-----|
| admin@notaria.com | Jose Luis Zapata | ADMIN |
| cindy.pazmino@notaria.com | Cindy Pazmiño Naranjo | CAJA |
| mayra.corella@notaria.com | Mayra Cristina Corella Parra | MATRIZADOR |
| karol.velastegui@notaria.com | Karol Daniela Velastegui Cadena | MATRIZADOR |
| jose.zapata@notaria.com | Jose Luis Zapata Silva | MATRIZADOR |
| gissela.velastegui@notaria.com | Gissela Vanessa Velastegui Cadena | MATRIZADOR |
| francisco.proano@notaria.com | Francisco Esteban Proaño Astudillo | MATRIZADOR |
| karolrecepcion@notaria.com | Karol Velastegui | RECEPCION |
| maria.diaz@notaria.com | Maria Lucinda Diaz Pilatasig | ARCHIVO |

**Contraseña temporal para todos:** `Notaria123.`

## 🚀 MÉTODOS DE CREACIÓN

### 1. Script Automático (Recomendado)

```bash
# En el directorio backend
npm run populate-users
```

Este script intentará crear todos los usuarios automáticamente.

### 2. Configurar Base de Datos PostgreSQL

Si necesitas configurar PostgreSQL para desarrollo:

```bash
# 1. Configurar DATABASE_URL en .env
DATABASE_URL="postgresql://usuario:password@localhost:5432/notaria_db"

# 2. Ejecutar migraciones
npm run db:migrate

# 3. Ejecutar script de población
npm run populate-users
```

### 3. Creación Manual

Si los scripts automáticos no funcionan, crear usuarios manualmente:

1. Levantar el servidor: `npm run dev`
2. Ir a http://localhost:5173
3. Usar el endpoint `/auth/init-users` o crear desde panel admin

## 📋 DISTRIBUCIÓN POR ROLES

- **ADMIN (1):** Jose Luis Zapata
- **CAJA (1):** Cindy Pazmiño
- **MATRIZADOR (5):** Mayra Corella, Karol Velastegui, Jose Luis Zapata, Gissela Velastegui, Francisco Proaño
- **RECEPCIÓN (1):** Karol Velastegui
- **ARCHIVO (1):** Maria Diaz

## 🧪 PRUEBAS DE LOGIN

Una vez creados los usuarios, probar con estos ejemplos:

```
ADMIN: admin@notaria.com / Notaria123.
CAJA: cindy.pazmino@notaria.com / Notaria123.
MATRIZADOR: mayra.corella@notaria.com / Notaria123.
RECEPCIÓN: karolrecepcion@notaria.com / Notaria123.
ARCHIVO: maria.diaz@notaria.com / Notaria123.
```

## ⚠️ IMPORTANTE

1. **Cambio de Contraseñas:** Los usuarios deben cambiar la contraseña temporal en el primer login
2. **Base de Datos:** El sistema requiere PostgreSQL, no funciona con SQLite
3. **Roles:** Los roles del sistema son: ADMIN, CAJA, MATRIZADOR, RECEPCION, ARCHIVO

## 🔧 ARCHIVOS GENERADOS

- `prisma/seed.js` - Script de población para Prisma
- `scripts/populate-users.js` - Script alternativo con múltiples métodos
- `package.json` - Comandos `db:seed` y `populate-users`

---
*Generado por Claude Code para el Sistema de Trazabilidad Documental Notarial*