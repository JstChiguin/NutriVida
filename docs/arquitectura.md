# Arquitectura de NutriVida

## 1. Visión general

```text
 React (5173)
    │  HTTP + JSON + JWT en la cabecera Authorization
    ├──────────────► servicio-autenticacion (8081) ── colecciones: usuarios, tokens_revocados
    ├──────────────► servicio-clinico       (8082) ── pacientes, nutricionistas, servicios, fichas_clinicas,
    │                                                  mediciones, planes_alimentarios, solicitudes_contacto
    └──────────────► servicio-agenda        (8083) ── agendas, citas, ocupaciones_agenda, pagos
                              │
 Los tres servicios escriben (solo agregan) en la colección compartida `auditorias`
 y todos usan la misma base MongoDB `nutrivida`.

 autenticación ──► clínico   crea el perfil del paciente al registrarse (token interno)
 agenda        ──► clínico   consulta servicios, nutricionistas y pacientes; autoriza al profesional al confirmar
```

Dependencias entre servicios (sin ciclos): `autenticación → clínico` y `agenda → clínico`. El servicio clínico no llama a ningún otro.

### Por qué esta división
- **Autenticación**: identidad, credenciales y roles. Es el único que conoce contraseñas y revocaciones de token.
- **Clínico**: personas y contenido clínico (pacientes, profesionales, catálogo, ficha, mediciones, planes, contacto).
- **Agenda**: tiempo y dinero simulado (horarios, citas, pagos) y los reportes sobre citas.

Ningún servicio lee colecciones de otro. Cuando necesita un dato ajeno lo pide por REST (`ClienteClinicoRest` en agenda; `ClienteServicioClinico` en autenticación).

### Módulo `comun`
Código compartido, sin lógica de negocio de dominio: `ServicioTokens` (generar y validar JWT), `FiltroAutenticacionJwt`, `ConfiguracionSeguridad` (cadena de filtros, CORS, rutas públicas por configuración), `ManejadorErroresGlobal` (JSON de error uniforme), `ConstructorConsulta` y `PaginaRespuesta` (filtros y paginación), `ServicioAuditoria`, `AplicadorEsquemasMongo` y el validador de RUT.

## 2. Modelo documental en MongoDB

Se evitó copiar un modelo relacional. Criterio aplicado: **se embebe lo que nace, vive y se consulta junto con su documento; se referencia lo que tiene ciclo de vida propio o crece sin límite.**

| Colección | Qué guarda | Embebido | Referencias (`ObjectId`) |
|---|---|---|---|
| `usuarios` | cuenta, hash BCrypt, rol, estado | — | — |
| `tokens_revocados` | tokens cerrados (índice TTL) | — | usuario |
| `pacientes` | perfil y contacto ficticios | lista de nutricionistas autorizados | `usuarioId` |
| `nutricionistas` | perfil profesional | especialidades | `usuarioId`, `serviciosIds[]` |
| `servicios` | prestación, duración, precio | — | — |
| `fichas_clinicas` | antecedentes, hábitos, objetivos | evoluciones, correcciones | `pacienteId`, profesional |
| `mediciones` | peso, estatura, IMC, cintura | otras mediciones | `pacienteId`, profesional |
| `planes_alimentarios` | versión del plan | comidas y alimentos | `pacienteId`, plan anterior |
| `solicitudes_contacto` | formulario público | — | — |
| `agendas` | jornada semanal y bloqueos | horarios, bloqueos | id = id del nutricionista |
| `citas` | cita y su historial | historial de eventos | paciente, profesional, servicio |
| `ocupaciones_agenda` | un documento por bloque de 15 min reservado | — | profesional, cita |
| `pagos` | pago simulado y comprobante ficticio | comprobante | cita, paciente |
| `auditorias` | quién hizo qué y cuándo | detalle | entidad |

