# Guía para entender y defender NutriVida

Cada concepto se explica con un archivo real del proyecto. Para seguir un caso completo, el recorrido sugerido es **“un paciente solicita una cita”**: pantalla React → API → controlador → servicio → repositorio → MongoDB.

## 1. Qué hace cada microservicio

| Microservicio | Responsabilidad | Carpeta |
|---|---|---|
| Autenticación | Registrar pacientes, iniciar y cerrar sesión, administrar cuentas y roles | `backend/servicio-autenticacion` |
| Clínico | Pacientes, nutricionistas, catálogo de servicios, ficha clínica, mediciones, planes alimentarios, formulario de contacto, auditoría | `backend/servicio-clinico` |
| Agenda | Horarios, disponibilidad, citas, pagos simulados y reportes de citas | `backend/servicio-agenda` |

Un **microservicio** es una aplicación pequeña e independiente con una responsabilidad de negocio, su propia configuración y su propio puerto. Se comunican por HTTP. Aquí cada uno puede arrancarse y probarse por separado.

## 2. MongoDB

- **Documento**: un objeto JSON. Una cita (`Cita.java`) es un documento con campos como `estado`, `inicio` y `pacienteId`.
- **Colección**: grupo de documentos parecidos: `citas`, `pacientes`, `servicios`.
- **Documento embebido**: va dentro de otro. `Cita.historialEstados` contiene un documento por cada cambio de estado; se guarda junto con la cita porque siempre se lee con ella.
- **Referencia**: guarda el `_id` de otro documento. `Cita.pacienteId` apunta a un paciente. Se usa referencia cuando el dato tiene vida propia (un paciente existe aunque cambie la cita).
- **`$lookup`**: une colecciones en una consulta (como un `JOIN`). **`$unwind`**: convierte un arreglo en una fila por elemento. Ejemplos y resultados en `docs/taller-bases-de-datos.md`.

## 3. CRUD y API REST

**CRUD** son las cuatro operaciones básicas: *Create, Read, Update, Delete*. En una **API REST** se asocian a métodos HTTP sobre una URL que representa un recurso:

| Operación | Método | Ejemplo real |
|---|---|---|
| Crear | `POST` | `POST /api/citas` solicita una cita |
| Leer | `GET` | `GET /api/citas?estado=CONFIRMADA&pagina=0` lista con filtros y paginación |
| Actualizar | `PUT` / `PATCH` | `PATCH /api/citas/{id}/reprogramacion` cambia la fecha |
| Eliminar | `DELETE` | `DELETE /api/servicios/{id}` **desactiva** el servicio (porque las citas lo referencian) |

Los datos viajan como **JSON**. Los códigos HTTP comunican el resultado: 200 correcto, 201 creado, 400 datos inválidos, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto (por ejemplo, horario ya tomado).

## 4. Controlador, servicio, repositorio y DTO

Ejemplo: solicitar una cita.

1. **DTO de entrada** `dto/SolicitudCita.java`: define qué datos acepta la API y con qué reglas (`@NotBlank`, `@NotNull`). Un **DTO** (Data Transfer Object) separa lo que viaja por la red de lo que se guarda: el cliente no puede enviar el estado, el historial ni el precio.
2. **Controlador** `controlador/ControladorCitas.java`: recibe la petición HTTP, exige el rol (`@PreAuthorize("hasAnyRole('PACIENTE','ADMINISTRADOR')")`) y delega. No contiene reglas de negocio.
   ```java
   @PostMapping
   public ResponseEntity<CitaRespuesta> solicitarCita(@Valid @RequestBody SolicitudCita solicitud) {
       return ResponseEntity.status(HttpStatus.CREATED).body(servicioCitas.solicitarCita(UsuarioActual.obtener(), solicitud));
   }
   ```
3. **Servicio** `servicio/ServicioCitas.java`: aquí viven las reglas: el servicio debe estar activo, el profesional debe ofrecerlo, el horario debe estar libre, no debe haber traslape con otra cita del paciente, la fecha no puede ser pasada.
4. **Repositorio** `repositorio/RepositorioCitas.java`: acceso a MongoDB. Spring Data genera la consulta desde el nombre del método, p. ej. `findByPacienteIdAndEstadoInAndInicioLessThanAndFinGreaterThan`.
5. **DTO de salida** `dto/CitaRespuesta.java`: la respuesta que ve el cliente, sin campos internos como `version`.

## 5. Autenticación, autorización, JWT y roles

- **Autenticación**: comprobar *quién eres*. `ServicioAutenticacion.iniciarSesion` compara la contraseña con el hash BCrypt guardado (`usuarios.hashContrasena`); nunca se guarda ni se devuelve la contraseña.
- **JWT** (JSON Web Token): una cadena firmada que el servidor entrega al iniciar sesión y que el cliente envía en cada petición (`Authorization: Bearer …`). Contiene el id, el correo, el rol y la expiración. `ServicioTokens` la firma y la valida con el secreto `NUTRIVIDA_JWT_SECRETO`; si alguien altera el contenido, la firma deja de coincidir.
- **Filtro de seguridad** `FiltroAutenticacionJwt`: en cada petición lee el token, lo valida y deja al usuario “conectado” para esa petición.
- **Autorización**: decidir *qué puedes hacer*. Se hace en dos niveles:
  1. Por **rol** (RBAC) con `@PreAuthorize`: `ADMINISTRADOR`, `NUTRICIONISTA`, `PACIENTE`.
  2. Por **propiedad del recurso**: `ControlAcceso` y `ServicioCitas.cargarConAcceso` verifican que la ficha, cita o plan pertenezca a esa persona (o que el nutricionista esté autorizado). Por eso un nutricionista con rol válido igual recibe 403 sobre un paciente ajeno.
