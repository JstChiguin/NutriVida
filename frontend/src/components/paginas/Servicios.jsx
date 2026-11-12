
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConsulta } from '../../hooks/useConsulta.js';
import { clinicoApi } from '../../servicios/clinicoApi.js';
import { EstadoConsulta } from '../ui/EstadoConsulta.jsx';
import { SERVICIOS_REFERENCIALES } from '../../datos/contenidoInstitucional.js';
import { formatearPrecio } from '../../utils/formatos.js';

export default function Servicios() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');

  const { datos, cargando, error, recargar } = useConsulta(
    () => clinicoApi.listarServicios({ tamano: 50 })
  );

  const sinConexion = error?.codigo === 'SIN_CONEXION';

  const servicios = datos?.contenido ??
    (sinConexion ? SERVICIOS_REFERENCIALES : []);

  const categorias = [
    ...new Set(servicios.map((servicio) => servicio.categoria).filter(Boolean)),
  ];

  const serviciosFiltrados = servicios.filter((servicio) => {
    const textoBuscado = busqueda.toLowerCase().trim();
    const textoCompleto =
      `${servicio.nombre} ${servicio.descripcion}`.toLowerCase();

    const coincideBusqueda =
      textoBuscado === '' || textoCompleto.includes(textoBuscado);

    const coincideFiltro =
      filtroActivo === 'todos' || servicio.categoria === filtroActivo;

    return coincideBusqueda && coincideFiltro;
  });

  return (
    <section
      id="servicios"
      className="mx-auto w-full max-w-[64rem] px-4 py-6 sm:px-6 sm:py-8"
    >
      <h2 className="text-center mb-4 fw-bold">
        Nuestros servicios
      </h2>

      {sinConexion && (
        <p role="status" className="alert alert-warning">
          Sin conexión con el servidor: se muestra información referencial.
        </p>
      )}

      <div className="row justify-content-center mb-4">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="buscador-servicios">
            <label
              htmlFor="buscar-servicio"
              className="form-label fw-semibold"
            >
              Buscar servicio
            </label>
            <input
              type="text"
              id="buscar-servicio"
              className="form-control form-control-lg shadow-sm"
              placeholder="Ej: nutrición deportiva"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filtros-servicios d-flex justify-content-center flex-wrap gap-2 mb-5">
        {['todos', ...categorias].map((categoria) => (
          <button
            key={categoria}
            type="button"
            data-filtro={categoria}
            className={`btn px-3 py-2 rounded-pill fw-semibold shadow-sm ${
              filtroActivo === categoria
                ? 'btn-success text-white'
                : 'btn-outline-success bg-white'
            }`}
            onClick={() => setFiltroActivo(categoria)}
          >
            {categoria === 'todos' ? 'Todos' : categoria}
          </button>
        ))}
      </div>

      <EstadoConsulta
        cargando={cargando}
        error={sinConexion ? null : error}
        onReintentar={recargar}
        vacio={serviciosFiltrados.length === 0}
        mensajeVacio="No se encontraron servicios que coincidan con la búsqueda."
      >
        <div className="contenedor-servicios row g-4 justify-content-center">
          {serviciosFiltrados.map((servicio) => (
            <div
              key={servicio.id}
              className="col-12 col-md-6 col-lg-4 d-flex align-items-stretch"
            >
              <article className="card tarjeta-servicio w-100 shadow-sm border-0 rounded-4 p-4 text-center">
                <div className="card-body d-flex flex-column justify-content-center">
                  <h3 className="card-title h4 text-success fw-bold mb-3">
                    {servicio.nombre}
                  </h3>

                  <p className="card-text text-secondary mb-3">
                    {servicio.descripcion}
                  </p>

                  {servicio.duracionMinutos && (
                    <p className="text-muted small">
                      {servicio.duracionMinutos} minutos
                      {' · '}
                      {formatearPrecio(servicio.precioReferencial)}
                    </p>
                  )}

                  {!sinConexion && (
                    <Link
                      to={`/mis-citas/nueva?servicioId=${servicio.id}`}
                      className="btn btn-outline-success mt-3"
                    >
                      Reservar
                    </Link>
                  )}
                </div>
              </article>
            </div>
          ))}
        </div>
      </EstadoConsulta>
    </section>
  );
}
