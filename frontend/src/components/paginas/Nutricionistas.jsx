
import { useConsulta } from '../../hooks/useConsulta.js';
import { clinicoApi } from '../../servicios/clinicoApi.js';
import { EnlaceBoton } from '../ui/Boton.jsx';
import { EstadoConsulta } from '../ui/EstadoConsulta.jsx';

function Fotografia({ profesional }) {
  if (!profesional.fotoUrl) {
    return (
      <span
        aria-hidden="true"
        className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center shadow-sm my-3 fs-1 fw-bold"
        style={{ width: '130px', height: '130px' }}
      >
        {profesional.nombreCompleto?.charAt(0) ?? '?'}
      </span>
    );
  }

  const imagen = /^https?:\/\//.test(profesional.fotoUrl)
    ? profesional.fotoUrl
    : `/${profesional.fotoUrl.replace(/^\/+/, '')}`;

  return (
    <img
      src={imagen}
      alt={`Nutricionista ${profesional.nombreCompleto}`}
      className="rounded-circle shadow-sm my-3"
      style={{ width: '130px', height: '130px', objectFit: 'cover' }}
    />
  );
}

export default function Nutricionistas() {
  const { datos, cargando, error, recargar } = useConsulta(
    () => clinicoApi.listarNutricionistas({ tamano: 50 })
  );

  const profesionales = datos?.contenido ?? [];

  return (
    <section
      id="nutricionistas"
      className="mx-auto w-full max-w-[64rem] px-4 py-6 sm:px-6 sm:py-8"
    >
      <h2 className="text-center mb-5 fw-bold">
        Nuestros nutricionistas
      </h2>

      <EstadoConsulta
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        vacio={profesionales.length === 0}
        mensajeVacio="Aún no hay nutricionistas disponibles."
      >
        <ul className="contenedor-nutricionistas list-unstyled">
          {profesionales.map((profesional) => (
            <li key={profesional.id}>
              <article className="card tarjeta-nutricionista w-100 shadow-sm border-0 rounded-4 text-center p-3 d-flex flex-column align-items-center">
                <Fotografia profesional={profesional} />

                <div className="card-body p-2 d-flex flex-column justify-content-between">
                  <div>
                    <h3 className="h5 fw-bold mb-2">
                      {profesional.nombreCompleto}
                    </h3>
                    <p className="text-success small fw-semibold mb-2">
                      {profesional.especialidades?.join(', ') ??
                        'Especialidad no informada'}
                    </p>
                  </div>

                  <EnlaceBoton
                    variante="contorno"
                    to={`/mis-citas/nueva?nutricionistaId=${profesional.id}`}
                    className="mt-3 w-100"
                  >
                    Reservar
                  </EnlaceBoton>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </EstadoConsulta>
    </section>
  );
}
