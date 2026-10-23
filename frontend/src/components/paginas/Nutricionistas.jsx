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
    <section id="nutricionistas" className="mx-auto w-full max-w-[64rem] px-4 py-6 sm:px-6 sm:py-8">
      <h2 className="text-center mb-5 fw-bold">Nuestros nutricionistas</h2>

      <div className="contenedor-nutricionistas row g-4 justify-content-center">
        {equipoNutricionistas.map((profesional) => (
          <div key={profesional.id} className="col-12 col-sm-6 col-lg-3 d-flex align-items-stretch">
            <article className="card tarjeta-nutricionista w-100 shadow-sm border-0 rounded-4 text-center p-3 d-flex flex-column align-items-center">
              <img
                src={profesional.imagen}
                alt={`Nutricionista ${profesional.nombre}`}
                className="rounded-circle shadow-sm my-3"
                style={{ width: '130px', height: '130px', objectFit: 'cover' }}
              />
              <div className="card-body p-2 d-flex flex-column justify-content-between">
                <div>
                  <h3 className="h5 fw-bold mb-2">{profesional.nombre}</h3>
                  <p className="text-success small fw-semibold mb-2">{profesional.especialidad}</p>
                </div>
                <p className="text-muted small mt-2 mb-0">{profesional.horario}</p>
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
