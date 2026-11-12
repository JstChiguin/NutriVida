# Endpoints REST de NutriVida

Tabla generada a partir de los controladores reales (`@RequestMapping`, `@PreAuthorize` y `@Operation`). Cada microservicio publica su documentación interactiva en `/swagger-ui.html` y el contrato OpenAPI en `/v3/api-docs`.

La columna **Acceso** indica los roles que el backend exige. Además del rol, los servicios verifican la relación entre el usuario y el recurso (por ejemplo, un paciente solo accede a sus propios datos y un nutricionista solo a pacientes autorizados).

## Servicio de autenticación (puerto 8081)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/autenticacion/registro` | Público | Registra un paciente nuevo. El registro público siempre asigna el rol PACIENTE |
| POST | `/api/autenticacion/iniciar-sesion` | Público | Valida las credenciales y entrega un token JWT |
| POST | `/api/autenticacion/cerrar-sesion` | Cualquier usuario autenticado | Revoca el token de la sesión actual |
| GET | `/api/autenticacion/yo` | Cualquier usuario autenticado | Devuelve los datos del usuario autenticado |
| GET | `/api/usuarios` | ADMINISTRADOR | Lista usuarios con filtros, paginación y orden (solo ADMINISTRADOR) |
| GET | `/api/usuarios/{usuarioId}` | ADMINISTRADOR | Consulta un usuario por identificador (solo ADMINISTRADOR) |
| POST | `/api/usuarios` | ADMINISTRADOR | Crea un usuario con cualquier rol permitido (solo ADMINISTRADOR) |
| PUT | `/api/usuarios/{usuarioId}` | ADMINISTRADOR | Actualiza nombre y correo de un usuario (solo ADMINISTRADOR) |
| PATCH | `/api/usuarios/{usuarioId}/estado` | ADMINISTRADOR | Activa o desactiva una cuenta (solo ADMINISTRADOR) |
| PATCH | `/api/usuarios/{usuarioId}/rol` | ADMINISTRADOR | Cambia el rol de un usuario (solo ADMINISTRADOR) |
| DELETE | `/api/usuarios/{usuarioId}` | ADMINISTRADOR | Desactiva la cuenta (eliminación lógica, conserva el historial) |
| PATCH | `/api/usuarios/yo/contrasena` | Cualquier usuario autenticado | Cambia la contraseña del usuario autenticado |