Decisiones de modelado:
- **Mediciones fuera de la ficha**: crecen con cada control; embebidas harían crecer el documento sin límite.
- **Evoluciones dentro de la ficha**: se leen siempre junto con ella y solo se agregan (`$push`), nunca se sobrescriben.
- **Planes versionados**: cada versión es un documento. Un índice único **parcial** (`pacienteId` donde `estado = VIGENTE`) garantiza un solo plan vigente por paciente aunque dos peticiones compitan.
- **Citas con datos duplicados a propósito** (`nombrePaciente`, `nombreServicio`, `precioReferencial`): son una fotografía del momento de la reserva; el historial no cambia si luego se edita el servicio.
- **Referencias reales**: se guardan como `ObjectId` (no como texto) para que `$lookup` funcione en Compass y mongosh.
- **Fechas sin hora** (nacimiento, vigencia del plan) se guardan como texto ISO `AAAA-MM-DD` para evitar desfases de zona horaria.

### Validación e índices
- Cada colección tiene un validador `$jsonSchema` (`backend/comun/src/main/resources/esquemas/*.json`) aplicado al iniciar cada servicio y reutilizado por `mongodb/01_…js`: una sola fuente de verdad.
- Índices únicos: correo de usuario, RUT de paciente, usuario de paciente/nutricionista, nombre de servicio, ficha por paciente, huella de solicitud de contacto.
- Índices compuestos: `(nutricionistaId, inicio)`, `(pacienteId, inicio)` y `(estado, inicio)` en citas; `(pacienteId, fecha)` en mediciones.
- Índice TTL en `tokens_revocados.expiraEn`: Mongo borra solo los tokens revocados ya vencidos.

## 3. Seguridad

1. **Autenticación**: `POST /api/autenticacion/iniciar-sesion` valida el hash BCrypt y entrega un JWT HS256 con `sub` (id de usuario), `correo`, `rol`, `jti`, emisor y expiración. El secreto viene de `NUTRIVIDA_JWT_SECRETO` (mínimo 32 caracteres, sin valor por defecto).
2. **Cierre de sesión**: el `jti` se guarda en `tokens_revocados` (índice TTL). Los tres servicios consultan esa colección en `FiltroAutenticacionJwt` mediante `VerificadorRevocacionMongo` (módulo `comun`), por lo que un token cerrado recibe 401 en autenticación, clínico y agenda. Hay pruebas automatizadas de token vigente, revocado y expirado en los tres servicios. Costo: una consulta por `_id` a MongoDB en cada petición autenticada.
3. **Roles (RBAC)**: `ADMINISTRADOR`, `NUTRICIONISTA`, `PACIENTE` más `SERVICIO_INTERNO`, que solo existe en tokens de un minuto firmados por los propios servicios y no puede asignarse a un usuario. Se aplica con `@PreAuthorize` en cada endpoint.
4. **Propiedad del recurso (acceso horizontal)**: el rol no basta. `ControlAcceso` (clínico) y `cargarConAcceso` (agenda) comparan el usuario con el dueño del dato:
   - un paciente solo ve su ficha, mediciones, plan, citas y pagos;
   - un nutricionista solo ve pacientes que lo tienen en `nutricionistasAutorizados`, lista que se completa cuando **confirma una cita** con ese paciente (llamada interna) o cuando el administrador lo asigna;
   - el administrador gestiona cuentas, catálogo y reportes, pero **no lee contenido clínico**.
5. **Registro público** siempre crea `PACIENTE`; un rol enviado en el cuerpo se ignora (hay prueba automatizada).
6. **Otros controles**: validación de entrada con Bean Validation, CORS restringido a los orígenes configurados, sesión sin estado, errores sin detalles internos, logs sin tokens ni contraseñas y auditoría de operaciones sensibles.
7. **Pagos**: solo simulación; no hay pasarela ni datos de tarjeta. Todo comprobante lleva la glosa “COMPROBANTE FICTICIO - PAGO SIMULADO SIN VALOR TRIBUTARIO”.

## 4. Agenda y concurrencia

