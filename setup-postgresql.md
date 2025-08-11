# Configuración PostgreSQL para Notaría Segura

## Opción 1: PostgreSQL en Windows (Recomendado para WSL2)

Si tienes PostgreSQL instalado en Windows, conecta desde WSL2:

1. **Verificar PostgreSQL Windows:**
   - Abrir Command Prompt en Windows
   - Ejecutar: `psql --version`
   - Verificar que el servicio esté corriendo

2. **Crear base de datos:**
   ```cmd
   psql -U postgres -c "CREATE DATABASE notaria_segura;"
   ```

3. **Configurar acceso desde WSL2:**
   - Editar `postgresql.conf` para permitir conexiones
   - Agregar en `pg_hba.conf`: `host all all 0.0.0.0/0 md5`
   - Reiniciar servicio PostgreSQL

## Opción 2: Docker Desktop (Si está configurado)

1. **Habilitar integración WSL2:**
   - Docker Desktop → Settings → Resources → WSL Integration
   - Habilitar para tu distribución Ubuntu

2. **Ejecutar PostgreSQL:**
   ```bash
   cd /mnt/c/notaria-segura
   docker-compose up -d postgres
   ```

## Opción 3: Instalación nativa Ubuntu

Si prefieres instalar en Ubuntu:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crear usuario y base de datos
sudo -u postgres psql -c "CREATE DATABASE notaria_segura;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

## Verificar conexión

Una vez configurado, ejecutar en el proyecto:

```bash
cd backend
npx prisma db push --force-reset
npx prisma db seed
```