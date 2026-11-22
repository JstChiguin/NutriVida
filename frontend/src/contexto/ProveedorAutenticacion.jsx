import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ContextoSesion } from './ContextoSesion.js';
import { autenticacionApi } from '../servicios/autenticacionApi.js';
import { configurarSesionApi } from '../servicios/clienteApi.js';
import { MENSAJE_SESION_EXPIRADA, obtenerExpiracionMs, tokenExpirado } from '../utils/sesion.js';

const CLAVE_SESION = 'nutrivida.sesion';
const ESPERA_MAXIMA_MS = 2 ** 31 - 1;

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
  if (!guardada?.token) {
    return { sesion: null, aviso: null };
  }
  if (tokenExpirado(guardada.token)) {
    return { sesion: null, aviso: MENSAJE_SESION_EXPIRADA };
  }
  return { sesion: guardada, aviso: null };
}

export function ProveedorAutenticacion({ children }) {
  const [inicial] = useState(restaurarSesion);
  const [sesion, setSesion] = useState(inicial.sesion);
  const [avisoSesion, setAvisoSesion] = useState(inicial.aviso);
  const tokenActual = useRef(inicial.sesion?.token ?? null);

  useEffect(() => {
    if (inicial.aviso) {
      guardarSesion(null);
    }
  }, [inicial]);

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
    });
  }, [invalidarSesion]);

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
      if (tokenExpirado(token)) {
        invalidarSesion(token);
        return;
      }
      programar();
    };

    function programar() {
      clearTimeout(temporizador);
      const restante = obtenerExpiracionMs(token) - Date.now();
      temporizador = setTimeout(verificar, Math.min(Math.max(restante, 0), ESPERA_MAXIMA_MS));
    }

    const alRecuperarVisibilidad = () => {
      if (document.visibilityState === 'visible') {
        verificar();
      }
    };

    programar();
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
