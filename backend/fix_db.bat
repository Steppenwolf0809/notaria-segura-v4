@echo off
cd /d "%~dp0"
echo ==========================================
echo Sincronizando Base de Datos (Notaria 18)
echo ==========================================
echo.
echo Ejecutando migracion de Prisma...
call npx prisma migrate dev --name add_transaction_details
echo.
echo ==========================================
if %ERRORLEVEL% EQU 0 (
    echo [EXITO] Base de datos actualizada correctamente.
    echo Por favor reinicie su backend para ver los cambios.
) else (
    echo [ERROR] Hubo un problema al actualizar la base de datos.
    echo Revise el mensaje de error arriba.
)
echo ==========================================
pause
