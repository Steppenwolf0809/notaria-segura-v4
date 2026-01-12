@echo off
setlocal enabledelayedexpansion

REM ===================================================
REM CONFIGURATION
REM ===================================================
set PROD_URL=postgresql://postgres:uXwrkbpPDVXrEngsRCMHdIKkOUDXipic@switchback.proxy.rlwy.net:25513/railway
set STAGING_URL=postgresql://postgres:vzdzHHIVerdjgzWlmfARWiSsbTBSJfvw@gondola.proxy.rlwy.net:39316/railway

echo ===================================================
echo  NOTARIA SEGURA - DB SYNC
echo  Production to Staging (Postgres Copy)
echo ===================================================
echo.
echo  SOURCE (Production): switchback.proxy.rlwy.net:25513
echo  TARGET (Staging):    gondola.proxy.rlwy.net:39316
echo.
echo  ONE-WAY SYNC WARNING:
echo  This will completely ERASE the Staging database and
echo  replace it with a fresh copy of Production data.
echo.
echo  Press Ctrl+C to cancel or any key to continue...
REM pause > nul

echo.
echo [1/3] Dumping Production database...
echo       This may take a while depending on database size...
pg_dump "%PROD_URL%" --clean --if-exists --no-owner --no-privileges --file="prod_dump_temp.sql"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to dump Production database.
    echo         Please check your internet connection and if the URL is correct.
    goto :error
)

echo.
echo [2/3] Restoring to Staging database...
echo       Writing data to Staging...
psql "%STAGING_URL%" --file="prod_dump_temp.sql" > restore_log.txt 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to restore to Staging database.
    echo         Check restore_log.txt for details.
    goto :error
)

echo.
echo [3/3] Cleaning up temporary files...
del "prod_dump_temp.sql"
del "restore_log.txt"

echo.
echo ===================================================
echo  SUCCESS! Staging database sync complete.
echo ===================================================
echo.
echo  You can now connect to your Staging environment.
echo  Make sure to update your Staging .env or Railway variables
echo  to point to the new Staging database URL.
echo.
REM pause
exit /b 0

:error
echo.
echo ===================================================
echo  PROCESS FAILED
echo ===================================================
echo.
REM pause
exit /b 1
