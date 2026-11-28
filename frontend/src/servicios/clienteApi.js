import { URLS_SERVICIOS } from '../configuracion/entorno.js';
import { MENSAJE_SESION_EXPIRADA, MENSAJE_SIN_PERMISOS, tokenExpirado } from '../utils/sesion.js';

export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, detalles = []) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

const CABECERA_ANTI_CSRF = { 'X-Nutrivida-Csrf': '1' };

let proveedorDeToken = () => null;
let alSesionInvalida = () => {};
let alSesionRenovada = () => {};
let renovacionEnCurso = null;

export function configurarSesionApi({ obtenerToken, alInvalidarSesion, alRenovarSesion = () => {} }) {
  proveedorDeToken = obtenerToken;
  alSesionInvalida = alInvalidarSesion;
  alSesionRenovada = alRenovarSesion;
}

async function ejecutarRenovacion() {
  try {
    const respuesta = await fetch(`${URLS_SERVICIOS.autenticacion}/api/v1/autenticacion/refrescar`, {
      method: 'POST',
      credentials: 'include',
      headers: CABECERA_ANTI_CSRF,
    });
    if (!respuesta.ok) {
      return null;
    }
    const datos = await leerRespuesta(respuesta);
    if (!datos?.token) {
      return null;
    }
    alSesionRenovada({ token: datos.token, usuario: datos.usuario });
    return datos.token;
  } catch {
    return null;
  }
}

export function renovarSesion() {
  if (!renovacionEnCurso) {
    renovacionEnCurso = ejecutarRenovacion().finally(() => {
      renovacionEnCurso = null;
    });
  }
  return renovacionEnCurso;
}

function construirUrl(servicio, ruta, parametros) {
  const consulta = new URLSearchParams();
  Object.entries(parametros ?? {}).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      consulta.append(clave, valor);
    }
  });
  const textoConsulta = consulta.toString();
  return `${URLS_SERVICIOS[servicio]}${ruta}${textoConsulta ? `?${textoConsulta}` : ''}`;
}

async function leerRespuesta(respuesta) {
  const texto = await respuesta.text();
  if (!texto) {
    return null;
  }
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

export function solicitar(servicio, metodo, ruta, opciones = {}) {
  return ejecutarSolicitud(servicio, metodo, ruta, opciones, false);
}

async function ejecutarSolicitud(servicio, metodo, ruta, { cuerpo, parametros } = {}, yaRenovada) {
  let token = proveedorDeToken();
  if (token && tokenExpirado(token)) {
    const tokenVencido = token;
    token = yaRenovada ? null : await renovarSesion();
    if (!token) {
      alSesionInvalida(tokenVencido);
      throw new ErrorApi(401, 'SESION_EXPIRADA', MENSAJE_SESION_EXPIRADA);
    }
    yaRenovada = true;
  }
  let respuesta;
  try {
    respuesta = await fetch(construirUrl(servicio, ruta, parametros), {
      method: metodo,
      credentials: servicio === 'autenticacion' ? 'include' : 'same-origin',
      headers: {
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'SIN_CONEXION', 'No fue posible comunicarse con el servidor. Intente nuevamente.');
  }

  const datos = await leerRespuesta(respuesta);
  if (respuesta.ok) {
    return datos;
  }
  if (respuesta.status === 401 && token) {
    if (!yaRenovada && (await renovarSesion())) {
      return ejecutarSolicitud(servicio, metodo, ruta, { cuerpo, parametros }, true);
    }
    alSesionInvalida(token);
  }
  throw new ErrorApi(
    respuesta.status,
    datos?.codigo ?? 'ERROR_DESCONOCIDO',
    datos?.mensaje ?? (respuesta.status === 403 ? MENSAJE_SIN_PERMISOS : 'Ocurrió un error inesperado'),
    datos?.detalles ?? [],
  );
}

export function describirError(error) {
  if (!(error instanceof ErrorApi)) {
    return 'Ocurrió un error inesperado';
  }
  return error.detalles.length > 0 ? `${error.message}: ${error.detalles.join('; ')}` : error.message;
}
