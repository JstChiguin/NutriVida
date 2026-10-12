import { useState } from 'react';

const listaServicios = [
  {
    id: 1,
    titulo: 'Control de peso',
    descripcion: 'Evaluación y acompañamiento nutricional personalizado.',
    categoria: 'control de peso',
  },
  {
    id: 2,
    titulo: 'Nutrición deportiva',
    descripcion: 'Orientación nutricional adaptada a la actividad física y los objetivos deportivos.',
    categoria: 'nutrición deportiva',
  },
  {
    id: 3,
    titulo: 'Enfermedades metabólicas',
    descripcion: 'Atención nutricional para personas con necesidades metabólicas específicas.',
    categoria: 'enfermedades metabólicas',
  },
];

const filtros = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'control de peso', etiqueta: 'Control de peso' },
  { id: 'nutrición deportiva', etiqueta: 'Nutrición deportiva' },
  { id: 'enfermedades metabólicas', etiqueta: 'Enfermedades metabólicas' },
];

export default function Servicios() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');

  const serviciosFiltrados = listaServicios.filter((servicio) => {
    const textoBuscado = busqueda.toLowerCase().trim();
    const textoCompleto = `${servicio.titulo} ${servicio.descripcion}`.toLowerCase();
    const coincideBusqueda = textoBuscado === '' || textoCompleto.includes(textoBuscado);
    const coincideFiltro =
      filtroActivo === 'todos' || textoCompleto.includes(filtroActivo);

    return coincideBusqueda && coincideFiltro;
  });

  return (
    <section id="servicios" className="container py-5">
      <h2 className="text-center mb-4 fw-bold">Nuestros servicios</h2>

      <div className="row justify-content-center mb-4">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="buscador-servicios">
            <label htmlFor="buscar-servicio" className="form-label fw-semibold">
              Buscar servicio
            </label>
            <input
              type="text"
              id="buscar-servicio"
              className="form-control form-control-lg shadow-sm"
              placeholder="Ej: nutrición deportiva"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filtros-servicios d-flex justify-content-center flex-wrap gap-2 mb-5">
        {filtros.map((filtro) => (
          <button
            key={filtro.id}
            type="button"
            data-filtro={filtro.id}
            className={`btn px-3 py-2 rounded-pill fw-semibold shadow-sm ${
              filtroActivo === filtro.id
                ? 'btn-success text-white'
                : 'btn-outline-success bg-white'
            }`}
            onClick={() => setFiltroActivo(filtro.id)}
          >
            {filtro.etiqueta}
          </button>
        ))}
      </div>

      <div className="contenedor-servicios row g-4 justify-content-center">
        {serviciosFiltrados.length > 0 ? (
          serviciosFiltrados.map((servicio) => (
            <div key={servicio.id} className="col-12 col-md-6 col-lg-4 d-flex align-items-stretch">
              <article className="card tarjeta-servicio w-100 shadow-sm border-0 rounded-4 p-4 text-center">
                <div className="card-body d-flex flex-column justify-content-center">
                  <h3 className="card-title h4 text-success fw-bold mb-3">{servicio.titulo}</h3>
                  <p className="card-text text-secondary mb-0">{servicio.descripcion}</p>
                </div>
              </article>
            </div>
          ))
        ) : (
          <div className="col-12 text-center py-4">
            <p className="text-muted fs-5">
              No se encontraron servicios que coincidan con la búsqueda.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
