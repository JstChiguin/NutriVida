
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
- Consultar, cancelar y reprogramar sus citas.
- Registrar pagos simulados.
- Acceder a información de su seguimiento nutricional.
- Consultar sus fichas clínicas y planes alimentarios.

### 🩺 Nutricionistas

Los profesionales pueden utilizar el sistema para:

- Consultar su agenda de atención.
- Gestionar citas, horarios y bloqueos.
- Revisar información de sus pacientes autorizados.
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
- Gestionar registros de pagos simulados.
- Revisar solicitudes de contacto.
- Consultar reportes e información administrativa.
- Revisar registros de auditoría.

## 🧩 Principales módulos

| Módulo | Descripción |
|---|---|
| Inicio | Presentación de la clínica y sus servicios. |
| Servicios | Catálogo de prestaciones nutricionales con búsqueda y filtros. |
| Nutricionistas | Información de los profesionales disponibles. |
| Contacto | Formulario de consultas con persistencia en MongoDB y mapa de ubicación referencial. |
| Autenticación | Registro, inicio y cierre de sesión. |
| Pacientes | Gestión de perfiles e información de pacientes. |
| Agenda | Disponibilidad de horarios y gestión de citas. |
| Ficha clínica | Registro y consulta de información de atención nutricional. |
| Seguimiento | Control de mediciones y evolución nutricional. |
| Planes alimentarios | Gestión y versionamiento de planes nutricionales. |
| Pagos | Registro y gestión de pagos simulados. |
| Administración | Gestión de usuarios, servicios, profesionales y solicitudes. |
| Reportes | Consulta de indicadores agregados e información administrativa. |
| Auditoría | Registro de operaciones realizadas en el sistema. |

## 🔐 Seguridad y acceso

NutriVida utiliza autenticación mediante **JWT (JSON Web Token)** y control de acceso basado en roles (RBAC).

El sistema contempla cuatro perfiles principales:

- Visitante.
- Paciente.
- Nutricionista.
- Administrador.

Cada usuario autenticado accede a las funcionalidades permitidas para su rol.

La aplicación incorpora los siguientes mecanismos de seguridad:

- Autenticación mediante JWT.
- Token de acceso de corta duración (15 minutos por defecto).
- Renovación automática de la sesión con refresh token opaco, enviado en una cookie `HttpOnly` y `SameSite=Lax` (`Secure` configurable con `NUTRIVIDA_COOKIE_SEGURA`).
- El refresh token se almacena solo como hash SHA-256, rota en cada renovación, revoca toda su familia si se reutiliza uno ya rotado y tiene un límite absoluto de sesión (8 horas por defecto, `NUTRIVIDA_SESION_MAXIMA_HORAS`).
- Protección CSRF de la renovación con la cabecera `X-Nutrivida-Csrf` y CORS con orígenes explícitos.
- La renovación vuelve a leer al usuario. Al desactivar una cuenta o cambiar su rol se revocan sus sesiones de renovación y se registra el instante en `usuarios_invalidados`: los tres microservicios rechazan con 401 los access tokens emitidos hasta ese instante (precisión de un segundo), por lo que no hay ventana de 15 minutos con privilegios antiguos.
- La cookie de refresco toma su `Path` del prefijo del proxy (`X-Forwarded-Prefix`): `/autenticacion/api/v1/autenticacion` detrás de Nginx y `/api/v1/autenticacion` sin proxy. Detrás de Nginx se requiere `NUTRIVIDA_FORWARD_HEADERS=framework`.
- Protección de contraseñas mediante hash BCrypt.
- Persistencia de sesión del token de acceso mediante `sessionStorage` (el refresh token nunca es accesible desde JavaScript).
- Revocación del token de acceso y de la sesión de renovación al cerrar sesión.
- Manejo de sesiones expiradas.
- Pago simulado con comprobante ficticio, un único pago aprobado por cita garantizado por índice único parcial.
- Recordatorios dentro de la aplicación para citas confirmadas próximas (24 horas por defecto, `NUTRIVIDA_HORAS_RECORDATORIO`). No se envían correos, SMS ni mensajes externos.
- Validación de datos en frontend y backend.
- Control de acceso por roles y propiedad de los recursos.
- Configuración de orígenes permitidos mediante CORS.
- Manejo centralizado de errores HTTP.
- Registro de operaciones mediante auditoría.
- Comunicación HTTPS en el entorno de AWS.

