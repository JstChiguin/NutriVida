# Taller de Bases de Datos — MongoDB en NutriVida

Los scripts están en `mongodb/` y usan los nombres reales de las colecciones. Se ejecutan sobre una base propia (`nutrivida_taller`) para no mezclar la demostración con los datos de la aplicación.

## Cómo ejecutarlos

Los cinco archivos empiezan con `use('nutrivida_taller')`, por lo que funcionan igual conectados a cualquier base y no dependen de variables de entorno ni de rutas de archivos. Con `mongosh` instalado, desde la raíz del repositorio:

```bash
mongosh "mongodb://127.0.0.1:27018"   mongodb/01_crear_colecciones_validadores_indices.js   mongodb/02_semillas_ficticias.js   mongodb/03_crud_basico.js   mongodb/04_consultas_lookup_unwind.js   mongodb/05_verificar_indices_y_validadores.js
```

Con Docker, sin instalar `mongosh` (el nombre del contenedor es `nutrivida-mongodb-1` con Docker Compose o `nutrivida-mongo` si se creó con `docker run`):

```bash
docker cp mongodb nutrivida-mongodb-1:/tmp/taller
docker exec nutrivida-mongodb-1 mongosh --quiet mongodb://127.0.0.1:27017 /tmp/taller/01_crear_colecciones_validadores_indices.js
```

En **MongoDB Compass**: conectarse, abrir `mongosh` (consola inferior) y pegar el contenido de cada archivo, o abrir `nutrivida_taller` y pegar cada `aggregate([...])` en la pestaña *Aggregations*. En **MongoDB Playground** (extensión de VS Code) se pueden abrir los archivos directamente porque no usan módulos de Node ni rutas; el Playground solo muestra el resultado de la última expresión, por lo que conviene ejecutar las consultas de `04` una por una. Esta compatibilidad se verificó con `mongosh` 2 sobre MongoDB 7; no se probó dentro de la extensión de VS Code ni de Compass. El script `03` modifica datos de práctica; para restaurar el estado inicial basta volver a ejecutar `02`.

El script `01` lleva incorporados los 13 validadores `$jsonSchema`. Se generan desde los mismos JSON que usa Spring (`backend/comun/src/main/resources/esquemas`) con `node scripts/generar-script-validadores.mjs`; `node scripts/generar-script-validadores.mjs --verificar` comprueba que no haya diferencias.

