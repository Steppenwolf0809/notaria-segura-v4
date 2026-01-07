@echo off
cd /d "%~dp0"
set DATABASE_URL=postgresql://postgres:gJFXtqjDmacRfMTdhrPWRzYmUYkRrjiQ@switchback.proxy.rlwy.net:25513/railway
echo Sincronizando BD remota...
call npx prisma db push --accept-data-loss
pause
