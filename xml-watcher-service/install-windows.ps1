# ========================================================================
# Script de Instalación Automatizada - XML Watcher Service
# Notaría Segura v4 - PowerShell Version
# ========================================================================

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  Instalación del Servicio de Monitoreo de XML - Notaría Segura" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se está ejecutando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host "Por favor, haz clic derecho y selecciona 'Ejecutar como administrador'" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Función para verificar comandos
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    } catch {
        return $false
    }
}

# [1/7] Verificar Node.js
Write-Host "[1/7] Verificando Node.js..." -ForegroundColor Green
if (-not (Test-Command "node")) {
    Write-Host "ERROR: Node.js no está instalado" -ForegroundColor Red
    Write-Host "Por favor, descarga e instala Node.js desde https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}
$nodeVersion = node --version
Write-Host "  ✓ Node.js $nodeVersion detectado" -ForegroundColor Gray
Write-Host ""

# [2/7] Verificar npm
Write-Host "[2/7] Verificando npm..." -ForegroundColor Green
if (-not (Test-Command "npm")) {
    Write-Host "ERROR: npm no está instalado" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}
$npmVersion = npm --version
Write-Host "  ✓ npm $npmVersion detectado" -ForegroundColor Gray
Write-Host ""

# [3/7] Instalar dependencias
Write-Host "[3/7] Instalando dependencias..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló la instalación de dependencias" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host "  ✓ Dependencias instaladas correctamente" -ForegroundColor Gray
Write-Host ""

# [4/7] Crear carpetas
Write-Host "[4/7] Creando carpetas necesarias..." -ForegroundColor Green
$folders = @(
    "C:\Users\admlocal\Desktop\xmlcopiados",
    "C:\Users\admlocal\Desktop\xmlcopiados\processed",
    "C:\Users\admlocal\Desktop\xmlcopiados\errors",
    "C:\Users\admlocal\Desktop\xmlcopiados\archived"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -Path $folder -ItemType Directory -Force | Out-Null
        Write-Host "  ✓ Creada: $folder" -ForegroundColor Gray
    } else {
        Write-Host "  ✓ Ya existe: $folder" -ForegroundColor Gray
    }
}
Write-Host ""

# [5/7] Construir ejecutable
Write-Host "[5/7] Construyendo ejecutable Windows..." -ForegroundColor Green
npm run build:pkg
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló la construcción del ejecutable" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host "  ✓ Ejecutable creado en dist\xml-service.exe" -ForegroundColor Gray
Write-Host ""

# [6/7] Copiar configuración
Write-Host "[6/7] Copiando archivos de configuración..." -ForegroundColor Green
if (-not (Test-Path "dist")) {
    New-Item -Path "dist" -ItemType Directory -Force | Out-Null
}
Copy-Item "config.json" "dist\config.json" -Force
Write-Host "  ✓ Configuración copiada correctamente" -ForegroundColor Gray
Write-Host ""

# [7/7] Verificar NSSM e instalar servicio
Write-Host "[7/7] Verificando instalación de NSSM..." -ForegroundColor Green
if (-not (Test-Command "nssm")) {
    Write-Host "ADVERTENCIA: NSSM no está instalado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para instalar el servicio de Windows, necesitas NSSM." -ForegroundColor Yellow
    Write-Host "Puedes descargarlo desde: https://nssm.cc/download" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "O puedes ejecutar el servicio manualmente con:" -ForegroundColor Yellow
    Write-Host "  dist\xml-service.exe" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "  ✓ NSSM detectado" -ForegroundColor Gray
    Write-Host ""

    $installService = Read-Host "¿Deseas instalar el servicio de Windows ahora? (S/N)"

    if ($installService -eq "S" -or $installService -eq "s") {
        Write-Host ""
        Write-Host "Instalando servicio de Windows..." -ForegroundColor Green

        # Desinstalar servicio si ya existe
        $serviceName = "XmlWatcherService"
        nssm stop $serviceName 2>$null
        nssm remove $serviceName confirm 2>$null

        # Instalar servicio
        $servicePath = Join-Path $PSScriptRoot "dist\xml-service.exe"
        $configPath = Join-Path $PSScriptRoot "dist"

        nssm install $serviceName $servicePath
        nssm set $serviceName AppDirectory $configPath
        nssm set $serviceName DisplayName "XML Watcher Service - Notaría Segura"
        nssm set $serviceName Description "Servicio de monitoreo automático de archivos XML para Notaría Segura"
        nssm set $serviceName Start SERVICE_AUTO_START
        nssm set $serviceName AppStdout "$configPath\service-stdout.log"
        nssm set $serviceName AppStderr "$configPath\service-stderr.log"
        nssm set $serviceName AppRotateFiles 1
        nssm set $serviceName AppRotateBytes 10485760  # 10MB

        Write-Host "  ✓ Servicio instalado correctamente" -ForegroundColor Gray
        Write-Host ""

        $startService = Read-Host "¿Deseas iniciar el servicio ahora? (S/N)"

        if ($startService -eq "S" -or $startService -eq "s") {
            nssm start $serviceName
            Start-Sleep -Seconds 2
            Write-Host ""
            Write-Host "Estado del servicio:" -ForegroundColor Cyan
            nssm status $serviceName
        }
    } else {
        Write-Host ""
        Write-Host "Servicio no instalado. Puedes ejecutar manualmente con:" -ForegroundColor Yellow
        Write-Host "  dist\xml-service.exe" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  Instalación Completada" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Edita dist\config.json para configurar:" -ForegroundColor White
Write-Host "     - Credenciales de API" -ForegroundColor Gray
Write-Host "     - Rutas de carpetas" -ForegroundColor Gray
Write-Host "     - Notificaciones por email (opcional)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Para ejecutar manualmente:" -ForegroundColor White
Write-Host "     cd dist" -ForegroundColor Gray
Write-Host "     .\xml-service.exe" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Para gestionar el servicio de Windows (si fue instalado):" -ForegroundColor White
Write-Host "     - Iniciar:  nssm start XmlWatcherService" -ForegroundColor Gray
Write-Host "     - Detener:  nssm stop XmlWatcherService" -ForegroundColor Gray
Write-Host "     - Estado:   nssm status XmlWatcherService" -ForegroundColor Gray
Write-Host "     - Logs:     dist\service-stdout.log" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Read-Host "Presiona Enter para salir"
