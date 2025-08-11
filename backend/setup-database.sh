#!/bin/bash

# Script de configuración de PostgreSQL para Notaría Segura
# Ejecutar desde el directorio backend/

echo "🔧 Configurando base de datos PostgreSQL para Notaría Segura..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si PostgreSQL está corriendo
check_postgres() {
    echo -e "${YELLOW}🔍 Verificando conexión a PostgreSQL...${NC}"
    
    if npx prisma db push --force-reset --accept-data-loss; then
        echo -e "${GREEN}✅ PostgreSQL está corriendo y accesible${NC}"
        return 0
    else
        echo -e "${RED}❌ No se puede conectar a PostgreSQL${NC}"
        return 1
    fi
}

# Función para configurar PostgreSQL usando Docker
setup_with_docker() {
    echo -e "${YELLOW}🐳 Configurando PostgreSQL con Docker...${NC}"
    
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        cd ..
        docker-compose up -d postgres
        sleep 5
        cd backend
        echo -e "${GREEN}✅ PostgreSQL iniciado con Docker${NC}"
        return 0
    else
        echo -e "${RED}❌ Docker no está disponible${NC}"
        return 1
    fi
}

# Función para mostrar instrucciones manuales
show_manual_setup() {
    echo -e "${RED}❌ PostgreSQL no está disponible${NC}"
    echo ""
    echo -e "${YELLOW}📋 Para configurar PostgreSQL manualmente:${NC}"
    echo ""
    echo "OPCIÓN 1 - Windows (recomendado para WSL2):"
    echo "1. Instalar PostgreSQL en Windows desde https://www.postgresql.org/download/windows/"
    echo "2. Crear la base de datos:"
    echo "   psql -U postgres -c \"CREATE DATABASE notaria_segura;\""
    echo ""
    echo "OPCIÓN 2 - Ubuntu (WSL2):"
    echo "1. sudo apt update && sudo apt install postgresql postgresql-contrib"
    echo "2. sudo systemctl start postgresql"
    echo "3. sudo -u postgres psql -c \"CREATE DATABASE notaria_segura;\""
    echo "4. sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'postgres';\""
    echo ""
    echo "OPCIÓN 3 - Docker Desktop:"
    echo "1. Habilitar WSL2 integration en Docker Desktop"
    echo "2. Ejecutar: docker-compose up -d postgres"
    echo ""
    echo -e "${YELLOW}Luego ejecuta este script nuevamente.${NC}"
}

# Ejecución principal
main() {
    echo "🚀 Iniciando configuración de base de datos..."
    
    # Intentar conexión directa
    if check_postgres; then
        echo -e "${GREEN}🎉 Base de datos configurada correctamente!${NC}"
        
        # Generar Prisma client
        echo -e "${YELLOW}📦 Generando Prisma client...${NC}"
        npx prisma generate
        
        # Poblar con datos iniciales
        if [ -f "prisma/seed.js" ]; then
            echo -e "${YELLOW}🌱 Poblando base de datos...${NC}"
            npm run db:seed
        fi
        
        echo -e "${GREEN}✅ Configuración completada!${NC}"
        return 0
    fi
    
    # Si falla, intentar con Docker
    if setup_with_docker && check_postgres; then
        echo -e "${GREEN}🎉 Base de datos configurada con Docker!${NC}"
        
        # Generar Prisma client y poblar
        npx prisma generate
        if [ -f "prisma/seed.js" ]; then
            npm run db:seed
        fi
        
        echo -e "${GREEN}✅ Configuración completada!${NC}"
        return 0
    fi
    
    # Si todo falla, mostrar instrucciones manuales
    show_manual_setup
    return 1
}

# Ejecutar función principal
main "$@"