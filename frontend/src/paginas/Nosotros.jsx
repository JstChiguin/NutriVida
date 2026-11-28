import { Link } from 'react-router-dom';

const EQUIPO = ['Chiguin Chiang', 'Victoria Ortega', 'Arlette Patiño'];

export default function Nosotros() {
  return (
    <div className="container py-5">
      <h1 className="h2 fw-bold text-success mb-3">Sobre NutriVida</h1>
      <section aria-labelledby="titulo-clinica" className="mb-5">
        <h2 id="titulo-clinica" className="h4 fw-bold">La clínica</h2>
        <p>
          NutriVida es una clínica nutricional <strong>ficticia</strong> creada con fines académicos. Digitaliza la
          gestión de citas, agendas, fichas clínicas y seguimiento nutricional de pacientes y profesionales.
        </p>
        <p className="mb-0">
          Su dirección, Av. Brasil 2021, Valparaíso, es <strong>referencial</strong> y corresponde a la sede de Duoc UC
          usada solo como ubicación de demostración. Puedes ver el mapa en la página de <Link to="/contacto">contacto</Link>.
        </p>
      </section>
      <section aria-labelledby="titulo-equipo" className="mb-5">
        <h2 id="titulo-equipo" className="h4 fw-bold">Equipo desarrollador</h2>
        <p>Proyecto de la asignatura Desarrollo FullStack II (DSY1104), Duoc UC, carrera de Ingeniería Informática.</p>
        <ul>
          {EQUIPO.map((integrante) => <li key={integrante}>{integrante}</li>)}
        </ul>
      </section>
      <section aria-labelledby="titulo-privacidad">
        <h2 id="titulo-privacidad" className="h4 fw-bold">Datos y privacidad</h2>
        <p className="mb-0">
          Todos los datos de la aplicación son ficticios. Las páginas públicas nunca muestran información clínica de pacientes.
        </p>
      </section>
    </div>
  );
}
