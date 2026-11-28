import { solicitar } from './clienteApi.js';

export const agendaApi = {
  consultarDisponibilidad: (nutricionistaId, parametros) =>
    solicitar('agenda', 'GET', `/api/v1/agendas/${nutricionistaId}/disponibilidad`, { parametros }),
  consultarAgenda: (nutricionistaId) => solicitar('agenda', 'GET', `/api/v1/agendas/${nutricionistaId}`),
  definirHorarios: (nutricionistaId, horarios) =>
    solicitar('agenda', 'PUT', `/api/v1/agendas/${nutricionistaId}/horarios`, { cuerpo: { horarios } }),
  agregarBloqueo: (nutricionistaId, datos) => solicitar('agenda', 'POST', `/api/v1/agendas/${nutricionistaId}/bloqueos`, { cuerpo: datos }),
  quitarBloqueo: (nutricionistaId, bloqueoId) => solicitar('agenda', 'DELETE', `/api/v1/agendas/${nutricionistaId}/bloqueos/${bloqueoId}`),

  solicitarCita: (datos) => solicitar('agenda', 'POST', '/api/v1/citas', { cuerpo: datos }),
  listarCitas: (parametros) => solicitar('agenda', 'GET', '/api/v1/citas', { parametros }),
  confirmarCita: (citaId) => solicitar('agenda', 'PATCH', `/api/v1/citas/${citaId}/confirmacion`),
  rechazarCita: (citaId, motivo) => solicitar('agenda', 'PATCH', `/api/v1/citas/${citaId}/rechazo`, { cuerpo: { motivo } }),
  cancelarCita: (citaId, motivo) => solicitar('agenda', 'PATCH', `/api/v1/citas/${citaId}/cancelacion`, { cuerpo: { motivo } }),
  reprogramarCita: (citaId, nuevoInicio, motivo) =>
    solicitar('agenda', 'PATCH', `/api/v1/citas/${citaId}/reprogramacion`, { cuerpo: { nuevoInicio, motivo } }),
  registrarAtencionRealizada: (citaId) => solicitar('agenda', 'PATCH', `/api/v1/citas/${citaId}/atencion-realizada`),
  registrarInasistencia: (citaId) => solicitar('agenda', 'PATCH', `/api/v1/citas/${citaId}/inasistencia`),
  pagarCita: (citaId, metodo, simularRechazo = false) =>
    solicitar('agenda', 'POST', `/api/v1/citas/${citaId}/pagos`, { cuerpo: { metodo, simularRechazo } }),
  listarPagosDeCita: (citaId) => solicitar('agenda', 'GET', `/api/v1/citas/${citaId}/pagos`),
  listarRecordatorios: () => solicitar('agenda', 'GET', '/api/v1/citas/recordatorios'),

  listarPagos: (parametros) => solicitar('agenda', 'GET', '/api/v1/pagos', { parametros }),
  anularPago: (pagoId) => solicitar('agenda', 'PATCH', `/api/v1/pagos/${pagoId}/anulacion`),

  contarCitasPorEstado: (parametros) => solicitar('agenda', 'GET', '/api/v1/reportes/citas-por-estado', { parametros }),
  resumirAtencionesPorNutricionista: (parametros) => solicitar('agenda', 'GET', '/api/v1/reportes/atenciones-por-nutricionista', { parametros }),
  listarServiciosMasSolicitados: (parametros) => solicitar('agenda', 'GET', '/api/v1/reportes/servicios-mas-solicitados', { parametros }),
  resumirActividadPorDia: (parametros) => solicitar('agenda', 'GET', '/api/v1/reportes/actividad-agenda', { parametros }),
  contarEventosDeCitas: (parametros) => solicitar('agenda', 'GET', '/api/v1/reportes/eventos-de-citas', { parametros }),
  contarPacientesAtendidos: (parametros) => solicitar('agenda', 'GET', '/api/v1/reportes/pacientes-atendidos', { parametros }),
};