**Importante:** NutriVida es un proyecto académico. Los datos utilizados para demostraciones y pruebas deben ser ficticios; no debe utilizarse para almacenar información real de pacientes sin una evaluación formal de seguridad y privacidad.

## 🖥️ Tecnologías utilizadas

### Frontend

- React 19.
- JavaScript y JSX.
- Vite 8.
- React Router 7.
- Bootstrap 5.
- CSS3.
- Leaflet y OpenStreetMap.

### Backend

- Java 21.
- Spring Boot 3.5.
- API REST.
- Spring Security.
- Spring Data MongoDB.
- JWT.
- BCrypt.
- Maven.
- JUnit y MockMvc.

### Base de datos

- MongoDB.
- MongoDB Atlas.
- Colecciones y documentos.
- Validadores e índices.
- Consultas y operaciones CRUD.

### Infraestructura y despliegue

- AWS Academy.
- Amazon EC2.
- Docker y Docker Compose.
- Docker Hub.
- Nginx.
- Caddy.
- HTTPS mediante Let's Encrypt.
- systemd.
- Dominios dinámicos sslip.io.

### Herramientas de desarrollo

- Visual Studio Code.
- Git y GitHub.
- Vitest.
- React Testing Library.
- ESLint.
- Swagger / OpenAPI.

## 🏗️ Arquitectura de la aplicación

NutriVida se organiza en tres componentes principales:

**Frontend:** interfaz web desarrollada con React, encargada de mostrar información y permitir la interacción con el usuario.

**Backend:** servicios desarrollados con Spring Boot, responsables de procesar las solicitudes, aplicar las reglas de negocio y controlar la seguridad.

**Base de datos:** MongoDB, utilizada para almacenar la información de la aplicación.

El backend se divide en tres microservicios y un módulo compartido:

| Servicio | Puerto | Responsabilidad |
|---|---:|---|
| Autenticación | 8081 | Registro, inicio y cierre de sesión, usuarios y roles. |
| Clínico | 8082 | Pacientes, nutricionistas, servicios, fichas clínicas, mediciones, planes alimentarios y solicitudes de contacto. |
| Agenda | 8083 | Disponibilidad de horarios, reservas, citas, pagos simulados y reportes asociados. |
| Común | No aplica | Seguridad, validaciones, auditoría, paginación y manejo de errores compartidos. |

La comunicación entre el frontend y los servicios se realiza mediante API REST utilizando solicitudes HTTP y respuestas JSON.

### Arquitectura en capas del backend

- **Controller:** recibe las solicitudes HTTP y entrega las respuestas correspondientes.
- **Service:** aplica las reglas de negocio.
- **Repository:** gestiona el acceso a MongoDB.
- **Model:** representa los documentos de la base de datos.
- **DTO:** define los datos de entrada y salida de las operaciones.

### Flujo general de comunicación

```text
Usuario
    |
Frontend React
    |
HTTPS / Caddy
    |
Nginx
    |
    +-- Autenticación :8081
    |
    +-- Clínico       :8082
    |
    +-- Agenda        :8083
    |
MongoDB Atlas
```

## 📚 Documentación de APIs

Los microservicios cuentan con documentación interactiva mediante Swagger y OpenAPI.

La API utiliza el prefijo `/api/v1` para organizar y versionar sus operaciones.

| Servicio | Swagger UI mediante el proxy |
|---|---|
| Autenticación | `/autenticacion/swagger-ui/index.html` |
| Clínico | `/clinico/swagger-ui/index.html` |
| Agenda | `/agenda/swagger-ui/index.html` |

