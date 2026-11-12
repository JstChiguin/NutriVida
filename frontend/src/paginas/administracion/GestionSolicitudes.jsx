import { useState } from 'react';
import { CampoSeleccion } from '../../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../../components/ui/EstadoConsulta.jsx';
import { Paginador } from '../../components/ui/Paginador.jsx';
import { Tarjeta } from '../../components/ui/Tarjeta.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import { clinicoApi } from '../../servicios/clinicoApi.js';
import { describirError } from '../../servicios/clienteApi.js';
import { formatearFechaHora } from '../../utils/formatos.js';

const ESTADOS = [
  { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
  { valor: 'EN_REVISION', etiqueta: 'En revisión' },
  { valor: 'RESUELTA', etiqueta: 'Resuelta' },
];

export default function GestionSolicitudes() {
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(0);
  const [error, setError] = useState('');
  const { datos, cargando, error: errorCarga, recargar } = useConsulta(
    () => clinicoApi.listarSolicitudesContacto({ estado, pagina, tamano: 10 }), { estado, pagina },
  );

  const cambiarEstado = async (solicitudId, nuevoEstado) => {
    try {
      await clinicoApi.cambiarEstadoSolicitudContacto(solicitudId, nuevoEstado);
      setError('');
      recargar();
    } catch (falla) {
      setError(describirError(falla));
    }
  };

  return (
    <Tarjeta titulo="Solicitudes de contacto">
      <div className="max-w-xs">
        <CampoSeleccion etiqueta="Filtrar por estado" id="filtro-solicitudes" marcador="Todas" opciones={ESTADOS} value={estado}
          onChange={(evento) => { setEstado(evento.target.value); setPagina(0); }} />
      </div>
      <Mensaje>{error}</Mensaje>
      <EstadoConsulta cargando={cargando} error={errorCarga} onReintentar={recargar} vacio={datos?.contenido.length === 0}
        mensajeVacio="No hay solicitudes con este estado.">
        <ul className="divide-y divide-gray-100">
          {datos?.contenido.map((solicitud) => (
            <li key={solicitud.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{solicitud.nombre} <span className="text-sm font-normal text-gray-500">· {solicitud.correo}</span></p>
                  <p className="text-sm text-gray-500">{formatearFechaHora(solicitud.creadoEn)}</p>
                </div>
                <select aria-label={`Estado de la solicitud de ${solicitud.nombre}`} value={solicitud.estado}
                  className="rounded border border-gray-300 px-2 py-1"
                  onChange={(evento) => cambiarEstado(solicitud.id, evento.target.value)}>
                  {ESTADOS.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
                </select>
              </div>
              <p className="mt-1 text-sm">{solicitud.mensaje}</p>
            </li>
          ))}
        </ul>
        <Paginador pagina={pagina} totalPaginas={datos?.totalPaginas} onCambiar={setPagina} />
      </EstadoConsulta>
    </Tarjeta>
  );
}
