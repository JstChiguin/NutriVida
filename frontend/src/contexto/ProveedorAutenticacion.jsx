import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ContextoSesion } from './ContextoSesion.js';
import { autenticacionApi } from '../servicios/autenticacionApi.js';
import { configurarSesionApi, renovarSesion } from '../servicios/clienteApi.js';
import { MENSAJE_SESION_EXPIRADA, obtenerExpiracionMs } from '../utils/sesion.js';

const CLAVE_SESION = 'nutrivida.sesion';
const ESPERA_MAXIMA_MS = 2 ** 31 - 1;
const MARGEN_RENOVACION_MS = 30000;

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

function restaurarSesion() {
  const guardada = leerSesionGuardada();
  return guardada?.token ? guardada : null;
}

export function ProveedorAutenticacion({ children }) {
  const [inicial] = useState(restaurarSesion);
  const [sesion, setSesion] = useState(inicial);
  const [avisoSesion, setAvisoSesion] = useState(null);
  const tokenActual = useRef(inicial?.token ?? null);

  const establecerSesion = useCallback((nuevaSesion) => {
    tokenActual.current = nuevaSesion?.token ?? null;
    guardarSesion(nuevaSesion);
    setSesion(nuevaSesion);
    if (nuevaSesion) {
      setAvisoSesion(null);
    }
  }, []);

  const invalidarSesion = useCallback((tokenAfectado) => {
    if (tokenActual.current === null || tokenAfectado !== tokenActual.current) {
      return;
    }
    setAvisoSesion(MENSAJE_SESION_EXPIRADA);
    establecerSesion(null);
  }, [establecerSesion]);

  useLayoutEffect(() => {
    configurarSesionApi({
      obtenerToken: () => tokenActual.current,
      alInvalidarSesion: invalidarSesion,
      alRenovarSesion: establecerSesion,
    });
  }, [invalidarSesion, establecerSesion]);

  const token = sesion?.token ?? null;

  useEffect(() => {
    if (!token || obtenerExpiracionMs(token) === null) {
      return undefined;
    }
    let temporizador = null;
    let cancelado = false;

    const verificar = () => {
      if (cancelado) {
        return;
      }
      if (obtenerExpiracionMs(token) - Date.now() <= MARGEN_RENOVACION_MS) {
        renovarSesion().then((nuevoToken) => {
          if (!nuevoToken && !cancelado) {
            invalidarSesion(token);
          }
        });
        return;
      }
      programar();
    };

    function programar() {
      clearTimeout(temporizador);
      const restante = obtenerExpiracionMs(token) - Date.now() - MARGEN_RENOVACION_MS;
      temporizador = setTimeout(verificar, Math.min(Math.max(restante, 0), ESPERA_MAXIMA_MS));
    }

    const alRecuperarVisibilidad = () => {
      if (document.visibilityState === 'visible') {
        verificar();
      }
    };

    verificar();
    window.addEventListener('focus', verificar);
    document.addEventListener('visibilitychange', alRecuperarVisibilidad);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      window.removeEventListener('focus', verificar);
      document.removeEventListener('visibilitychange', alRecuperarVisibilidad);
    };
  }, [token, invalidarSesion]);

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
    setAvisoSesion(null);
  }, [establecerSesion]);

  const descartarAviso = useCallback(() => setAvisoSesion(null), []);

  const valor = useMemo(() => ({
    usuario: sesion?.usuario ?? null,
    autenticado: Boolean(sesion?.token),
    avisoSesion,
    descartarAviso,
    iniciarSesion,
    registrarPaciente,
    cerrarSesion,
  }), [sesion, avisoSesion, descartarAviso, iniciarSesion, registrarPaciente, cerrarSesion]);

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}
