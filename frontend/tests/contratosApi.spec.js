import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agendaApi } from '../src/servicios/agendaApi.js';
import { autenticacionApi } from '../src/servicios/autenticacionApi.js';
import { solicitar } from '../src/servicios/clienteApi.js';
import { clinicoApi } from '../src/servicios/clinicoApi.js';

vi.mock('../src/servicios/clienteApi.js', () => ({ solicitar: vi.fn().mockResolvedValue(null) }));

const P = { pagina: 1 };

const CONTRATO_AUTENTICACION = {
  iniciarSesion: [['a@b.cl', 'x'], 'POST', '/api/v1/autenticacion/iniciar-sesion', { cuerpo: { correo: 'a@b.cl', contrasena: 'x' } }],
  registrarPaciente: [[{ n: 1 }], 'POST', '/api/v1/autenticacion/registro', { cuerpo: { n: 1 } }],
  cerrarSesion: [[], 'POST', '/api/v1/autenticacion/cerrar-sesion'],
  cambiarContrasena: [['a', 'b'], 'PATCH', '/api/v1/usuarios/yo/contrasena', { cuerpo: { contrasenaActual: 'a', contrasenaNueva: 'b' } }],
  listarUsuarios: [[P], 'GET', '/api/v1/usuarios', { parametros: P }],
  crearUsuario: [[{ n: 1 }], 'POST', '/api/v1/usuarios', { cuerpo: { n: 1 } }],
  actualizarUsuario: [['u1', { n: 1 }], 'PUT', '/api/v1/usuarios/u1', { cuerpo: { n: 1 } }],
  cambiarEstadoUsuario: [['u1', false], 'PATCH', '/api/v1/usuarios/u1/estado', { cuerpo: { activo: false } }],
  cambiarRolUsuario: [['u1', 'PACIENTE'], 'PATCH', '/api/v1/usuarios/u1/rol', { cuerpo: { rol: 'PACIENTE' } }],
};

