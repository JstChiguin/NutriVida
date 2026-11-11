import { useState } from 'react';
import Contenedor from '../components/layout/Contenedor.jsx';
import { Boton } from '../components/ui/Boton.jsx';
import { CampoAreaTexto, CampoTexto } from '../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../components/ui/EstadoConsulta.jsx';
import { Insignia } from '../components/ui/Insignia.jsx';
import { Tarjeta } from '../components/ui/Tarjeta.jsx';
import { usePacienteActual } from '../hooks/usePacienteActual.js';
import { useConsulta } from '../hooks/useConsulta.js';
import { clinicoApi } from '../servicios/clinicoApi.js';
import { describirError } from '../servicios/clienteApi.js';
import { formatearFechaHora } from '../utils/formatos.js';

const separarLista = (texto) => texto.split(',').map((elemento) => elemento.trim()).filter(Boolean);

function FormularioApertura({ pacienteId, onAbierta }) {
  const [valores, setValores] = useState({ motivoConsulta: '', alergias: '', habitosAlimentarios: '', objetivos: '' });
  const [resultado, setResultado] = useState('');

  const abrir = async (evento) => {
    evento.preventDefault();
    try {
      await clinicoApi.abrirFicha(pacienteId, {
        motivoConsulta: valores.motivoConsulta,
        alergias: separarLista(valores.alergias),
        habitosAlimentarios: valores.habitosAlimentarios || null,
        objetivosNutricionales: separarLista(valores.objetivos),
      });
      onAbierta();
    } catch (falla) {
      setResultado(describirError(falla));
    }
  };

  const modificar = (evento) => setValores({ ...valores, [evento.target.id]: evento.target.value });

  return (
    <Tarjeta titulo="Abrir ficha clínica">
      <Mensaje>{resultado}</Mensaje>
      <form onSubmit={abrir}>
        <CampoAreaTexto etiqueta="Motivo de consulta" id="motivoConsulta" required value={valores.motivoConsulta} onChange={modificar} />
        <CampoTexto etiqueta="Alergias (separadas por coma)" id="alergias" value={valores.alergias} onChange={modificar} />
        <CampoAreaTexto etiqueta="Hábitos alimentarios" id="habitosAlimentarios" value={valores.habitosAlimentarios} onChange={modificar} />
        <CampoTexto etiqueta="Objetivos nutricionales (separados por coma)" id="objetivos" value={valores.objetivos} onChange={modificar} />
        <Boton type="submit">Abrir ficha</Boton>
      </form>
    </Tarjeta>
  );
}

