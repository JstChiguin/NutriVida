export default function Portada() {
  return (
    <section id="inicio" className="portada py-5 text-white" style={{ backgroundColor: 'var(--color-portada, #81C784)' }}>
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8 text-center portada-contenido">
            <h1 className="display-5 fw-bold mb-3">Tu bienestar comienza aquí</h1>
            <p className="lead mb-0">
              Conecta con nutricionistas certificados y transforma tus hábitos alimenticios
              con planes personalizados.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