La disponibilidad se calcula en el backend: jornada semanal del profesional, bloqueos y ausencias, duración del servicio, hora actual y bloques ya ocupados. React solo muestra lo que el backend responde.

**Reserva sin transacciones**: cada cita ocupa documentos en `ocupaciones_agenda` cuyo `_id` es `profesional|instante` por cada bloque de 15 minutos. Reservar es insertar esos documentos; si otra petición ya tomó alguno, MongoDB responde con clave duplicada y el servicio revierte los bloques que alcanzó a insertar y responde 409. Es atómico por documento, funciona en un MongoDB de un solo nodo y evita traslapes aunque las citas tengan distinta duración. Hay una prueba con dos hilos compitiendo por el mismo horario (resultado 201 y 409).

**Máquina de estados** (`Cita.EstadoCita.puedeCambiarA`): `SOLICITADA → CONFIRMADA | RECHAZADA | CANCELADA`; `CONFIRMADA → CANCELADA | REALIZADA | INASISTENCIA`. Todo cambio agrega un evento al historial embebido. La reprogramación mueve los bloques (reserva los nuevos, libera los antiguos) y, si la pide el paciente sobre una cita confirmada, vuelve a `SOLICITADA` para que el profesional la confirme otra vez.

Control de concurrencia adicional: los documentos tienen `@Version` (bloqueo optimista) y un conflicto responde 409.

## 5. Frontend

- **React Router**: rutas públicas y privadas; `RutaProtegida` redirige sin sesión y bloquea por rol. Es solo comodidad de interfaz: el backend vuelve a validar todo.
- **Estado**: sesión en `ProveedorAutenticacion` (token y usuario en `sessionStorage`), consultas con `useConsulta` (datos, carga, error, recarga) y formularios controlados con `useState`.
- **Almacenamiento del token (evaluado)**: se mantiene `sessionStorage`. La alternativa más segura frente a XSS es una cookie `HttpOnly`, pero exigiría que los tres servicios (puertos distintos) emitan y reciban cookies entre orígenes (`SameSite=None; Secure`, CORS con credenciales) y añadir protección CSRF, además de un cambio de arquitectura que no está autorizado en esta etapa. Mitigaciones vigentes: el token vive solo en la pestaña (se pierde al cerrarla), expira a los 60 minutos, puede revocarse en los tres servicios, React escapa el contenido por defecto, no hay `dangerouslySetInnerHTML` y no se escribe en logs. Mejora futura recomendada: cookie `HttpOnly` detrás de un único origen (proxy inverso) con CSRF por doble envío.
- **Acceso a datos**: `servicios/clienteApi.js` agrega el token, normaliza errores y cierra la sesión local ante un 401. Una función por endpoint en `autenticacionApi`, `clinicoApi` y `agendaApi`.
- **Estilos**: Tailwind CSS con la paleta original de NutriVida definida en `src/index.css`.
- **Contenido de respaldo**: Servicios y Nutricionistas conservan el contenido original del equipo y lo muestran, con un aviso, solo si no hay conexión con el servidor.

## 6. Decisiones y límites

| Decisión | Motivo |
|---|---|
| Una base MongoDB compartida, colecciones por servicio | Reutilizable en el Taller de Bases de Datos y simple de operar; la propiedad se respeta por convención y revisión, no por permisos de base de datos |
| Reserva con bloques únicos en vez de transacciones | Las transacciones exigen un conjunto de réplicas; la solución elegida funciona en un nodo |
| Auditoría compartida (`auditorias`) escrita por los tres servicios | Una sola bitácora consultable; es la única colección con escritura compartida y es solo de agregado |
| Creación de usuario y perfil en dos pasos para nutricionistas | El administrador crea la cuenta (autenticación) y luego el perfil (clínico); no hay verificación cruzada de que el usuario exista |
| Registro de paciente con compensación manual | Si falla la creación del perfil clínico se elimina el usuario recién creado; no es una transacción distribuida |

Pendientes y limitaciones se detallan en `docs/informe-sesion.md`.