| Script | Qué hace |
|---|---|
| `01_crear_colecciones_validadores_indices.js` | Crea las 14 colecciones con validador `$jsonSchema` (incorporado en el script, generado desde los JSON de Spring) y todos los índices. Es repetible |
| `02_semillas_ficticias.js` | Inserta datos ficticios con identificadores fijos: 10 usuarios, 6 pacientes, 3 nutricionistas, 4 servicios, 14 citas, 7 mediciones, 3 planes, etc. |
| `03_crud_basico.js` | `insertOne`, `insertMany`, `find`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany` y rechazos por validador e índice único |
| `04_consultas_lookup_unwind.js` | Consultas de agregación del taller |
| `05_verificar_indices_y_validadores.js` | Lista índices y validadores y comprueba que no haya referencias huérfanas |

## Conceptos mínimos

- **Documento**: un objeto JSON (BSON) con campos y valores; una cita es un documento.
- **Colección**: conjunto de documentos del mismo tipo (`citas`, `pacientes`…).
- **Documento embebido**: objeto o arreglo dentro de otro documento. `citas.historialEstados` es un arreglo de documentos embebidos.
- **Referencia**: un campo que guarda el `_id` de otra colección. `citas.pacienteId` apunta a `pacientes._id`. MongoDB no la verifica sola; por eso existe el script `05` y la validación en la aplicación.

## Operadores de agregación usados y por qué

| Operador | Qué hace | Dónde se usa |
|---|---|---|
| `$match` | Deja pasar solo los documentos que cumplen una condición. Va primero para reducir el trabajo y poder usar índices | Todas las consultas |
| `$lookup` | “Une” con otra colección: busca en `from` los documentos cuyo `foreignField` coincide con `localField` y los deja en un arreglo `as` | Citas con paciente o profesional; mediciones con paciente; ficha y plan por paciente |
| `$unwind` | Convierte un arreglo en varios documentos, uno por elemento | Después de `$lookup` (para tener un objeto en vez de un arreglo de uno) y sobre `historialEstados`, `comidas` y `comidas.alimentos` |
| `$group` | Agrupa por una clave y calcula acumulados (`$sum`, `$first`, `$last`) | Citas por profesional, servicios más solicitados, mediciones por paciente |
| `$project` | Elige y renombra campos, y calcula nuevos (`$subtract`, `$round`, `$size`) | Salidas legibles |
| `$sort` | Ordena | Rankings y líneas de tiempo |
| `$limit` | Corta el resultado | “Los 3 más solicitados” |
| `$cond` | Expresión condicional dentro de `$sum` para contar según un criterio | Realizadas, inasistencias y canceladas por profesional |
| `$dateToString` | Convierte una fecha a texto con formato y zona horaria | Actividad de la agenda por día |

Regla práctica: **`$lookup` siempre devuelve un arreglo**; si se espera un único documento, se sigue con `$unwind`. Sin `$unwind`, el campo `paciente` sería `[ {…} ]` (comprobado: tipo `array`, tamaño 1).

## Consultas, resultado esperado y resultado obtenido

Datos de partida (semilla): 14 citas — 6 REALIZADA, 2 CONFIRMADA, 2 SOLICITADA, 2 CANCELADA, 1 INASISTENCIA, 1 RECHAZADA. Resultados obtenidos con MongoDB 7 sobre `nutrivida_taller`.

### 1. Citas con información del paciente
`$match` (estados activos) → `$lookup` a `pacientes` → `$unwind` → `$project` → `$sort`.
- **Esperado**: 4 filas (las citas SOLICITADA y CONFIRMADA), cada una con el nombre y correo del paciente.
- **Obtenido**: 4 filas; la primera es “Primera consulta nutricional” del 2026-10-09 de *Joaquín Pérez Demo*.

### 2. Citas con información del nutricionista
`$match` REALIZADA → `$lookup` a `nutricionistas` → `$unwind` → `$project` → `$sort` → `$limit 4`.
- **Esperado**: 4 filas con nombre y especialidades del profesional.
- **Obtenido**: 4 filas.

### 3. Historial de atención de un paciente
`$match` por `pacienteId` → `$unwind` de `historialEstados` → `$project` → `$sort`.
- **Esperado**: una fila por evento de cada cita de *Valentina Rojas Demo* (3 + 3 + 4 + 3 = 13 eventos).
- **Obtenido**: 13 filas.

### 4. Cantidad de citas por profesional (`$group`)
| Profesional | Citas |
|---|---|
| Carolina Fuentes M. | 6 |
| Rodrigo Sepúlveda A. | 4 |
| Daniela Morales C. | 4 |

### 5. Servicios más solicitados (`$group` + `$sort` + `$limit`)
| Servicio | Solicitudes |
|---|---|
| Control nutricional | 7 |
| Primera consulta nutricional | 3 |
| Enfermedades metabólicas | 2 |

### 6. Mediciones por paciente (`$sort` + `$group` con `$first/$last` + `$lookup`)
| Paciente | Mediciones | Peso inicial | Peso actual | IMC actual | Variación |
|---|---|---|---|---|---|
| Valentina Rojas Demo | 4 | 82.4 | 77 | 27.3 | −5.4 kg |
| Matías Soto Demo | 3 | 95 | 92.2 | 29.1 | −2.8 kg |

El `$sort` previo por fecha es lo que hace que `$first` y `$last` signifiquen “primera” y “última” medición.

### 7. Reporte de atenciones (`$group` con `$cond`)
| Profesional | Total | Realizadas | Inasistencias | Canceladas |
|---|---|---|---|---|
| Carolina Fuentes M. | 6 | 3 | 0 | 0 |
| Rodrigo Sepúlveda A. | 4 | 0 | 1 | 2 |
| Daniela Morales C. | 4 | 3 | 0 | 0 |

### 8. Separación de arreglos con `$unwind`
Eventos de todas las citas (`$unwind` de `historialEstados` + `$group`): SOLICITUD 14, CONFIRMACION 11, ATENCION_REALIZADA 6, CANCELACION 2, RECHAZO 1, REPROGRAMACION 1, INASISTENCIA 1 (total 36 eventos, coincide con la suma de los historiales).
8b. `$unwind` doble sobre el plan vigente de Valentina (`comidas` y luego `comidas.alimentos`): 5 filas (2 de Desayuno y 3 de Almuerzo).

### 9. Pacientes con su ficha y su plan vigente (`$lookup` simple y con subpipeline)
Valentina: motivo “Control de peso”, plan versión 2, 2 evoluciones. Matías: plan versión 1, 2 evoluciones. Los pacientes sin ficha se excluyen con `$match: { 'ficha.0': { $exists: true } }`.

### 10. Actividad de la agenda por día (`$dateToString` con zona `America/Santiago`)
Primeros días con citas: 2026-09-14, 09-15, 09-20, 10-05 y 10-06, una cita cada uno.

## CRUD básico (script 03) — resultado obtenido

| Operación | Resultado |
|---|---|
| `insertOne` de un servicio | `acknowledged: true` con un `insertedId` |
| `insertMany` de 2 solicitudes | 2 documentos insertados |
| `find` + proyección + `sort` + `limit` | 3 atenciones realizadas más recientes (Tomás Araya, Fernanda Díaz, Camila Vera) |
| `countDocuments` con `$in` y `$gte` | 3 |
| `updateOne` con `$set` | `matchedCount: 1`, `modifiedCount: 1` |
| `updateOne` con `$push` a `evoluciones` | `matchedCount: 1`, `modifiedCount: 1` |
| `updateMany` | `matchedCount: 2`, `modifiedCount: 2` |
| `deleteOne` / `deleteMany` (solo datos de práctica) | `deletedCount: 1` / `2` |
| `insertOne` de un paciente sin campos obligatorios | Rechazado por el validador (código 121, *Document failed validation*) |
| `insertOne` de un servicio con nombre repetido | Rechazado por el índice único (código 11000, `nombre_1`) |

**Por qué no se usa `deleteOne` sobre fichas, auditorías o citas**: son registros que deben conservar historial; en la aplicación se desactivan, anulan o cierran. Los `delete` del taller se aplican únicamente a datos de práctica creados en el mismo script.

## Verificación (script 05) — resultado obtenido

- 14 colecciones, 13 con validador `$jsonSchema` (nivel `moderate`, acción `error`; `auditorias` queda sin validador porque solo la escribe el sistema).
- Índices: únicos en `usuarios.correo`, `pacientes.usuarioId`, `pacientes.rut` (sparse), `nutricionistas.usuarioId`, `servicios.nombre`, `fichas_clinicas.pacienteId`, `solicitudes_contacto.claveDuplicado`; único parcial `un_plan_vigente_por_paciente`; TTL en `tokens_revocados.expiraEn`; compuestos en `citas` y `mediciones`.
- Integridad referencial: 0 huérfanos en las 9 referencias comprobadas; ningún paciente con más de un plan vigente.

## Diferencia con los datos de la aplicación

La aplicación (backend) guarda los mismos tipos de documento en la base `nutrivida`. Las semillas del taller se pueden abrir también desde la aplicación apuntando `NUTRIVIDA_MONGO_URI` a `nutrivida_taller` (las cuentas de la semilla usan la contraseña ficticia `Demo12345` mediante un hash BCrypt).
