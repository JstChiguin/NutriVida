use('nutrivida_taller');

const HASH_DEMO12345 = '$2a$10$U2LGHESeVwvFAyvYtFIC6ObpeMHAo9d1hwQU2ZW8rMCS6zYUwC/si';
const CREACION = ISODate('2026-08-01T12:00:00Z');

const identificador = (numero) => ObjectId(numero.toString(16).padStart(24, '0'));
const ID = {
  usuario: (n) => identificador(0x100 + n),
  paciente: (n) => identificador(0x200 + n),
  nutricionista: (n) => identificador(0x300 + n),
  servicio: (n) => identificador(0x400 + n),
  cita: (n) => identificador(0x500 + n),
  ficha: (n) => identificador(0x600 + n),
  medicion: (n) => identificador(0x700 + n),
  plan: (n) => identificador(0x800 + n),
  pago: (n) => identificador(0x900 + n),
};

['usuarios', 'pacientes', 'nutricionistas', 'servicios', 'agendas', 'citas', 'ocupaciones_agenda', 'pagos',
  'fichas_clinicas', 'mediciones', 'planes_alimentarios', 'solicitudes_contacto', 'auditorias']
  .forEach((coleccion) => db.getCollection(coleccion).deleteMany({}));

const usuarioBase = (n, correo, nombreCompleto, rol) => ({
  _id: ID.usuario(n), correo, hashContrasena: HASH_DEMO12345, nombreCompleto, rol, activo: true,
  creadoEn: CREACION, actualizadoEn: CREACION, ultimoAcceso: null, version: NumberLong('0'),
});

const personasPacientes = [
  [1, 'Valentina Rojas Demo', '11111111-1', 'FEMENINO', '1991-03-14'],
  [2, 'Matías Soto Demo', '22222222-2', 'MASCULINO', '1988-07-02'],
  [3, 'Camila Vera Demo', '33333333-3', 'FEMENINO', '1995-11-23'],
  [4, 'Joaquín Pérez Demo', '44444444-4', 'MASCULINO', '2001-01-30'],
  [5, 'Fernanda Díaz Demo', '55555555-5', 'FEMENINO', '1979-09-09'],
  [6, 'Tomás Araya Demo', '66666666-6', 'MASCULINO', '1999-05-18'],
];
const profesionales = [
  [1, 'Carolina Fuentes M.', 'Obesidad y síndrome metabólico'],
  [2, 'Rodrigo Sepúlveda A.', 'Nutrición deportiva y rendimiento'],
  [3, 'Daniela Morales C.', 'Alimentación vegetariana, vegana y trastornos alimentarios'],
];
const prestaciones = [
  [1, 'Primera consulta nutricional', 'Consulta', 60, 35000, 'Evaluación inicial, historia alimentaria y objetivos.'],
  [2, 'Control nutricional', 'Control', 30, 25000, 'Seguimiento de avances y ajuste del plan alimentario.'],
  [3, 'Nutrición deportiva', 'Deportiva', 45, 40000, 'Planificación alimentaria para rendimiento y composición corporal.'],
  [4, 'Enfermedades metabólicas', 'Clínica', 45, 38000, 'Abordaje nutricional de diabetes, dislipidemias y síndrome metabólico.'],
];

db.usuarios.insertMany([
  usuarioBase(0, 'admin@nutrivida.demo', 'Administrador NutriVida', 'ADMINISTRADOR'),
  ...profesionales.map(([n, nombre]) => usuarioBase(10 + n, `profesional${n}@nutrivida.demo`, nombre, 'NUTRICIONISTA')),
  ...personasPacientes.map(([n, nombre]) => usuarioBase(20 + n, `paciente${n}@nutrivida.demo`, nombre, 'PACIENTE')),
]);

db.servicios.insertMany(prestaciones.map(([n, nombre, categoria, duracionMinutos, precioReferencial, descripcion]) => ({
  _id: ID.servicio(n), nombre, descripcion, categoria, duracionMinutos, precioReferencial, activo: true,
  creadoEn: CREACION, actualizadoEn: CREACION, version: NumberLong('0'),
})));

