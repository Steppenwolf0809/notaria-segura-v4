@echo off
echo ========================================
echo  XML Watcher Service - Instalador PM2
echo ========================================
echo.

REM Verificar si PM2 está instalado
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/4] Instalando PM2 globalmente...
    npm install -g pm2
    npm install -g pm2-windows-startup
) else (
    echo [1/4] PM2 ya instalado ✓
)

echo.
echo [2/4] Configurando inicio automatico con Windows...
pm2-startup install

echo.
echo [3/4] Iniciando servicio XML Watcher...
cd /d %~dp0
pm2 start ecosystem.config.js --name xml-watcher

echo.
echo [4/4] Guardando configuracion...
pm2 save

echo.
echo ========================================
echo  ✅ Servicio instalado correctamente!
echo ========================================
echo.
echo El servicio ahora:
echo  - Vigila C:\SRI\Comprobantes_generados
echo  - Copia XMLs a xmlcopiados
echo  - Sube facturas automaticamente
echo  - Detecta gaps y muestra popup
echo  - Se inicia automaticamente con Windows
echo.
echo Comandos utiles:
echo   pm2 status          - Ver estado
echo   pm2 logs xml-watcher - Ver logs
echo   pm2 restart xml-watcher - Reiniciar
echo.
pause
