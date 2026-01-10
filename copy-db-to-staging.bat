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
:: CONFIGURACION DE CONEXION
:: ==========================================
set PROD_HOST=gondola.proxy.rlwy.net
set PROD_PORT=41960
set PROD_USER=postgres
set PROD_DB=railway
set PGPASSWORD_PROD=ymGXjRwwZshJaTEwyIpyztWqAZogkzSG

set STAGING_HOST=gondola.proxy.rlwy.net
set STAGING_PORT=39316
set STAGING_USER=postgres
set STAGING_DB=railway
set PGPASSWORD_STAGING=vzdzHHIVerdjgzWlmfARWiSsbTBSJfvw

echo.
echo ===================================================
echo   COPIA DE SEGURIDAD: PROD - STAGING
echo ===================================================
echo   ORIGEN:  %PROD_HOST%:%PROD_PORT%
echo   DESTINO: %STAGING_HOST%:%STAGING_PORT%
echo ===================================================
echo.

echo [1/2] Limpiando base de datos de STAGING...
set PGPASSWORD=%PGPASSWORD_STAGING%
%PG_BIN%\psql.exe -h %STAGING_HOST% -p %STAGING_PORT% -U %STAGING_USER% -d %STAGING_DB% -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo limpiar la base de datos de Staging.
    echo Verifica la conexion a Staging.
    pause
    exit /b
)

echo.
echo [2/2] Transfiriendo datos (PROD - STAGING)...
echo       Esto puede tardar unos minutos...

:: COMANDO MAGICO: Tubería directa sin archivo intermedio
:: Se usa la password de PROD para el dump y luego se necesita la de STAGING para el restore
:: Como no podemos cambiar variables de entorno en medio de una tuberia, usaremos archivo de claves temporal

echo %STAGING_HOST%:%STAGING_PORT%:%STAGING_DB%:%STAGING_USER%:%PGPASSWORD_STAGING%> "%APPDATA%\postgresql\pgpass.conf" 2>nul
if not exist "%APPDATA%\postgresql" mkdir "%APPDATA%\postgresql" 2>nul
echo %STAGING_HOST%:%STAGING_PORT%:%STAGING_DB%:%STAGING_USER%:%PGPASSWORD_STAGING%> "%APPDATA%\postgresql\pgpass.conf"

set PGPASSWORD=%PGPASSWORD_PROD%
%PG_BIN%\pg_dump.exe -h %PROD_HOST% -p %PROD_PORT% -U %PROD_USER% -d %PROD_DB% --no-owner --no-acl --format=custom | %PG_BIN%\pg_restore.exe -h %STAGING_HOST% -p %STAGING_PORT% -U %STAGING_USER% -d %STAGING_DB% --no-owner --no-acl

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Hubo un problema durante la transferencia.
) else (
    echo.
    echo [EXITO] Transferencia completada correctamente.
)

:: Limpieza
del "%APPDATA%\postgresql\pgpass.conf" 2>nul
set PGPASSWORD=
pause
