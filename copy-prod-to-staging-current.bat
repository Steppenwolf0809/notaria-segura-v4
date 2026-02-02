@echo off
setlocal

:: ==========================================
:: CONFIGURACION DE RUTAS (Modificar si es necesario)
:: ==========================================
set PG_BIN_17="C:\Program Files\PostgreSQL\17\bin"
set PG_BIN_93="C:\Program Files\PostgreSQL\9.3\bin"

:: Intentar detectar donde esta pg_dump
if exist %PG_BIN_17%\pg_dump.exe (
    set PG_BIN=%PG_BIN_17%
    echo [INFO] Usando PostgreSQL 17 en %PG_BIN_17%
) else (
    if exist %PG_BIN_93%\pg_dump.exe (
        set PG_BIN=%PG_BIN_93%
        echo [INFO] Usando PostgreSQL 9.3 en %PG_BIN_93%
    ) else (
        echo.
        echo [ERROR CRITICO] No se encontro PostgreSQL en las rutas estandar.
        echo Por favor, edita este archivo y pon la ruta correcta en PG_BIN_17.
        pause
        exit /b
    )
)

:: ==========================================
:: CONFIGURACION DE CONEXION - ACTUALIZADO 2026-02-01
:: ==========================================
:: PRODUCCION (origen)
set PROD_HOST=switchback.proxy.rlwy.net
set PROD_PORT=25513
set PROD_USER=postgres
set PROD_DB=railway
set PGPASSWORD_PROD=uXwrkbpPDVXrEngsRCMHdIKkOUDXipic

:: STAGING (destino) - CORREGIDO
set STAGING_HOST=gondola.proxy.rlwy.net
set STAGING_PORT=39316
set STAGING_USER=postgres
set STAGING_DB=railway
set PGPASSWORD_STAGING=vzdzHHIVerdjgzWlmfARWiSsbTBSJfvw

echo.
echo ===================================================
echo   COPIA DE BASE DE DATOS: PROD - STAGING
echo ===================================================
echo   ORIGEN:  %PROD_HOST%:%PROD_PORT% (Produccion)
echo   DESTINO: %STAGING_HOST%:%STAGING_PORT% (Staging)
echo ===================================================
echo.
echo [ADVERTENCIA] Esto sobrescribira completamente la base de datos de Staging.
echo.
pause

echo.
echo [1/4] Limpiando base de datos de STAGING...
set PGPASSWORD=%PGPASSWORD_STAGING%
%PG_BIN%\psql.exe -h %STAGING_HOST% -p %STAGING_PORT% -U %STAGING_USER% -d %STAGING_DB% -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo limpiar la base de datos de Staging.
    echo Verifica la conexion a Staging.
    pause
    exit /b
)

echo.
echo [2/4] Descargando base de datos de PRODUCCION...
echo       Esto puede tardar unos minutos...
set PGPASSWORD=%PGPASSWORD_PROD%
%PG_BIN%\pg_dump.exe -h %PROD_HOST% -p %PROD_PORT% -U %PROD_USER% -d %PROD_DB% --no-owner --no-acl --format=custom --file="temp_prod_db.dump"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo al descargar de produccion.
    if exist "temp_prod_db.dump" del "temp_prod_db.dump"
    pause
    exit /b
)

echo.
echo [3/4] Restaurando en STAGING...
set PGPASSWORD=%PGPASSWORD_STAGING%
%PG_BIN%\pg_restore.exe -h %STAGING_HOST% -p %STAGING_PORT% -U %STAGING_USER% -d %STAGING_DB% --no-owner --no-acl "temp_prod_db.dump"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ADVERTENCIA] pg_restore reporto errores (puede ser normal por dependencias).
    echo         Verificando conexion...
)

echo.
echo [4/4] Verificando conexion a STAGING...
set PGPASSWORD=%PGPASSWORD_STAGING%
%PG_BIN%\psql.exe -h %STAGING_HOST% -p %STAGING_PORT% -U %STAGING_USER% -d %STAGING_DB% -c "SELECT COUNT(*) as total_documentos FROM Document;"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo verificar la base de datos de Staging.
) else (
    echo.
    echo [EXITO] Base de datos copiada correctamente de Produccion a Staging.
)

:: Limpieza
if exist "temp_prod_db.dump" del "temp_prod_db.dump"
set PGPASSWORD=
echo.
pause
