@echo off
:: ========================================================================
:: Script de Desinstalación - XML Watcher Service
:: Notaría Segura v4
:: ========================================================================

echo ========================================================================
echo   Desinstalacion del Servicio de Monitoreo de XML - Notaria Segura
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

echo ADVERTENCIA: Este script desinstalara el servicio de Windows
echo y opcionalmente puede eliminar los archivos procesados.
echo.
set /p CONFIRM="¿Estas seguro de que deseas continuar? (S/N): "

if /i not "%CONFIRM%"=="S" (
    echo Desinstalacion cancelada
    pause
    exit /b 0
)

echo.
echo [1/3] Verificando NSSM...
nssm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo NSSM no esta instalado, saltando desinstalacion de servicio
    goto :cleanup
)

echo [2/3] Deteniendo y desinstalando servicio de Windows...
nssm stop XmlWatcherService
timeout /t 2 >nul
nssm remove XmlWatcherService confirm
if %errorLevel% equ 0 (
    echo Servicio desinstalado correctamente
) else (
    echo No se encontro el servicio o ya fue desinstalado
)

:cleanup
echo.
echo [3/3] Limpieza de archivos...
echo.
echo ¿Deseas eliminar los archivos procesados y de error? (S/N)
echo ADVERTENCIA: Esto eliminara todas las carpetas processed, errors y archived
set /p DELETE_FILES="> "

if /i "%DELETE_FILES%"=="S" (
    echo Eliminando archivos...
    if exist "C:\Users\admlocal\Desktop\xmlcopiados\processed" rmdir /s /q "C:\Users\admlocal\Desktop\xmlcopiados\processed"
    if exist "C:\Users\admlocal\Desktop\xmlcopiados\errors" rmdir /s /q "C:\Users\admlocal\Desktop\xmlcopiados\errors"
    if exist "C:\Users\admlocal\Desktop\xmlcopiados\archived" rmdir /s /q "C:\Users\admlocal\Desktop\xmlcopiados\archived"
    echo Archivos eliminados
) else (
    echo Archivos conservados
)

echo.
echo ¿Deseas eliminar el ejecutable y configuracion? (S/N)
set /p DELETE_DIST="> "

if /i "%DELETE_DIST%"=="S" (
    if exist "dist" rmdir /s /q "dist"
    echo Ejecutable eliminado
) else (
    echo Ejecutable conservado
)

echo.
echo ========================================================================
echo   Desinstalacion Completada
echo ========================================================================
echo.
pause
