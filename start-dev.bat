@echo off
REM Script para Windows - Iniciar entorno de desarrollo completo

echo 🚀 Iniciando entorno de desarrollo de Notaría Segura...
echo.

REM Verificar que estamos en la carpeta correcta
if not exist "package.json" (
    echo ❌ Error: Ejecuta este script desde la raíz del proyecto
    pause
    exit /b 1
)

echo 📡 Iniciando backend en puerto 3001...
start "Backend" cmd /k "cd backend && npm run dev"

echo Esperando que el backend inicie...
timeout /t 3 /nobreak > nul

echo 🎨 Iniciando frontend en puerto 5173...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo 🔥 ¡Entorno de desarrollo iniciado!
echo 📡 Backend:  http://localhost:3001
echo 🎨 Frontend: http://localhost:5173
echo.
echo 💡 Cierra las ventanas de comando para detener los servicios
echo.
pause
