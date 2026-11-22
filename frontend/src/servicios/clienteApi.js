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

let proveedorDeToken = () => null;
let alSesionInvalida = () => {};

export function configurarSesionApi({ obtenerToken, alInvalidarSesion }) {
  proveedorDeToken = obtenerToken;
  alSesionInvalida = alInvalidarSesion;
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

export async function solicitar(servicio, metodo, ruta, { cuerpo, parametros } = {}) {
  const token = proveedorDeToken();
  if (token && tokenExpirado(token)) {
    alSesionInvalida(token);
    throw new ErrorApi(401, 'SESION_EXPIRADA', MENSAJE_SESION_EXPIRADA);
  }
  let respuesta;
  try {
    respuesta = await fetch(construirUrl(servicio, ruta, parametros), {
      method: metodo,
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
