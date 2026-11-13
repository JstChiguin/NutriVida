# NutriVida — Clínica de Atención Nutricional

**Proyecto académico de Desarrollo FullStack II (DSY1104), Duoc UC.**

NutriVida es una aplicación web para la atención nutricional que reúne un sitio público, registro e inicio de sesión, reserva y gestión de citas, seguimiento de pacientes y herramientas de administración. Integra un frontend React, tres microservicios Spring Boot y MongoDB.

> **Importante:** clínica y registros utilizados con fines académicos. Todas las demostraciones deben emplear exclusivamente datos ficticios. La dirección Av. Brasil 2021, Valparaíso, es la ubicación definida para la simulación del proyecto; no implica que allí funcione una clínica real.

**Repositorio:** [JstChiguin/NutriVida](https://github.com/JstChiguin/NutriVida)

## Funcionalidades

### Sitio público

- Inicio con navegación y tarjetas interactivas.
- Catálogo de servicios nutricionales, búsqueda y filtros por categoría.
- Perfiles de nutricionistas consultados desde la API, con información referencial cuando no hay conexión.
- Formulario de contacto con validación de campos, consentimiento de privacidad, mensajes de error y confirmación visual.
- Mapa interactivo con **Leaflet**, controles de zoom y marcador personalizado de NutriVida.

### Pacientes

- Registro, inicio y cierre de sesión.
- Consulta y actualización de perfil.
- Solicitud y consulta de citas, según disponibilidad y permisos.
- Consulta de ficha clínica, mediciones, seguimiento y planes alimentarios.

### Nutricionistas

- Agenda y gestión de citas.
- Consulta de pacientes atendidos y sus antecedentes autorizados.
- Registro y gestión de información clínica y planes alimentarios, según los permisos implementados.

### Administración

- Gestión de usuarios, roles y estados de cuenta.
- Gestión de servicios y profesionales.
- Asignación de nutricionistas, solicitudes y pagos simulados.
- Reportes y consulta de auditoría.

Las rutas internas se protegen según los roles **PACIENTE**, **NUTRICIONISTA** y **ADMINISTRADOR**.

## Tecnologías

| Componente | Tecnologías |
|---|---|
| Frontend | React 19, JavaScript, Vite 8, React Router, Bootstrap 5 y CSS |
| Mapa | Leaflet 1.9.4 |
| Backend | Java 21, Spring Boot 3.5, Spring Security, API REST |
| Persistencia | MongoDB 7, Spring Data MongoDB |
| Seguridad | JWT, BCrypt y autorización basada en roles y recursos |
| Pruebas | Vitest, React Testing Library, JUnit 5 y Spring Test |
| Documentación API | OpenAPI / Swagger UI |
| Entorno local | Docker y Docker Compose |
| Colaboración | Git y GitHub, ramas y Pull Requests |

## Estructura del proyecto

```text
NutriVida/
├── backend/
│   ├── comun/
│   ├── servicio-autenticacion/
│   ├── servicio-clinico/
│   └── servicio-agenda/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── paginas/
│   │   │   └── ui/
│   │   ├── configuracion/
│   │   ├── contexto/
│   │   ├── datos/
│   │   ├── hooks/
│   │   ├── paginas/
│   │   │   └── administracion/
│   │   ├── rutas/
│   │   ├── servicios/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── estilos-integracion.css
│   ├── tests/
│   └── package.json
├── mongodb/
├── scripts/
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

El backend se divide en un módulo común y tres servicios independientes:

| Servicio | Puerto local | Responsabilidad |
|---|---:|---|
| Autenticación | `8081` | Registro, inicio de sesión, usuarios y roles |
| Clínico | `8082` | Servicios, nutricionistas, pacientes, fichas, mediciones, planes y contacto |
| Agenda | `8083` | Horarios, disponibilidad, citas, pagos simulados y reportes |
| Frontend Vite | `5173` | Interfaz web |
| MongoDB | `27018` | Base de datos expuesta solo en localhost por Docker Compose |

## Requisitos para ejecutar localmente

- Git.
- Node.js y npm compatibles con Vite 8 (se recomienda Node.js 22 LTS).
- Docker Desktop con Docker Compose, para MongoDB y los microservicios.
- Opcional: Java 21 y Maven 3.9 para compilar o probar el backend fuera de Docker.

## Instalación y ejecución en Windows (PowerShell)

Desde la raíz del repositorio:

### 1. Preparar la configuración local

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edita `.env` en tu equipo y define los valores requeridos, especialmente `NUTRIVIDA_JWT_SECRETO` (un secreto aleatorio suficientemente largo). Configura las credenciales iniciales únicamente para el entorno de pruebas, si corresponde.

**No publiques `.env`, contraseñas, tokens ni datos personales.** Conserva `.env.example` solo como plantilla, sin secretos reales.

### 2. Iniciar MongoDB y los tres servicios Spring Boot

```powershell
docker compose up -d --build
docker compose ps
```

Docker Compose crea y utiliza un volumen persistente para MongoDB. **No ejecutes `docker compose down -v` si necesitas conservar los datos del entorno.**

### 3. Instalar y ejecutar el frontend

En una segunda terminal, desde la raíz del proyecto:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run dev
```

Abre **http://localhost:5173**.

El frontend utiliza por defecto los servicios locales. Si necesitas otras direcciones, configura `frontend/.env` tomando como referencia `frontend/.env.example`, con `VITE_URL_AUTENTICACION`, `VITE_URL_CLINICO` y `VITE_URL_AGENDA`.

### 4. API y documentación

Con los servicios funcionando, la interfaz de Swagger UI está disponible en:

- Autenticación: http://localhost:8081/swagger-ui.html
- Clínico: http://localhost:8082/swagger-ui.html
- Agenda: http://localhost:8083/swagger-ui.html

Los endpoints y permisos se describen en [`docs/api-endpoints.md`](docs/api-endpoints.md).

## Pruebas y calidad

Desde la raíz, en PowerShell:

```powershell
npm.cmd --prefix frontend run test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

**Última verificación informada para la integración en `main` (12-11-2026):**

- **143 de 143 pruebas Vitest aprobadas**, distribuidas en **16 archivos**.
- Compilación Vite exitosa (**83 módulos**).
- ESLint sin errores.
- Conflictos de Git resueltos antes de integrar `develop` en `main`.
- Commit de integración de `main`: **`7a44a01`** (PR #12).

Para ejecutar las pruebas del backend, con Java y Maven instalados:

```powershell
mvn -f backend/pom.xml test
```

Algunas pruebas de integración del backend requieren MongoDB accesible; no se afirma aquí que hayan sido ejecutadas en la última validación del frontend.

## Datos de demostración

El repositorio contiene scripts en `mongodb/` y `scripts/` para preparar colecciones y datos de demostración ficticios. Consulta [`docs/taller-bases-de-datos.md`](docs/taller-bases-de-datos.md) antes de utilizarlos. No cargues información clínica ni datos personales reales.

## Seguridad y privacidad

- Autenticación con JWT y contraseñas protegidas mediante BCrypt.
- Autorización por roles y controles sobre el acceso a los recursos.
- Variables sensibles fuera del código fuente y del repositorio.
- Uso exclusivo de identidades, contactos y antecedentes clínicos ficticios para pruebas.
- El formulario público exige consentimiento de privacidad.

**Alcance del formulario de Contacto:** las pruebas verifican sus validaciones y la confirmación visual; dicha confirmación, por sí sola, **no acredita el envío o almacenamiento efectivo de la consulta en el backend**.

## Despliegue y limitaciones conocidas

El repositorio registra una publicación del frontend mediante **GitHub Pages**. Esto no significa que MongoDB y los tres microservicios estén alojados y disponibles públicamente: para utilizar las funciones que dependen de la API se necesita un backend accesible y correctamente configurado.

Pendientes identificados durante la integración:

- Revisar las **cuatro vulnerabilidades moderadas** informadas por `npm audit`, sin aplicar actualizaciones incompatibles automáticamente.
- Optimizar el tamaño del paquete JavaScript: Vite advierte un archivo superior a **500 kB** tras minificación.
- Comprobar el flujo completo frontend–backend en el entorno de despliegue previsto.
- Validar la compatibilidad final de la solución con las exigencias de infraestructura y base de datos de la pauta académica.

## Documentación

- [`docs/arquitectura.md`](docs/arquitectura.md): componentes, microservicios y decisiones técnicas.
- [`docs/api-endpoints.md`](docs/api-endpoints.md): rutas REST y permisos.
- [`docs/taller-bases-de-datos.md`](docs/taller-bases-de-datos.md): MongoDB y consultas.
- [`docs/guia-de-defensa.md`](docs/guia-de-defensa.md): conceptos y preparación para la presentación.

## Trabajo colaborativo

Proyecto desarrollado por **Chiguin Chiang, Victoria Ortega y Arlette Patiño**.

Se utiliza `main` para la versión principal y `develop` para integrar trabajo. Las nuevas funcionalidades deben desarrollarse en ramas creadas desde `develop`, revisarse mediante Pull Requests y fusionarse sin reescribir el historial del equipo. Los commits deben describir en español los cambios, motivos, archivos afectados y verificaciones realmente ejecutadas, con la identidad Git verificada de cada integrante.

---

**Estado:** integración de código completada en `main` el 12 de noviembre de 2026; validaciones de despliegue integral y observaciones técnicas pendientes.
