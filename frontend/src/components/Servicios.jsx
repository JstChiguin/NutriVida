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
    <section id="servicios">
      <h2>Nuestros servicios</h2>

      <div className="buscador-servicios">
        <label htmlFor="buscar-servicio">Buscar servicio</label>
        <input
          type="text"
          id="buscar-servicio"
          placeholder="Ej: nutrición deportiva"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="filtros-servicios">
        {filtros.map((filtro) => (
          <button
            key={filtro.id}
            type="button"
            data-filtro={filtro.id}
            style={
              filtroActivo === filtro.id
                ? { backgroundColor: 'darkgreen', color: 'white' }
                : undefined
            }
            onClick={() => setFiltroActivo(filtro.id)}
          >
            {filtro.etiqueta}
          </button>
        ))}
      </div>

      <div className="contenedor-servicios">
        {serviciosFiltrados.length > 0 ? (
          serviciosFiltrados.map((servicio) => (
            <article key={servicio.id} className="tarjeta-servicio">
              <h3>{servicio.titulo}</h3>
              <p>{servicio.descripcion}</p>
            </article>
          ))
        ) : (
          <p style={{ textAlign: 'center', width: '100%', color: 'dimgray' }}>
            No se encontraron servicios que coincidan con la búsqueda.
          </p>
        )}
      </div>
    </section>
  );
}