El código actual contempla 85 operaciones HTTP (13 en Autenticación, 46 en Clínico y 26 en Agenda), incluyendo las operaciones internas entre microservicios. Respecto de EP3 se agregaron `POST /api/v1/autenticacion/refrescar` y `GET /api/v1/citas/recordatorios`.

Los endpoints protegidos requieren un token JWT válido y los permisos correspondientes.

### Códigos de respuesta HTTP

| Código | Significado |
|---|---|
| 200 | Solicitud realizada correctamente. |
| 201 | Recurso creado correctamente. |
| 204 | Operación exitosa sin contenido de respuesta. |
| 400 | Solicitud inválida. |
| 401 | Usuario no autenticado o token inválido. |
| 403 | Permisos insuficientes. |
| 404 | Recurso no encontrado. |
| 409 | Conflicto de datos o reglas de negocio. |
| 500 | Error interno del servidor. |
| 503 | Servicio no disponible. |

## 📁 Organización del proyecto

El repositorio está organizado en las siguientes carpetas:

- `frontend/`: aplicación web desarrollada en React.
- `backend/`: microservicios Spring Boot y componentes compartidos.
- `mongodb/`: scripts para colecciones, validaciones, índices y datos ficticios.
- `despliegue/`: configuración versionada para desplegar en AWS, Docker Compose, Caddy y plantillas `.env.example`.
- `scripts/`: herramientas auxiliares para la preparación de datos y operaciones del proyecto.

El archivo `docker-compose.yml` contiene la configuración para ejecutar los servicios mediante contenedores.

## 🚀 Ejecución local

### Requisitos

- Git.
- Node.js y npm.
- Java 21 y Maven, para ejecutar el backend fuera de contenedores.
- Docker y Docker Compose, para utilizar el entorno con contenedores.

### 1. Clonar el repositorio

```bash
git clone https://github.com/JstChiguin/NutriVida.git
cd NutriVida
```

También es posible descargar el código fuente desde GitHub mediante la opción **Code → Download ZIP** y descomprimirlo en una carpeta local.

### 2. Configurar el entorno

Revisar los archivos `.env.example` disponibles en el proyecto y crear los archivos de configuración local que correspondan.

No incluir credenciales, contraseñas ni claves privadas en GitHub.

### 3. Iniciar los servicios

Con Docker instalado y la configuración local preparada:

```bash
docker compose up --build -d
```

`NUTRIVIDA_CONTRASENA_DEMO` define la contraseña común de las cuentas ficticias. Si `NUTRIVIDA_ADMIN_CONTRASENA` queda vacía, el administrador inicial utiliza esa misma contraseña.

Ambas se configuran solo en el archivo `.env` local, que no se versiona.

El archivo `.env.example` no trae valores para contraseñas ni para `NUTRIVIDA_JWT_SECRETO`. Estos valores deben definirse localmente. El secreto JWT requiere al menos 32 caracteres aleatorios y no debe publicarse.

Para cargar los datos ficticios en una base nueva:

```bash
node --env-file=.env scripts/sembrar-datos-demo.mjs
```

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

## ☁️ Despliegue en AWS

La configuración para desplegar NutriVida en AWS se encuentra en `despliegue/aws/`, con un archivo `.env.example` por cada instancia que lista las variables de entorno necesarias.

El despliegue de laboratorio utiliza dos instancias EC2.

### Instancia FRONT

- Ejecuta Caddy para gestionar las conexiones HTTPS.
- Ejecuta Nginx para servir la aplicación React.
- Nginx escucha localmente en `127.0.0.1`.
- Recibe las solicitudes de los usuarios.
- Reenvía las solicitudes hacia los microservicios del backend.
- Gestiona el dominio dinámico sslip.io.

### Instancia BACK

- Ejecuta los tres microservicios Spring Boot.
- Se conecta a MongoDB Atlas.
- Se comunica con FRONT mediante su dirección IP privada dentro de la VPC.
- Su acceso está controlado mediante Security Groups.

La instancia BACK dispone de una dirección IPv4 pública en el entorno de laboratorio. Por lo tanto, no corresponde describirla como una instancia ubicada en una subred privada.

