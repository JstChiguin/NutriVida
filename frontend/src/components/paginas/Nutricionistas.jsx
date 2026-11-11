
import { Link } from 'react-router-dom';
import { useConsulta } from '../../hooks/useConsulta.js';
import { clinicoApi } from '../../servicios/clinicoApi.js';
import { EstadoConsulta } from '../ui/EstadoConsulta.jsx';
import { NUTRICIONISTAS_REFERENCIALES } from '../../datos/contenidoInstitucional.js';

const horariosReferenciales = {
  'Carolina Fuentes M.': 'Lunes, Miércoles y Viernes',
  'Rodrigo Sepúlveda A.': 'Martes, Jueves y Sábados',
  'Daniela Morales C.': 'Lunes a Viernes',
  'Felipe Araya R.': 'Martes a Viernes',
};

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

  const sinConexion = error?.codigo === 'SIN_CONEXION';

  const profesionales = datos?.contenido ??
    (sinConexion ? NUTRICIONISTAS_REFERENCIALES : []);

  return (
    <section
      id="nutricionistas"
      className="mx-auto w-full max-w-[64rem] px-4 py-6 sm:px-6 sm:py-8"
    >
      <h2 className="text-center mb-5 fw-bold">
        Nuestros nutricionistas
      </h2>

      {sinConexion && (
        <p role="status" className="alert alert-warning">
          Sin conexión con el servidor: se muestra información referencial.
        </p>
      )}

      <EstadoConsulta
        cargando={cargando}
        error={sinConexion ? null : error}
        onReintentar={recargar}
        vacio={profesionales.length === 0}
        mensajeVacio="Aún no hay nutricionistas disponibles."
      >
        <div className="contenedor-nutricionistas row g-4 justify-content-center">
          {profesionales.map((profesional) => (
            <div
              key={profesional.id}
              className="col-12 col-sm-6 col-lg-3 d-flex align-items-stretch"
            >
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

                  {sinConexion &&
                    horariosReferenciales[profesional.nombreCompleto] && (
                      <p className="text-muted small mt-2">
                        {horariosReferenciales[profesional.nombreCompleto]}
                      </p>
                    )}

                  {!sinConexion && (
                    <Link
                      to={`/mis-citas/nueva?nutricionistaId=${profesional.id}`}
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
