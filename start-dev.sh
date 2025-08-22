#!/bin/bash

# Script para iniciar el entorno de desarrollo completo
# Ejecuta frontend y backend en paralelo

echo "🚀 Iniciando entorno de desarrollo de Notaría Segura..."
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios de desarrollo..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Capturar Ctrl+C para limpiar
trap cleanup SIGINT

# Iniciar backend en background
echo "📡 Iniciando backend en puerto 3001..."
cd backend && npm run dev &
BACKEND_PID=$!

# Esperar un momento para que el backend inicie
sleep 3

# Iniciar frontend en background
echo "🎨 Iniciando frontend en puerto 5173..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Mostrar información útil
echo ""
echo "🔥 ¡Entorno de desarrollo iniciado!"
echo "📡 Backend:  http://localhost:3001"
echo "🎨 Frontend: http://localhost:5173"
echo ""
echo "💡 Presiona Ctrl+C para detener ambos servicios"
echo ""

# Esperar que ambos procesos terminen
wait $BACKEND_PID $FRONTEND_PID
