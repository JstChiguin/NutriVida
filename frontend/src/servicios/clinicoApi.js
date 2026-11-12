import { solicitar } from './clienteApi.js';

export const clinicoApi = {
  listarServicios: (parametros) => solicitar('clinico', 'GET', '/api/servicios', { parametros }),
  crearServicio: (datos) => solicitar('clinico', 'POST', '/api/servicios', { cuerpo: datos }),
  actualizarServicio: (servicioId, datos) => solicitar('clinico', 'PUT', `/api/servicios/${servicioId}`, { cuerpo: datos }),
  cambiarEstadoServicio: (servicioId, activo) =>
    solicitar('clinico', 'PATCH', `/api/servicios/${servicioId}/estado`, { cuerpo: { activo } }),

  listarNutricionistas: (parametros) => solicitar('clinico', 'GET', '/api/nutricionistas', { parametros }),
  consultarMiPerfilNutricionista: () => solicitar('clinico', 'GET', '/api/nutricionistas/yo'),
  actualizarMiPerfilNutricionista: (datos) => solicitar('clinico', 'PUT', '/api/nutricionistas/yo', { cuerpo: datos }),
  crearNutricionista: (datos) => solicitar('clinico', 'POST', '/api/nutricionistas', { cuerpo: datos }),
  cambiarEstadoNutricionista: (nutricionistaId, activo) =>
    solicitar('clinico', 'PATCH', `/api/nutricionistas/${nutricionistaId}/estado`, { cuerpo: { activo } }),

  consultarMiPerfilPaciente: () => solicitar('clinico', 'GET', '/api/pacientes/yo'),
  actualizarMiPerfilPaciente: (datos) => solicitar('clinico', 'PUT', '/api/pacientes/yo', { cuerpo: datos }),
  listarPacientes: (parametros) => solicitar('clinico', 'GET', '/api/pacientes', { parametros }),
  consultarPaciente: (pacienteId) => solicitar('clinico', 'GET', `/api/pacientes/${pacienteId}`),
  cambiarEstadoPaciente: (pacienteId, activo) =>
    solicitar('clinico', 'PATCH', `/api/pacientes/${pacienteId}/estado`, { cuerpo: { activo } }),

  autorizarNutricionista: (pacienteId, nutricionistaId) =>
    solicitar('clinico', 'PUT', `/api/pacientes/${pacienteId}/nutricionistas/${nutricionistaId}`),
  retirarNutricionista: (pacienteId, nutricionistaId) =>
    solicitar('clinico', 'DELETE', `/api/pacientes/${pacienteId}/nutricionistas/${nutricionistaId}`),

  consultarFicha: (pacienteId) => solicitar('clinico', 'GET', `/api/pacientes/${pacienteId}/ficha-clinica`),
  abrirFicha: (pacienteId, datos) => solicitar('clinico', 'POST', `/api/pacientes/${pacienteId}/ficha-clinica`, { cuerpo: datos }),
  actualizarFicha: (pacienteId, datos, motivoCambio) =>
    solicitar('clinico', 'PUT', `/api/pacientes/${pacienteId}/ficha-clinica`, { cuerpo: { datos, motivoCambio } }),
  registrarEvolucion: (pacienteId, datos) =>
    solicitar('clinico', 'POST', `/api/pacientes/${pacienteId}/ficha-clinica/evoluciones`, { cuerpo: datos }),
  corregirEvolucion: (pacienteId, evolucionId, datos) =>
    solicitar('clinico', 'POST', `/api/pacientes/${pacienteId}/ficha-clinica/evoluciones/${evolucionId}/correcciones`, { cuerpo: datos }),

  consultarEvolucionMediciones: (pacienteId) => solicitar('clinico', 'GET', `/api/pacientes/${pacienteId}/mediciones/evolucion`),
  listarMediciones: (pacienteId, parametros) => solicitar('clinico', 'GET', `/api/pacientes/${pacienteId}/mediciones`, { parametros }),
  anularMedicion: (pacienteId, medicionId, motivo) =>
    solicitar('clinico', 'PATCH', `/api/pacientes/${pacienteId}/mediciones/${medicionId}/anulacion`, { cuerpo: { motivo } }),
  registrarMedicion: (pacienteId, datos) => solicitar('clinico', 'POST', `/api/pacientes/${pacienteId}/mediciones`, { cuerpo: datos }),

  consultarPlanVigente: (pacienteId) => solicitar('clinico', 'GET', `/api/pacientes/${pacienteId}/planes-alimentarios/vigente`),
  listarVersionesPlan: (pacienteId) => solicitar('clinico', 'GET', `/api/pacientes/${pacienteId}/planes-alimentarios`),
  crearPlan: (pacienteId, datos) => solicitar('clinico', 'POST', `/api/pacientes/${pacienteId}/planes-alimentarios`, { cuerpo: datos }),
  actualizarPlan: (planId, datos) => solicitar('clinico', 'PUT', `/api/planes-alimentarios/${planId}`, { cuerpo: datos }),

  enviarSolicitudContacto: (datos) => solicitar('clinico', 'POST', '/api/solicitudes-contacto', { cuerpo: datos }),
  listarSolicitudesContacto: (parametros) => solicitar('clinico', 'GET', '/api/solicitudes-contacto', { parametros }),
  cambiarEstadoSolicitudContacto: (solicitudId, estado) =>
    solicitar('clinico', 'PATCH', `/api/solicitudes-contacto/${solicitudId}/estado`, { cuerpo: { estado } }),

  listarAuditorias: (parametros) => solicitar('clinico', 'GET', '/api/auditorias', { parametros }),
  resumirPacientes: (parametros) => solicitar('clinico', 'GET', '/api/reportes/pacientes', { parametros }),
};
