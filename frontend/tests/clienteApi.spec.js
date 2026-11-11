import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi, configurarSesionApi, describirError, solicitar } from '../src/servicios/clienteApi.js';

function simularRespuesta(estado, cuerpo) {
  return Promise.resolve({
    ok: estado >= 200 && estado < 300,
    status: estado,
    text: () => Promise.resolve(cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
  });
}

describe('Cliente de la API REST', () => {
  beforeEach(() => {
    configurarSesionApi({ obtenerToken: () => null, alInvalidarSesion: () => {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('construye la URL con parámetros omitiendo los vacíos', async () => {
    const peticion = vi.fn(() => simularRespuesta(200, { contenido: [] }));
    vi.stubGlobal('fetch', peticion);

    await solicitar('clinico', 'GET', '/api/servicios', { parametros: { texto: 'peso', categoria: '', pagina: 0 } });

    expect(peticion.mock.calls[0][0]).toBe('http://localhost:8082/api/servicios?texto=peso&pagina=0');
  });

  it('envía el token Bearer y el cuerpo JSON cuando existen', async () => {
    const peticion = vi.fn(() => simularRespuesta(201, { id: '1' }));
    vi.stubGlobal('fetch', peticion);
    configurarSesionApi({ obtenerToken: () => 'abc', alInvalidarSesion: () => {} });

    await solicitar('agenda', 'POST', '/api/citas', { cuerpo: { motivoConsulta: 'Control' } });

    const [, opciones] = peticion.mock.calls[0];
    expect(opciones.headers.Authorization).toBe('Bearer abc');
    expect(opciones.headers['Content-Type']).toBe('application/json');
    expect(opciones.body).toBe('{"motivoConsulta":"Control"}');
  });

  it('devuelve null cuando la respuesta no tiene contenido', async () => {
    vi.stubGlobal('fetch', vi.fn(() => simularRespuesta(204)));

    expect(await solicitar('autenticacion', 'POST', '/api/autenticacion/cerrar-sesion')).toBeNull();
  });

  it('convierte los errores del backend en ErrorApi con código y detalles', async () => {
    vi.stubGlobal('fetch', vi.fn(() => simularRespuesta(400, {
      codigo: 'VALIDACION_FALLIDA', mensaje: 'Los datos enviados no son válidos', detalles: ['correo: no es válido'],
    })));

    const error = await solicitar('autenticacion', 'POST', '/api/usuarios', { cuerpo: {} }).catch((falla) => falla);

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.estado).toBe(400);
    expect(error.codigo).toBe('VALIDACION_FALLIDA');
    expect(describirError(error)).toBe('Los datos enviados no son válidos: correo: no es válido');
  });

  it('informa falta de conexión cuando fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('fallo de red'))));

    const error = await solicitar('clinico', 'GET', '/api/servicios').catch((falla) => falla);

    expect(error.codigo).toBe('SIN_CONEXION');
  });

  it('invalida la sesión local cuando el servidor responde 401 a un usuario con token', async () => {
    const alInvalidarSesion = vi.fn();
    configurarSesionApi({ obtenerToken: () => 'vencido', alInvalidarSesion });
    vi.stubGlobal('fetch', vi.fn(() => simularRespuesta(401, { codigo: 'NO_AUTENTICADO', mensaje: 'Debe iniciar sesión' })));

    await solicitar('agenda', 'GET', '/api/citas').catch(() => null);

    expect(alInvalidarSesion).toHaveBeenCalledTimes(1);
  });

  it('describe un error desconocido con un mensaje genérico', () => {
    expect(describirError(new Error('interno'))).toBe('Ocurrió un error inesperado');
  });
});
