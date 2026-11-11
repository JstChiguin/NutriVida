import { useState } from 'react';
import { Link } from 'react-router-dom';
import Contenedor from '../components/layout/Contenedor.jsx';
import { CampoTexto } from '../components/ui/Campo.jsx';
import { EstadoConsulta } from '../components/ui/EstadoConsulta.jsx';
import { Paginador } from '../components/ui/Paginador.jsx';
import { useConsulta } from '../hooks/useConsulta.js';
import { clinicoApi } from '../servicios/clinicoApi.js';

export default function PacientesAtendidos() {
  const [texto, setTexto] = useState('');
  const [pagina, setPagina] = useState(0);
  const { datos, cargando, error, recargar } = useConsulta(
    () => clinicoApi.listarPacientes({ texto, pagina, tamano: 10 }), { texto, pagina },
  );

  return (
    <Contenedor titulo="Mis pacientes" descripcion="Solo aparecen los pacientes que te han sido autorizados al confirmar una cita.">
      <div className="max-w-md">
        <CampoTexto etiqueta="Buscar por nombre, correo o RUT" id="buscar-paciente" value={texto}
          onChange={(evento) => { setTexto(evento.target.value); setPagina(0); }} />
      </div>
      <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar}
        vacio={datos?.contenido.length === 0} mensajeVacio="No hay pacientes para mostrar.">
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-green-50 text-exito">
              <tr><th className="p-3">Paciente</th><th className="p-3">Correo</th><th className="p-3">Acciones</th></tr>
            </thead>
            <tbody>
              {datos?.contenido.map((paciente) => (
                <tr key={paciente.id} className="border-t border-gray-100">
                  <td className="p-3 font-semibold">{paciente.nombreCompleto}</td>
                  <td className="p-3">{paciente.correo}</td>
                  <td className="flex flex-wrap gap-3 p-3">
                    <Link className="font-semibold text-exito" to={`/pacientes/${paciente.id}/ficha-clinica`}>Ficha clínica</Link>
                    <Link className="font-semibold text-exito" to={`/pacientes/${paciente.id}/seguimiento`}>Seguimiento</Link>
                    <Link className="font-semibold text-exito" to={`/pacientes/${paciente.id}/planes-alimentarios`}>Plan alimentario</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginador pagina={pagina} totalPaginas={datos?.totalPaginas} onCambiar={setPagina} />
      </EstadoConsulta>
    </Contenedor>
  );
}
