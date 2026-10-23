# NutriVida — Clínica de Atención Nutricional

Aplicación web para presentar los servicios de NutriVida, conocer al equipo de nutricionistas y realizar consultas mediante un formulario de contacto.

## Tecnologías

- React 19
- Vite
- JavaScript
- Bootstrap
- CSS3
- Git y GitHub

## Estructura del proyecto

```text
NutriVida/
├── frontend/
│   ├── public/
│   │   └── img/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Contacto.jsx
│   │   │   ├── Encabezado.jsx
│   │   │   ├── Nutricionistas.jsx
│   │   │   ├── PiePagina.jsx
│   │   │   ├── Portada.jsx
│   │   │   └── Servicios.jsx
│   │   ├── utils/
│   │   │   └── validadores.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Requisitos

- Node.js y npm instalados.
- Git instalado.

## Instalación

Desde la raíz del repositorio, ejecutar:

```bash
cd frontend
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Vite mostrará la dirección local para abrir la aplicación en el navegador.

## Comprobar el proyecto

Compilar para producción:

```bash
npm run build
```

Revisar el código con ESLint:

```bash
npm run lint
```

## Funcionalidades implementadas

- Navegación por las secciones de la página.
- Presentación de servicios nutricionales.
- Visualización del equipo de nutricionistas.
- Búsqueda y filtrado de servicios.
- Formulario de contacto con validaciones.
- Mensaje de confirmación de envío simulado.

**Estado actual:** base inicial integrada en React. Las pruebas automatizadas y las funcionalidades pendientes se desarrollarán durante las siguientes etapas del proyecto.

## Trabajo colaborativo

Las nuevas funcionalidades deben desarrollarse en ramas de trabajo independientes y compartirse mediante Pull Requests, siguiendo el flujo acordado por el equipo.
