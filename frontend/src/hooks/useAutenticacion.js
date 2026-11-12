import { useContext } from 'react';
import { ContextoSesion } from '../contexto/ContextoSesion.js';

export function useAutenticacion() {
  const contexto = useContext(ContextoSesion);
  if (!contexto) {
    throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
  }
  return contexto;
}
