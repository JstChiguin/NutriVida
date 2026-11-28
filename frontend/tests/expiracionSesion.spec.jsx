import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import RutaProtegida from '../src/rutas/RutaProtegida.jsx';
import IniciarSesion from '../src/paginas/IniciarSesion.jsx';
import { useAutenticacion } from '../src/hooks/useAutenticacion.js';
import { clinicoApi } from '../src/servicios/clinicoApi.js';
import { MENSAJE_SESION_EXPIRADA, MENSAJE_SIN_PERMISOS, obtenerExpiracionMs, tokenExpirado } from '../src/utils/sesion.js';
import { renderizarEn } from './ayudas.jsx';

const AHORA = new Date('2026-11-22T12:00:00Z');
const USUARIO = { id: 'u1', correo: 'ana@nutrivida.test', nombreCompleto: 'Ana Prueba Demo', rol: 'PACIENTE', activo: true };

function codificar(objeto) {
  return btoa(JSON.stringify(objeto)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function crearJwt(segundosDesdeAhora, identificador = 'a') {
  const exp = Math.floor(Date.now() / 1000) + segundosDesdeAhora;
  return `${codificar({ alg: 'HS256' })}.${codificar({ sub: 'u1', rol: 'PACIENTE', exp, jti: identificador })}.firma`;
}

function guardarSesion(token) {
  sessionStorage.setItem('nutrivida.sesion', JSON.stringify({ token, usuario: USUARIO }));
}

function respuesta(estado, cuerpo) {
  const texto = cuerpo === undefined ? '' : JSON.stringify(cuerpo);
  return { ok: estado < 400, status: estado, text: async () => texto };
}

function Panel() {
  const { autenticado, usuario, avisoSesion, iniciarSesion, cerrarSesion } = useAutenticacion();
  const [resultado, setResultado] = useState('sin consulta');
  const consultar = () => clinicoApi.consultarMiPerfilPaciente()
    .then(() => setResultado('ok'))
    .catch((error) => setResultado(`${error.estado}: ${error.message}`));
  return (
    <div>
      <p>{autenticado ? `Sesión de ${usuario.nombreCompleto}` : 'Sin sesión'}</p>
      <p>{avisoSesion ? `Aviso: ${avisoSesion}` : 'Sin aviso'}</p>
      <p>{`Resultado: ${resultado}`}</p>
      <button type="button" onClick={() => iniciarSesion('ana@nutrivida.test', 'x').catch(() => null)}>Entrar</button>
      <button type="button" onClick={cerrarSesion}>Salir</button>
      <button type="button" onClick={consultar}>Consultar</button>
    </div>
  );
}

function RutasDePrueba() {
  return (
    <Routes>
      <Route path="/iniciar-sesion" element={<IniciarSesion />} />
      <Route element={<RutaProtegida />}>
        <Route path="/mis-datos" element={<Panel />} />
      </Route>
      <Route path="/" element={<Panel />} />
    </Routes>
  );
}

async function pulsar(nombre) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: nombre }));
  });
}

async function avanzar(milisegundos) {
  await act(async () => {
    vi.advanceTimersByTime(milisegundos);
  });
}

async function saltarEnElTiempo(milisegundos) {
  vi.setSystemTime(Date.now() + milisegundos);
}

describe('Utilidades de vigencia del token', () => {
  it('lee la expiración real del JWT en milisegundos', () => {
    const exp = 1893456000;
    const token = `${codificar({ alg: 'HS256' })}.${codificar({ exp })}.firma`;
    expect(obtenerExpiracionMs(token)).toBe(exp * 1000);
  });

  it('no determina expiración para textos que no son un JWT', () => {
    expect(obtenerExpiracionMs('token-de-prueba')).toBeNull();
    expect(obtenerExpiracionMs('a.%%%.c')).toBeNull();
    expect(obtenerExpiracionMs(null)).toBeNull();
    expect(tokenExpirado('token-de-prueba')).toBe(false);
  });

  it('distingue un token vencido de uno vigente', () => {
    const ahora = Date.parse('2026-11-22T12:00:00Z');
    const vigente = `x.${codificar({ exp: Math.floor(ahora / 1000) + 10 })}.y`;
    const vencido = `x.${codificar({ exp: Math.floor(ahora / 1000) - 10 })}.y`;
    expect(tokenExpirado(vigente, ahora)).toBe(false);
    expect(tokenExpirado(vencido, ahora)).toBe(true);
  });
});

