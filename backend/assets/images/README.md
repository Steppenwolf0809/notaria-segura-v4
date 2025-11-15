# Logo de la Notaría para PDFs UAFE

## 📍 Ubicación del Logo

Coloca el logo de la Notaría 18 en esta carpeta con el nombre:

```
logo-notaria.png
```

## 📐 Especificaciones Recomendadas

- **Formato**: PNG (con fondo transparente preferiblemente)
- **Tamaño**: 200x200px o mayor (se redimensionará automáticamente a 60x60px en el PDF)
- **Forma**: Cuadrada o circular
- **Calidad**: Alta resolución para mejor impresión

## 🔧 Comportamiento

- Si el archivo `logo-notaria.png` existe en esta carpeta, se usará en los PDFs de formularios UAFE
- Si NO existe el archivo, se mostrará un círculo azul con "N18" como placeholder
- El logo aparecerá en la esquina superior izquierda del header del PDF

## 📝 Ejemplo de Ruta Completa

```
backend/assets/images/logo-notaria.png
```

## 🎨 Alternativas Aceptadas

También puedes usar estos formatos:
- `.jpg` / `.jpeg` (modificar el código para cambiar la extensión)
- `.svg` (requiere conversión a PNG primero)

## ⚠️ Importante

- NO commitear el logo al repositorio si contiene información confidencial
- Agregar `*.png` a `.gitignore` si es necesario
