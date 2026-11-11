use('nutrivida_taller');

print('=== 1. Citas con información del paciente ($lookup) ===');
db.citas.aggregate([
  { $match: { estado: { $in: ['CONFIRMADA', 'SOLICITADA'] } } },
  { $lookup: { from: 'pacientes', localField: 'pacienteId', foreignField: '_id', as: 'paciente' } },
  { $unwind: '$paciente' },
  { $project: { _id: 0, inicio: 1, estado: 1, nombreServicio: 1, 'paciente.nombreCompleto': 1, 'paciente.correo': 1 } },
  { $sort: { inicio: 1 } },
]).forEach(printjson);

print('=== 2. Citas con información del nutricionista ($lookup) ===');
db.citas.aggregate([
  { $match: { estado: 'REALIZADA' } },
  { $lookup: { from: 'nutricionistas', localField: 'nutricionistaId', foreignField: '_id', as: 'profesional' } },
  { $unwind: '$profesional' },
  { $project: { _id: 0, inicio: 1, nombreServicio: 1, 'profesional.nombreCompleto': 1, 'profesional.especialidades': 1 } },
  { $sort: { inicio: 1 } },
  { $limit: 4 },
]).forEach(printjson);

print('=== 3. Historial de atención de un paciente ($match + $unwind del historial embebido) ===');
db.citas.aggregate([
  { $match: { pacienteId: ObjectId('000000000000000000000201') } },
  { $unwind: '$historialEstados' },
  { $project: { _id: 0, cita: '$inicio', evento: '$historialEstados.evento', estadoResultante: '$historialEstados.estado',
    fechaEvento: '$historialEstados.fecha' } },
  { $sort: { cita: 1, fechaEvento: 1 } },
]).forEach(printjson);

print('=== 4. Cantidad de citas por profesional ($group) ===');
db.citas.aggregate([
  { $group: { _id: '$nombreNutricionista', totalCitas: { $sum: 1 } } },
  { $sort: { totalCitas: -1 } },
]).forEach(printjson);

print('=== 5. Servicios más solicitados ($group + $sort + $limit) ===');
db.citas.aggregate([
  { $group: { _id: '$nombreServicio', solicitudes: { $sum: 1 } } },
  { $sort: { solicitudes: -1, _id: 1 } },
  { $limit: 3 },
]).forEach(printjson);

print('=== 6. Mediciones por paciente con su nombre y variación de peso ($lookup + $group) ===');
db.mediciones.aggregate([
  { $match: { estado: 'VIGENTE' } },
  { $sort: { fecha: 1 } },
  { $group: { _id: '$pacienteId', mediciones: { $sum: 1 }, pesoInicial: { $first: '$pesoKg' }, pesoActual: { $last: '$pesoKg' },
    imcActual: { $last: '$imc' } } },
  { $lookup: { from: 'pacientes', localField: '_id', foreignField: '_id', as: 'paciente' } },
  { $unwind: '$paciente' },
  { $project: { _id: 0, paciente: '$paciente.nombreCompleto', mediciones: 1, pesoInicial: 1, pesoActual: 1, imcActual: 1,
    variacionKg: { $round: [{ $subtract: ['$pesoActual', '$pesoInicial'] }, 1] } } },
]).forEach(printjson);

print('=== 7. Reporte de atenciones por profesional y estado ($group con $cond) ===');
db.citas.aggregate([
  { $group: { _id: '$nombreNutricionista', total: { $sum: 1 },
    realizadas: { $sum: { $cond: [{ $eq: ['$estado', 'REALIZADA'] }, 1, 0] } },
    inasistencias: { $sum: { $cond: [{ $eq: ['$estado', 'INASISTENCIA'] }, 1, 0] } },
    canceladas: { $sum: { $cond: [{ $eq: ['$estado', 'CANCELADA'] }, 1, 0] } } } },
  { $sort: { total: -1 } },
]).forEach(printjson);

print('=== 8. Separación de arreglos con $unwind: eventos del historial de todas las citas ===');
db.citas.aggregate([
  { $unwind: '$historialEstados' },
  { $group: { _id: '$historialEstados.evento', cantidad: { $sum: 1 } } },
  { $sort: { cantidad: -1 } },
]).forEach(printjson);

print('=== 8b. $unwind sobre los alimentos de cada comida del plan vigente (arreglos anidados) ===');
db.planes_alimentarios.aggregate([
  { $match: { pacienteId: ObjectId('000000000000000000000201'), estado: 'VIGENTE' } },
  { $unwind: '$comidas' },
  { $unwind: '$comidas.alimentos' },
  { $project: { _id: 0, comida: '$comidas.nombre', alimento: '$comidas.alimentos.alimento',
    cantidad: '$comidas.alimentos.cantidad', unidad: '$comidas.alimentos.unidad' } },
]).forEach(printjson);

print('=== 9. Pacientes con su ficha y su plan vigente ($lookup encadenados) ===');
db.pacientes.aggregate([
  { $lookup: { from: 'fichas_clinicas', localField: '_id', foreignField: 'pacienteId', as: 'ficha' } },
  { $lookup: { from: 'planes_alimentarios', let: { idPaciente: '$_id' }, pipeline: [
    { $match: { $expr: { $and: [{ $eq: ['$pacienteId', '$$idPaciente'] }, { $eq: ['$estado', 'VIGENTE'] }] } } },
  ], as: 'planVigente' } },
  { $match: { 'ficha.0': { $exists: true } } },
  { $project: { _id: 0, nombreCompleto: 1, motivo: { $first: '$ficha.motivoConsulta' },
    versionPlan: { $first: '$planVigente.numeroVersion' }, evoluciones: { $size: { $first: '$ficha.evoluciones' } } } },
]).forEach(printjson);

print('=== 10. Actividad de la agenda por día (zona America/Santiago) ===');
db.citas.aggregate([
  { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$inicio', timezone: 'America/Santiago' } }, citas: { $sum: 1 } } },
  { $sort: { _id: 1 } },
  { $limit: 5 },
]).forEach(printjson);