db.nutricionistas.insertMany(profesionales.map(([n, nombreCompleto, especialidad]) => ({
  _id: ID.nutricionista(n), usuarioId: ID.usuario(10 + n), nombreCompleto, titulo: 'Nutricionista',
  especialidades: [especialidad], biografia: 'Perfil ficticio para demostración académica.', fotoUrl: null,
  serviciosIds: prestaciones.map(([s]) => ID.servicio(s)), activo: true,
  creadoEn: CREACION, actualizadoEn: CREACION, version: NumberLong('0'),
})));

const nutricionistaDe = { 1: [1], 2: [1, 2], 3: [2], 4: [3, 1], 5: [3], 6: [3] };
db.pacientes.insertMany(personasPacientes.map(([n, nombreCompleto, rut, sexo, fechaNacimiento]) => ({
  _id: ID.paciente(n), usuarioId: ID.usuario(20 + n), nombreCompleto, rut, correo: `paciente${n}@nutrivida.demo`,
  telefono: `5691000000${n}`, fechaNacimiento, sexo, direccion: null, activo: true,
  nutricionistasAutorizados: nutricionistaDe[n].map((p) => ID.nutricionista(p)),
  creadoEn: CREACION, actualizadoEn: CREACION, version: NumberLong('0'),
})));

db.agendas.insertMany(profesionales.map(([n]) => ({
  _id: ID.nutricionista(n),
  horariosSemanales: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    .map((dia) => ({ dia, horaInicio: '09:00', horaFin: '13:00' })),
  bloqueos: [], activa: true, actualizadaEn: CREACION, version: NumberLong('0'),
})));

const MOTIVOS = { SOLICITUD: 'Control de peso', CANCELACION: 'Cambio de planes', RECHAZO: 'Agenda completa',
  REPROGRAMACION: 'Cambio de turno', CONFIRMACION: null, ATENCION_REALIZADA: null, INASISTENCIA: null };
const ESTADO_TRAS = { SOLICITUD: 'SOLICITADA', CONFIRMACION: 'CONFIRMADA', RECHAZO: 'RECHAZADA',
  CANCELACION: 'CANCELADA', REPROGRAMACION: 'SOLICITADA', ATENCION_REALIZADA: 'REALIZADA', INASISTENCIA: 'INASISTENCIA' };

const citasBase = [
  [1, 1, 1, 1, '2026-09-14T13:00:00Z', 'REALIZADA', ['SOLICITUD', 'CONFIRMACION', 'ATENCION_REALIZADA']],
  [2, 1, 1, 2, '2026-10-05T13:00:00Z', 'REALIZADA', ['SOLICITUD', 'CONFIRMACION', 'ATENCION_REALIZADA']],
  [3, 2, 1, 2, '2026-09-15T14:00:00Z', 'REALIZADA', ['SOLICITUD', 'CONFIRMACION', 'ATENCION_REALIZADA']],
  [4, 2, 2, 3, '2026-10-06T14:00:00Z', 'INASISTENCIA', ['SOLICITUD', 'CONFIRMACION', 'INASISTENCIA']],
  [5, 3, 2, 3, '2026-09-20T15:00:00Z', 'CANCELADA', ['SOLICITUD', 'CANCELACION']],
  [6, 3, 3, 2, '2026-10-08T13:30:00Z', 'REALIZADA', ['SOLICITUD', 'CONFIRMACION', 'ATENCION_REALIZADA']],
  [7, 4, 3, 1, '2026-10-09T12:00:00Z', 'CONFIRMADA', ['SOLICITUD', 'CONFIRMACION']],
  [8, 4, 1, 2, '2026-10-12T16:00:00Z', 'SOLICITADA', ['SOLICITUD']],
  [9, 1, 1, 2, '2026-10-19T13:00:00Z', 'CONFIRMADA', ['SOLICITUD', 'CONFIRMACION', 'REPROGRAMACION', 'CONFIRMACION']],
  [10, 2, 1, 2, '2026-10-20T13:00:00Z', 'RECHAZADA', ['SOLICITUD', 'RECHAZO']],
  [11, 3, 2, 4, '2026-10-21T14:00:00Z', 'SOLICITADA', ['SOLICITUD']],
  [12, 5, 3, 1, '2026-10-22T12:00:00Z', 'REALIZADA', ['SOLICITUD', 'CONFIRMACION', 'ATENCION_REALIZADA']],
  [13, 6, 3, 2, '2026-10-23T12:00:00Z', 'REALIZADA', ['SOLICITUD', 'CONFIRMACION', 'ATENCION_REALIZADA']],
  [14, 1, 2, 4, '2026-10-26T15:00:00Z', 'CANCELADA', ['SOLICITUD', 'CONFIRMACION', 'CANCELACION']],
];

