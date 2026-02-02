@echo off
echo Ejecutando migracion de base de datos para tabla pending_receivables...
cd /d "%~dp0"
call npx prisma migrate dev --name add_pending_receivables_table
pause
