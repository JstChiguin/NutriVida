const URL_AUTENTICACION = process.env.NUTRIVIDA_URL_AUTENTICACION ?? 'http://localhost:8081';
const URL_CLINICO = process.env.NUTRIVIDA_URL_CLINICO ?? 'http://localhost:8082';
const URL_AGENDA = process.env.NUTRIVIDA_URL_AGENDA ?? 'http://localhost:8083';
const CORREO_ADMINISTRADOR = process.env.NUTRIVIDA_ADMIN_CORREO ?? 'admin@nutrivida.demo';
const CONTRASENA_ADMINISTRADOR = process.env.NUTRIVIDA_ADMIN_CONTRASENA;
const CONTRASENA_DEMO = process.env.NUTRIVIDA_CONTRASENA_DEMO ?? 'Demo12345';

if (!CONTRASENA_ADMINISTRADOR) {
  console.error('Defina NUTRIVIDA_ADMIN_CONTRASENA con la contraseña del administrador inicial.');
  process.exit(1);
}

async function llamar(base, metodo, ruta, token, cuerpo, estadosAceptados = [200, 201, 204]) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : null;
  if (!estadosAceptados.includes(respuesta.status)) {
    const error = new Error(`${metodo} ${ruta} respondió ${respuesta.status}: ${texto}`);
    error.estado = respuesta.status;
    throw error;
  }
  return datos;
}

async function iniciarSesion(correo, contrasena) {
  return llamar(URL_AUTENTICACION, 'POST', '/api/autenticacion/iniciar-sesion', null, { correo, contrasena });
}

async function crearOBuscar(crear, buscar) {
  try {
    return await crear();
  } catch (error) {
    if (error.estado === 409) {
      return buscar();
    }
    throw error;
  }
}

const servicios = [
  { nombre: 'Primera consulta nutricional', descripcion: 'Evaluación inicial, historia alimentaria y objetivos.', categoria: 'Consulta', duracionMinutos: 60, precioReferencial: 35000 },
  { nombre: 'Control nutricional', descripcion: 'Seguimiento de avances y ajuste del plan alimentario.', categoria: 'Control', duracionMinutos: 30, precioReferencial: 25000 },
  { nombre: 'Nutrición deportiva', descripcion: 'Planificación alimentaria para rendimiento y composición corporal.', categoria: 'Deportiva', duracionMinutos: 45, precioReferencial: 40000 },
  { nombre: 'Enfermedades metabólicas', descripcion: 'Abordaje nutricional de diabetes, dislipidemias y síndrome metabólico.', categoria: 'Clínica', duracionMinutos: 45, precioReferencial: 38000 },
];

