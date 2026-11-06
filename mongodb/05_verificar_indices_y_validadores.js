use('nutrivida_taller');

print('=== Índices por colección ===');
db.getCollectionNames().sort().forEach((coleccion) => {
  const indices = db.getCollection(coleccion).getIndexes().map((indice) => {
    const clave = Object.keys(indice.key).join('+');
    const propiedades = [indice.unique ? 'único' : null, indice.sparse ? 'sparse' : null,
      indice.partialFilterExpression ? 'parcial' : null, indice.expireAfterSeconds !== undefined ? 'TTL' : null]
      .filter(Boolean).join(',');
    return propiedades ? `${clave} (${propiedades})` : clave;
  });
  print(`${coleccion}: ${indices.join(' | ')}`);
});

print('=== Colecciones con validador $jsonSchema ===');
db.getCollectionInfos().filter((informacion) => informacion.options.validator).forEach((informacion) => {
  print(`${informacion.name}: nivel=${informacion.options.validationLevel}, acción=${informacion.options.validationAction}`);
});

print('=== Comprobaciones de integridad referencial ===');
const referencias = [
  ['citas.pacienteId -> pacientes', 'citas', 'pacienteId', 'pacientes'],
  ['citas.nutricionistaId -> nutricionistas', 'citas', 'nutricionistaId', 'nutricionistas'],
  ['citas.servicioId -> servicios', 'citas', 'servicioId', 'servicios'],
  ['mediciones.pacienteId -> pacientes', 'mediciones', 'pacienteId', 'pacientes'],
  ['fichas_clinicas.pacienteId -> pacientes', 'fichas_clinicas', 'pacienteId', 'pacientes'],
  ['planes_alimentarios.pacienteId -> pacientes', 'planes_alimentarios', 'pacienteId', 'pacientes'],
  ['pagos.citaId -> citas', 'pagos', 'citaId', 'citas'],
  ['pacientes.usuarioId -> usuarios', 'pacientes', 'usuarioId', 'usuarios'],
  ['nutricionistas.usuarioId -> usuarios', 'nutricionistas', 'usuarioId', 'usuarios'],
];
referencias.forEach(([descripcion, origen, campo, destino]) => {
  const huerfanos = db.getCollection(origen).aggregate([
    { $lookup: { from: destino, localField: campo, foreignField: '_id', as: 'destino' } },
    { $match: { destino: { $size: 0 } } },
    { $count: 'huerfanos' },
  ]).toArray();
  print(`${descripcion}: ${huerfanos.length === 0 ? 0 : huerfanos[0].huerfanos} huérfanos`);
});

print('=== Un único plan vigente por paciente ===');
printjson(db.planes_alimentarios.aggregate([
  { $match: { estado: 'VIGENTE' } },
  { $group: { _id: '$pacienteId', vigentes: { $sum: 1 } } },
  { $match: { vigentes: { $gt: 1 } } },
]).toArray());
