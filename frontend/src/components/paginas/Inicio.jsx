import { EnlaceBoton } from '../ui/Boton.jsx';
import { useAutenticacion } from '../../hooks/useAutenticacion.js';
import Portada from './Portada.jsx';

const BENEFICIOS = [
  { titulo: 'Profesionales certificados', texto: 'Nutricionistas con especialidades clínicas, deportivas, pediátricas y metabólicas.' },
  { titulo: 'Reserva en línea', texto: 'Consulta horarios disponibles y solicita tu cita en pocos pasos.' },
  { titulo: 'Seguimiento continuo', texto: 'Revisa tus mediciones, tu evolución y tu plan alimentario vigente.' },
];

export default function Inicio() {
  const { autenticado } = useAutenticacion();

  return (
    <>
      <Portada titulo="Tu bienestar comienza aquí">
        <p className="mb-6">
          Conecta con nutricionistas certificados y transforma tus hábitos alimenticios con planes personalizados.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <EnlaceBoton to={autenticado ? '/mis-citas/nueva' : '/registro'} variante="claro">
            {autenticado ? 'Reservar una cita' : 'Crear mi cuenta'}
          </EnlaceBoton>
          <EnlaceBoton to="/servicios" variante="contornoClaro">
            Ver servicios
          </EnlaceBoton>
        </div>
      </Portada>

      <section className="mx-auto w-full max-w-[64rem] px-4 py-8 sm:px-6">
        <ul className="grid gap-5 md:grid-cols-3">
          {BENEFICIOS.map((beneficio) => (
            <li key={beneficio.titulo} className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <h2 className="mb-2 text-xl font-bold text-exito">{beneficio.titulo}</h2>
              <p className="text-gray-600">{beneficio.texto}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
