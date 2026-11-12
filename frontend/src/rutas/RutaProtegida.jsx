import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAutenticacion } from '../hooks/useAutenticacion.js';

export default function RutaProtegida({ roles }) {
  const { autenticado, usuario } = useAutenticacion();
  const ubicacion = useLocation();

  if (!autenticado) {
    return <Navigate to="/iniciar-sesion" replace state={{ desde: ubicacion.pathname }} />;
  }
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/sin-permiso" replace />;
  }
  return <Outlet />;
}
