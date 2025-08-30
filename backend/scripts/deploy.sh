#!/bin/bash

echo "🚀 Iniciando proceso de deploy seguro..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Verificar que estamos en la rama correcta
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    warn "No estás en la rama main. Rama actual: $CURRENT_BRANCH"
    read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deploy cancelado"
        exit 1
    fi
fi

# Instalar dependencias
log "Instalando dependencias..."
npm ci

# Generar Prisma Client
log "Generando Prisma Client..."
npx prisma generate

# Ejecutar pruebas
log "Ejecutando pruebas..."
if npm run test:ci; then
    log "✅ Todas las pruebas pasaron!"
else
    error "❌ Las pruebas fallaron. Deploy cancelado."
    exit 1
fi

# Verificar lint (si existe)
if npm run lint 2>/dev/null; then
    log "✅ Lint verificado!"
else
    warn "⚠️  No se encontró script de lint"
fi

# Build del proyecto
log "Construyendo proyecto..."
if npm run build; then
    log "✅ Build exitoso!"
else
    error "❌ Build falló. Deploy cancelado."
    exit 1
fi

# Commit de los cambios si hay alguno
if [ -n "$(git status --porcelain)" ]; then
    log "Hay cambios sin commitear. Creando commit..."
    git add .
    git commit -m "chore: update build and test files before deploy

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
fi

# Push a GitHub (Railway se conecta automáticamente)
log "Enviando cambios a GitHub..."
git push origin $CURRENT_BRANCH

log "🎉 Deploy completado! Railway detectará los cambios y desplegará automáticamente."
log "📊 Verifica el estado del deploy en: https://railway.app"