Nginx reenvía `/autenticacion/`, `/clinico/` y `/agenda/` a cada servicio y bloquea las rutas internas. El frontend consume la API versionada mediante `/api/v1`.

Las imágenes Docker se publican con una etiqueta basada en el commit, por ejemplo `chiguin/nutrivida:frontend-899e328`, y se reemplazan servicio por servicio conservando el contenedor anterior para poder revertir una actualización.

En el Compose del backend, la imagen de Autenticación admite una etiqueta propia (`ETIQUETA_AUTENTICACION`) que, si no se define, utiliza `ETIQUETA_IMAGENES`.

Esto permite actualizar Autenticación sin cambiar los servicios Clínico y Agenda.

El procedimiento está disponible en:

`despliegue/aws/backend/ACTUALIZACION-AUTENTICACION.md`

### Recuperación automática del dominio

La recuperación automática del dominio tras reiniciar AWS Academy cubre la instancia FRONT, Caddy y el dominio sslip.io mediante systemd.

La documentación correspondiente está disponible en:

`despliegue/aws/frontend/automatizacion/README.md`

El backend no se sincroniza automáticamente con ese dominio. La comunicación funciona mediante el mismo origen publicado por el frontend.

El entorno de AWS es de laboratorio y no permanece encendido de forma permanente. La dirección pública puede cambiar al reiniciar el laboratorio, por lo que no constituye una URL permanente.

Las credenciales, los archivos `.env` reales y las claves privadas no se publican en el repositorio.

## 🧪 Pruebas y validación

El frontend dispone de pruebas automatizadas mediante Vitest y React Testing Library.

El backend incorpora pruebas mediante JUnit y MockMvc para verificar controladores, servicios, seguridad, reglas de negocio y persistencia.

### Resultados de las verificaciones de la versión EFT

Resultados obtenidos el 28 de noviembre de 2026 en la rama `feature/eft-nutrivida`:

| Verificación | Resultado |
|---|---|
| Pruebas frontend (Vitest) | 305 aprobadas en 22 archivos. |
| Cobertura frontend (v8) | Sentencias 91,55 %, ramas 85,15 %, funciones 89,71 %, líneas 92,28 %. `src/servicios`: líneas 98,48 %. |
| Pruebas backend (JUnit, MongoDB 7 aislado en Docker) | 169 métodos `@Test`, 169 ejecutadas, 0 fallos, 0 omitidas. |
| Cobertura backend (JaCoCo, líneas) | Autenticación 86,0 %, Clínico 92,8 %, Agenda 91,5 %, Común 20,5 %. |
| ESLint | Sin errores. |

Métodos de prueba del backend por módulo: Común 11, Autenticación 51, Clínico 55 y Agenda 52.

Verificación de integración sobre el stack Docker (`scripts/verificar-integracion-local.ps1`, vía Nginx): 28 comprobaciones HTTP aprobadas, y recorrido en Chrome (F5, renovación automática, pago rechazado y aprobado con comprobante, URLs restringidas, logout, video) con 17 comprobaciones aprobadas. Medición responsive en Chrome de 22 rutas a 360, 768, 1024 y 1280 px sin desbordes, errores de consola, campos sin etiqueta ni imágenes sin `alt`.

La cobertura del módulo Común es baja porque sus clases se ejercitan sobre todo desde las pruebas de integración de los otros módulos, que JaCoCo contabiliza en cada uno de ellos.

Sin una base MongoDB accesible, las pruebas de integración se omiten y Maven informa igualmente `BUILD SUCCESS`. Por eso la verificación de entrega debe hacerse con el script descrito más abajo, que falla si hay pruebas omitidas.

### Ejecutar las verificaciones del frontend

```bash
cd frontend
npm install
npm run test
npm run test:cobertura
npm run build
npm run lint
```

### Integración local con Docker

```powershell
$env:NUTRIVIDA_JWT_SECRETO = '<secreto de al menos 32 caracteres>'
$env:NUTRIVIDA_FORWARD_HEADERS = 'framework'
docker compose -p nutrivida-eft up -d --build
docker build -t nutrivida-front-eft frontend
docker run -d --name nutrivida-front-eft -p 127.0.0.1:8080:80 -e IP_BACKEND_PRIVADA=host.docker.internal --add-host=host.docker.internal:host-gateway nutrivida-front-eft
```

