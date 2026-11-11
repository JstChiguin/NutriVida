import { useState } from 'react';
import Contenedor from '../components/layout/Contenedor.jsx';
import { Boton } from '../components/ui/Boton.jsx';
import { CampoAreaTexto, CampoTexto } from '../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../components/ui/EstadoConsulta.jsx';
import { GraficoLineas } from '../components/ui/GraficoLineas.jsx';
import { Tarjeta } from '../components/ui/Tarjeta.jsx';
import { usePacienteActual } from '../hooks/usePacienteActual.js';
import { useConsulta } from '../hooks/useConsulta.js';
import { clinicoApi } from '../servicios/clinicoApi.js';
import { describirError } from '../servicios/clienteApi.js';
import { Insignia } from '../components/ui/Insignia.jsx';
import { formatearFecha } from '../utils/formatos.js';

const convertirANumero = (texto) => (texto === '' ? null : Number(texto));

function FormularioMedicion({ pacienteId, onRegistrada }) {
  const [valores, setValores] = useState({ pesoKg: '', estaturaCm: '', cinturaCm: '', observaciones: '' });
  const [error, setError] = useState('');

  const registrar = async (evento) => {
    evento.preventDefault();
    try {
      await clinicoApi.registrarMedicion(pacienteId, {
        pesoKg: convertirANumero(valores.pesoKg),
        estaturaCm: convertirANumero(valores.estaturaCm),
        cinturaCm: convertirANumero(valores.cinturaCm),
        observaciones: valores.observaciones || null,
      });
      setValores({ pesoKg: '', estaturaCm: '', cinturaCm: '', observaciones: '' });
      setError('');
      onRegistrada();
    } catch (falla) {
      setError(describirError(falla));
    }
  };

  const modificar = (evento) => setValores({ ...valores, [evento.target.id]: evento.target.value });

  return (
    <Tarjeta titulo="Registrar medición">
      <Mensaje>{error}</Mensaje>
      <form onSubmit={registrar}>
        <CampoTexto etiqueta="Peso (kg)" id="pesoKg" type="number" step="0.1" required value={valores.pesoKg} onChange={modificar} />
        <CampoTexto etiqueta="Estatura (cm)" id="estaturaCm" type="number" step="0.1" value={valores.estaturaCm}
          ayuda="Obligatoria en la primera medición." onChange={modificar} />
        <CampoTexto etiqueta="Cintura (cm)" id="cinturaCm" type="number" step="0.1" value={valores.cinturaCm} onChange={modificar} />
        <CampoAreaTexto etiqueta="Observaciones" id="observaciones" value={valores.observaciones} onChange={modificar} />
        <Boton type="submit">Registrar</Boton>
      </form>
    </Tarjeta>
  );
}

