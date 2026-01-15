# Script de Limpieza de Estados Documentales

Este script actualiza el estado de documentos a `ENTREGADO` para matrizadores específicos, 
respetando una lista de excepciones.

## Matrizadores Afectados

| ID | Nombre |
|----|--------|
| 8  | FRANCISCO ESTEBAN PROAÑO ASTUDILLO |
| 12 | MAYRA CRISTINA CORELLA PARRA |

⚠️ **Documentos de otros matrizadores NO serán modificados.**

## Uso

### 1. Configurar excepciones
Edita `excepciones.txt` con los códigos de barras que NO deben modificarse:
```
# Documentos pendientes
20251701018P02635
20251701018C02510
```

### 2. Configurar conexión
El archivo `.env` ya está configurado con la URL de producción de Railway.

### 3. Instalar dependencias
```bash
npm install
```

### 4. Ver preview (SIN modificar la BD)
```bash
npm run preview
```

### 5. Ejecutar cambios
```bash
npm run ejecutar
```

## ⚠️ Importante

- **SIEMPRE** ejecuta `preview` antes de `ejecutar`
- **VERIFICA** que tienes un backup reciente
- El script requiere **doble confirmación** antes de ejecutar
- Los cambios usan **transacciones SQL** (rollback automático si hay error)
- Se genera un **reporte Excel** con todos los cambios realizados

## Archivos Generados

Después de ejecutar, se genera un archivo `cambios_YYYYMMDDTHHMMSS.xlsx` con:
- **Hoja 1**: Resumen general
- **Hoja 2**: Documentos modificados
- **Hoja 3**: Excepciones respetadas
- **Hoja 4**: Resumen por matrizador
