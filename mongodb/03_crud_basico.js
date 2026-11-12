use('nutrivida_taller');

print('=== CREATE: insertOne ===');
const servicioNuevo = db.servicios.insertOne({
  nombre: 'Taller grupal de alimentación saludable',
  descripcion: 'Sesión grupal de educación alimentaria.',
  categoria: 'Educación',
  duracionMinutos: 60,
  precioReferencial: 12000,
  activo: true,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
});
printjson(servicioNuevo);

print('=== CREATE: insertMany (solicitudes de contacto) ===');
const solicitudes = db.solicitudes_contacto.insertMany([
  { nombre: 'Persona Taller Uno', correo: 'taller1@nutrivida.demo', telefono: null, mensaje: 'Consulta de práctica número uno',
    estado: 'PENDIENTE', claveDuplicado: 'taller-1', creadoEn: new Date(), actualizadoEn: new Date() },
  { nombre: 'Persona Taller Dos', correo: 'taller2@nutrivida.demo', telefono: null, mensaje: 'Consulta de práctica número dos',
    estado: 'PENDIENTE', claveDuplicado: 'taller-2', creadoEn: new Date(), actualizadoEn: new Date() },
]);
print(`Documentos insertados: ${Object.keys(solicitudes.insertedIds).length}`);

print('=== READ: find con filtro, proyección, orden y límite ===');
db.citas.find(
  { estado: 'REALIZADA' },
  { nombrePaciente: 1, nombreNutricionista: 1, inicio: 1, _id: 0 },
).sort({ inicio: -1 }).limit(3).forEach(printjson);

print('=== READ: búsqueda por rango de fechas y operadores $in / $gte ===');
print(db.citas.countDocuments({
  estado: { $in: ['SOLICITADA', 'CONFIRMADA'] },
  inicio: { $gte: ISODate('2026-10-10T00:00:00Z') },
}));

print('=== UPDATE: updateOne con $set ===');
printjson(db.servicios.updateOne(
  { nombre: 'Taller grupal de alimentación saludable' },
  { $set: { precioReferencial: 15000, actualizadoEn: new Date() } },
));

print('=== UPDATE: updateOne con $push sobre un arreglo (agrega una evolución) ===');
printjson(db.fichas_clinicas.updateOne(
  { pacienteId: ObjectId('000000000000000000000201') },
  { $push: { evoluciones: {
    identificador: 'evolucion-taller', fecha: new Date(), nutricionistaId: ObjectId('000000000000000000000301'),
    citaId: null, descripcion: 'Evolución agregada desde el taller.', indicaciones: null, corrigeEvolucionId: null,
    motivoCorreccion: null, corregida: false } } },
));

print('=== UPDATE: updateMany (pasa solicitudes pendientes de práctica a EN_REVISION) ===');
printjson(db.solicitudes_contacto.updateMany(
  { claveDuplicado: { $in: ['taller-1', 'taller-2'] } },
  { $set: { estado: 'EN_REVISION', actualizadoEn: new Date() } },
));

print('=== DELETE: deleteOne sobre datos de práctica ===');
printjson(db.servicios.deleteOne({ nombre: 'Taller grupal de alimentación saludable' }));

print('=== DELETE: deleteMany sobre datos de práctica ===');
printjson(db.solicitudes_contacto.deleteMany({ claveDuplicado: { $in: ['taller-1', 'taller-2'] } }));

print('=== Restricciones: el validador y los índices únicos rechazan datos inválidos ===');
try {
  db.pacientes.insertOne({ nombreCompleto: 'Sin campos obligatorios' });
} catch (error) {
  print(`Rechazado por el validador (código ${error.code}): ${error.message.split(".")[0]}`);
}
try {
  db.servicios.insertOne({
    nombre: 'Control nutricional', descripcion: 'Duplicado', categoria: 'Control', duracionMinutos: 30,
    precioReferencial: 1, activo: true, creadoEn: new Date(),
  });
} catch (error) {
  print(`Rechazado por el índice único (código ${error.code}): ${error.message.split(" dup key")[0]}`);
}