## Servicio clínico (puerto 8082)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/auditorias` | ADMINISTRADOR | Lista la bitácora con filtros y paginación (solo ADMINISTRADOR) |
| POST | `/api/pacientes/{pacienteId}/ficha-clinica` | NUTRICIONISTA | Abre la ficha clínica del paciente (nutricionista autorizado) |
| GET | `/api/pacientes/{pacienteId}/ficha-clinica` | NUTRICIONISTA, PACIENTE | Consulta la ficha: nutricionista autorizado o el propio paciente |
| PUT | `/api/pacientes/{pacienteId}/ficha-clinica` | NUTRICIONISTA | Corrige los datos base de la ficha conservando el estado anterior |
| POST | `/api/pacientes/{pacienteId}/ficha-clinica/evoluciones` | NUTRICIONISTA | Registra una evolución sin modificar las anteriores |
| POST | `/api/pacientes/{pacienteId}/ficha-clinica/evoluciones/{evolucionId}/correcciones` | NUTRICIONISTA | Corrige una evolución creando una nueva y marcando la original como corregida |
| PATCH | `/api/pacientes/{pacienteId}/ficha-clinica/estado` | NUTRICIONISTA | Abre o cierra la ficha (las fichas nunca se eliminan) |
| POST | `/api/pacientes/{pacienteId}/mediciones` | NUTRICIONISTA | Registra una medición y calcula el IMC (nutricionista autorizado) |
| GET | `/api/pacientes/{pacienteId}/mediciones` | NUTRICIONISTA, PACIENTE | Lista las mediciones con filtro por fechas y paginación |
| GET | `/api/pacientes/{pacienteId}/mediciones/evolucion` | NUTRICIONISTA, PACIENTE | Serie temporal de peso, IMC y cintura lista para graficar |
| PATCH | `/api/pacientes/{pacienteId}/mediciones/{medicionId}/anulacion` | NUTRICIONISTA | Anula una medición errónea conservando el registro y el motivo |
| GET | `/api/nutricionistas` | Público | Lista pública de nutricionistas con filtros por texto, especialidad o servicio |
| GET | `/api/nutricionistas/yo` | NUTRICIONISTA | Perfil del nutricionista autenticado |
| PUT | `/api/nutricionistas/yo` | NUTRICIONISTA | Actualiza el perfil profesional del nutricionista autenticado |
| GET | `/api/nutricionistas/{nutricionistaId}` | Público | Consulta pública de un nutricionista |
| POST | `/api/nutricionistas` | ADMINISTRADOR | Crea el perfil de un nutricionista para un usuario existente (solo ADMINISTRADOR) |
| PUT | `/api/nutricionistas/{nutricionistaId}` | ADMINISTRADOR | Actualiza un nutricionista (solo ADMINISTRADOR) |
| PATCH | `/api/nutricionistas/{nutricionistaId}/estado` | ADMINISTRADOR | Activa o desactiva un nutricionista (solo ADMINISTRADOR) |
| DELETE | `/api/nutricionistas/{nutricionistaId}` | ADMINISTRADOR | Desactiva al nutricionista (eliminación lógica que conserva el historial) |
| GET | `/api/pacientes/yo` | PACIENTE | Perfil del paciente autenticado |
| PUT | `/api/pacientes/yo` | PACIENTE | Actualiza los datos personales permitidos del paciente autenticado |
| GET | `/api/pacientes` | ADMINISTRADOR, NUTRICIONISTA | Busca pacientes. El nutricionista solo ve a sus pacientes autorizados |
| GET | `/api/pacientes/{pacienteId}` | ADMINISTRADOR, NUTRICIONISTA, PACIENTE | Consulta un paciente. Exige ser administrador, nutricionista autorizado o el propio paciente |
| PUT | `/api/pacientes/{pacienteId}` | ADMINISTRADOR | Actualiza los datos de un paciente (solo ADMINISTRADOR) |
| PATCH | `/api/pacientes/{pacienteId}/estado` | ADMINISTRADOR | Activa o desactiva un paciente (solo ADMINISTRADOR) |
| DELETE | `/api/pacientes/{pacienteId}` | ADMINISTRADOR | Desactiva al paciente (eliminación lógica que conserva el historial clínico) |
| PUT | `/api/pacientes/{pacienteId}/nutricionistas/{nutricionistaId}` | ADMINISTRADOR | Autoriza a un nutricionista a atender a un paciente (solo ADMINISTRADOR) |
| DELETE | `/api/pacientes/{pacienteId}/nutricionistas/{nutricionistaId}` | ADMINISTRADOR | Retira la autorización de un nutricionista sobre un paciente (solo ADMINISTRADOR) |
| POST | `/api/pacientes/{pacienteId}/planes-alimentarios` | NUTRICIONISTA | Crea el primer plan alimentario del paciente (nutricionista autorizado) |
| GET | `/api/pacientes/{pacienteId}/planes-alimentarios/vigente` | NUTRICIONISTA, PACIENTE | Consulta el plan vigente del paciente |
| GET | `/api/pacientes/{pacienteId}/planes-alimentarios` | NUTRICIONISTA, PACIENTE | Historial de versiones de planes del paciente |
| GET | `/api/planes-alimentarios/{planId}` | NUTRICIONISTA, PACIENTE | Consulta un plan por identificador |
| PUT | `/api/planes-alimentarios/{planId}` | NUTRICIONISTA | Crea una nueva versión del plan y marca la anterior como reemplazada |
| PATCH | `/api/planes-alimentarios/{planId}/finalizacion` | NUTRICIONISTA | Finaliza un plan vigente |
| GET | `/api/reportes/pacientes` | ADMINISTRADOR | Pacientes registrados, activos y registros por mes (solo ADMINISTRADOR) |
| GET | `/api/servicios` | Público | Lista pública de prestaciones con filtros y paginación |
| GET | `/api/servicios/{servicioId}` | Público | Consulta pública de una prestación |
| POST | `/api/servicios` | ADMINISTRADOR | Crea una prestación (solo ADMINISTRADOR) |
| PUT | `/api/servicios/{servicioId}` | ADMINISTRADOR | Actualiza una prestación (solo ADMINISTRADOR) |
| PATCH | `/api/servicios/{servicioId}/estado` | ADMINISTRADOR | Activa o desactiva una prestación (solo ADMINISTRADOR) |
| DELETE | `/api/servicios/{servicioId}` | ADMINISTRADOR | Desactiva la prestación (eliminación lógica porque las citas la referencian) |
| POST | `/api/solicitudes-contacto` | Público | Registra una solicitud de contacto. Un reenvío idéntico el mismo día no genera duplicados |
| GET | `/api/solicitudes-contacto` | ADMINISTRADOR | Lista solicitudes con filtros y paginación (solo ADMINISTRADOR) |
| PATCH | `/api/solicitudes-contacto/{solicitudId}/estado` | ADMINISTRADOR | Cambia el estado de gestión de una solicitud (solo ADMINISTRADOR) |

