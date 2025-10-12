# 🚀 Instrucciones Rápidas: Solución Error 401 PDF

## ⚡ Solución en 3 pasos

### 1️⃣ Agregar Variables FTP al `.env`

Edita `backend/.env` y agrega:

```env
# Servidor FTP / cPanel
FTP_HOST=ftp.notaria18quito.com.ec
FTP_USER=tu_usuario_ftp_real
FTP_PASSWORD=tu_contraseña_ftp_real
FTP_PORT=21
FTP_BASE_PATH=/public_html/fotos-escrituras
FTP_PUBLIC_BASE_URL=https://www.notaria18quito.com.ec/fotos-escrituras
```

**⚠️ IMPORTANTE**: Reemplaza con tus credenciales reales de cPanel.

### 2️⃣ Reiniciar Backend

**Desarrollo:**
```bash
# Detener el servidor (Ctrl+C)
# Iniciar nuevamente
cd backend
npm run dev
```

**Producción (Railway):**
1. Ve a tu proyecto en Railway
2. Settings → Variables
3. Agrega las 6 variables FTP
4. Guarda (redeploy automático)

### 3️⃣ Verificar

**Opción A - Navegador:**
```
http://localhost:3001/api/proxy-pdf/health
```

Debe mostrar: `"status": "ready"`

**Opción B - Script:**
```bash
cd backend
node scripts/test-ftp-proxy.js
```

## 🎯 Resultado

✅ El modal "Gestionar Páginas Ocultas" cargará los PDFs sin error  
✅ No más "Failed to load PDF file"  
✅ No más error 401

## 📚 Documentación Completa

Lee `SOLUCION_ERROR_401_PDF.md` para:
- Explicación técnica detallada
- Opciones alternativas
- Troubleshooting avanzado

## 🔍 Commits Realizados

```
Branch: fix/proxy-pdf-unauthorized
Commit: 83aa729
Mensaje: "fix: corregir error 401 en endpoint proxy-pdf..."
```

## 📝 Archivos Modificados

- ✅ `backend/env.example` - Variables FTP documentadas
- ✅ `backend/src/routes/pdf-proxy-routes.js` - Logs y endpoint de health
- ✅ `frontend/src/components/escrituras/PDFPageManagerModal.jsx` - Mejor UX
- ✅ `backend/scripts/test-ftp-proxy.js` - Script de diagnóstico (nuevo)
- ✅ `SOLUCION_ERROR_401_PDF.md` - Documentación completa (nuevo)

---

**¿Problemas?** Lee la documentación completa o revisa los logs del backend.