Con `NUTRIVIDA_ADMIN_CORREO`, `NUTRIVIDA_ADMIN_CONTRASENA` y `NUTRIVIDA_CONTRASENA_DEMO` definidos y `node scripts/sembrar-datos-demo.mjs`, `scripts/verificar-integracion-local.ps1` comprueba el sistema a través de Nginx. Use únicamente datos y secretos de prueba.

### Verificación completa del backend con MongoDB aislado (recomendada)

Con Docker instalado, desde PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verificar-backend.ps1
```

El script levanta un MongoDB 7 temporal en una red Docker propia, ejecuta `mvn verify` con Maven y Java 21 en contenedor, elimina el MongoDB temporal al terminar y falla si Maven termina con error, si se ejecutan menos pruebas que los métodos `@Test` declarados, si hay pruebas omitidas o fallidas. Imprime además la cobertura JaCoCo por módulo. No utiliza ninguna base de datos de uso habitual.

### Ejecutar las pruebas del backend

Para ejecutar las pruebas del backend se necesita Maven, Java 21 y un servidor MongoDB de pruebas distinto de cualquier base de datos de uso habitual.

Su dirección se indica mediante la variable `NUTRIVIDA_MONGO_SERVIDOR_PRUEBAS`.

```bash
cd backend
mvn test
```

Las pruebas deben ejecutarse exclusivamente con datos ficticios y en un entorno aislado.

## 📌 Estado del proyecto

La aplicación fue integrada en la rama principal `main` mediante Pull Requests, conservando el historial del trabajo colaborativo.

La rama `main` contiene la versión integrada del proyecto académico.

### Funcionalidades incorporadas

- Interfaz pública de la clínica.
- Navegación mediante React Router.
- Registro y autenticación de usuarios.
- Control de acceso según roles.
- Gestión de pacientes y nutricionistas.
- Gestión de citas y disponibilidad.
- Intervalos de agenda de 15 minutos.
- Fichas clínicas y seguimiento nutricional.
- Planes alimentarios versionados.
- Administración de usuarios y servicios.
- Pagos simulados.
- Reportes y auditoría.
- Mapa interactivo de ubicación referencial.
- API REST versionada en los tres microservicios.
- Manejo de la expiración de sesión y de las respuestas 401 y 403 en el frontend.
- Formulario de contacto integrado con el backend y persistencia en MongoDB.
- Manejo del RUT duplicado mediante HTTP 409.
- Despliegue en AWS con Docker, Caddy y Nginx, verificado previamente en el entorno de laboratorio.
- Recuperación automática del dominio público mediante systemd.

### Verificaciones y mejoras pendientes

- Verificar nuevamente el despliegue en AWS cada vez que se encienda el entorno de laboratorio.
- Ejecutar las pruebas y la compilación sobre la versión definitiva de entrega.
- Completar las pruebas funcionales de extremo a extremo para todos los roles.
- Verificar las respuestas 401 y 403 del endpoint de perfil del nutricionista.
- Completar las evidencias de diseño responsive.
- Revisar las vulnerabilidades moderadas informadas históricamente en las dependencias de desarrollo.
- Optimizar el tamaño de los archivos generados durante la compilación.
- Implementar recordatorios automáticos de citas.
- Completar la validación de seguridad antes de considerar un uso productivo.

El despliegue del frontend en GitHub Pages no implica automáticamente que los servicios backend y MongoDB estén disponibles públicamente.

## 📄 Documentación académica

La documentación complementaria del proyecto contempla:

- Especificación de Requisitos de Software (ERS).
- Anexo 2: Documentación de APIs e Integración.
- Anexo 3: Catálogo de endpoints de la API.
- Anexo 4: Manual de usuario.

Estos documentos describen los requisitos, la arquitectura, las funcionalidades, la integración, las pruebas, las evidencias y las limitaciones del sistema.

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
