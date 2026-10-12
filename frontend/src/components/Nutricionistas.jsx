const equipoNutricionistas = [
  {
    id: 1,
    nombre: 'Carolina Fuentes M.',
    especialidad: 'Obesidad y síndrome metabólico',
    horario: 'Lunes, Miércoles y Viernes',
    imagen: 'img/carolina-fuentes.png',
  },
  {
    id: 2,
    nombre: 'Rodrigo Sepúlveda A.',
    especialidad: 'Nutrición deportiva y rendimiento',
    horario: 'Martes, Jueves y Sábados',
    imagen: 'img/rodrigo-sepulveda.png',
  },
  {
    id: 3,
    nombre: 'Daniela Morales C.',
    especialidad: 'Alimentación vegetariana, vegana y trastornos alimentarios',
    horario: 'Lunes a Viernes',
    imagen: 'img/daniela-morales.png',
  },
  {
    id: 4,
    nombre: 'Felipe Araya R.',
    especialidad: 'Nutrición pediátrica y familiar',
    horario: 'Martes a Viernes',
    imagen: 'img/felipe-araya.png',
  },
];

export default function Nutricionistas() {
  return (
    <section id="nutricionistas">
      <h2>Nuestros nutricionistas</h2>

      <div className="contenedor-nutricionistas">
        {equipoNutricionistas.map((profesional) => (
          <article key={profesional.id} className="tarjeta-nutricionista">
            <img src={profesional.imagen} alt={`Nutricionista ${profesional.nombre}`} />
            <h3>{profesional.nombre}</h3>
            <p>{profesional.especialidad}</p>
            <p>{profesional.horario}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