- **Cerrar sesión**: el identificador del token (`jti`) se guarda en `tokens_revocados`; los tres servicios consultan esa lista en cada petición y lo rechazan con 401 desde ese momento.

## 6. Cómo React consume el backend

- `frontend/src/servicios/clienteApi.js` es el único lugar que llama a `fetch`: agrega el token, convierte errores en un objeto `ErrorApi` y, si recibe 401, cierra la sesión local.
- `agendaApi.js`, `clinicoApi.js` y `autenticacionApi.js` tienen una función por endpoint, por ejemplo `agendaApi.solicitarCita(datos)`.
- React **nunca** habla con MongoDB: todo pasa por la API REST y sus permisos.

## 7. Conceptos de React con ejemplos del proyecto

- **Renderizar**: React convierte los componentes (funciones que devuelven JSX) en elementos de pantalla y los vuelve a dibujar cuando cambian los datos.
- **Props**: datos que un componente recibe de su padre. `<Insignia tipo={cita.estado}>…</Insignia>` pasa el estado para elegir el color.
- **Estado (`useState`)**: datos que cambian y provocan un nuevo dibujo. En `Contacto.jsx`, `valores` guarda lo escrito y `errores` guarda los mensajes de validación.
- **Efectos (`useEffect`)**: acciones que ocurren al mostrarse el componente o cuando cambian ciertos datos, como pedir datos al servidor. `hooks/useConsulta.js` lo encapsula y devuelve `datos`, `cargando`, `error` y `recargar`.
- **Hook propio**: función cuyo nombre empieza con `use` y reutiliza lógica con estado. `useConsulta`, `useAutenticacion` y `usePacienteActual` lo son.
- **Contexto**: forma de compartir datos sin pasarlos por todos los componentes. `ProveedorAutenticacion` comparte el usuario y las acciones de sesión con toda la aplicación.
- **Renderizado condicional**: `EstadoConsulta.jsx` muestra “Cargando…”, el error con botón *Reintentar*, un mensaje vacío o el contenido, según el estado.
- **Formularios controlados**: el valor del campo vive en el estado (`value={valores.nombre}` y `onChange`). Las validaciones están en `utils/validadores.js`.

## 8. React Router

`App.jsx` declara qué componente se muestra en cada dirección:

```jsx
<Route element={<RutaProtegida roles={['PACIENTE']} />}>
  <Route path="mis-citas" element={<MisCitas />} />
</Route>
```

`RutaProtegida.jsx` revisa la sesión: sin sesión redirige a `/iniciar-sesion` (recordando a dónde quería ir) y con un rol no autorizado redirige a `/sin-permiso`. `Encabezado.jsx` usa `NavLink` para marcar la sección activa y mostrar solo los enlaces del rol. Esta protección mejora la experiencia, pero **no es seguridad**: aunque alguien llegue a la pantalla, el backend vuelve a validar cada petición.

## 9. Preguntas típicas y dónde está la respuesta

| Pregunta | Respuesta breve y archivo |
|---|---|
| ¿Cómo evitan que dos pacientes reserven la misma hora? | Cada bloque de 15 minutos es un documento con `_id` único; si el segundo `insert` falla por clave duplicada, se responde 409. `ReservaDeBloques.java`, prueba `CitasIntegracionPruebas.protegeContraReservasSimultaneasDelMismoHorario` |
| ¿Qué pasa si cancelan una cita? | La máquina de estados valida el cambio (`Cita.EstadoCita.puedeCambiarA`), se agrega un evento al historial, se libera el bloque y queda auditado |
| ¿Por qué no hay `DELETE` real de fichas? | Deben conservar historial; se cierran o se corrigen con registro de lo anterior (`ServicioFichasClinicas`) |
| ¿Cómo se corrige una evolución clínica? | Se crea una evolución nueva que referencia la original y la original se marca `corregida: true`; el texto original no se borra |
| ¿Cómo se calcula el IMC? | `CalculadoraIndiceMasaCorporal`: peso / estatura² (estatura en metros) con un decimal; la interfaz aclara que es referencial |
| ¿Por qué un administrador no ve fichas clínicas? | Principio de mínimo privilegio: gestiona cuentas, catálogo y reportes agregados, no contenido clínico (`ControlAcceso`) |
| ¿Dónde están las contraseñas? | Solo como hash BCrypt en `usuarios.hashContrasena`; el servicio no se inicia si no hay secreto JWT |
| ¿Cómo se prueba? | Backend: pruebas de integración con MockMvc y MongoDB real; frontend: Vitest con la API simulada. Comandos en el `README.md` |

## 10. Cómo se ejecutan las pruebas

- **Backend** (`backend/`): `mvn install`. Cada servicio tiene pruebas de integración que levantan la aplicación completa, hacen peticiones HTTP simuladas (MockMvc) y comprueban respuesta y contenido de MongoDB. Se omiten si no hay un MongoDB disponible (variable `NUTRIVIDA_MONGO_SERVIDOR_PRUEBAS`).
- **Frontend** (`frontend/`): `npm test`. Las pruebas renderizan componentes con React Testing Library, escriben y hacen clic como un usuario y reemplazan la API por funciones simuladas (`vi.mock`).
- Una prueba “de acceso denegado” es tan importante como una de éxito: por eso hay casos como *paciente intenta leer la ficha de otro paciente* → 403.
