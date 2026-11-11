import { useState } from 'react';
import { Boton } from '../ui/Boton.jsx';
import { CampoTexto } from '../ui/Campo.jsx';
import { EstadoConsulta } from '../ui/EstadoConsulta.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import { agendaApi } from '../../servicios/agendaApi.js';
import { fechaLocalISO, formatearHora } from '../../utils/formatos.js';

export default function SelectorHorario({ nutricionistaId, servicioId, seleccionado, onSeleccionar }) {
  const hoy = fechaLocalISO(new Date());
  const [fecha, setFecha] = useState(hoy);
  const { datos, cargando, error, recargar } = useConsulta(
    () => agendaApi.consultarDisponibilidad(nutricionistaId, { servicioId, fecha }),
    { nutricionistaId, servicioId, fecha },
  );
  const horarios = datos?.[0]?.horarios ?? [];

  return (
    <div>
      <CampoTexto etiqueta="Fecha" id="fecha-cita" type="date" min={hoy} value={fecha}
        onChange={(evento) => setFecha(evento.target.value)} />
      <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar} vacio={horarios.length === 0}
        mensajeVacio="No hay horarios disponibles para esta fecha.">
        <ul className="flex flex-wrap gap-2" aria-label="Horarios disponibles">
          {horarios.map((horario) => (
            <li key={horario.inicio}>
              <Boton variante={seleccionado === horario.inicio ? 'primario' : 'contorno'}
                aria-pressed={seleccionado === horario.inicio} onClick={() => onSeleccionar(horario.inicio)}>
                {formatearHora(horario.inicio)}
              </Boton>
            </li>
          ))}
        </ul>
      </EstadoConsulta>
    </div>
  );
}