function HistorialMediciones({ pacienteId, mediciones, puedeAnular, onAnulada }) {
  const [anulando, setAnulando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [errorAnulacion, setErrorAnulacion] = useState('');

  const anular = async (medicionId) => {
    try {
      await clinicoApi.anularMedicion(pacienteId, medicionId, motivo.trim());
      setAnulando(null);
      setMotivo('');
      setErrorAnulacion('');
      onAnulada();
    } catch (falla) {
      setErrorAnulacion(describirError(falla));
    }
  };

  return (
    <Tarjeta titulo="Historial de mediciones">
      <Mensaje>{errorAnulacion}</Mensaje>
      <EstadoConsulta cargando={mediciones.cargando} error={mediciones.error} onReintentar={mediciones.recargar}
        vacio={mediciones.datos?.contenido.length === 0} mensajeVacio="Aún no hay mediciones registradas.">
        <ul className="space-y-2">
          {mediciones.datos?.contenido.map((medicion) => (
            <li key={medicion.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{formatearFecha(medicion.fecha)} · {medicion.pesoKg} kg · {medicion.estaturaCm} cm · IMC {medicion.imc}</span>
                {medicion.estado === 'ANULADA'
                  ? <Insignia tipo="CANCELADA">Anulada</Insignia>
                  : puedeAnular && (
                    <Boton variante="peligro" aria-label={`Anular medición del ${formatearFecha(medicion.fecha)}`}
                      onClick={() => setAnulando(medicion.id)}>Anular</Boton>
                  )}
              </div>
              {medicion.estado === 'ANULADA' && <p className="mt-1 text-gray-500">Motivo: {medicion.motivoAnulacion}</p>}
              {anulando === medicion.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <CampoTexto etiqueta="Motivo de la anulación" id={`motivo-anulacion-${medicion.id}`} value={motivo}
                    onChange={(evento) => setMotivo(evento.target.value)} />
                  <Boton variante="peligro" className="mb-4" disabled={!motivo.trim()} onClick={() => anular(medicion.id)}>
                    Confirmar anulación
                  </Boton>
                </div>
              )}
            </li>
          ))}
        </ul>
      </EstadoConsulta>
    </Tarjeta>
  );
}

export default function Seguimiento() {
  const { paciente, puedeEscribir, cargando: cargandoPaciente, error: errorPaciente } = usePacienteActual();
  const pacienteId = paciente?.id;
  const evolucion = useConsulta(
    () => (pacienteId ? clinicoApi.consultarEvolucionMediciones(pacienteId) : Promise.resolve(null)), { pacienteId },
  );
  const mediciones = useConsulta(
    () => (pacienteId ? clinicoApi.listarMediciones(pacienteId, { tamano: 50 }) : Promise.resolve(null)), { pacienteId },
  );
  const [aviso, setAviso] = useState('');
  const recargarTodo = () => {
    evolucion.recargar();
    mediciones.recargar();
  };
  const puntos = evolucion.datos?.puntos ?? [];
  const resumen = evolucion.datos?.resumen;

  return (
    <Contenedor titulo="Seguimiento nutricional" descripcion={paciente?.nombreCompleto}>
      <EstadoConsulta cargando={cargandoPaciente || evolucion.cargando} error={errorPaciente || evolucion.error}
        onReintentar={evolucion.recargar}>
        <Mensaje tipo="exito">{aviso}</Mensaje>
        {resumen && (
          <dl className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Mediciones', resumen.cantidadMediciones],
              ['Peso actual', resumen.pesoActualKg !== null ? `${resumen.pesoActualKg} kg` : '—'],
              ['Variación', resumen.variacionPesoKg !== null ? `${resumen.variacionPesoKg} kg` : '—'],
              ['IMC actual', resumen.imcActual ?? '—'],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="rounded-xl bg-white p-4 text-center shadow-sm">
                <dt className="text-sm text-gray-500">{etiqueta}</dt>
                <dd className="text-2xl font-bold text-exito">{valor}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className={`grid gap-5 ${puedeEscribir ? 'lg:grid-cols-[1fr_20rem]' : ''}`}>
          <div className="space-y-5">
            <Tarjeta titulo="Evolución del peso">
              <GraficoLineas titulo="Evolución del peso en kilogramos" unidad=" kg"
                puntos={puntos.map((punto) => ({ etiqueta: formatearFecha(punto.fecha), valor: punto.pesoKg }))} />
            </Tarjeta>
            <Tarjeta titulo="Evolución del IMC">
              <GraficoLineas titulo="Evolución del índice de masa corporal"
                puntos={puntos.map((punto) => ({ etiqueta: formatearFecha(punto.fecha), valor: punto.imc }))} />
              <p className="mt-2 text-xs text-gray-500">El IMC es un indicador referencial y no reemplaza la evaluación nutricional completa.</p>
            </Tarjeta>
            <HistorialMediciones pacienteId={pacienteId} mediciones={mediciones} puedeAnular={puedeEscribir}
              onAnulada={() => { setAviso('Medición anulada; el registro y el motivo quedan conservados'); recargarTodo(); }} />
          </div>
          {puedeEscribir && <FormularioMedicion pacienteId={pacienteId} onRegistrada={recargarTodo} />}
        </div>
      </EstadoConsulta>
    </Contenedor>
  );
}
