import { Boton } from '../ui/Boton.jsx';

export function Outlet() {
  return null;
}

export function ResumenServicios({ servicios = [], onRemover, titulo = 'Servicios seleccionados' }) {
  if (!servicios || servicios.length === 0) {
    return null;
  }

  return (
    <aside className="resumen-servicios card p-3 shadow-sm border-0 rounded-3">
      <h3 className="h6 fw-bold mb-3 text-success">{titulo}</h3>
      <ul className="list-unstyled mb-0">
        {servicios.map((servicio, index) => {
          const esTexto = typeof servicio === 'string';
          const texto = esTexto ? servicio : servicio.titulo || servicio.nombre;
          return (
            <li key={esTexto ? index : servicio.clave ?? index}
              className="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom">
              <span className="small">
                {texto}
                {!esTexto && servicio.detalle && <span className="resumen-reserva-detalle">{servicio.detalle}</span>}
              </span>
              {onRemover && (
                <Boton variante="peligro" aria-label={`Quitar ${texto}`} onClick={() => onRemover(servicio)}>
                  Quitar
                </Boton>
              )}
            </li>
          );
        })}
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