const citas = citasBase.map(([n, p, nu, s, inicioTexto, estado, eventos]) => {
  const inicio = ISODate(inicioTexto);
  const [, nombrePaciente] = personasPacientes[p - 1];
  const [, nombreNutricionista] = profesionales[nu - 1];
  const [, nombreServicio, , duracionMinutos, precioReferencial] = prestaciones[s - 1];
  const primerEvento = new Date(inicio.getTime() - 5 * 24 * 3600 * 1000);
  return {
    _id: ID.cita(n), pacienteId: ID.paciente(p), nombrePaciente, nutricionistaId: ID.nutricionista(nu), nombreNutricionista,
    servicioId: ID.servicio(s), nombreServicio, duracionMinutos, precioReferencial, inicio,
    fin: new Date(inicio.getTime() + duracionMinutos * 60000), motivoConsulta: MOTIVOS.SOLICITUD, estado,
    pagada: estado === 'REALIZADA',
    historialEstados: eventos.map((evento, posicion) => ({
      evento, estado: ESTADO_TRAS[evento], fecha: new Date(primerEvento.getTime() + posicion * 3600000),
      usuarioId: evento === 'SOLICITUD' ? ID.usuario(20 + p) : ID.usuario(10 + nu), detalle: MOTIVOS[evento],
    })),
    creadaEn: primerEvento, actualizadaEn: primerEvento, version: NumberLong(String(eventos.length)),
  };
});
db.citas.insertMany(citas);

const ocupaciones = citas.filter((cita) => ['SOLICITADA', 'CONFIRMADA'].includes(cita.estado)).flatMap((cita) => {
  const bloques = [];
  for (let instante = cita.inicio.getTime(); instante < cita.fin.getTime(); instante += 15 * 60000) {
    bloques.push({ _id: `${cita.nutricionistaId.toString()}|${instante}`, nutricionistaId: cita.nutricionistaId,
      bloqueInicio: new Date(instante), citaId: cita._id });
  }
  return bloques;
});
db.ocupaciones_agenda.insertMany(ocupaciones);

db.pagos.insertMany(citas.filter((cita) => cita.pagada).map((cita, posicion) => ({
  _id: ID.pago(posicion + 1), citaId: cita._id, pacienteId: cita.pacienteId, monto: cita.precioReferencial,
  estado: 'APROBADO_SIMULADO', metodo: 'TARJETA_SIMULADA',
  comprobante: { numero: `NV-20260901-${String(posicion + 1).padStart(6, '0')}`, emitidoEn: cita.inicio,
    glosa: 'COMPROBANTE FICTICIO - PAGO SIMULADO SIN VALOR TRIBUTARIO' },
  creadoEn: cita.inicio, version: NumberLong('0'),
})));

db.fichas_clinicas.insertMany([1, 2].map((p) => ({
  _id: ID.ficha(p), pacienteId: ID.paciente(p), nutricionistaResponsableId: ID.nutricionista(1),
  fechaApertura: ISODate('2026-09-14T13:00:00Z'), motivoConsulta: 'Control de peso',
  antecedentes: { morbidos: [], quirurgicos: [], familiares: ['Diabetes tipo 2 (abuelo)'], farmacos: [] },
  alergias: p === 1 ? ['Maní'] : [], intolerancias: p === 2 ? ['Lactosa'] : [],
  habitosAlimentarios: 'Almuerza fuera de casa durante la semana',
  actividadFisica: { nivel: 'LIGERO', descripcion: 'Caminatas', sesionesPorSemana: 3 },
  objetivosNutricionales: ['Reducir 5 kg en 3 meses'], evaluacion: 'Evaluación inicial ficticia',
  diagnosticoNutricional: null, planIntervencion: 'Plan hipocalórico moderado', indicaciones: 'Hidratación constante',
  estado: 'ABIERTA',
  evoluciones: [
    { identificador: `evolucion-${p}-1`, fecha: ISODate('2026-09-14T13:30:00Z'), nutricionistaId: ID.nutricionista(1),
      citaId: ID.cita(p === 1 ? 1 : 3), descripcion: 'Primera evaluación y definición de objetivos.', indicaciones: null,
      corrigeEvolucionId: null, motivoCorreccion: null, corregida: false },
    { identificador: `evolucion-${p}-2`, fecha: ISODate('2026-10-05T13:30:00Z'), nutricionistaId: ID.nutricionista(1),
      citaId: ID.cita(p === 1 ? 2 : 3), descripcion: 'Buena adherencia al plan inicial.', indicaciones: 'Continuar con el plan.',
      corrigeEvolucionId: null, motivoCorreccion: null, corregida: false },
  ],
  correcciones: [], actualizadoEn: ISODate('2026-10-05T13:30:00Z'), version: NumberLong('0'),
})));

