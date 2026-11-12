import { solicitar } from './clienteApi.js';

export const agendaApi = {
  consultarDisponibilidad: (nutricionistaId, parametros) =>
    solicitar('agenda', 'GET', `/api/agendas/${nutricionistaId}/disponibilidad`, { parametros }),
  consultarAgenda: (nutricionistaId) => solicitar('agenda', 'GET', `/api/agendas/${nutricionistaId}`),
  definirHorarios: (nutricionistaId, horarios) =>
    solicitar('agenda', 'PUT', `/api/agendas/${nutricionistaId}/horarios`, { cuerpo: { horarios } }),
  agregarBloqueo: (nutricionistaId, datos) => solicitar('agenda', 'POST', `/api/agendas/${nutricionistaId}/bloqueos`, { cuerpo: datos }),
  quitarBloqueo: (nutricionistaId, bloqueoId) => solicitar('agenda', 'DELETE', `/api/agendas/${nutricionistaId}/bloqueos/${bloqueoId}`),

  solicitarCita: (datos) => solicitar('agenda', 'POST', '/api/citas', { cuerpo: datos }),
  listarCitas: (parametros) => solicitar('agenda', 'GET', '/api/citas', { parametros }),
  confirmarCita: (citaId) => solicitar('agenda', 'PATCH', `/api/citas/${citaId}/confirmacion`),
  rechazarCita: (citaId, motivo) => solicitar('agenda', 'PATCH', `/api/citas/${citaId}/rechazo`, { cuerpo: { motivo } }),
  cancelarCita: (citaId, motivo) => solicitar('agenda', 'PATCH', `/api/citas/${citaId}/cancelacion`, { cuerpo: { motivo } }),
  reprogramarCita: (citaId, nuevoInicio, motivo) =>
    solicitar('agenda', 'PATCH', `/api/citas/${citaId}/reprogramacion`, { cuerpo: { nuevoInicio, motivo } }),
  registrarAtencionRealizada: (citaId) => solicitar('agenda', 'PATCH', `/api/citas/${citaId}/atencion-realizada`),
  registrarInasistencia: (citaId) => solicitar('agenda', 'PATCH', `/api/citas/${citaId}/inasistencia`),
  pagarCita: (citaId, metodo) => solicitar('agenda', 'POST', `/api/citas/${citaId}/pagos`, { cuerpo: { metodo } }),

  listarPagos: (parametros) => solicitar('agenda', 'GET', '/api/pagos', { parametros }),
  anularPago: (pagoId) => solicitar('agenda', 'PATCH', `/api/pagos/${pagoId}/anulacion`),

  contarCitasPorEstado: (parametros) => solicitar('agenda', 'GET', '/api/reportes/citas-por-estado', { parametros }),
  resumirAtencionesPorNutricionista: (parametros) => solicitar('agenda', 'GET', '/api/reportes/atenciones-por-nutricionista', { parametros }),
  listarServiciosMasSolicitados: (parametros) => solicitar('agenda', 'GET', '/api/reportes/servicios-mas-solicitados', { parametros }),
  resumirActividadPorDia: (parametros) => solicitar('agenda', 'GET', '/api/reportes/actividad-agenda', { parametros }),
  contarEventosDeCitas: (parametros) => solicitar('agenda', 'GET', '/api/reportes/eventos-de-citas', { parametros }),
  contarPacientesAtendidos: (parametros) => solicitar('agenda', 'GET', '/api/reportes/pacientes-atendidos', { parametros }),
};
