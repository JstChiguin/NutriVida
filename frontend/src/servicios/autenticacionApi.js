import { solicitar } from './clienteApi.js';

export const autenticacionApi = {
  iniciarSesion: (correo, contrasena) =>
    solicitar('autenticacion', 'POST', '/api/v1/autenticacion/iniciar-sesion', { cuerpo: { correo, contrasena } }),
  registrarPaciente: (datos) => solicitar('autenticacion', 'POST', '/api/v1/autenticacion/registro', { cuerpo: datos }),
  cerrarSesion: () => solicitar('autenticacion', 'POST', '/api/v1/autenticacion/cerrar-sesion'),
  cambiarContrasena: (contrasenaActual, contrasenaNueva) =>
    solicitar('autenticacion', 'PATCH', '/api/v1/usuarios/yo/contrasena', { cuerpo: { contrasenaActual, contrasenaNueva } }),
  listarUsuarios: (parametros) => solicitar('autenticacion', 'GET', '/api/v1/usuarios', { parametros }),
  crearUsuario: (datos) => solicitar('autenticacion', 'POST', '/api/v1/usuarios', { cuerpo: datos }),
  actualizarUsuario: (usuarioId, datos) => solicitar('autenticacion', 'PUT', `/api/v1/usuarios/${usuarioId}`, { cuerpo: datos }),
  cambiarEstadoUsuario: (usuarioId, activo) =>
    solicitar('autenticacion', 'PATCH', `/api/v1/usuarios/${usuarioId}/estado`, { cuerpo: { activo } }),
  cambiarRolUsuario: (usuarioId, rol) =>
    solicitar('autenticacion', 'PATCH', `/api/v1/usuarios/${usuarioId}/rol`, { cuerpo: { rol } }),
};
