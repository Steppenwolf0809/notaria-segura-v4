# 🚀 Checklist de Despliegue - Sistema de Concuerdos

## 📋 Pre-Despliegue

### ✅ Requisitos del Sistema
- [ ] Node.js versión 18+ instalada
- [ ] PostgreSQL versión 13+ configurado
- [ ] Redis (opcional, para cache avanzado)
- [ ] Conectividad a internet para Gemini API

### ✅ Variables de Entorno
- [ ] `DATABASE_URL` configurada y accesible
- [ ] `JWT_SECRET` configurado (mínimo 32 caracteres)
- [ ] `GOOGLE_API_KEY` configurada y válida
- [ ] `GEMINI_ENABLED=true`
- [ ] `TEMPLATE_MODE=family` (recomendado)
- [ ] `NODE_ENV=production` (para despliegue)

### ✅ Base de Datos
- [ ] Prisma client generado (`npm run db:generate`)
- [ ] Migraciones ejecutadas (`npm run db:migrate`)
- [ ] Datos iniciales poblados (`npm run populate-users`)
- [ ] Backup de base de datos actual creado

### ✅ QA y Testing
- [ ] `npm run qa:concuerdos` ejecutado exitosamente
- [ ] `npm run qa:gate` aprobado (score ≥ 70)
- [ ] Tests unitarios pasando (`npm test`)
- [ ] Cobertura de código ≥ 80%

### ✅ Configuración de Seguridad
- [ ] JWT secret único para producción
- [ ] Rate limiting configurado
- [ ] PII masking habilitado
- [ ] Logs sin información sensible

## 🚀 Proceso de Despliegue

### Fase 1: Preparación
```bash
# 1. Checkout a rama de producción
git checkout main
git pull origin main

# 2. Instalar dependencias
npm ci

# 3. Ejecutar QA Gate
npm run qa:gate

# 4. Generar build de producción
npm run build
```

### Fase 2: Base de Datos
```bash
# 1. Ejecutar migraciones
npm run db:migrate

# 2. Verificar estado de BD
npm run db:studio

# 3. Backup final
pg_dump $DATABASE_URL > backup_pre_deployment.sql
```

### Fase 3: Despliegue
```bash
# Opción A: Railway (recomendado)
npm run start:railway

# Opción B: Docker
docker build -t notaria-segura .
docker run -p 3001:3001 notaria-segura

# Opción C: PM2
npm install -g pm2
pm2 start ecosystem.config.js
```

### Fase 4: Verificación Post-Despliegue
```bash
# 1. Health check
curl https://tu-api.com/health

# 2. Endpoint de métricas (desarrollo)
curl https://tu-api.com/api/concuerdos/metrics

# 3. Test de funcionalidad
curl -X POST https://tu-api.com/api/concuerdos/process \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test document"}'
```

## 📊 Monitoreo Post-Despliegue

### Métricas a Monitorear
- [ ] Tasa de éxito de generación de concuerdos
- [ ] Tiempo promedio de respuesta
- [ ] Errores por minuto
- [ ] Estado del circuit breaker
- [ ] Uso de cache de templates

### Logs a Revisar
- [ ] Errores de autenticación
- [ ] Fallos de Gemini API
- [ ] Tiempos de respuesta > 10s
- [ ] Uso de memoria del proceso

## 🔄 Plan de Rollback

### Rollback Automático
```bash
# 1. Detener servicio actual
pm2 stop notaria-segura

# 2. Restaurar versión anterior
git checkout HEAD~1

# 3. Reinstalar dependencias
npm ci

# 4. Restaurar base de datos
psql $DATABASE_URL < backup_pre_deployment.sql

# 5. Reiniciar servicio
npm run start:prod
```

### Rollback Manual
1. **Código**: `git revert <commit-hash>`
2. **Base de datos**: Ejecutar script de rollback de Prisma
3. **Configuración**: Restaurar variables de entorno anteriores
4. **Cache**: Limpiar Redis/cache si aplica

### Tiempo Estimado de Rollback
- **Rollback completo**: 15-30 minutos
- **Rollback de código**: 5-10 minutos
- **Rollback de BD**: 10-20 minutos

## 🚨 Escenarios de Emergencia

### 1. Error Crítico en Producción
```bash
# 1. Activar modo mantenimiento
echo "Mantenimiento activado" > maintenance.html

# 2. Rollback inmediato
npm run rollback:auto

# 3. Notificar al equipo
# Slack/Discord alert
```

### 2. Degradación de Rendimiento
- [ ] Verificar métricas de Gemini API
- [ ] Revisar estado del circuit breaker
- [ ] Aumentar timeouts si es necesario
- [ ] Escalar recursos del servidor

### 3. Pérdida de Conectividad
- [ ] Verificar conectividad a PostgreSQL
- [ ] Revisar configuración de Redis
- [ ] Activar modo offline si es crítico

## 📈 Métricas de Éxito

### KPIs Post-Despliegue
- **Disponibilidad**: ≥ 99.5%
- **Tiempo de respuesta**: < 5s promedio
- **Tasa de error**: < 1%
- **Satisfacción de QA**: Score ≥ 85

### Métricas de Negocio
- **Documentos procesados**: +20% vs versión anterior
- **Tiempo de procesamiento**: -30% vs manual
- **Errores de validación**: -50% vs versión anterior

## 📞 Contactos de Emergencia

| Rol | Contacto | Disponibilidad |
|-----|----------|----------------|
| DevOps Lead | @devops-lead | 24/7 |
| Backend Lead | @backend-lead | 9AM-6PM ECT |
| QA Lead | @qa-lead | 9AM-6PM ECT |
| Producto | @product-owner | 9AM-6PM ECT |

## 📝 Checklist Final

### Antes de Cerrar el Ticket
- [ ] Métricas de rendimiento verificadas
- [ ] Logs de error revisados (últimas 24h)
- [ ] Backup de BD confirmado
- [ ] Documentación actualizada
- [ ] Equipo notificado del despliegue exitoso

### Documentación Actualizada
- [ ] README_CONCUERDOS.md actualizado
- [ ] Variables de entorno documentadas
- [ ] Endpoints API documentados
- [ ] Runbook de troubleshooting actualizado

---

## 🎯 Checklist de Validación Final

- [ ] ✅ QA Gate aprobado
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Base de datos migrada
- [ ] ✅ Backup creado
- [ ] ✅ Despliegue exitoso
- [ ] ✅ Endpoints respondiendo
- [ ] ✅ Métricas funcionando
- [ ] ✅ Logs sin errores críticos
- [ ] ✅ Equipo notificado

**Fecha de despliegue**: __________
**Versión desplegada**: __________
**Responsable del despliegue**: __________

---

*Última actualización: Diciembre 2024*