const equipo = [
  { nombre: 'Carolina Fuentes M.', correo: 'carolina.fuentes@nutrivida.demo', especialidades: ['Obesidad y síndrome metabólico'], dias: ['MONDAY', 'WEDNESDAY', 'FRIDAY'], foto: 'img/carolina-fuentes.png' },
  { nombre: 'Rodrigo Sepúlveda A.', correo: 'rodrigo.sepulveda@nutrivida.demo', especialidades: ['Nutrición deportiva y rendimiento'], dias: ['TUESDAY', 'THURSDAY', 'SATURDAY'], foto: 'img/rodrigo-sepulveda.png' },
  { nombre: 'Daniela Morales C.', correo: 'daniela.morales@nutrivida.demo', especialidades: ['Alimentación vegetariana, vegana y trastornos alimentarios'], dias: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'], foto: 'img/daniela-morales.png' },
  { nombre: 'Felipe Araya R.', correo: 'felipe.araya@nutrivida.demo', especialidades: ['Nutrición pediátrica y familiar'], dias: ['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'], foto: 'img/felipe-araya.png' },
];

const pacientes = [
  { nombreCompleto: 'Valentina Rojas Demo', correo: 'valentina.rojas@nutrivida.demo', rut: '11111111-1', telefono: '56911111111' },
  { nombreCompleto: 'Matías Soto Demo', correo: 'matias.soto@nutrivida.demo', rut: '22222222-2', telefono: '56922222222' },
  { nombreCompleto: 'Camila Vera Demo', correo: 'camila.vera@nutrivida.demo', rut: '33333333-3', telefono: '56933333333' },
];

function proximoDiaHabil() {
  const fecha = new Date();
  do {
    fecha.setDate(fecha.getDate() + 1);
  } while ([0, 6].includes(fecha.getDay()));
  return fecha.toISOString().slice(0, 10);
}

async function main() {
  const administrador = await iniciarSesion(CORREO_ADMINISTRADOR, CONTRASENA_ADMINISTRADOR);
  const tokenAdministrador = administrador.token;

  const serviciosCreados = [];
  for (const servicio of servicios) {
    const creado = await crearOBuscar(
      () => llamar(URL_CLINICO, 'POST', '/api/servicios', tokenAdministrador, servicio),
      async () => (await llamar(URL_CLINICO, 'GET', `/api/servicios?soloActivos=false&texto=${encodeURIComponent(servicio.nombre)}`)).contenido[0],
    );
    serviciosCreados.push(creado);
  }
  const identificadoresServicios = serviciosCreados.map((servicio) => servicio.id);
  console.log(`Servicios disponibles: ${serviciosCreados.length}`);

  const profesionales = [];
  for (const integrante of equipo) {
    const usuario = await crearOBuscar(
      () => llamar(URL_AUTENTICACION, 'POST', '/api/usuarios', tokenAdministrador, {
        nombreCompleto: integrante.nombre, correo: integrante.correo, contrasena: CONTRASENA_DEMO, rol: 'NUTRICIONISTA',
      }),
      async () => (await llamar(URL_AUTENTICACION, 'GET', `/api/usuarios?texto=${encodeURIComponent(integrante.correo)}`, tokenAdministrador)).contenido[0],
    );
    const perfil = await crearOBuscar(
      () => llamar(URL_CLINICO, 'POST', '/api/nutricionistas', tokenAdministrador, {
        usuarioId: usuario.id, nombreCompleto: integrante.nombre, titulo: 'Nutricionista', especialidades: integrante.especialidades,
        biografia: 'Perfil ficticio para demostración académica.', fotoUrl: integrante.foto, serviciosIds: identificadoresServicios,
      }),
      async () => (await llamar(URL_CLINICO, 'GET', `/api/nutricionistas?texto=${encodeURIComponent(integrante.nombre)}`)).contenido[0],
    );
    await llamar(URL_AGENDA, 'PUT', `/api/agendas/${perfil.id}/horarios`, tokenAdministrador, {
      horarios: integrante.dias.map((dia) => ({ dia, horaInicio: '09:00', horaFin: '13:00' }))
        .concat(integrante.dias.map((dia) => ({ dia, horaInicio: '15:00', horaFin: '18:00' }))),
    });
    const sesion = await iniciarSesion(integrante.correo, CONTRASENA_DEMO);
    profesionales.push({ perfil, token: sesion.token });
  }
  console.log(`Nutricionistas con agenda: ${profesionales.length}`);

  const sesionesPacientes = [];
  for (const paciente of pacientes) {
    const sesion = await crearOBuscar(
      () => llamar(URL_AUTENTICACION, 'POST', '/api/autenticacion/registro', null, { ...paciente, contrasena: CONTRASENA_DEMO }),
      () => iniciarSesion(paciente.correo, CONTRASENA_DEMO),
    );
    const perfil = await llamar(URL_CLINICO, 'GET', '/api/pacientes/yo', sesion.token);
    sesionesPacientes.push({ token: sesion.token, perfil });
  }
  console.log(`Pacientes registrados: ${sesionesPacientes.length}`);

  const fecha = proximoDiaHabil();
  const servicioControl = serviciosCreados.find((servicio) => servicio.nombre === 'Control nutricional');
  const profesionalDemo = profesionales[2];
  const horarios = await llamar(URL_AGENDA, 'GET',
    `/api/agendas/${profesionalDemo.perfil.id}/disponibilidad?servicioId=${servicioControl.id}&fecha=${fecha}`, sesionesPacientes[0].token);
  const libres = horarios[0].horarios;

  const citasExistentes = await llamar(URL_AGENDA, 'GET', '/api/citas', sesionesPacientes[0].token);

  if (citasExistentes.totalElementos > 0) {
    console.log('Los datos de citas y ficha clínica ya existían; se conservan sin duplicar');
  } else if (libres.length >= pacientes.length) {
    const citas = [];
    for (let posicion = 0; posicion < sesionesPacientes.length; posicion += 1) {
      const cita = await llamar(URL_AGENDA, 'POST', '/api/citas', sesionesPacientes[posicion].token, {
        nutricionistaId: profesionalDemo.perfil.id, servicioId: servicioControl.id, inicio: libres[posicion * 2].inicio,
        motivoConsulta: 'Control de peso y hábitos alimentarios',
      });
      citas.push(cita);
    }
    await llamar(URL_AGENDA, 'PATCH', `/api/citas/${citas[0].id}/confirmacion`, profesionalDemo.token);
    await llamar(URL_AGENDA, 'PATCH', `/api/citas/${citas[1].id}/confirmacion`, profesionalDemo.token);
    await llamar(URL_AGENDA, 'POST', `/api/citas/${citas[0].id}/pagos`, sesionesPacientes[0].token, { metodo: 'TARJETA_SIMULADA' });

    const pacienteId = sesionesPacientes[0].perfil.id;
    await llamar(URL_CLINICO, 'POST', `/api/pacientes/${pacienteId}/ficha-clinica`, profesionalDemo.token, {
      motivoConsulta: 'Control de peso', alergias: ['Maní'], habitosAlimentarios: 'Almuerza fuera de casa',
      actividadFisica: { nivel: 'LIGERO', descripcion: 'Caminatas', sesionesPorSemana: 3 }, objetivosNutricionales: ['Reducir 5 kg en 3 meses'],
    });
    await llamar(URL_CLINICO, 'POST', `/api/pacientes/${pacienteId}/mediciones`, profesionalDemo.token, { pesoKg: 82.4, estaturaCm: 168, cinturaCm: 96, fecha: '2026-08-01T12:00:00Z' });
    await llamar(URL_CLINICO, 'POST', `/api/pacientes/${pacienteId}/mediciones`, profesionalDemo.token, { pesoKg: 80.1, cinturaCm: 94, fecha: '2026-09-01T12:00:00Z' });
    await llamar(URL_CLINICO, 'POST', `/api/pacientes/${pacienteId}/mediciones`, profesionalDemo.token, { pesoKg: 78.3, cinturaCm: 92, fecha: '2026-10-01T12:00:00Z' });
    await llamar(URL_CLINICO, 'POST', `/api/pacientes/${pacienteId}/ficha-clinica/evoluciones`, profesionalDemo.token, { descripcion: 'Buena adherencia al plan inicial.', citaId: citas[0].id });
    await llamar(URL_CLINICO, 'POST', `/api/pacientes/${pacienteId}/planes-alimentarios`, profesionalDemo.token, {
      objetivos: ['Reducción gradual de peso'], recomendacionesGenerales: 'Mantener hidratación.',
      comidas: [{ nombre: 'Desayuno', horario: '08:00', alimentos: [{ alimento: 'Avena', cantidad: 40, unidad: 'g' }, { alimento: 'Leche descremada', cantidad: 200, unidad: 'ml' }] }],
    });
    console.log('Flujo de citas, ficha clínica, mediciones, plan y pago simulado creado');
  } else {
    console.log('No hay horarios suficientes para sembrar citas de demostración');
  }

  await llamar(URL_CLINICO, 'POST', '/api/solicitudes-contacto', null, {
    nombre: 'Visitante Demo', correo: 'visitante@nutrivida.demo', telefono: '56944444444', mensaje: 'Quisiera conocer los planes de nutrición deportiva.',
  });
  console.log('Datos de demostración listos');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
