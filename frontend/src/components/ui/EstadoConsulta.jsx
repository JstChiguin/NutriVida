import { Boton } from './Boton.jsx';

export function EstadoConsulta({ cargando, error, vacio, mensajeVacio = 'No hay información para mostrar.', onReintentar, children }) {
  if (cargando) {
    return <p role="status" className="py-6 text-center text-gray-500">Cargando…</p>;
  }
  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-red-50 p-4 text-center text-red-700">
        <p className="mb-3">{error.mensaje}</p>
        {onReintentar && <Boton variante="contorno" onClick={onReintentar}>Reintentar</Boton>}
      </div>
    );
  }
  if (vacio) {
    return <p className="py-6 text-center text-gray-500">{mensajeVacio}</p>;
  }
  return children;
}

export function Mensaje({ tipo = 'error', children }) {
  if (!children) {
    return null;
  }
  const clases = tipo === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800';
  return <p role={tipo === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg p-3 text-sm ${clases}`}>{children}</p>;
}