function Evolucion({ evolucion, puedeCorregir, onCorregir }) {
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [descripcion, setDescripcion] = useState(evolucion.descripcion);
  const [motivo, setMotivo] = useState('');

  return (
    <li className="rounded-lg border border-gray-100 p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{formatearFechaHora(evolucion.fecha)}</span>
        {evolucion.corregida && <Insignia tipo="CANCELADA">Corregida</Insignia>}
        {evolucion.corrigeEvolucionId && <Insignia tipo="CONFIRMADA">Corrección: {evolucion.motivoCorreccion}</Insignia>}
      </div>
      <p className={evolucion.corregida ? 'text-gray-500 line-through' : ''}>{evolucion.descripcion}</p>
      {evolucion.indicaciones && <p className="mt-1 text-sm text-gray-600">Indicaciones: {evolucion.indicaciones}</p>}
      {puedeCorregir && !evolucion.corregida && (
        <div className="mt-2">
          <Boton variante="suave" onClick={() => setCorrigiendo(!corrigiendo)}>Corregir</Boton>
          {corrigiendo && (
            <div className="mt-2">
              <CampoAreaTexto etiqueta="Texto corregido" id={`correccion-${evolucion.identificador}`} value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)} />
              <CampoTexto etiqueta="Motivo de la corrección" id={`motivo-${evolucion.identificador}`} value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)} />
              <Boton disabled={!motivo.trim() || !descripcion.trim()}
                onClick={() => onCorregir(evolucion.identificador, descripcion, motivo)}>Guardar corrección</Boton>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function EdicionDatosBase({ pacienteId, ficha, onGuardado, onCancelar }) {
  const [valores, setValores] = useState({
    motivoConsulta: ficha.motivoConsulta,
    alergias: ficha.alergias.join(', '),
    intolerancias: ficha.intolerancias.join(', '),
    habitosAlimentarios: ficha.habitosAlimentarios ?? '',
    objetivos: ficha.objetivosNutricionales.join(', '),
    evaluacion: ficha.evaluacion ?? '',
    diagnosticoNutricional: ficha.diagnosticoNutricional ?? '',
    planIntervencion: ficha.planIntervencion ?? '',
    indicaciones: ficha.indicaciones ?? '',
    motivoCambio: '',
  });
  const [resultado, setResultado] = useState('');

  const modificar = (evento) => setValores({ ...valores, [evento.target.id]: evento.target.value });

  const guardar = async (evento) => {
    evento.preventDefault();
    try {
      await clinicoApi.actualizarFicha(pacienteId, {
        motivoConsulta: valores.motivoConsulta,
        antecedentes: ficha.antecedentes,
        alergias: separarLista(valores.alergias),
        intolerancias: separarLista(valores.intolerancias),
        habitosAlimentarios: valores.habitosAlimentarios || null,
        actividadFisica: ficha.actividadFisica,
        objetivosNutricionales: separarLista(valores.objetivos),
        evaluacion: valores.evaluacion || null,
        diagnosticoNutricional: valores.diagnosticoNutricional || null,
        planIntervencion: valores.planIntervencion || null,
        indicaciones: valores.indicaciones || null,
      }, valores.motivoCambio.trim());
      onGuardado();
    } catch (falla) {
      setResultado(describirError(falla));
    }
  };

  return (
    <Tarjeta titulo="Corregir datos base de la ficha">
      <p className="mb-3 text-sm text-gray-600">El estado anterior se conserva en el historial de correcciones junto con el motivo del cambio.</p>
      <Mensaje>{resultado}</Mensaje>
      <form onSubmit={guardar}>
        <CampoAreaTexto etiqueta="Motivo de consulta" id="motivoConsulta" required value={valores.motivoConsulta} onChange={modificar} />
        <CampoTexto etiqueta="Alergias (separadas por coma)" id="alergias" value={valores.alergias} onChange={modificar} />
        <CampoTexto etiqueta="Intolerancias (separadas por coma)" id="intolerancias" value={valores.intolerancias} onChange={modificar} />
        <CampoAreaTexto etiqueta="Hábitos alimentarios" id="habitosAlimentarios" value={valores.habitosAlimentarios} onChange={modificar} />
        <CampoTexto etiqueta="Objetivos nutricionales (separados por coma)" id="objetivos" value={valores.objetivos} onChange={modificar} />
        <CampoAreaTexto etiqueta="Evaluación" id="evaluacion" value={valores.evaluacion} onChange={modificar} />
        <CampoTexto etiqueta="Diagnóstico nutricional" id="diagnosticoNutricional" value={valores.diagnosticoNutricional} onChange={modificar} />
        <CampoAreaTexto etiqueta="Plan de intervención" id="planIntervencion" value={valores.planIntervencion} onChange={modificar} />
        <CampoAreaTexto etiqueta="Indicaciones" id="indicaciones" value={valores.indicaciones} onChange={modificar} />
        <CampoTexto etiqueta="Motivo del cambio" id="motivoCambio" required value={valores.motivoCambio} onChange={modificar} />
        <div className="flex gap-2">
          <Boton type="submit" disabled={!valores.motivoCambio.trim() || !valores.motivoConsulta.trim()}>Guardar corrección</Boton>
          <Boton variante="suave" onClick={onCancelar}>Cancelar</Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

function FichaCompleta({ pacienteId, ficha, puedeEscribir, onCambio }) {
  const [descripcion, setDescripcion] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [resultado, setResultado] = useState('');
  const [editando, setEditando] = useState(false);

  const ejecutar = async (accion) => {
    try {
      await accion();
      setResultado('');
      onCambio();
    } catch (falla) {
      setResultado(describirError(falla));
    }
  };

  return (
    <div className="space-y-5">
      {editando && (
        <EdicionDatosBase pacienteId={pacienteId} ficha={ficha} onCancelar={() => setEditando(false)}
          onGuardado={() => { setEditando(false); onCambio(); }} />
      )}
      <Tarjeta titulo="Antecedentes y evaluación">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="font-semibold">Motivo de consulta</dt><dd>{ficha.motivoConsulta}</dd></div>
          <div><dt className="font-semibold">Alergias</dt><dd>{ficha.alergias.join(', ') || 'Sin registro'}</dd></div>
          <div><dt className="font-semibold">Intolerancias</dt><dd>{ficha.intolerancias.join(', ') || 'Sin registro'}</dd></div>
          <div><dt className="font-semibold">Hábitos alimentarios</dt><dd>{ficha.habitosAlimentarios || 'Sin registro'}</dd></div>
          <div><dt className="font-semibold">Objetivos</dt><dd>{ficha.objetivosNutricionales.join(', ') || 'Sin registro'}</dd></div>
          <div><dt className="font-semibold">Evaluación</dt><dd>{ficha.evaluacion || 'Sin registro'}</dd></div>
          <div><dt className="font-semibold">Diagnóstico nutricional</dt><dd>{ficha.diagnosticoNutricional || 'Sin registro'}</dd></div>
          <div><dt className="font-semibold">Estado</dt><dd>{ficha.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}</dd></div>
        </dl>
        {puedeEscribir && ficha.estado === 'ABIERTA' && !editando && (
          <Boton className="mt-4" variante="contorno" onClick={() => setEditando(true)}>Corregir datos base</Boton>
        )}
        {ficha.correcciones.length > 0 && (
          <p className="mt-3 text-xs text-gray-500">Esta ficha tiene {ficha.correcciones.length} corrección(es) registrada(s) en el historial.</p>
        )}
      </Tarjeta>

      <Tarjeta titulo={`Evoluciones (${ficha.evoluciones.length})`}>
        <Mensaje>{resultado}</Mensaje>
        <ul className="space-y-3">
          {ficha.evoluciones.map((evolucion) => (
            <Evolucion key={evolucion.identificador} evolucion={evolucion} puedeCorregir={puedeEscribir && ficha.estado === 'ABIERTA'}
              onCorregir={(identificador, texto, motivo) =>
                ejecutar(() => clinicoApi.corregirEvolucion(pacienteId, identificador, { descripcion: texto, motivoCorreccion: motivo }))} />
          ))}
        </ul>
        {puedeEscribir && ficha.estado === 'ABIERTA' && (
          <form className="mt-5 border-t border-gray-100 pt-4" onSubmit={(evento) => {
            evento.preventDefault();
            ejecutar(async () => {
              await clinicoApi.registrarEvolucion(pacienteId, { descripcion, indicaciones: indicaciones || null });
              setDescripcion('');
              setIndicaciones('');
            });
          }}>
            <CampoAreaTexto etiqueta="Nueva evolución" id="nueva-evolucion" required value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)} />
            <CampoTexto etiqueta="Indicaciones" id="indicaciones" value={indicaciones}
              onChange={(evento) => setIndicaciones(evento.target.value)} />
            <Boton type="submit">Registrar evolución</Boton>
          </form>
        )}
      </Tarjeta>
    </div>
  );
}

export default function FichaClinica() {
  const { paciente, puedeEscribir, cargando: cargandoPaciente, error: errorPaciente } = usePacienteActual();
  const pacienteId = paciente?.id;
  const ficha = useConsulta(
    () => (pacienteId ? clinicoApi.consultarFicha(pacienteId) : Promise.resolve(null)), { pacienteId },
  );
  const sinFicha = ficha.error?.mensaje && ficha.error.mensaje.includes('aún no tiene ficha');

  return (
    <Contenedor titulo="Ficha clínica nutricional" descripcion={paciente?.nombreCompleto}>
      <EstadoConsulta cargando={cargandoPaciente || ficha.cargando} error={errorPaciente || (sinFicha ? null : ficha.error)}
        onReintentar={ficha.recargar}>
        {sinFicha ? (
          puedeEscribir
            ? <FormularioApertura pacienteId={pacienteId} onAbierta={ficha.recargar} />
            : <p className="py-6 text-center text-gray-500">Aún no tienes una ficha clínica. Tu nutricionista la abrirá en tu primera atención.</p>
        ) : (
          ficha.datos && <FichaCompleta pacienteId={pacienteId} ficha={ficha.datos} puedeEscribir={puedeEscribir} onCambio={ficha.recargar} />
        )}
      </EstadoConsulta>
    </Contenedor>
  );
}
