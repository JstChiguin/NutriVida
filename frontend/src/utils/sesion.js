export const MENSAJE_SESION_EXPIRADA = 'Su sesión expiró o ya no es válida. Inicie sesión nuevamente.';
export const MENSAJE_SIN_PERMISOS = 'No tiene permisos para realizar esta acción.';

export function obtenerExpiracionMs(token) {
  if (typeof token !== 'string') {
    return null;
  }
  const carga = token.split('.')[1];
  if (!carga) {
    return null;
  }
  try {
    const base64 = carga.replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const datos = JSON.parse(atob(relleno));
    return Number.isFinite(datos.exp) ? datos.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function tokenExpirado(token, ahora = Date.now()) {
  const expiracion = obtenerExpiracionMs(token);
  return expiracion !== null && expiracion <= ahora;
}
