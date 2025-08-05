# Frontend - Notaría Segura

Este directorio contiene el código fuente de la aplicación frontend de Notaría Segura, construida con React.

## Stack Tecnológico

- **Framework**: React 19
- **Bundler**: Vite
- **UI Kit**: Material-UI (MUI)
- **Manejo de Estado**: Zustand
- **Cliente HTTP**: Axios
- **Enrutamiento**: (No se especifica un enrutador, probablemente se usa uno simple o se gestiona a través del estado)

## Estructura de Directorios

```
frontend/
├── src/
│   ├── assets/         # Imágenes y otros recursos estáticos
│   ├── components/     # Componentes de React reutilizables
│   │   ├── archivo/    # Componentes para el rol de Archivo
│   │   ├── Documents/  # Componentes relacionados con documentos
│   │   ├── UI/         # Componentes generales de la interfaz
│   │   └── ...
│   ├── hooks/          # Hooks de React personalizados
│   ├── pages/          # Componentes que representan páginas completas
│   ├── services/       # Servicios para interactuar con la API
│   ├── store/          # Stores de Zustand para el manejo de estado
│   └── utils/          # Funciones de utilidad
├── .env.example      # Ejemplo de variables de entorno
├── package.json        # Dependencias y scripts del frontend
└── README.md           # Este archivo
```

## Componentes Principales

- **`App.jsx`**: Componente raíz de la aplicación.
- **`LoginForm.jsx`**: Formulario de inicio de sesión.
- **`Dashboard.jsx`**: Dashboard principal que se muestra después de iniciar sesión.
- **`KanbanView.jsx`**: Vista de tablero Kanban para la gestión de documentos.
- **`DocumentCard.jsx`**: Tarjeta que representa un documento en el Kanban.
- **Componentes de Rol**: El directorio `components` contiene subdirectorios para componentes específicos de cada rol (`archivo`, `recepcion`, etc.).

## Manejo de Estado con Zustand

La aplicación utiliza Zustand para un manejo de estado simple y eficiente. Los stores se encuentran en `src/store`:

- **`auth-store.js`**: Gestiona el estado de autenticación (token, usuario).
- **`document-store.js`**: Gestiona el estado de los documentos.
- **`theme-store.js`**: Gestiona el tema de la aplicación (claro/oscuro).

## Interacción con la API

Los servicios en `src/services` se encargan de la comunicación con la API del backend. Cada servicio corresponde a un conjunto de endpoints:

- **`auth-service.js`**: Endpoints de autenticación.
- **`document-service.js`**: Endpoints de gestión de documentos.
- **`reception-service.js`**: Endpoints del rol de recepción.
- **`archivo-service.js`**: Endpoints del rol de archivo.

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo de Vite.
- `npm run build`: Compila la aplicación para producción.
- `npm run preview`: Sirve la aplicación compilada localmente.