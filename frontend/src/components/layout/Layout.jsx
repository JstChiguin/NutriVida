export function Outlet() {
  return null;
}

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
  children,
}) {
  return (
    <div className="mx-auto grid w-full max-w-[64rem] flex-1 grid-cols-1 items-start gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1fr_18rem]">
      {children ? children : <Outlet />}
      {barraLateral || (
        <ResumenServicios
          servicios={serviciosSeleccionados}
          onRemover={onRemoverServicio}
        />
      )}
    </div>
  );
}
