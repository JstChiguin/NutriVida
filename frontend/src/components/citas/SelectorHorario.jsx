import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Boton } from '../ui/Boton.jsx';
import { CampoTexto } from '../ui/Campo.jsx';
import { EstadoConsulta } from '../ui/EstadoConsulta.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import { agendaApi } from '../../servicios/agendaApi.js';
import { fechaEnZonaHoraria, fechaLocalISO, formatearHora } from '../../utils/formatos.js';

const FILAS_VISIBLES = 3;
const COLUMNAS_PREDETERMINADAS = 4;

function ordenarSinDuplicados(horarios) {
  const porInicio = new Map();
  horarios.forEach((horario) => {
    if (!porInicio.has(horario.inicio)) {
      porInicio.set(horario.inicio, horario);
    }
  });
  return [...porInicio.values()].sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
}

function contarColumnas(grilla) {
  const plantilla = window.getComputedStyle(grilla).gridTemplateColumns;
  if (!plantilla || plantilla === 'none') {
    return 0;
  }
  return plantilla.split(' ').filter(Boolean).length;
}

export default function SelectorHorario({ nutricionistaId, servicioId, seleccionado, onSeleccionar }) {
  const hoy = fechaLocalISO(new Date());
  const idGrilla = useId();
  const refGrilla = useRef(null);
  const [fecha, setFecha] = useState(() => (seleccionado ? fechaEnZonaHoraria(seleccionado) : hoy));
  const [expandido, setExpandido] = useState(false);
  const [columnas, setColumnas] = useState(COLUMNAS_PREDETERMINADAS);
  const { datos, cargando, error, recargar } = useConsulta(
    () => agendaApi.consultarDisponibilidad(nutricionistaId, { servicioId, fecha }),
    { nutricionistaId, servicioId, fecha },
  );

  const horarios = useMemo(() => ordenarSinDuplicados(datos?.[0]?.horarios ?? []), [datos]);
  const consultaFinalizada = !cargando && !error && datos !== null;
  const seleccionDisponible = !seleccionado || horarios.some((horario) => horario.inicio === seleccionado);
  const hayHorarios = horarios.length > 0;

  useEffect(() => {
    if (consultaFinalizada && seleccionado && !seleccionDisponible) {
      onSeleccionar('');
    }
  }, [consultaFinalizada, seleccionado, seleccionDisponible, onSeleccionar]);

  useEffect(() => {
    const grilla = refGrilla.current;
    if (!hayHorarios || !grilla || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observador = new ResizeObserver(() => {
      const cantidad = contarColumnas(grilla);
      if (cantidad > 0) {
        setColumnas(cantidad);
      }
    });
    observador.observe(grilla);
    return () => observador.disconnect();
  }, [hayHorarios]);

  const cambiarFecha = (evento) => {
    const nuevaFecha = evento.target.value;
    if (!nuevaFecha || nuevaFecha === fecha) {
      return;
    }
    setFecha(nuevaFecha);
    setExpandido(false);
    if (seleccionado) {
      onSeleccionar('');
    }
  };

  const limite = columnas * FILAS_VISIBLES;
  const hayMas = horarios.length > limite;
  const visibles = expandido || !hayMas ? horarios : horarios.slice(0, limite);
  const seleccionOculta = Boolean(seleccionado) && seleccionDisponible
    && !visibles.some((horario) => horario.inicio === seleccionado);

  return (
    <div>
      <CampoTexto etiqueta="Fecha" id="fecha-cita" type="date" min={hoy} value={fecha} onChange={cambiarFecha} />
      <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar} vacio={!hayHorarios}
        mensajeVacio="No hay horarios disponibles para esta fecha.">
        {seleccionOculta && (
          <p className="horario-seleccionado-aviso" role="status">
            Horario seleccionado: {formatearHora(seleccionado)}
          </p>
        )}
        <ul ref={refGrilla} id={idGrilla} className="grilla-horarios" aria-label="Horarios disponibles">
          {visibles.map((horario) => (
            <li key={horario.inicio}>
              <Boton variante={seleccionado === horario.inicio ? 'primario' : 'contorno'}
                aria-pressed={seleccionado === horario.inicio} onClick={() => onSeleccionar(horario.inicio)}>
                {formatearHora(horario.inicio)}
              </Boton>
            </li>
          ))}
        </ul>
        {hayMas && (
          <Boton variante="contorno" aria-expanded={expandido} aria-controls={idGrilla}
            onClick={() => setExpandido(!expandido)}>
            {expandido ? 'Ver menos' : `Ver más horarios (${horarios.length - limite})`}
          </Boton>
        )}
      </EstadoConsulta>
    </div>
  );
}
