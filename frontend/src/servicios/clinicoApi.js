import { solicitar } from './clienteApi.js';

export const clinicoApi = {
  listarServicios: (parametros) => solicitar('clinico', 'GET', '/api/v1/servicios', { parametros }),
  crearServicio: (datos) => solicitar('clinico', 'POST', '/api/v1/servicios', { cuerpo: datos }),
  actualizarServicio: (servicioId, datos) => solicitar('clinico', 'PUT', `/api/v1/servicios/${servicioId}`, { cuerpo: datos }),
  cambiarEstadoServicio: (servicioId, activo) =>
    solicitar('clinico', 'PATCH', `/api/v1/servicios/${servicioId}/estado`, { cuerpo: { activo } }),

  listarNutricionistas: (parametros) => solicitar('clinico', 'GET', '/api/v1/nutricionistas', { parametros }),
  consultarNutricionista: (nutricionistaId) => solicitar('clinico', 'GET', `/api/v1/nutricionistas/${nutricionistaId}`),
  consultarMiPerfilNutricionista: () => solicitar('clinico', 'GET', '/api/v1/nutricionistas/yo'),
  actualizarMiPerfilNutricionista: (datos) => solicitar('clinico', 'PUT', '/api/v1/nutricionistas/yo', { cuerpo: datos }),
  crearNutricionista: (datos) => solicitar('clinico', 'POST', '/api/v1/nutricionistas', { cuerpo: datos }),
  cambiarEstadoNutricionista: (nutricionistaId, activo) =>
    solicitar('clinico', 'PATCH', `/api/v1/nutricionistas/${nutricionistaId}/estado`, { cuerpo: { activo } }),

  consultarMiPerfilPaciente: () => solicitar('clinico', 'GET', '/api/v1/pacientes/yo'),
  actualizarMiPerfilPaciente: (datos) => solicitar('clinico', 'PUT', '/api/v1/pacientes/yo', { cuerpo: datos }),
  listarPacientes: (parametros) => solicitar('clinico', 'GET', '/api/v1/pacientes', { parametros }),
  consultarPaciente: (pacienteId) => solicitar('clinico', 'GET', `/api/v1/pacientes/${pacienteId}`),
  cambiarEstadoPaciente: (pacienteId, activo) =>
    solicitar('clinico', 'PATCH', `/api/v1/pacientes/${pacienteId}/estado`, { cuerpo: { activo } }),

  autorizarNutricionista: (pacienteId, nutricionistaId) =>
    solicitar('clinico', 'PUT', `/api/v1/pacientes/${pacienteId}/nutricionistas/${nutricionistaId}`),
  retirarNutricionista: (pacienteId, nutricionistaId) =>
    solicitar('clinico', 'DELETE', `/api/v1/pacientes/${pacienteId}/nutricionistas/${nutricionistaId}`),

  consultarFicha: (pacienteId) => solicitar('clinico', 'GET', `/api/v1/pacientes/${pacienteId}/ficha-clinica`),
  abrirFicha: (pacienteId, datos) => solicitar('clinico', 'POST', `/api/v1/pacientes/${pacienteId}/ficha-clinica`, { cuerpo: datos }),
  actualizarFicha: (pacienteId, datos, motivoCambio) =>
    solicitar('clinico', 'PUT', `/api/v1/pacientes/${pacienteId}/ficha-clinica`, { cuerpo: { datos, motivoCambio } }),
  registrarEvolucion: (pacienteId, datos) =>
    solicitar('clinico', 'POST', `/api/v1/pacientes/${pacienteId}/ficha-clinica/evoluciones`, { cuerpo: datos }),
  corregirEvolucion: (pacienteId, evolucionId, datos) =>
    solicitar('clinico', 'POST', `/api/v1/pacientes/${pacienteId}/ficha-clinica/evoluciones/${evolucionId}/correcciones`, { cuerpo: datos }),

  consultarEvolucionMediciones: (pacienteId) => solicitar('clinico', 'GET', `/api/v1/pacientes/${pacienteId}/mediciones/evolucion`),
  listarMediciones: (pacienteId, parametros) => solicitar('clinico', 'GET', `/api/v1/pacientes/${pacienteId}/mediciones`, { parametros }),
  anularMedicion: (pacienteId, medicionId, motivo) =>
    solicitar('clinico', 'PATCH', `/api/v1/pacientes/${pacienteId}/mediciones/${medicionId}/anulacion`, { cuerpo: { motivo } }),
  registrarMedicion: (pacienteId, datos) => solicitar('clinico', 'POST', `/api/v1/pacientes/${pacienteId}/mediciones`, { cuerpo: datos }),

  consultarPlanVigente: (pacienteId) => solicitar('clinico', 'GET', `/api/v1/pacientes/${pacienteId}/planes-alimentarios/vigente`),
  listarVersionesPlan: (pacienteId) => solicitar('clinico', 'GET', `/api/v1/pacientes/${pacienteId}/planes-alimentarios`),
  crearPlan: (pacienteId, datos) => solicitar('clinico', 'POST', `/api/v1/pacientes/${pacienteId}/planes-alimentarios`, { cuerpo: datos }),
  actualizarPlan: (planId, datos) => solicitar('clinico', 'PUT', `/api/v1/planes-alimentarios/${planId}`, { cuerpo: datos }),

  enviarSolicitudContacto: (datos) => solicitar('clinico', 'POST', '/api/v1/solicitudes-contacto', { cuerpo: datos }),
  listarSolicitudesContacto: (parametros) => solicitar('clinico', 'GET', '/api/v1/solicitudes-contacto', { parametros }),
  cambiarEstadoSolicitudContacto: (solicitudId, estado) =>
    solicitar('clinico', 'PATCH', `/api/v1/solicitudes-contacto/${solicitudId}/estado`, { cuerpo: { estado } }),

  listarAuditorias: (parametros) => solicitar('clinico', 'GET', '/api/v1/auditorias', { parametros }),
  resumirPacientes: (parametros) => solicitar('clinico', 'GET', '/api/v1/reportes/pacientes', { parametros }),
};
