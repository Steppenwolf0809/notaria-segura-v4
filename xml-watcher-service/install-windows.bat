@echo off
:: ========================================================================
:: Script de Instalación Automatizada - XML Watcher Service
:: Notaría Segura v4
:: ========================================================================

echo ========================================================================
echo   Instalacion del Servicio de Monitoreo de XML - Notaria Segura
echo ========================================================================
echo.

:: Verificar si se está ejecutando como administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Este script debe ejecutarse como Administrador
    echo Por favor, haz clic derecho y selecciona "Ejecutar como administrador"
    pause
    exit /b 1
)

echo [1/7] Verificando Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Por favor, descarga e instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)
node --version
echo.

echo [2/7] Verificando npm...
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: npm no esta instalado
    pause
    exit /b 1
)
npm --version
echo.

echo [3/7] Instalando dependencias...
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Fallo la instalacion de dependencias
    pause
    exit /b 1
)
echo Dependencias instaladas correctamente
echo.

echo [4/7] Creando carpetas necesarias...
if not exist "C:\Users\admlocal\Desktop\xmlcopiados" mkdir "C:\Users\admlocal\Desktop\xmlcopiados"
if not exist "C:\Users\admlocal\Desktop\xmlcopiados\processed" mkdir "C:\Users\admlocal\Desktop\xmlcopiados\processed"
if not exist "C:\Users\admlocal\Desktop\xmlcopiados\errors" mkdir "C:\Users\admlocal\Desktop\xmlcopiados\errors"
if not exist "C:\Users\admlocal\Desktop\xmlcopiados\archived" mkdir "C:\Users\admlocal\Desktop\xmlcopiados\archived"
echo Carpetas creadas correctamente
echo.

echo [5/7] Construyendo ejecutable Windows...
call npm run build:pkg
if %errorLevel% neq 0 (
    echo ERROR: Fallo la construccion del ejecutable
    pause
    exit /b 1
)
echo Ejecutable creado en dist\xml-service.exe
echo.

echo [6/7] Copiando archivos de configuracion...
if not exist "dist" mkdir "dist"
copy config.json dist\config.json
if %errorLevel% neq 0 (
    echo ERROR: Fallo la copia del archivo de configuracion
    pause
    exit /b 1
)
echo Configuracion copiada correctamente
echo.

echo [7/7] Verificando instalacion de NSSM...
nssm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ADVERTENCIA: NSSM no esta instalado
    echo.
    echo Para instalar el servicio de Windows, necesitas NSSM.
    echo Puedes descargarlo desde: https://nssm.cc/download
    echo.
    echo O puedes ejecutar el servicio manualmente con:
    echo   dist\xml-service.exe
    echo.
    goto :finish
)

echo NSSM detectado
echo.
echo ¿Deseas instalar el servicio de Windows ahora? (S/N)
set /p INSTALL_SERVICE="> "

if /i "%INSTALL_SERVICE%"=="S" (
    echo.
    echo Instalando servicio de Windows...

    :: Desinstalar servicio si ya existe
    nssm stop XmlWatcherService >nul 2>&1
    nssm remove XmlWatcherService confirm >nul 2>&1

    :: Instalar servicio
    set SERVICE_PATH=%CD%\dist\xml-service.exe
    set CONFIG_PATH=%CD%\dist

    nssm install XmlWatcherService "%SERVICE_PATH%"
    nssm set XmlWatcherService AppDirectory "%CONFIG_PATH%"
    nssm set XmlWatcherService DisplayName "XML Watcher Service - Notaria Segura"
    nssm set XmlWatcherService Description "Servicio de monitoreo automatico de archivos XML para Notaria Segura"
    nssm set XmlWatcherService Start SERVICE_AUTO_START
    nssm set XmlWatcherService AppStdout "%CONFIG_PATH%\service-stdout.log"
    nssm set XmlWatcherService AppStderr "%CONFIG_PATH%\service-stderr.log"

    echo Servicio instalado correctamente
    echo.
    echo ¿Deseas iniciar el servicio ahora? (S/N)
    set /p START_SERVICE="> "

    if /i "%START_SERVICE%"=="S" (
        nssm start XmlWatcherService
        echo.
        echo Servicio iniciado
        timeout /t 3 >nul
        nssm status XmlWatcherService
    )
) else (
    echo.
    echo Servicio no instalado. Puedes ejecutar manualmente con:
    echo   dist\xml-service.exe
)

:finish
echo.
echo ========================================================================
echo   Instalacion Completada
echo ========================================================================
echo.
echo Proximos pasos:
echo   1. Edita dist\config.json para configurar:
echo      - Credenciales de API
echo      - Rutas de carpetas
echo      - Notificaciones por email (opcional)
echo.
echo   2. Para ejecutar manualmente:
echo      cd dist
echo      xml-service.exe
echo.
echo   3. Para gestionar el servicio de Windows (si fue instalado):
echo      - Iniciar:  nssm start XmlWatcherService
echo      - Detener:  nssm stop XmlWatcherService
echo      - Estado:   nssm status XmlWatcherService
echo      - Logs:     dist\service-stdout.log
echo.
echo ========================================================================
pause