describe('Expiración y cierre controlado de la sesión', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(AHORA);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('inicia sesión contra la ruta versionada y persiste la sesión', async () => {
    const token = crearJwt(3600);
    fetch.mockResolvedValue(respuesta(200, { token, tipo: 'Bearer', usuario: USUARIO }));
    renderizarEn(<Panel />);

    await pulsar('Entrar');

    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    expect(fetch.mock.calls[0][0]).toContain('/api/v1/autenticacion/iniciar-sesion');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(sessionStorage.getItem('nutrivida.sesion')).token).toBe(token);
  });

  it('envía el token a las rutas versionadas con la sesión iniciada', async () => {
    guardarSesion(crearJwt(3600));
    fetch.mockResolvedValue(respuesta(200, {}));
    renderizarEn(<Panel />);

    await pulsar('Consultar');

    expect(fetch.mock.calls[0][0]).toContain('/api/v1/pacientes/yo');
    expect(fetch.mock.calls[0][1].headers.Authorization).toMatch(/^Bearer /);
    expect(screen.getByText('Resultado: ok')).toBeTruthy();
  });

  it('F5 con token vigente: restaura la sesión sin aviso', () => {
    guardarSesion(crearJwt(3600));
    renderizarEn(<Panel />);

    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    expect(screen.getByText('Sin aviso')).toBeTruthy();
    expect(sessionStorage.getItem('nutrivida.sesion')).not.toBeNull();
  });

  it('F5 con token expirado y renovación rechazada: no autentica, limpia el almacenamiento y avisa', async () => {
    guardarSesion(crearJwt(-60));
    fetch.mockResolvedValue(respuesta(401, { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'La sesión expiró' }));
    renderizarEn(<RutasDePrueba />, '/mis-datos');
    await act(async () => {});

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByText(MENSAJE_SESION_EXPIRADA)).toBeTruthy();
    expect(sessionStorage.getItem('nutrivida.sesion')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain('/api/v1/autenticacion/refrescar');
  });

  it('sin renovación posible: cierra la sesión al llegar al margen previo al vencimiento', async () => {
    guardarSesion(crearJwt(60));
    fetch.mockResolvedValue(respuesta(401, {}));
    renderizarEn(<RutasDePrueba />, '/mis-datos');

    await avanzar(29_000);
    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();

    await avanzar(2_000);
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByText(MENSAJE_SESION_EXPIRADA)).toBeTruthy();
    expect(sessionStorage.getItem('nutrivida.sesion')).toBeNull();
  });

  it('expiración con la pestaña inactiva: comprueba la vigencia al recuperar el foco', async () => {
    guardarSesion(crearJwt(60));
    renderizarEn(<Panel />);

    await saltarEnElTiempo(120_000);
    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(screen.getByText('Sin sesión')).toBeTruthy();
    expect(screen.getByText(`Aviso: ${MENSAJE_SESION_EXPIRADA}`)).toBeTruthy();
    expect(sessionStorage.getItem('nutrivida.sesion')).toBeNull();
  });

  it('expiración con la pestaña inactiva: comprueba la vigencia al volver a ser visible', async () => {
    guardarSesion(crearJwt(60));
    renderizarEn(<Panel />);

    await saltarEnElTiempo(120_000);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByText('Sin sesión')).toBeTruthy();
  });

  it('no cierra la sesión al recuperar el foco si el token sigue vigente', async () => {
    guardarSesion(crearJwt(3600));
    renderizarEn(<Panel />);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
  });

  it('no envía la petición original si el token venció y la renovación falla', async () => {
    guardarSesion(crearJwt(3600));
    renderizarEn(<Panel />);
    fetch.mockResolvedValue(respuesta(401, {}));

    await saltarEnElTiempo(7_200_000);
    await pulsar('Consultar');

    expect(fetch.mock.calls.every(([url]) => url.includes('/refrescar'))).toBe(true);
    expect(screen.getByText('Sin sesión')).toBeTruthy();
    expect(screen.getByText(`Aviso: ${MENSAJE_SESION_EXPIRADA}`)).toBeTruthy();
    expect(sessionStorage.getItem('nutrivida.sesion')).toBeNull();
  });

  it('respuesta 401 en una petición autenticada: limpia la sesión y muestra un mensaje claro', async () => {
    guardarSesion(crearJwt(3600));
    fetch.mockResolvedValue(respuesta(401, { codigo: 'NO_AUTENTICADO', mensaje: 'Debe iniciar sesión para acceder' }));
    renderizarEn(<Panel />);

    await pulsar('Consultar');

    expect(screen.getByText('Sin sesión')).toBeTruthy();
    expect(screen.getByText(`Aviso: ${MENSAJE_SESION_EXPIRADA}`)).toBeTruthy();
    expect(sessionStorage.getItem('nutrivida.sesion')).toBeNull();
  });

  it('respuesta 403: informa la falta de permisos sin cerrar la sesión', async () => {
    guardarSesion(crearJwt(3600));
    fetch.mockResolvedValue(respuesta(403, {}));
    renderizarEn(<Panel />);

    await pulsar('Consultar');

    expect(screen.getByText(`Resultado: 403: ${MENSAJE_SIN_PERMISOS}`)).toBeTruthy();
    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    expect(screen.getByText('Sin aviso')).toBeTruthy();
    expect(sessionStorage.getItem('nutrivida.sesion')).not.toBeNull();
  });

  it('respuesta 403 con mensaje del servidor: lo conserva y mantiene la sesión', async () => {
    guardarSesion(crearJwt(3600));
    fetch.mockResolvedValue(respuesta(403, { codigo: 'PERMISO_DENEGADO', mensaje: 'No tiene permisos para realizar esta operación' }));
    renderizarEn(<Panel />);

    await pulsar('Consultar');

    expect(screen.getByText('Resultado: 403: No tiene permisos para realizar esta operación')).toBeTruthy();
    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
  });

  it('cierre de sesión manual: limpia el estado, no deja aviso ni temporizadores activos', async () => {
    guardarSesion(crearJwt(60));
    fetch.mockResolvedValue(respuesta(204));
    renderizarEn(<Panel />);

    await pulsar('Salir');

    expect(fetch.mock.calls[0][0]).toContain('/api/v1/autenticacion/cerrar-sesion');
    expect(screen.getByText('Sin sesión')).toBeTruthy();
    expect(screen.getByText('Sin aviso')).toBeTruthy();
    expect(sessionStorage.getItem('nutrivida.sesion')).toBeNull();

    await avanzar(180_000);
    expect(screen.getByText('Sin aviso')).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cierre de sesión manual con el token ya vencido: no muestra aviso de expiración', async () => {
    guardarSesion(crearJwt(60));
    renderizarEn(<Panel />);

    await saltarEnElTiempo(120_000);
    await pulsar('Salir');

    expect(screen.getByText('Sin sesión')).toBeTruthy();
    expect(screen.getByText('Sin aviso')).toBeTruthy();
  });

  it('iniciar sesión de nuevo tras expirar restablece el estado y programa la nueva expiración', async () => {
    guardarSesion(crearJwt(60, 'a'));
    renderizarEn(<Panel />);
    await avanzar(61_000);
    expect(screen.getByText(`Aviso: ${MENSAJE_SESION_EXPIRADA}`)).toBeTruthy();

    const nuevo = crearJwt(3600, 'b');
    fetch.mockResolvedValue(respuesta(200, { token: nuevo, tipo: 'Bearer', usuario: USUARIO }));
    await pulsar('Entrar');

    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    expect(screen.getByText('Sin aviso')).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('nutrivida.sesion')).token).toBe(nuevo);

    fetch.mockResolvedValue(respuesta(401, {}));
    await avanzar(3_000_000);
    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    await avanzar(700_000);
    expect(screen.getByText('Sin sesión')).toBeTruthy();
  });

  it('el temporizador de una sesión anterior no cierra la sesión de un usuario nuevo', async () => {
    const primero = crearJwt(60, 'a');
    const segundo = crearJwt(3600, 'b');
    fetch.mockResolvedValueOnce(respuesta(200, { token: primero, tipo: 'Bearer', usuario: USUARIO }));
    fetch.mockResolvedValueOnce(respuesta(200, { token: segundo, tipo: 'Bearer', usuario: { ...USUARIO, nombreCompleto: 'Beto Prueba Demo' } }));
    renderizarEn(<Panel />);

    await pulsar('Entrar');
    await pulsar('Entrar');
    expect(screen.getByText('Sesión de Beto Prueba Demo')).toBeTruthy();
    expect(vi.getTimerCount()).toBe(1);

    await avanzar(120_000);

    expect(screen.getByText('Sesión de Beto Prueba Demo')).toBeTruthy();
    expect(screen.getByText('Sin aviso')).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('nutrivida.sesion')).token).toBe(segundo);
  });

  it('un 401 tardío de una petición del usuario anterior no cierra la sesión del usuario nuevo', async () => {
    const primero = crearJwt(3600, 'a');
    const segundo = crearJwt(3600, 'b');
    guardarSesion(primero);
    let resolverTardia;
    fetch.mockImplementation((url) => {
      if (url.includes('/refrescar')) {
        return Promise.resolve(respuesta(401, {}));
      }
      if (url.includes('iniciar-sesion')) {
        return Promise.resolve(respuesta(200, { token: segundo, tipo: 'Bearer', usuario: { ...USUARIO, nombreCompleto: 'Beto Prueba Demo' } }));
      }
      return new Promise((resolver) => {
        resolverTardia = resolver;
      });
    });
    renderizarEn(<Panel />);

    await pulsar('Consultar');
    await pulsar('Entrar');
    expect(screen.getByText('Sesión de Beto Prueba Demo')).toBeTruthy();

    await act(async () => {
      resolverTardia(respuesta(401, { codigo: 'NO_AUTENTICADO', mensaje: 'Debe iniciar sesión para acceder' }));
    });

    expect(screen.getByText('Sesión de Beto Prueba Demo')).toBeTruthy();
    expect(screen.getByText('Sin aviso')).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('nutrivida.sesion')).token).toBe(segundo);
  });

  it('libera el temporizador al desmontar la aplicación', async () => {
    guardarSesion(crearJwt(3600));
    const { rerender } = renderizarEn(<Panel />);
    rerender(<div />);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('conserva la sesión cuando el token no es un JWT con expiración legible', () => {
    sessionStorage.setItem('nutrivida.sesion', JSON.stringify({ token: 'token-de-prueba', usuario: USUARIO }));
    renderizarEn(<Panel />);

    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Renovación automática de la sesión', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(AHORA);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('con el token vencido renueva y luego envía la petición original con el nuevo token', async () => {
    guardarSesion(crearJwt(3600, 'viejo'));
    const nuevo = crearJwt(900, 'nuevo');
    fetch.mockImplementation((url) => Promise.resolve(url.includes('/refrescar')
      ? respuesta(200, { token: nuevo, tipo: 'Bearer', usuario: USUARIO })
      : respuesta(200, {})));
    renderizarEn(<Panel />);
    await act(async () => {});
    fetch.mockClear();

    await saltarEnElTiempo(7_200_000);
    await pulsar('Consultar');

    expect(screen.getByText('Resultado: ok')).toBeTruthy();
    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('nutrivida.sesion')).token).toBe(nuevo);
    const llamadaPaciente = fetch.mock.calls.find(([url]) => url.includes('/pacientes/yo'));
    expect(llamadaPaciente[1].headers.Authorization).toBe(`Bearer ${nuevo}`);
  });

  it('la solicitud de renovación envía la cookie y la cabecera anti-CSRF', async () => {
    guardarSesion(crearJwt(-60));
    fetch.mockResolvedValue(respuesta(401, {}));
    renderizarEn(<Panel />);
    await act(async () => {});

    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toContain('/api/v1/autenticacion/refrescar');
    expect(opciones.method).toBe('POST');
    expect(opciones.credentials).toBe('include');
    expect(opciones.headers['X-Nutrivida-Csrf']).toBe('1');
  });

  it('ante un 401 renueva una vez y reintenta la petición con el nuevo token', async () => {
    guardarSesion(crearJwt(3600, 'viejo'));
    const nuevo = crearJwt(900, 'nuevo');
    let intentos = 0;
    fetch.mockImplementation((url) => {
      if (url.includes('/refrescar')) {
        return Promise.resolve(respuesta(200, { token: nuevo, tipo: 'Bearer', usuario: USUARIO }));
      }
      intentos += 1;
      return Promise.resolve(intentos === 1 ? respuesta(401, {}) : respuesta(200, {}));
    });
    renderizarEn(<Panel />);

    await pulsar('Consultar');

    expect(screen.getByText('Resultado: ok')).toBeTruthy();
    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('si el 401 persiste tras renovar no entra en bucle y cierra la sesión', async () => {
    guardarSesion(crearJwt(3600, 'viejo'));
    const nuevo = crearJwt(900, 'nuevo');
    fetch.mockImplementation((url) => Promise.resolve(url.includes('/refrescar')
      ? respuesta(200, { token: nuevo, tipo: 'Bearer', usuario: USUARIO })
      : respuesta(401, {})));
    renderizarEn(<Panel />);

    await pulsar('Consultar');

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(screen.getByText('Sin sesión')).toBeTruthy();
    expect(screen.getByText(`Aviso: ${MENSAJE_SESION_EXPIRADA}`)).toBeTruthy();
  });

  it('varias solicitudes simultáneas con el token vencido provocan una sola renovación', async () => {
    guardarSesion(crearJwt(3600, 'viejo'));
    let nuevo = null;
    fetch.mockImplementation((url) => Promise.resolve(url.includes('/refrescar')
      ? respuesta(200, { token: nuevo, tipo: 'Bearer', usuario: USUARIO })
      : respuesta(200, {})));
    renderizarEn(<Panel />);
    await act(async () => {});
    fetch.mockClear();

    await saltarEnElTiempo(7_200_000);
    nuevo = crearJwt(900, 'nuevo');
    await act(async () => {
      await Promise.all([clinicoApi.consultarMiPerfilPaciente(), clinicoApi.consultarMiPerfilPaciente(),
        clinicoApi.consultarMiPerfilPaciente()]);
    });

    expect(fetch.mock.calls.filter(([url]) => url.includes('/refrescar'))).toHaveLength(1);
    expect(fetch.mock.calls.filter(([url]) => url.includes('/pacientes/yo'))).toHaveLength(3);
  });

  it('renueva por adelantado cuando falta menos del margen para el vencimiento', async () => {
    guardarSesion(crearJwt(60, 'viejo'));
    const nuevo = crearJwt(900, 'nuevo');
    fetch.mockResolvedValue(respuesta(200, { token: nuevo, tipo: 'Bearer', usuario: USUARIO }));
    renderizarEn(<Panel />);

    await avanzar(31_000);

    expect(fetch.mock.calls[0][0]).toContain('/refrescar');
    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('nutrivida.sesion')).token).toBe(nuevo);
  });
});
