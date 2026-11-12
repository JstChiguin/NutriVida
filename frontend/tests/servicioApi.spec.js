import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agendaApi } from '../src/servicios/agendaApi.js';
import { autenticacionApi } from '../src/servicios/autenticacionApi.js';
import { solicitar } from '../src/servicios/clienteApi.js';
import { clinicoApi } from '../src/servicios/clinicoApi.js';

vi.mock('../src/servicios/clienteApi.js', () => ({ solicitar: vi.fn().mockResolvedValue(null) }));

const CASOS = [
  ['autenticación: inicio de sesión', () => autenticacionApi.iniciarSesion('a@b.cl', 'x'), 'autenticacion', 'POST', '/api/autenticacion/iniciar-sesion', { cuerpo: { correo: 'a@b.cl', contrasena: 'x' } }],
  ['autenticación: cierre de sesión', () => autenticacionApi.cerrarSesion(), 'autenticacion', 'POST', '/api/autenticacion/cerrar-sesion'],
  ['autenticación: cambio de rol', () => autenticacionApi.cambiarRolUsuario('u1', 'PACIENTE'), 'autenticacion', 'PATCH', '/api/usuarios/u1/rol', { cuerpo: { rol: 'PACIENTE' } }],
  ['clínico: servicios', () => clinicoApi.listarServicios({ tamano: 5 }), 'clinico', 'GET', '/api/servicios', { parametros: { tamano: 5 } }],
  ['clínico: perfil del paciente', () => clinicoApi.consultarMiPerfilPaciente(), 'clinico', 'GET', '/api/pacientes/yo'],
  ['clínico: ficha clínica', () => clinicoApi.consultarFicha('p1'), 'clinico', 'GET', '/api/pacientes/p1/ficha-clinica'],
  ['clínico: corrección de evolución', () => clinicoApi.corregirEvolucion('p1', 'e1', { descripcion: 'x' }), 'clinico', 'POST', '/api/pacientes/p1/ficha-clinica/evoluciones/e1/correcciones', { cuerpo: { descripcion: 'x' } }],
  ['clínico: evolución de mediciones', () => clinicoApi.consultarEvolucionMediciones('p1'), 'clinico', 'GET', '/api/pacientes/p1/mediciones/evolucion'],
  ['clínico: plan vigente', () => clinicoApi.consultarPlanVigente('p1'), 'clinico', 'GET', '/api/pacientes/p1/planes-alimentarios/vigente'],
  ['clínico: nueva versión de plan', () => clinicoApi.actualizarPlan('pl1', { objetivos: [] }), 'clinico', 'PUT', '/api/planes-alimentarios/pl1', { cuerpo: { objetivos: [] } }],
  ['clínico: solicitud de contacto', () => clinicoApi.enviarSolicitudContacto({ nombre: 'x' }), 'clinico', 'POST', '/api/solicitudes-contacto', { cuerpo: { nombre: 'x' } }],
  ['clínico: auditoría', () => clinicoApi.listarAuditorias({ entidad: 'citas' }), 'clinico', 'GET', '/api/auditorias', { parametros: { entidad: 'citas' } }],
  ['agenda: disponibilidad', () => agendaApi.consultarDisponibilidad('n1', { fecha: '2026-11-03' }), 'agenda', 'GET', '/api/agendas/n1/disponibilidad', { parametros: { fecha: '2026-11-03' } }],
  ['agenda: horarios', () => agendaApi.definirHorarios('n1', []), 'agenda', 'PUT', '/api/agendas/n1/horarios', { cuerpo: { horarios: [] } }],
  ['agenda: solicitud de cita', () => agendaApi.solicitarCita({ servicioId: 's1' }), 'agenda', 'POST', '/api/citas', { cuerpo: { servicioId: 's1' } }],
  ['agenda: reprogramación', () => agendaApi.reprogramarCita('c1', '2026-11-04T12:00:00Z', 'Cambio'), 'agenda', 'PATCH', '/api/citas/c1/reprogramacion', { cuerpo: { nuevoInicio: '2026-11-04T12:00:00Z', motivo: 'Cambio' } }],
  ['agenda: pago simulado', () => agendaApi.pagarCita('c1', 'TARJETA_SIMULADA'), 'agenda', 'POST', '/api/citas/c1/pagos', { cuerpo: { metodo: 'TARJETA_SIMULADA' } }],
  ['agenda: reporte por estado', () => agendaApi.contarCitasPorEstado({}), 'agenda', 'GET', '/api/reportes/citas-por-estado', { parametros: {} }],
];

describe('Módulos de acceso a la API REST', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(CASOS)('%s invoca el endpoint correcto', (_nombre, ejecutar, servicio, metodo, ruta, opciones) => {
    ejecutar();

    if (opciones) {
      expect(solicitar).toHaveBeenCalledWith(servicio, metodo, ruta, opciones);
    } else {
      expect(solicitar).toHaveBeenCalledWith(servicio, metodo, ruta);
    }
  });
});