const CONTRATO_CLINICO = {
  listarServicios: [[P], 'GET', '/api/v1/servicios', { parametros: P }],
  crearServicio: [[{ n: 1 }], 'POST', '/api/v1/servicios', { cuerpo: { n: 1 } }],
  actualizarServicio: [['s1', { n: 1 }], 'PUT', '/api/v1/servicios/s1', { cuerpo: { n: 1 } }],
  cambiarEstadoServicio: [['s1', true], 'PATCH', '/api/v1/servicios/s1/estado', { cuerpo: { activo: true } }],
  listarNutricionistas: [[P], 'GET', '/api/v1/nutricionistas', { parametros: P }],
  consultarNutricionista: [['n1'], 'GET', '/api/v1/nutricionistas/n1'],
  consultarMiPerfilNutricionista: [[], 'GET', '/api/v1/nutricionistas/yo'],
  actualizarMiPerfilNutricionista: [[{ n: 1 }], 'PUT', '/api/v1/nutricionistas/yo', { cuerpo: { n: 1 } }],
  crearNutricionista: [[{ n: 1 }], 'POST', '/api/v1/nutricionistas', { cuerpo: { n: 1 } }],
  cambiarEstadoNutricionista: [['n1', false], 'PATCH', '/api/v1/nutricionistas/n1/estado', { cuerpo: { activo: false } }],
  consultarMiPerfilPaciente: [[], 'GET', '/api/v1/pacientes/yo'],
  actualizarMiPerfilPaciente: [[{ n: 1 }], 'PUT', '/api/v1/pacientes/yo', { cuerpo: { n: 1 } }],
  listarPacientes: [[P], 'GET', '/api/v1/pacientes', { parametros: P }],
  consultarPaciente: [['p1'], 'GET', '/api/v1/pacientes/p1'],
  cambiarEstadoPaciente: [['p1', true], 'PATCH', '/api/v1/pacientes/p1/estado', { cuerpo: { activo: true } }],
  autorizarNutricionista: [['p1', 'n1'], 'PUT', '/api/v1/pacientes/p1/nutricionistas/n1'],
  retirarNutricionista: [['p1', 'n1'], 'DELETE', '/api/v1/pacientes/p1/nutricionistas/n1'],
  consultarFicha: [['p1'], 'GET', '/api/v1/pacientes/p1/ficha-clinica'],
  abrirFicha: [['p1', { n: 1 }], 'POST', '/api/v1/pacientes/p1/ficha-clinica', { cuerpo: { n: 1 } }],
  actualizarFicha: [['p1', { n: 1 }, 'Motivo'], 'PUT', '/api/v1/pacientes/p1/ficha-clinica', { cuerpo: { datos: { n: 1 }, motivoCambio: 'Motivo' } }],
  registrarEvolucion: [['p1', { n: 1 }], 'POST', '/api/v1/pacientes/p1/ficha-clinica/evoluciones', { cuerpo: { n: 1 } }],
  corregirEvolucion: [['p1', 'e1', { n: 1 }], 'POST', '/api/v1/pacientes/p1/ficha-clinica/evoluciones/e1/correcciones', { cuerpo: { n: 1 } }],
  consultarEvolucionMediciones: [['p1'], 'GET', '/api/v1/pacientes/p1/mediciones/evolucion'],
  listarMediciones: [['p1', P], 'GET', '/api/v1/pacientes/p1/mediciones', { parametros: P }],
  anularMedicion: [['p1', 'm1', 'Error de digitación'], 'PATCH', '/api/v1/pacientes/p1/mediciones/m1/anulacion', { cuerpo: { motivo: 'Error de digitación' } }],
  registrarMedicion: [['p1', { n: 1 }], 'POST', '/api/v1/pacientes/p1/mediciones', { cuerpo: { n: 1 } }],
  consultarPlanVigente: [['p1'], 'GET', '/api/v1/pacientes/p1/planes-alimentarios/vigente'],
  listarVersionesPlan: [['p1'], 'GET', '/api/v1/pacientes/p1/planes-alimentarios'],
  crearPlan: [['p1', { n: 1 }], 'POST', '/api/v1/pacientes/p1/planes-alimentarios', { cuerpo: { n: 1 } }],
  actualizarPlan: [['pl1', { n: 1 }], 'PUT', '/api/v1/planes-alimentarios/pl1', { cuerpo: { n: 1 } }],
  enviarSolicitudContacto: [[{ n: 1 }], 'POST', '/api/v1/solicitudes-contacto', { cuerpo: { n: 1 } }],
  listarSolicitudesContacto: [[P], 'GET', '/api/v1/solicitudes-contacto', { parametros: P }],
  cambiarEstadoSolicitudContacto: [['sc1', 'ATENDIDA'], 'PATCH', '/api/v1/solicitudes-contacto/sc1/estado', { cuerpo: { estado: 'ATENDIDA' } }],
  listarAuditorias: [[P], 'GET', '/api/v1/auditorias', { parametros: P }],
  resumirPacientes: [[P], 'GET', '/api/v1/reportes/pacientes', { parametros: P }],
};

