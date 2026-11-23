
# 🥗 NutriVida — Clínica de Atención Nutricional

NutriVida es una aplicación web de gestión nutricional desarrollada para facilitar la atención de pacientes, la reserva de consultas y la administración de una clínica especializada en nutrición.

El sistema reúne en una misma plataforma la información de los servicios nutricionales, la gestión de profesionales, las citas y el seguimiento de pacientes, proporcionando diferentes funcionalidades según el tipo de usuario.

Este proyecto fue desarrollado con fines académicos para la asignatura **Desarrollo FullStack II (DSY1104)** de Duoc UC.

## 🌿 ¿Qué es NutriVida?

NutriVida busca digitalizar los procesos de atención de una clínica nutricional, permitiendo que pacientes y profesionales interactúen mediante una plataforma web.

La aplicación contempla el proceso de atención nutricional, desde la consulta de servicios y la reserva de una hora hasta el registro de evaluaciones, mediciones y planes alimentarios.

Su objetivo es facilitar el acceso a la atención nutricional y mantener organizada la información necesaria para el trabajo clínico y administrativo.

## ✨ ¿Qué permite hacer NutriVida?

### 🌐 Visitantes

Las personas que ingresan al sitio web pueden:

- Conocer la clínica y sus servicios nutricionales.
- Consultar información de los nutricionistas.
- Buscar y filtrar los servicios disponibles.
- Acceder a un formulario de contacto.
- Consultar la ubicación referencial de la clínica mediante un mapa interactivo.
- Registrarse para acceder a las funcionalidades de pacientes.

### 👤 Pacientes

Los pacientes registrados cuentan con funcionalidades para:

- Iniciar sesión de forma segura.
- Consultar y actualizar información de su perfil.
- Buscar profesionales y servicios nutricionales.
- Solicitar citas según los horarios disponibles.
- Consultar sus citas registradas.
- Acceder a información de su seguimiento nutricional.
- Revisar la información nutricional que corresponda a su perfil.

### 🩺 Nutricionistas

Los profesionales pueden utilizar el sistema para:

- Consultar su agenda de atención.
- Revisar información de sus pacientes asignados.
- Gestionar información de fichas clínicas.
- Registrar evaluaciones y mediciones nutricionales.
- Realizar seguimiento de la evolución de los pacientes.
- Elaborar y gestionar planes alimentarios.

### 🛠️ Administradores

Los usuarios con permisos administrativos pueden:

- Gestionar usuarios y sus respectivos roles.
- Administrar la información de los nutricionistas.
- Gestionar los servicios nutricionales.
- Supervisar citas y agendas.
- Gestionar registros de pagos.
- Revisar solicitudes de contacto.
- Consultar reportes e información administrativa.
- Revisar registros de auditoría.

## 🧩 Principales módulos

| Módulo | Descripción |
|---|---|
| Inicio | Presentación de la clínica y sus servicios. |
| Servicios | Catálogo de prestaciones nutricionales con búsqueda y filtros. |
| Nutricionistas | Información de los profesionales disponibles. |
| Contacto | Formulario de consultas y mapa de ubicación referencial. |
| Autenticación | Registro, inicio y cierre de sesión. |
| Pacientes | Gestión de perfiles e información de pacientes. |
| Agenda | Disponibilidad de horarios y gestión de citas. |
| Ficha clínica | Registro y consulta de información de atención nutricional. |
| Seguimiento | Control de mediciones y evolución nutricional. |
| Planes alimentarios | Gestión de indicaciones y planes nutricionales. |
| Administración | Gestión de usuarios, servicios, profesionales y solicitudes. |
| Reportes | Consulta de información clínica y administrativa. |

## 🔐 Seguridad y acceso

NutriVida utiliza autenticación mediante **JWT (JSON Web Token)** y control de acceso basado en roles.

El sistema contempla cuatro perfiles principales:

- Visitante.
- Paciente.
- Nutricionista.
- Administrador.

Cada usuario autenticado accede a las funcionalidades permitidas para su rol.

La aplicación también incorpora validaciones de entrada, controles de autorización y mecanismos de auditoría.

**Importante:** NutriVida es un proyecto académico. Los datos utilizados para demostraciones y pruebas deben ser ficticios; no debe utilizarse para almacenar información real de pacientes sin una evaluación formal de seguridad y privacidad.

## 🖥️ Tecnologías utilizadas

### Frontend

- React 19.
- JavaScript y JSX.
- Vite.
- React Router.
- Bootstrap 5.
- CSS3.
- Leaflet y OpenStreetMap.

