import { solicitar } from './clienteApi.js';

export const autenticacionApi = {
  iniciarSesion: (correo, contrasena) =>
    solicitar('autenticacion', 'POST', '/api/autenticacion/iniciar-sesion', { cuerpo: { correo, contrasena } }),
  registrarPaciente: (datos) => solicitar('autenticacion', 'POST', '/api/autenticacion/registro', { cuerpo: datos }),
  cerrarSesion: () => solicitar('autenticacion', 'POST', '/api/autenticacion/cerrar-sesion'),
  cambiarContrasena: (contrasenaActual, contrasenaNueva) =>
    solicitar('autenticacion', 'PATCH', '/api/usuarios/yo/contrasena', { cuerpo: { contrasenaActual, contrasenaNueva } }),
  listarUsuarios: (parametros) => solicitar('autenticacion', 'GET', '/api/usuarios', { parametros }),
  crearUsuario: (datos) => solicitar('autenticacion', 'POST', '/api/usuarios', { cuerpo: datos }),
  actualizarUsuario: (usuarioId, datos) => solicitar('autenticacion', 'PUT', `/api/usuarios/${usuarioId}`, { cuerpo: datos }),
  cambiarEstadoUsuario: (usuarioId, activo) =>
    solicitar('autenticacion', 'PATCH', `/api/usuarios/${usuarioId}/estado`, { cuerpo: { activo } }),
  cambiarRolUsuario: (usuarioId, rol) =>
    solicitar('autenticacion', 'PATCH', `/api/usuarios/${usuarioId}/rol`, { cuerpo: { rol } }),
};