## Servicio de agenda (puerto 8083)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/agendas/{nutricionistaId}` | ADMINISTRADOR, NUTRICIONISTA | Consulta horarios y bloqueos (administrador o dueño de la agenda) |
| PUT | `/api/agendas/{nutricionistaId}/horarios` | ADMINISTRADOR, NUTRICIONISTA | Define los horarios semanales (administrador o dueño de la agenda) |
| POST | `/api/agendas/{nutricionistaId}/bloqueos` | ADMINISTRADOR, NUTRICIONISTA | Registra un bloqueo o ausencia; falla si afecta citas activas |
| DELETE | `/api/agendas/{nutricionistaId}/bloqueos/{bloqueoId}` | ADMINISTRADOR, NUTRICIONISTA | Elimina un bloqueo o ausencia |
| GET | `/api/agendas/{nutricionistaId}/disponibilidad` | Cualquier usuario autenticado | Horarios libres para un servicio, por día o semana (requiere sesión) |
| POST | `/api/citas` | PACIENTE, ADMINISTRADOR | Solicita una cita. El backend valida disponibilidad, bloqueos, duplicados y fechas pasadas |
| GET | `/api/citas` | PACIENTE, NUTRICIONISTA, ADMINISTRADOR | Lista citas con filtros. Cada rol solo ve las citas que le corresponden |
| GET | `/api/citas/{citaId}` | PACIENTE, NUTRICIONISTA, ADMINISTRADOR | Consulta una cita con su historial de estados |
| PATCH | `/api/citas/{citaId}/confirmacion` | NUTRICIONISTA, ADMINISTRADOR | Confirma una cita solicitada y autoriza al profesional sobre el paciente |
| PATCH | `/api/citas/{citaId}/rechazo` | NUTRICIONISTA, ADMINISTRADOR | Rechaza una cita solicitada y libera el horario |
| PATCH | `/api/citas/{citaId}/cancelacion` | PACIENTE, NUTRICIONISTA, ADMINISTRADOR | Cancela una cita activa. El paciente debe respetar la anticipación mínima |
| PATCH | `/api/citas/{citaId}/reprogramacion` | PACIENTE, NUTRICIONISTA, ADMINISTRADOR | Reprograma una cita activa validando el nuevo horario |
| PATCH | `/api/citas/{citaId}/atencion-realizada` | NUTRICIONISTA, ADMINISTRADOR | Registra la atención realizada de una cita confirmada ya iniciada |
| PATCH | `/api/citas/{citaId}/inasistencia` | NUTRICIONISTA, ADMINISTRADOR | Registra la inasistencia del paciente a una cita confirmada ya iniciada |
| POST | `/api/citas/{citaId}/pagos` | PACIENTE, ADMINISTRADOR | Realiza un pago SIMULADO de la cita y emite un comprobante ficticio |
| GET | `/api/citas/{citaId}/pagos` | PACIENTE, ADMINISTRADOR | Lista los pagos simulados de una cita |
| GET | `/api/pagos` | ADMINISTRADOR | Lista pagos simulados con filtros (solo ADMINISTRADOR) |
| GET | `/api/pagos/{pagoId}` | PACIENTE, ADMINISTRADOR | Consulta un pago y su comprobante ficticio (dueño o administrador) |
| PATCH | `/api/pagos/{pagoId}/anulacion` | ADMINISTRADOR | Anula un pago simulado aprobado (solo ADMINISTRADOR) |
| GET | `/api/reportes/citas-por-estado` | ADMINISTRADOR | Cantidad de citas por estado, filtrable por fechas y profesional |
| GET | `/api/reportes/atenciones-por-nutricionista` | ADMINISTRADOR | Total, realizadas, inasistencias y canceladas por nutricionista |
| GET | `/api/reportes/servicios-mas-solicitados` | ADMINISTRADOR | Ranking de servicios más solicitados |
| GET | `/api/reportes/actividad-agenda` | ADMINISTRADOR | Cantidad de citas por día para graficar la actividad de la agenda |
| GET | `/api/reportes/eventos-de-citas` | ADMINISTRADOR | Conteo de eventos del historial de citas (usa $unwind): solicitudes, cancelaciones, reprogramaciones |
| GET | `/api/reportes/pacientes-atendidos` | ADMINISTRADOR | Pacientes distintos atendidos y atenciones realizadas en el período |

## Comunicación entre servicios

Los endpoints bajo `/api/internos/**` del servicio clínico no se documentan en Swagger y solo aceptan un token con rol `SERVICIO_INTERNO`, firmado con el mismo secreto y con vigencia de un minuto. Los usa el servicio de autenticación para crear el perfil clínico de un paciente recién registrado y el servicio de agenda para autorizar a un nutricionista sobre un paciente cuando confirma una cita.

## Formato de errores

Todos los errores devuelven el mismo JSON: `fecha`, `estado`, `codigo`, `mensaje`, `ruta` y `detalles` (lista de campos inválidos en errores de validación). Códigos usados: `VALIDACION_FALLIDA`, `SOLICITUD_INVALIDA`, `NO_AUTENTICADO`, `CREDENCIALES_INVALIDAS`, `PERMISO_DENEGADO`, `RECURSO_NO_ENCONTRADO`, `CONFLICTO_DE_NEGOCIO`, `CONFLICTO_DE_DATOS`, `SERVICIO_NO_DISPONIBLE` y `ERROR_INTERNO`.
