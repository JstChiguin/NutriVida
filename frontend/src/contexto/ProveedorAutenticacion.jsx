import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ContextoSesion } from './ContextoSesion.js';
import { autenticacionApi } from '../servicios/autenticacionApi.js';
import { configurarSesionApi } from '../servicios/clienteApi.js';

const CLAVE_SESION = 'nutrivida.sesion';

function leerSesionGuardada() {
  try {
    const texto = sessionStorage.getItem(CLAVE_SESION);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion) {
  try {
    if (sesion) {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    } else {
      sessionStorage.removeItem(CLAVE_SESION);
    }
  } catch {
    return;
  }
}

export function ProveedorAutenticacion({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada);

  const establecerSesion = useCallback((nuevaSesion) => {
    guardarSesion(nuevaSesion);
    setSesion(nuevaSesion);
  }, []);

  useLayoutEffect(() => {
    configurarSesionApi({
      obtenerToken: () => sesion?.token ?? null,
      alInvalidarSesion: () => establecerSesion(null),
    });
  }, [sesion, establecerSesion]);

  const iniciarSesion = useCallback(async (correo, contrasena) => {
    const respuesta = await autenticacionApi.iniciarSesion(correo, contrasena);
    establecerSesion({ token: respuesta.token, usuario: respuesta.usuario });
    return respuesta.usuario;
  }, [establecerSesion]);

  const registrarPaciente = useCallback(async (datos) => {
    const respuesta = await autenticacionApi.registrarPaciente(datos);
    establecerSesion({ token: respuesta.token, usuario: respuesta.usuario });
    return respuesta.usuario;
  }, [establecerSesion]);

  const cerrarSesion = useCallback(async () => {
    await autenticacionApi.cerrarSesion().catch(() => null);
    establecerSesion(null);
  }, [establecerSesion]);

  const valor = useMemo(() => ({
    usuario: sesion?.usuario ?? null,
    autenticado: Boolean(sesion?.token),
    iniciarSesion,
    registrarPaciente,
    cerrarSesion,
  }), [sesion, iniciarSesion, registrarPaciente, cerrarSesion]);

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}
