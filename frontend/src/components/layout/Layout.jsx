import { Outlet } from 'react-router-dom';
import Encabezado from './Encabezado';
import PiePagina from './PiePagina';

export function ResumenServicios({ servicios = [], onRemover }) {
  if (!servicios || servicios.length === 0) {
    return null;
  }

  return (
    <aside className="resumen-servicios card p-3 shadow-sm border-0 rounded-3">
      <h3 className="h6 fw-bold mb-3 text-success">Servicios seleccionados</h3>
      <ul className="list-unstyled mb-0">
        {servicios.map((servicio, index) => (
          <li key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
            <span className="small">{typeof servicio === 'string' ? servicio : servicio.titulo || servicio.nombre}</span>
            {onRemover && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => onRemover(servicio)}
              >
                Quitar
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default function Layout({
  serviciosSeleccionados = [],
  onRemoverServicio = () => {},
  barraLateral = null,
}) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Encabezado />
      <div className="flex-grow-1">
        <Outlet />
      </div>
      {barraLateral || (
        <ResumenServicios
          servicios={serviciosSeleccionados}
          onRemover={onRemoverServicio}
        />
      )}
      <PiePagina />
    </div>
  );
}
