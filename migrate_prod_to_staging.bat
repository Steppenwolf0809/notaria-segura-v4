@echo off
setlocal

:: CONFIGURACION - RUTAS DE POSTGRESQL (Ajustado para version 17)
set PG_BIN="C:\Program Files\PostgreSQL\17\bin"

:: CONFIGURACION PRODUCCION (ORIGEN)
set PROD_HOST=gondola.proxy.rlwy.net
set PROD_PORT=41960
set PROD_USER=postgres
set PROD_DB=railway
set PGPASSWORD_PROD=ymGXjRwwZshJaTEwyIpyztWqAZogkzSG

:: CONFIGURACION STAGING (DESTINO)
set STAGING_HOST=gondola.proxy.rlwy.net
set STAGING_PORT=39316
set STAGING_USER=postgres
set STAGING_DB=railway
set PGPASSWORD_STAGING=vzdzHHIVerdjgzWlmfARWiSsbTBSJfvw

echo ===================================================
echo   MIGRACION AUTOMATICA: PROD - STAGING
echo ===================================================
echo.

:: VERIFICAR EXISTENCIA DE PGDUMP
if not exist %PG_BIN%\pg_dump.exe (
    echo [ERROR] No se encontro pg_dump.exe en %PG_BIN%
    echo Intentando buscar en version 9.3...
    set PG_BIN="C:\Program Files\PostgreSQL\9.3\bin"
)

if not exist %PG_BIN%\pg_dump.exe (
    echo [CRITICO] No se encontraron las herramientas de PostgreSQL.
    goto :fin
)

:: 1. DUMP DE PRODUCCION
echo [1/3] Conectando a PRODUCCION (%PROD_HOST%:%PROD_PORT%)...
echo       Descargando datos usando %PG_BIN%...

:: Establecer contrasena para el comando actual
set PGPASSWORD=%PGPASSWORD_PROD%

%PG_BIN%\pg_dump.exe -h %PROD_HOST% -p %PROD_PORT% -U %PROD_USER% -d %PROD_DB% --clean --if-exists --no-owner --no-acl -f backup_temp.sql

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Fallo al descargar de Produccion.
    echo Verifica tu conexion a internet y que el puerto siga siendo %PROD_PORT%.
    goto :fin
)

echo.
echo [2/3] Backup descargado correctamente.
echo.

:: 2. RESTORE A STAGING
echo [3/3] Subiendo a STAGING (%STAGING_HOST%:%STAGING_PORT%)...

:: Establecer contrasena para el comando actual
set PGPASSWORD=%PGPASSWORD_STAGING%

%PG_BIN%\psql.exe -h %STAGING_HOST% -p %STAGING_PORT% -U %STAGING_USER% -d %STAGING_DB% -f backup_temp.sql

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Fallo al subir a Staging.
    goto :fin
)

echo.
echo ===================================================
echo   MIGRACION COMPLETADA CON EXITO
echo ===================================================
echo.
echo Limpiando archivo temporal...
del backup_temp.sql

:fin
:: Limpiar variables de entorno por seguridad
set PGPASSWORD=
pause