const CONTRATO_AGENDA = {
  consultarDisponibilidad: [['n1', P], 'GET', '/api/v1/agendas/n1/disponibilidad', { parametros: P }],
  consultarAgenda: [['n1'], 'GET', '/api/v1/agendas/n1'],
  definirHorarios: [['n1', [1]], 'PUT', '/api/v1/agendas/n1/horarios', { cuerpo: { horarios: [1] } }],
  agregarBloqueo: [['n1', { n: 1 }], 'POST', '/api/v1/agendas/n1/bloqueos', { cuerpo: { n: 1 } }],
  quitarBloqueo: [['n1', 'b1'], 'DELETE', '/api/v1/agendas/n1/bloqueos/b1'],
  solicitarCita: [[{ n: 1 }], 'POST', '/api/v1/citas', { cuerpo: { n: 1 } }],
  listarCitas: [[P], 'GET', '/api/v1/citas', { parametros: P }],
  confirmarCita: [['c1'], 'PATCH', '/api/v1/citas/c1/confirmacion'],
  rechazarCita: [['c1', 'Motivo'], 'PATCH', '/api/v1/citas/c1/rechazo', { cuerpo: { motivo: 'Motivo' } }],
  cancelarCita: [['c1', 'Motivo'], 'PATCH', '/api/v1/citas/c1/cancelacion', { cuerpo: { motivo: 'Motivo' } }],
  reprogramarCita: [['c1', '2026-11-04T12:00:00Z', 'Cambio'], 'PATCH', '/api/v1/citas/c1/reprogramacion', { cuerpo: { nuevoInicio: '2026-11-04T12:00:00Z', motivo: 'Cambio' } }],
  registrarAtencionRealizada: [['c1'], 'PATCH', '/api/v1/citas/c1/atencion-realizada'],
  registrarInasistencia: [['c1'], 'PATCH', '/api/v1/citas/c1/inasistencia'],
  pagarCita: [['c1', 'TARJETA_SIMULADA', true], 'POST', '/api/v1/citas/c1/pagos', { cuerpo: { metodo: 'TARJETA_SIMULADA', simularRechazo: true } }],
  listarPagosDeCita: [['c1'], 'GET', '/api/v1/citas/c1/pagos'],
  listarRecordatorios: [[], 'GET', '/api/v1/citas/recordatorios'],
  listarPagos: [[P], 'GET', '/api/v1/pagos', { parametros: P }],
  anularPago: [['pg1'], 'PATCH', '/api/v1/pagos/pg1/anulacion'],
  contarCitasPorEstado: [[P], 'GET', '/api/v1/reportes/citas-por-estado', { parametros: P }],
  resumirAtencionesPorNutricionista: [[P], 'GET', '/api/v1/reportes/atenciones-por-nutricionista', { parametros: P }],
  listarServiciosMasSolicitados: [[P], 'GET', '/api/v1/reportes/servicios-mas-solicitados', { parametros: P }],
  resumirActividadPorDia: [[P], 'GET', '/api/v1/reportes/actividad-agenda', { parametros: P }],
  contarEventosDeCitas: [[P], 'GET', '/api/v1/reportes/eventos-de-citas', { parametros: P }],
  contarPacientesAtendidos: [[P], 'GET', '/api/v1/reportes/pacientes-atendidos', { parametros: P }],
};

const SERVICIOS = [
  ['autenticacion', autenticacionApi, CONTRATO_AUTENTICACION],
  ['clinico', clinicoApi, CONTRATO_CLINICO],
  ['agenda', agendaApi, CONTRATO_AGENDA],
];

describe('Contrato de los módulos de acceso a la API REST', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(SERVICIOS)('el contrato del servicio %s cubre todas las funciones del módulo', (_servicio, modulo, contrato) => {
    expect(Object.keys(contrato).sort()).toEqual(Object.keys(modulo).sort());
  });

  for (const [servicio, modulo, contrato] of SERVICIOS) {
    it.each(Object.entries(contrato))(`${servicio}: %s usa el método, la ruta y el cuerpo esperados`, (nombre, [argumentos, metodo, ruta, opciones]) => {
      modulo[nombre](...argumentos);

      if (opciones) {
        expect(solicitar).toHaveBeenCalledWith(servicio, metodo, ruta, opciones);
      } else {
        expect(solicitar).toHaveBeenCalledWith(servicio, metodo, ruta);
      }
    });
  }

  it('todas las rutas del contrato pertenecen a la API versionada /api/v1', () => {
    for (const [, , contrato] of SERVICIOS) {
      for (const [, [, , ruta]] of Object.entries(contrato)) {
        expect(ruta.startsWith('/api/v1/')).toBe(true);
      }
    }
  });
});
