import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { describirError } from '../servicios/clienteApi.js';

export function useConsulta(funcionDeCarga, parametros = {}) {
  const [version, setVersion] = useState(0);
  const [resultado, setResultado] = useState(null);
  const clave = JSON.stringify([parametros, version]);
  const cargar = useEffectEvent(funcionDeCarga);

  useEffect(() => {
    let cancelado = false;
    cargar()
      .then((datos) => {
        if (!cancelado) {
          setResultado({ clave, datos, error: null });
        }
      })
      .catch((error) => {
        if (!cancelado) {
          setResultado({ clave, datos: null, error: { mensaje: describirError(error), codigo: error.codigo } });
        }
      });
    return () => {
      cancelado = true;
    };
  }, [clave]);

  const recargar = useCallback(() => setVersion((valor) => valor + 1), []);
  const vigente = resultado?.clave === clave;
  return {
    datos: vigente ? resultado.datos : null,
    cargando: !vigente,
    error: vigente ? resultado.error : null,
    recargar,
  };
}