### Backend

- Java.
- Spring Boot.
- API REST.
- Spring Security.
- JWT.
- Maven.

### Base de datos

- MongoDB.
- Colecciones y documentos.
- Validadores e índices.
- Consultas y operaciones CRUD.

### Herramientas de desarrollo

- Visual Studio Code.
- Git y GitHub.
- Docker y Docker Compose.
- Vitest.
- React Testing Library.
- ESLint.
- Swagger / OpenAPI.

## 🏗️ Arquitectura de la aplicación

NutriVida se organiza en tres componentes principales:

**Frontend:** interfaz web desarrollada con React, encargada de mostrar información y permitir la interacción con el usuario.

**Backend:** servicios desarrollados con Spring Boot, responsables de procesar las solicitudes, aplicar las reglas de negocio y controlar la seguridad.

**Base de datos:** MongoDB, utilizada para almacenar la información de la aplicación.

El backend se divide en tres servicios:

| Servicio | Responsabilidad |
|---|---|
| Autenticación | Registro, inicio de sesión, usuarios y roles. |
| Clínico | Pacientes, nutricionistas, fichas clínicas, mediciones y planes alimentarios. |
| Agenda | Disponibilidad de horarios, reservas, citas, pagos y reportes asociados. |

La comunicación entre el frontend y los servicios se realiza mediante API REST utilizando solicitudes HTTP y respuestas JSON.

## 📁 Organización del proyecto

El repositorio está organizado en las siguientes carpetas:

- `frontend/`: aplicación web desarrollada en React.
- `backend/`: servicios Spring Boot y componentes compartidos.
- `mongodb/`: scripts para colecciones, validaciones, índices y datos ficticios.
- `despliegue/`: configuración versionada para desplegar en AWS (Docker Compose, Caddy y plantillas `.env.example`).
- `scripts/`: herramientas auxiliares para la preparación de datos y la generación del ZIP de entrega.

El archivo `docker-compose.yml` contiene la configuración para ejecutar los servicios mediante contenedores.

## 🚀 Ejecución local

### Requisitos

- Git.
- Node.js y npm.
- Java y Maven, para ejecutar el backend fuera de contenedores.
- Docker y Docker Compose, para utilizar el entorno con contenedores.

### 1. Clonar el repositorio

```bash
git clone https://github.com/JstChiguin/NutriVida.git
cd NutriVida
```

### 2. Configurar el entorno

Revisar los archivos `.env.example` disponibles en el proyecto y crear los archivos de configuración local que correspondan.

No incluir credenciales, contraseñas ni claves privadas en GitHub.

### 3. Iniciar los servicios

Con Docker instalado y la configuración local preparada:

```bash
docker compose up --build -d
```

`NUTRIVIDA_CONTRASENA_DEMO` define la contraseña común de las cuentas ficticias. Si `NUTRIVIDA_ADMIN_CONTRASENA` queda vacía, el administrador inicial utiliza esa misma contraseña. Ambas se configuran solo en el archivo `.env` local, que no se versiona. El archivo `.env.example` no trae valores para contraseñas ni para `NUTRIVIDA_JWT_SECRETO`: defínalos localmente (el secreto JWT requiere al menos 32 caracteres aleatorios) y no los publique.

Para cargar los datos ficticios en una base nueva:

```bash
node --env-file=.env scripts/sembrar-datos-demo.mjs
```

### Despliegue en AWS

La configuración para desplegar NutriVida en AWS (Caddy con HTTPS, Nginx con React, Docker Compose para la EC2 pública y la EC2 privada, y MongoDB Atlas) está en `despliegue/aws/`, con un `.env.example` por cada instancia que lista las variables de entorno necesarias.

El despliegue de laboratorio utiliza dos instancias EC2. La pública ejecuta Caddy, que atiende HTTPS, y Nginx, que sirve la aplicación React y solo escucha en `127.0.0.1`. La privada ejecuta los tres servicios Spring Boot, conectados a MongoDB Atlas. Nginx reenvía `/autenticacion/`, `/clinico/` y `/agenda/` a cada servicio y bloquea las rutas internas, y el frontend consume la API versionada (`/api/v1`).

Las imágenes Docker se publican con una etiqueta basada en el commit, por ejemplo `chiguin/nutrivida:frontend-899e328`, y se reemplazan servicio por servicio conservando el contenedor anterior para poder revertir.

El entorno de AWS es de laboratorio y no permanece encendido de forma permanente. La dirección pública (un dominio `sslip.io` derivado de la IP de la instancia) cambia cada vez que se enciende, por lo que no es una URL permanente. Las credenciales, los archivos `.env` reales y los procedimientos internos de despliegue no se publican en el repositorio.

