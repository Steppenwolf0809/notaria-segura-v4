@echo off
setlocal

:: ==========================================
:: CONFIGURACION DE RUTAS
:: ==========================================
set PG_BIN="C:\Program Files\PostgreSQL\17\bin"

if not exist %PG_BIN%\pg_dump.exe (
    echo [ERROR] No se encontro PostgreSQL en %PG_BIN%
    pause
    exit /b
)

:: ==========================================
:: CONFIGURACION DE CONEXION
:: ==========================================
set PROD_HOST=switchback.proxy.rlwy.net
set PROD_PORT=25513
set PROD_USER=postgres
set PROD_DB=railway
set PGPASSWORD_PROD=uXwrkbpPDVXrEngsRCMHdIKkOUDXipic

set LOCAL_HOST=localhost
set LOCAL_PORT=5433
set LOCAL_USER=postgres
set LOCAL_DB=notaria_segura_dev
set LOCAL_PASS=password

echo.
echo ===================================================
echo   CLONAR DATABASE: PROD - LOCAL (Dev)
echo ===================================================
echo   ORIGEN:  %PROD_HOST%:%PROD_PORT%
echo   DESTINO: %LOCAL_HOST%:%LOCAL_PORT% (%LOCAL_DB%)
echo ===================================================
echo.

echo [0/4] Verificando base de datos destino...
set PGPASSWORD=%LOCAL_PASS%

:: Intentar conectar, si no existe la DB, crearla
%PG_BIN%\psql.exe -h %LOCAL_HOST% -p %LOCAL_PORT% -U %LOCAL_USER% -lqt | findstr "%LOCAL_DB%" > nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Creando base de datos '%LOCAL_DB%'...
    %PG_BIN%\createdb.exe -h %LOCAL_HOST% -p %LOCAL_PORT% -U %LOCAL_USER% %LOCAL_DB%
) else (
    echo [INFO] La base de datos '%LOCAL_DB%' ya existe.
)

echo.
echo [1/4] Limpiando esquema public en LOCAL...
%PG_BIN%\psql.exe -h %LOCAL_HOST% -p %LOCAL_PORT% -U %LOCAL_USER% -d %LOCAL_DB% -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo limpiar la base local. Verifica credenciales y puerto.
    echo Pasword usado: %LOCAL_PASS%
    pause
    exit /b
)

echo.
echo [2/4] Descargando de PRODUCCION...
set PGPASSWORD=%PGPASSWORD_PROD%
%PG_BIN%\pg_dump.exe -h %PROD_HOST% -p %PROD_PORT% -U %PROD_USER% -d %PROD_DB% --no-owner --no-acl --format=custom --file="temp_prod.dump"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo al descargar de produccion.
    if exist "temp_prod.dump" del "temp_prod.dump"
    pause
    exit /b
)

echo.
echo [3/4] Restaurando en LOCAL...
set PGPASSWORD=%LOCAL_PASS%
%PG_BIN%\pg_restore.exe -h %LOCAL_HOST% -p %LOCAL_PORT% -U %LOCAL_USER% -d %LOCAL_DB% --no-owner --no-acl "temp_prod.dump"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARN] Hubo advertencias al restaurar (es normal si faltan roles).
) else (
    echo.
    echo [EXITO] Base de datos clonada exitosamente.
)

:: Limpieza
if exist "temp_prod.dump" del "temp_prod.dump"
set PGPASSWORD=
echo.
echo Listo. Ahora verifica que tu .env apunte a localhost:%LOCAL_PORT%/%LOCAL_DB%
pause