const pesosPorPaciente = { 1: [82.4, 80.1, 78.3, 77.0], 2: [95.0, 93.6, 92.2] };
const estaturaPorPaciente = { 1: 168, 2: 178 };
const mediciones = [];
Object.entries(pesosPorPaciente).forEach(([paciente, pesos]) => {
  pesos.forEach((pesoKg, posicion) => {
    const estaturaCm = estaturaPorPaciente[paciente];
    mediciones.push({
      _id: ID.medicion(Number(paciente) * 10 + posicion), pacienteId: ID.paciente(Number(paciente)),
      nutricionistaId: ID.nutricionista(1), fecha: new Date(Date.UTC(2026, 7 + posicion, 1, 12)), pesoKg, estaturaCm,
      imc: Math.round((pesoKg / ((estaturaCm / 100) ** 2)) * 10) / 10, cinturaCm: 96 - posicion * 2,
      otrasMediciones: {}, observaciones: null, estado: 'VIGENTE', motivoAnulacion: null, creadoEn: CREACION,
      version: NumberLong('0'),
    });
  });
});
db.mediciones.insertMany(mediciones);

const plan = (n, paciente, numeroVersion, estado, objetivo, planAnteriorId) => ({
  _id: ID.plan(n), pacienteId: ID.paciente(paciente), nutricionistaId: ID.nutricionista(1), numeroVersion, estado,
  vigenteDesde: '2026-09-14', vigenteHasta: null, objetivos: [objetivo],
  comidas: [
    { nombre: 'Desayuno', horario: '08:00', recomendaciones: null, alimentos: [
      { alimento: 'Avena', cantidad: 40, unidad: 'g' }, { alimento: 'Leche descremada', cantidad: 200, unidad: 'ml' }] },
    { nombre: 'Almuerzo', horario: '13:30', recomendaciones: 'Priorizar verduras', alimentos: [
      { alimento: 'Pechuga de pollo', cantidad: 120, unidad: 'g' }, { alimento: 'Ensalada mixta', cantidad: 200, unidad: 'g' },
      { alimento: 'Arroz integral', cantidad: 80, unidad: 'g' }] },
  ],
  recomendacionesGenerales: 'Mantener hidratación', planAnteriorId, creadoEn: CREACION, version: NumberLong('0'),
});
db.planes_alimentarios.insertMany([
  plan(1, 1, 1, 'REEMPLAZADO', 'Reducción gradual de peso', null),
  plan(2, 1, 2, 'VIGENTE', 'Mantener la reducción y mejorar hábitos', ID.plan(1)),
  plan(3, 2, 1, 'VIGENTE', 'Reducción de peso con control de lactosa', null),
]);

db.solicitudes_contacto.insertMany([
  ['Visitante Uno', 'visita1@nutrivida.demo', 'Consulta por planes deportivos', 'PENDIENTE'],
  ['Visitante Dos', 'visita2@nutrivida.demo', 'Consulta por nutrición infantil', 'EN_REVISION'],
  ['Visitante Tres', 'visita3@nutrivida.demo', 'Consulta por valores de las consultas', 'RESUELTA'],
].map(([nombre, correo, mensaje, estado], posicion) => ({
  nombre, correo, telefono: null, mensaje: `${mensaje} y horarios disponibles`, estado,
  claveDuplicado: `semilla-contacto-${posicion + 1}`, creadoEn: CREACION, actualizadoEn: CREACION,
})));

print('Semillas ficticias cargadas:');
['usuarios', 'pacientes', 'nutricionistas', 'servicios', 'agendas', 'citas', 'ocupaciones_agenda', 'pagos',
  'fichas_clinicas', 'mediciones', 'planes_alimentarios', 'solicitudes_contacto']
  .forEach((coleccion) => print(`  ${coleccion}: ${db.getCollection(coleccion).countDocuments()}`));