### 4. Iniciar el frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir en el navegador la dirección local indicada por Vite.

### 5. Detener los servicios

Desde la raíz del proyecto:

```bash
docker compose down
```

## 📦 Generar el ZIP de entrega

Desde la carpeta `scripts` de un clon del proyecto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\generar-zip-evaluacion.ps1"
```

El script incluye `backend`, `frontend`, `mongodb`, `scripts`, `despliegue` y los documentos de la raíz permitidos; la carpeta `docs` solo se agrega con el parámetro `-IncluirDocs`. Excluye `.git`, `.claude`, `node_modules`, `dist`, `target`, los archivos `.env` (salvo `.env.example`), las claves y los certificados, y se detiene sin crear el ZIP si detecta patrones de credenciales. El resultado queda en la carpeta `Entregas-NutriVida`, junto a la carpeta del proyecto. Conviene revisar su contenido antes de compartirlo.

## 🧪 Pruebas y validación

El frontend dispone de pruebas automatizadas mediante Vitest y React Testing Library.

En la última verificación local sobre `develop` (23-11-2026) se obtuvieron los siguientes resultados:

- **Frontend: 190 pruebas aprobadas** en 18 archivos de pruebas.
- **Backend: 124 pruebas aprobadas** (11 del módulo común, 22 de autenticación, 45 del servicio clínico y 46 de agenda), ejecutadas contra una base MongoDB de pruebas aislada y con datos ficticios.
- Compilación de producción del frontend realizada correctamente (Vite informa una advertencia por el tamaño del paquete principal).
- Análisis estático con ESLint sin errores.

Para ejecutar las verificaciones del frontend:

```bash
cd frontend
npm run test
npm run build
npm run lint
```

Para ejecutar las pruebas del backend se necesita Maven, Java y un servidor MongoDB de pruebas distinto de cualquier base con datos propios. Su dirección se indica con la variable `NUTRIVIDA_MONGO_SERVIDOR_PRUEBAS`:

```bash
cd backend
mvn test
```

## 📌 Estado del proyecto

La aplicación fue integrada en la rama principal `main` mediante Pull Requests, conservando el historial del trabajo colaborativo.

**Versión integrada de referencia:** commit `b2d2ccb` de `main`, correspondiente al Pull Request #30.

### Funcionalidades incorporadas

- Interfaz pública de la clínica.
- Navegación mediante React Router.
- Registro y autenticación de usuarios.
- Control de acceso según roles.
- Gestión de pacientes y nutricionistas.
- Gestión de citas y disponibilidad.
- Fichas clínicas y seguimiento nutricional.
- Planes alimentarios.
- Administración de usuarios y servicios.
- Reportes y auditoría.
- Mapa interactivo de ubicación referencial.
- API REST versionada (`/api/v1`) en los tres servicios y en el frontend.
- Manejo de la expiración de sesión y de las respuestas 401 y 403 en el frontend.
- Despliegue en AWS con Docker, Caddy y Nginx, completado y verificado en un entorno de laboratorio.

### Verificaciones y mejoras pendientes

- Verificar nuevamente el despliegue en AWS cada vez que se encienda el entorno de laboratorio.
- Revisar las vulnerabilidades moderadas informadas por npm.
- Optimizar el tamaño de los archivos generados en la compilación.
- Completar las pruebas funcionales de extremo a extremo.
- Verificar el envío y la persistencia de consultas del formulario de contacto.

El despliegue del frontend en GitHub Pages no implica automáticamente que los servicios backend y MongoDB estén disponibles públicamente.

## 👩‍💻 Equipo de desarrollo

Proyecto desarrollado por estudiantes de **Duoc UC**, carrera de Ingeniería Informática.

**Integrantes:**

- Chiguin Chiang.
- Victoria Ortega.
- Arlette Patiño.

**Asignatura:** Desarrollo FullStack II — DSY1104.

## 🤝 Trabajo colaborativo

El desarrollo se organiza utilizando Git y GitHub.

- `main`: rama principal con las integraciones revisadas.
- `develop`: rama de integración de nuevas funcionalidades.
- `feature/*`: ramas de desarrollo de funcionalidades.
- `fix/*`: ramas de correcciones.


Los cambios se incorporan mediante Pull Requests, permitiendo revisar el trabajo antes de integrarlo.


---

**NutriVida — Proyecto académico de Desarrollo FullStack II, Duoc UC.**
